import { describe, expect, it } from 'vitest';
import { normalizeEditedCellValue } from '~/components/modules/quick-query/utils/normalizeEditedCellValue';

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
});
