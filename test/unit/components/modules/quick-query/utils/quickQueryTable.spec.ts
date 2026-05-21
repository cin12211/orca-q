import { describe, expect, it } from 'vitest';
import { HASH_INDEX_ID } from '~/components/base/dynamic-table/constants';
import {
  buildQuickQueryRowData,
  suppressDeleteKeyboardEvent,
} from '~/components/modules/quick-query/utils/quickQueryTable';

describe('quickQueryTable utils', () => {
  it('adds display hash indexes without mutating row data order', () => {
    expect(
      buildQuickQueryRowData(
        [
          { id: 'u1', name: 'Ada' },
          { id: 'u2', name: 'Linus' },
        ],
        20
      )
    ).toEqual([
      { [HASH_INDEX_ID]: 21, id: 'u1', name: 'Ada' },
      { [HASH_INDEX_ID]: 22, id: 'u2', name: 'Linus' },
    ]);
  });

  it('returns an empty array when data is missing', () => {
    expect(buildQuickQueryRowData(undefined, 5)).toEqual([]);
  });

  it('suppresses delete and backspace keyboard edits', () => {
    expect(
      suppressDeleteKeyboardEvent({
        event: { key: 'Delete' },
      } as Parameters<typeof suppressDeleteKeyboardEvent>[0])
    ).toBe(true);
    expect(
      suppressDeleteKeyboardEvent({
        event: { key: 'Backspace' },
      } as Parameters<typeof suppressDeleteKeyboardEvent>[0])
    ).toBe(true);
    expect(
      suppressDeleteKeyboardEvent({
        event: { key: 'Enter' },
      } as Parameters<typeof suppressDeleteKeyboardEvent>[0])
    ).toBe(false);
  });
});
