/**
 * Helpers for binary (BLOB / BYTEA / BINARY / VARBINARY / RAW) cell values.
 *
 * The pg and mysql drivers return binary columns as Node.js `Buffer`s, which
 * reach the browser through JSON as `{ type: 'Buffer', data: number[] }`.
 * The grid shows and edits them as a `0x…` hex string, and the SQL dialects
 * turn the Buffer shape back into a binary literal when saving.
 */

/** JSON shape of a Node.js `Buffer`. */
export interface SerializedBinaryValue {
  type: 'Buffer';
  data: number[];
}

export const BINARY_HEX_PREFIX = '0x';

const HEX_INPUT_PREFIX = /^(0x|\\x)/i;
const HEX_DIGITS = /^[0-9a-f]*$/i;
const MAX_BYTE = 255;

/** True for a JSON-serialized Node.js Buffer (`{ type: 'Buffer', data }`). */
export const isSerializedBinaryValue = (
  value: unknown
): value is SerializedBinaryValue => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as { type?: unknown; data?: unknown };
  return (
    candidate.type === 'Buffer' &&
    Array.isArray(candidate.data) &&
    candidate.data.every(
      byte => Number.isInteger(byte) && byte >= 0 && byte <= MAX_BYTE
    )
  );
};

/** Lower-case hex digits of the bytes, without a prefix. */
export const binaryValueToHex = (value: SerializedBinaryValue): string =>
  value.data.map(byte => byte.toString(16).padStart(2, '0')).join('');

/** Grid display of a binary value: its size, not its bytes. */
export const formatBinarySummary = (value: SerializedBinaryValue): string => {
  const size = value.data.length;
  return `BINARY - ${size} ${size === 1 ? 'byte' : 'bytes'}`;
};

/** Edit form of a binary value: `0x` followed by hex digits. */
export const formatBinaryValue = (value: SerializedBinaryValue): string =>
  `${BINARY_HEX_PREFIX}${binaryValueToHex(value)}`;

/**
 * Parse user input back into a binary value. Accepts `0x…`, Postgres-style
 * `\x…`, or bare hex digits; whitespace between bytes is ignored. Returns
 * `undefined` for anything that is not a whole number of hex bytes, so the
 * edit can be rejected instead of writing text into a binary column.
 */
export const parseBinaryInput = (
  input: string
): SerializedBinaryValue | undefined => {
  const hex = input.replace(/\s+/g, '').replace(HEX_INPUT_PREFIX, '');

  if (!HEX_DIGITS.test(hex) || hex.length % 2 !== 0) {
    return undefined;
  }

  const data: number[] = [];
  for (let index = 0; index < hex.length; index += 2) {
    data.push(Number.parseInt(hex.slice(index, index + 2), 16));
  }

  return { type: 'Buffer', data };
};
