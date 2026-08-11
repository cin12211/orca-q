import { describe, expect, it } from 'vitest';
import { buildMongoPreviewFields } from '~/components/modules/quick-query/mongodb/utils/buildMongoPreviewFields';

describe('buildMongoPreviewFields', () => {
  it('returns up to maxFields scalar top-level fields, excluding _id', () => {
    const fields = buildMongoPreviewFields(
      { _id: '1', name: 'Alice', age: 30, city: 'Hanoi', country: 'VN' },
      3
    );

    expect(fields).toEqual([
      { key: 'name', value: 'Alice' },
      { key: 'age', value: 30 },
      { key: 'city', value: 'Hanoi' },
    ]);
  });

  it('skips object/array values', () => {
    const fields = buildMongoPreviewFields(
      { _id: '1', name: 'Alice', address: { city: 'Hanoi' }, tags: ['a'] },
      3
    );

    expect(fields).toEqual([{ key: 'name', value: 'Alice' }]);
  });

  it('defaults maxFields to 3', () => {
    const fields = buildMongoPreviewFields({
      _id: '1',
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    });

    expect(fields).toHaveLength(3);
  });
});
