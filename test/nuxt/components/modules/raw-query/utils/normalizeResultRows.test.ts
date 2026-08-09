import { describe, expect, it } from 'vitest';
import { normalizeResultRows } from '~/components/modules/raw-query/utils';

describe('normalizeResultRows', () => {
  const columns = [
    { name: 'id', aliasFieldName: 'id' },
    { name: 'name', aliasFieldName: 'name' },
  ];

  it('maps positional rows to named objects', () => {
    expect(normalizeResultRows([[1, 'Ada']] as any, columns)).toEqual([
      { id: 1, name: 'Ada' },
    ]);
  });

  it('keeps named-object rows intact', () => {
    expect(
      normalizeResultRows([{ id: 1, name: 'Ada' }] as any, columns)
    ).toEqual([{ id: 1, name: 'Ada' }]);
  });

  it('maps numeric-keyed object rows to field names', () => {
    expect(normalizeResultRows([{ 0: 1, 1: 'Ada' }] as any, columns)).toEqual([
      { id: 1, name: 'Ada' },
    ]);
  });

  it('maps duplicate column names uniquely using aliasFieldName', () => {
    const duplicateColumns = [
      { name: 'id', aliasFieldName: 'id' },
      { name: 'id', aliasFieldName: 'positions.id' },
    ];
    expect(
      normalizeResultRows(
        [
          [
            '30bef49f-3e9a-4fad-9cc3-a014946b85bd',
            '10dc28f8-cae9-49c6-8005-44509622789c',
          ],
        ] as any,
        duplicateColumns
      )
    ).toEqual([
      {
        id: '30bef49f-3e9a-4fad-9cc3-a014946b85bd',
        'positions.id': '10dc28f8-cae9-49c6-8005-44509622789c',
      },
    ]);
  });
});
