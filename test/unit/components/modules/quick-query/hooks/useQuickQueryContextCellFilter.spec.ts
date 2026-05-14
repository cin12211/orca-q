import { describe, expect, it } from 'vitest';
import { OperatorSet } from '~/core/constants';
import { buildFilterFromContextCell } from '~/components/modules/quick-query/hooks/useQuickQueryContextCellFilter';

describe('buildFilterFromContextCell', () => {
  it('preserves Postgres array column values for equality filters', () => {
    expect(
      buildFilterFromContextCell({
        columnName: 'tags',
        columnType: 'text[]',
        cellValue: ['java', 'spring'],
      })
    ).toEqual({
      fieldName: 'tags',
      isSelect: true,
      operator: OperatorSet.EQUAL,
      valueType: 'postgres-array',
      search: ['java', 'spring'],
    });
  });

  it('keeps non-array column array values as JSON strings', () => {
    expect(
      buildFilterFromContextCell({
        columnName: 'payload',
        columnType: 'jsonb',
        cellValue: ['java', 'spring'],
      })
    ).toMatchObject({
      fieldName: 'payload',
      valueType: undefined,
      search: '["java","spring"]',
    });
  });
});
