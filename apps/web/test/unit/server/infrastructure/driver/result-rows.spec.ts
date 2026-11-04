import { describe, expect, it } from 'vitest';
import {
  createSyntheticFields,
  lowerCaseRowKeys,
  mapArrayRowsToObjects,
} from '~/server/infrastructure/driver/result-rows';

describe('result rows helpers', () => {
  it('maps array rows onto field names', () => {
    expect(
      mapArrayRowsToObjects([[1, 'a']], [{ name: 'id' }, { name: 'label' }])
    ).toEqual([{ id: 1, label: 'a' }]);
  });

  it('creates text fields from column names', () => {
    expect(createSyntheticFields(['id'])[0]).toMatchObject({
      name: 'id',
      columnID: 0,
      format: 'text',
    });
  });

  it('lower-cases keys without touching values', () => {
    expect(lowerCaseRowKeys([{ SCHEMA_NAME: 'ORCAQ' }])).toEqual([
      { schema_name: 'ORCAQ' },
    ]);
  });
});
