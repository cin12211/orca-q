import { describe, expect, it } from 'vitest';
import {
  binaryValueToHex,
  formatBinarySummary,
  formatBinaryValue,
  isSerializedBinaryValue,
  parseBinaryInput,
} from '~/core/helpers/binary-value';

describe('binary-value', () => {
  it('detects only well-formed Buffer JSON', () => {
    expect(isSerializedBinaryValue({ type: 'Buffer', data: [0, 255] })).toBe(
      true
    );
    expect(isSerializedBinaryValue({ type: 'Buffer', data: [256] })).toBe(
      false
    );
    expect(isSerializedBinaryValue({ type: 'Buffer', data: [1.5] })).toBe(
      false
    );
    expect(isSerializedBinaryValue({ type: 'Buffer', data: ['1'] })).toBe(
      false
    );
    expect(isSerializedBinaryValue([1, 2])).toBe(false);
    expect(isSerializedBinaryValue(null)).toBe(false);
  });

  it('formats bytes as lower-case, zero-padded 0x hex', () => {
    const value = { type: 'Buffer' as const, data: [0, 10, 171, 255] };
    expect(binaryValueToHex(value)).toBe('000aabff');
    expect(formatBinaryValue(value)).toBe('0x000aabff');
    expect(formatBinaryValue({ type: 'Buffer', data: [] })).toBe('0x');
  });

  it('parses 0x, \\x and bare hex, ignoring whitespace', () => {
    const expected = { type: 'Buffer', data: [0, 10, 171, 255] };
    expect(parseBinaryInput('0x000aabff')).toEqual(expected);
    expect(parseBinaryInput('0X000AABFF')).toEqual(expected);
    expect(parseBinaryInput('\\x000aabff')).toEqual(expected);
    expect(parseBinaryInput('00 0a ab ff')).toEqual(expected);
    expect(parseBinaryInput('0x')).toEqual({ type: 'Buffer', data: [] });
  });

  it('rejects odd-length or non-hex input', () => {
    expect(parseBinaryInput('0x123')).toBeUndefined();
    expect(parseBinaryInput('zz')).toBeUndefined();
    expect(parseBinaryInput('{"type":"Buffer"}')).toBeUndefined();
  });

  it('round-trips format and parse', () => {
    const value = { type: 'Buffer' as const, data: [1, 2, 3, 254] };
    expect(parseBinaryInput(formatBinaryValue(value))).toEqual(value);
  });

  it('summarises binary values by size for the grid', () => {
    expect(formatBinarySummary({ type: 'Buffer', data: [] })).toBe(
      'BINARY - 0 bytes'
    );
    expect(formatBinarySummary({ type: 'Buffer', data: [1] })).toBe(
      'BINARY - 1 byte'
    );
    expect(formatBinarySummary({ type: 'Buffer', data: [1, 2, 3] })).toBe(
      'BINARY - 3 bytes'
    );
  });
});
