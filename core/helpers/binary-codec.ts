import {
  binaryValueToHex,
  parseBinaryInput,
  type SerializedBinaryValue,
} from './binary-value';

/**
 * Text encodings a binary cell can be viewed and edited in. Decoding and
 * re-encoding are exact: `encodeBinaryText(decodeBinaryText(v, e), e)`
 * yields the same bytes for every encoding the value decodes in.
 */
export enum BinaryTextEncoding {
  Utf8 = 'utf8',
  Hex = 'hex',
  Base64 = 'base64',
}

export const BINARY_TEXT_ENCODING_LABELS: Record<BinaryTextEncoding, string> = {
  [BinaryTextEncoding.Utf8]: 'Text (UTF-8)',
  [BinaryTextEncoding.Hex]: 'Hex',
  [BinaryTextEncoding.Base64]: 'Base64',
};

const BASE64_INPUT = /^[A-Za-z0-9+/]*={0,2}$/;
const BASE64_BLOCK = 4;
/** Chunk size for `String.fromCharCode` so large blobs cannot overflow the stack. */
const CHAR_CODE_CHUNK = 0x8000;
/**
 * Control characters other than tab / line feed / carriage return. Text
 * containing them is almost certainly not meant to be read as text.
 */
// eslint-disable-next-line no-control-regex
const NON_TEXT_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

// `ignoreBOM` keeps a leading BOM in the text so encoding gives it back;
// `fatal` refuses invalid UTF-8 instead of replacing bytes with U+FFFD.
const utf8Decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const utf8Encoder = new TextEncoder();

const toBinaryValue = (bytes: ArrayLike<number>): SerializedBinaryValue => ({
  type: 'Buffer',
  data: Array.from(bytes),
});

const bytesToBinaryString = (data: number[]) => {
  let result = '';
  for (let index = 0; index < data.length; index += CHAR_CODE_CHUNK) {
    result += String.fromCharCode(
      ...data.slice(index, index + CHAR_CODE_CHUNK)
    );
  }
  return result;
};

/**
 * Text for the bytes in `encoding`, or `undefined` when they cannot be shown
 * that way losslessly (only possible for UTF-8).
 */
export const decodeBinaryText = (
  value: SerializedBinaryValue,
  encoding: BinaryTextEncoding
): string | undefined => {
  switch (encoding) {
    case BinaryTextEncoding.Utf8:
      try {
        return utf8Decoder.decode(Uint8Array.from(value.data));
      } catch {
        return undefined;
      }
    case BinaryTextEncoding.Base64:
      return btoa(bytesToBinaryString(value.data));
    case BinaryTextEncoding.Hex:
      return `0x${binaryValueToHex(value)}`;
  }
};

/** Bytes for `text` read in `encoding`, or `undefined` for invalid input. */
export const encodeBinaryText = (
  text: string,
  encoding: BinaryTextEncoding
): SerializedBinaryValue | undefined => {
  switch (encoding) {
    case BinaryTextEncoding.Utf8:
      return toBinaryValue(utf8Encoder.encode(text));
    case BinaryTextEncoding.Base64: {
      const compact = text.replace(/\s+/g, '');
      if (compact.length % BASE64_BLOCK !== 0 || !BASE64_INPUT.test(compact)) {
        return undefined;
      }
      try {
        const decoded = atob(compact);
        return toBinaryValue(
          Array.from(decoded, character => character.charCodeAt(0))
        );
      } catch {
        return undefined;
      }
    }
    case BinaryTextEncoding.Hex:
      return parseBinaryInput(text);
  }
};

/**
 * Encoding to open a binary value in: readable UTF-8 text when the bytes are
 * valid UTF-8 without stray control characters, hex otherwise (images,
 * hashes, UUIDs, compressed data, ...).
 */
export const detectBinaryTextEncoding = (
  value: SerializedBinaryValue
): BinaryTextEncoding => {
  if (!value.data.length) return BinaryTextEncoding.Hex;

  const text = decodeBinaryText(value, BinaryTextEncoding.Utf8);
  if (text === undefined || NON_TEXT_CONTROL_CHARS.test(text)) {
    return BinaryTextEncoding.Hex;
  }

  return BinaryTextEncoding.Utf8;
};
