import { describe, expect, it } from 'vitest';
import {
  BinaryTextEncoding,
  decodeBinaryText,
  detectBinaryTextEncoding,
  encodeBinaryText,
} from '~/core/helpers/binary-codec';
import type { SerializedBinaryValue } from '~/core/helpers/binary-value';

const bytes = (...data: number[]): SerializedBinaryValue => ({
  type: 'Buffer',
  data,
});
const utf8 = (text: string) => bytes(...new TextEncoder().encode(text));

const ALL_ENCODINGS = Object.values(BinaryTextEncoding);

/** Byte sequences that must survive decode → encode unchanged. */
const ROUND_TRIP_SAMPLES: [string, SerializedBinaryValue][] = [
  ['empty', bytes()],
  ['ascii text', utf8('hello world')],
  ['vietnamese + emoji', utf8('Xin chào 👋 — ổn')],
  ['multi-line with CRLF', utf8('line 1\r\nline 2\n\ttab')],
  ['leading BOM', bytes(0xef, 0xbb, 0xbf, 0x61)],
  ['JSON text', utf8('{"a":[1,2]}')],
  ['PNG header', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
  ['all byte values', bytes(...Array.from({ length: 256 }, (_, i) => i))],
  ['invalid UTF-8', bytes(0xc3, 0x28)],
  ['large blob', bytes(...Array.from({ length: 100_000 }, (_, i) => i % 256))],
];

describe('binary codec round-trip', () => {
  for (const [label, value] of ROUND_TRIP_SAMPLES) {
    for (const encoding of ALL_ENCODINGS) {
      it(`${label} via ${encoding}`, () => {
        const text = decodeBinaryText(value, encoding);
        if (text === undefined) {
          // Only UTF-8 may refuse, and only for bytes that are not UTF-8.
          expect(encoding).toBe(BinaryTextEncoding.Utf8);
          return;
        }

        expect(encodeBinaryText(text, encoding)).toEqual(value);
      });
    }
  }
});

describe('decodeBinaryText', () => {
  it('decodes readable text and keeps a BOM', () => {
    expect(decodeBinaryText(utf8('chào'), BinaryTextEncoding.Utf8)).toBe(
      'chào'
    );
    expect(
      decodeBinaryText(bytes(0xef, 0xbb, 0xbf, 0x61), BinaryTextEncoding.Utf8)
    ).toBe('﻿a');
  });

  it('refuses invalid UTF-8 instead of replacing bytes', () => {
    expect(
      decodeBinaryText(bytes(0xff, 0xfe), BinaryTextEncoding.Utf8)
    ).toBeUndefined();
  });

  it('renders hex and base64', () => {
    const value = bytes(0xde, 0xad, 0xbe, 0xef);
    expect(decodeBinaryText(value, BinaryTextEncoding.Hex)).toBe('0xdeadbeef');
    expect(decodeBinaryText(value, BinaryTextEncoding.Base64)).toBe('3q2+7w==');
  });
});

describe('encodeBinaryText', () => {
  it('encodes text as UTF-8 bytes', () => {
    expect(encodeBinaryText('é', BinaryTextEncoding.Utf8)).toEqual(
      bytes(0xc3, 0xa9)
    );
    expect(encodeBinaryText('', BinaryTextEncoding.Utf8)).toEqual(bytes());
  });

  it('accepts base64 with whitespace and rejects malformed input', () => {
    expect(encodeBinaryText('3q2+\n7w==', BinaryTextEncoding.Base64)).toEqual(
      bytes(0xde, 0xad, 0xbe, 0xef)
    );
    for (const input of ['3q2', 'abc$', '====', 'a===']) {
      expect(
        encodeBinaryText(input, BinaryTextEncoding.Base64)
      ).toBeUndefined();
    }
  });

  it('rejects malformed hex', () => {
    expect(encodeBinaryText('0x1', BinaryTextEncoding.Hex)).toBeUndefined();
  });
});

describe('detectBinaryTextEncoding', () => {
  it.each([
    ['readable text', utf8('hello'), BinaryTextEncoding.Utf8],
    ['multi-line text', utf8('a\nb\r\n\tc'), BinaryTextEncoding.Utf8],
    ['vietnamese text', utf8('Tiếng Việt'), BinaryTextEncoding.Utf8],
    ['empty', bytes(), BinaryTextEncoding.Hex],
    ['invalid UTF-8', bytes(0xff), BinaryTextEncoding.Hex],
    ['NUL byte', bytes(0x61, 0x00, 0x62), BinaryTextEncoding.Hex],
    ['PNG header', bytes(0x89, 0x50, 0x4e, 0x47), BinaryTextEncoding.Hex],
    ['ASCII control chars', bytes(0x01, 0x02), BinaryTextEncoding.Hex],
  ])('%s', (_label, value, expected) => {
    expect(detectBinaryTextEncoding(value)).toBe(expected);
  });
});
