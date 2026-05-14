import { describe, expect, it } from 'vitest';
import {
  formatQuickQueryCellValue,
  isQuickQueryArrayColumnType,
  isQuickQueryStructuredColumnType,
  setQuickQueryCellValue,
} from '~/components/modules/quick-query/utils/quickQueryTable';

describe('quickQueryTable utils', () => {
  it('detects Postgres array columns as structured editable columns', () => {
    expect(isQuickQueryArrayColumnType('text[]')).toBe(true);
    expect(isQuickQueryStructuredColumnType('text[]')).toBe(true);
    expect(isQuickQueryStructuredColumnType('jsonb')).toBe(true);
    expect(isQuickQueryStructuredColumnType('text')).toBe(false);
  });

  it('formats array cell values as pretty JSON for inline editing', () => {
    expect(
      formatQuickQueryCellValue(
        { value: ['java', 'spring'] } as Parameters<
          typeof formatQuickQueryCellValue
        >[0],
        true
      )
    ).toBe('[\n  "java",\n  "spring"\n]');
  });

  it('sets array cell values from JSON editor output', () => {
    const params = {
      data: {},
      newValue: '["java","spring"]',
    } as Parameters<typeof setQuickQueryCellValue>[0]['params'];

    expect(
      setQuickQueryCellValue({
        params,
        fieldId: 'tags',
        isObjectColumn: true,
      })
    ).toBe(true);
    expect(params.data.tags).toEqual(['java', 'spring']);
  });
});
