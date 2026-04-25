import { describe, expect, it } from 'vitest';
import { normalizeResultRows } from '~/components/modules/raw-query/utils';

describe('normalizeResultRows', () => {
  const fieldDefs = [{ name: 'id' }, { name: 'name' }] as const;

  it('maps positional rows to named objects', () => {
    expect(normalizeResultRows([[1, 'Ada']] as any, fieldDefs as any)).toEqual([
      { id: 1, name: 'Ada' },
    ]);
  });

  it('keeps named-object rows intact', () => {
    expect(
      normalizeResultRows([{ id: 1, name: 'Ada' }] as any, fieldDefs as any)
    ).toEqual([{ id: 1, name: 'Ada' }]);
  });

  it('maps numeric-keyed object rows to field names', () => {
    expect(
      normalizeResultRows([{ 0: 1, 1: 'Ada' }] as any, fieldDefs as any)
    ).toEqual([{ id: 1, name: 'Ada' }]);
  });
});
