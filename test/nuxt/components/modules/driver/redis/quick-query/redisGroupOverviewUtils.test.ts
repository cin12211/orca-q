import type { ValueFormatterParams } from 'ag-grid-community';
import { describe, expect, it } from 'vitest';
import {
  buildRedisGroupOverviewColumnDefs,
  buildRedisGroupOverviewRows,
  formatRedisTtl,
} from '~/components/modules/driver/redis/quick-query/utils/redisGroupOverview';
import type { RedisKeyListItem } from '~/core/types/redis-workspace.types';

const item = (overrides: Partial<RedisKeyListItem> = {}): RedisKeyListItem => ({
  key: 'user:1',
  type: 'hash',
  ttl: -1,
  memoryUsage: 2048,
  memoryUsageHuman: '2.0 KB',
  ...overrides,
});

const formatWith = (
  colDefs: ReturnType<typeof buildRedisGroupOverviewColumnDefs>,
  field: string,
  value: unknown
) => {
  const formatter = colDefs.find(c => c.field === field)?.valueFormatter;
  if (typeof formatter !== 'function') {
    throw new Error(`No valueFormatter for "${field}"`);
  }
  return formatter({ value } as ValueFormatterParams);
};

describe('redisGroupOverview utils', () => {
  it('exposes key, size, ttl and data type columns in order', () => {
    const headers = buildRedisGroupOverviewColumnDefs([item()])
      .map(c => c.headerName)
      .filter(h => h && h !== '#');

    expect(headers).toEqual(['Key', 'Size', 'TTL', 'Data Type']);
  });

  it('maps items to rows keeping raw size/ttl for numeric sorting', () => {
    const rows = buildRedisGroupOverviewRows([
      item({ key: 'a', type: 'string', ttl: 30, memoryUsage: 100 }),
    ]) as Record<string, unknown>[];

    expect(rows[0]).toMatchObject({
      key: 'a',
      type: 'string',
      ttl: 30,
      size: 100,
    });
  });

  it('formats size and ttl for display, with placeholders for missing values', () => {
    const colDefs = buildRedisGroupOverviewColumnDefs([item()]);

    expect(formatWith(colDefs, 'size', 2048)).toBe('2 KB');
    expect(formatWith(colDefs, 'size', null)).toBe('—');
    expect(formatWith(colDefs, 'ttl', -1)).toBe('Persisted');
  });

  it.each([
    [-2, 'Persisted'],
    [45, '45s'],
    [120, '2m'],
    [7200, '2h'],
    [172800, '2d'],
  ])('formatRedisTtl(%s) = %s', (ttl, label) => {
    expect(formatRedisTtl(ttl)).toBe(label);
  });

  it('returns no rows for an empty group', () => {
    expect(buildRedisGroupOverviewRows([])).toEqual([]);
  });
});
