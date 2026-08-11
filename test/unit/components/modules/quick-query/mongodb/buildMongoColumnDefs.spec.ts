import { describe, expect, it } from 'vitest';
import { buildMongoColumnDefs } from '~/components/modules/quick-query/mongodb/utils/buildMongoColumnDefs';

describe('buildMongoColumnDefs', () => {
  it('puts _id first and orders remaining keys by first appearance', () => {
    const columns = buildMongoColumnDefs([
      { _id: '1', name: 'Alice', age: 30 },
      { _id: '2', name: 'Bob', email: 'bob@example.com' },
    ]);

    expect(columns.map(col => col.field)).toEqual([
      '_id',
      'name',
      'age',
      'email',
    ]);
  });

  it('stringifies object and array values for cell display', () => {
    const columns = buildMongoColumnDefs([
      { _id: '1', tags: ['a', 'b'], address: { city: 'Hanoi' } },
    ]);

    const tagsCol = columns.find(col => col.field === 'tags');
    const rowValue = tagsCol?.valueGetter?.({
      data: { tags: ['a', 'b'] },
    } as any);
    expect(rowValue).toBe('["a","b"]');
  });

  it('returns just the _id column for an empty document list', () => {
    expect(buildMongoColumnDefs([])).toEqual([
      { field: '_id', headerName: '_id' },
    ]);
  });
});
