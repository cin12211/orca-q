import { describe, expect, it } from 'vitest';
import { normalizeEditedCellValue } from '~/core/helpers/cell-value';

describe('normalizeEditedCellValue', () => {
  it('preserves numeric zero instead of coercing it to null', () => {
    expect(
      normalizeEditedCellValue({
        fieldType: 'int4',
        isObjectColumn: false,
        value: 0,
      })
    ).toBe(0);
  });

  it('keeps explicit empty cell values as null', () => {
    expect(
      normalizeEditedCellValue({
        fieldType: 'text',
        isObjectColumn: false,
        value: '',
      })
    ).toBeNull();
  });

  it('normalizes boolean columns without treating false as null', () => {
    expect(
      normalizeEditedCellValue({
        fieldType: 'bool',
        isObjectColumn: false,
        value: false,
      })
    ).toBe(false);
  });

  it('handles various boolean-like inputs correctly', () => {
    const options = { fieldType: 'bool', isObjectColumn: false };

    expect(normalizeEditedCellValue({ ...options, value: 'true' })).toBe(true);
    expect(normalizeEditedCellValue({ ...options, value: 'false' })).toBe(
      false
    );
    expect(normalizeEditedCellValue({ ...options, value: '1' })).toBe(true);
    expect(normalizeEditedCellValue({ ...options, value: '0' })).toBe(false);
    expect(normalizeEditedCellValue({ ...options, value: 1 })).toBe(true);
    expect(normalizeEditedCellValue({ ...options, value: 0 })).toBe(false);
    expect(normalizeEditedCellValue({ ...options, value: true })).toBe(true);
    expect(normalizeEditedCellValue({ ...options, value: false })).toBe(false);

    // Invalid boolean-like should be returned as-is (or handled by DB)
    expect(normalizeEditedCellValue({ ...options, value: 'yes' })).toBe('yes');
    expect(normalizeEditedCellValue({ ...options, value: 2 })).toBe(2);
  });

  it('parses JSON editor values for array columns into arrays', () => {
    expect(
      normalizeEditedCellValue({
        fieldType: 'text[]',
        isObjectColumn: true,
        value: '["java","spring"]',
      })
    ).toEqual(['java', 'spring']);
  });

  it('preserves array values for array columns', () => {
    expect(
      normalizeEditedCellValue({
        fieldType: 'text[]',
        isObjectColumn: true,
        value: ['java', 'spring'],
      })
    ).toEqual(['java', 'spring']);
  });
});
