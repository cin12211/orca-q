import type { ColDef, ValueFormatterParams } from 'ag-grid-community';
import {
  buildDynamicColumnDefs,
  buildDynamicRowData,
  type RowData,
} from '~/components/base/data-grid/utils';
import { buildMappedColumnsFromKeys } from '~/core/helpers';
import { formatBytes } from '~/core/helpers/bytes-formatter';
import type { RedisKeyListItem } from '~/core/types/redis-workspace.types';

export const REDIS_GROUP_OVERVIEW_COLUMN_LABELS = {
  key: 'Key',
  size: 'Size',
  ttl: 'TTL',
  type: 'Data Type',
} as const;

type RedisGroupOverviewField = keyof typeof REDIS_GROUP_OVERVIEW_COLUMN_LABELS;

const EMPTY_CELL_LABEL = '—';
const PERSISTED_TTL_LABEL = 'Persisted';
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

/** Redis returns -1 (no expiry) / -2 (missing key) for keys without a TTL. */
export const formatRedisTtl = (ttl: number | null | undefined) => {
  if (ttl === null || ttl === undefined) return EMPTY_CELL_LABEL;
  if (ttl < 0) return PERSISTED_TTL_LABEL;
  if (ttl < SECONDS_PER_MINUTE) return `${ttl}s`;
  if (ttl < SECONDS_PER_HOUR) return `${Math.floor(ttl / SECONDS_PER_MINUTE)}m`;
  if (ttl < SECONDS_PER_DAY) return `${Math.floor(ttl / SECONDS_PER_HOUR)}h`;
  return `${Math.floor(ttl / SECONDS_PER_DAY)}d`;
};

const formatRedisSize = (memoryUsage: number | null | undefined) =>
  memoryUsage === null || memoryUsage === undefined
    ? EMPTY_CELL_LABEL
    : formatBytes(memoryUsage);

/**
 * Rows keep raw numeric `size` / `ttl` so the grid sorts numerically; the
 * human-readable text is produced by the column `valueFormatter`s below.
 */
export const buildRedisGroupOverviewRows = (
  items: RedisKeyListItem[]
): unknown[] =>
  buildDynamicRowData(
    items.map(item => ({
      key: item.key,
      size: item.memoryUsage,
      ttl: item.ttl,
      type: item.type,
    }))
  );

const CELL_FORMATTERS: Partial<
  Record<RedisGroupOverviewField, (params: ValueFormatterParams) => string>
> = {
  size: params => formatRedisSize(params.value),
  ttl: params => formatRedisTtl(params.value),
};

export const buildRedisGroupOverviewColumnDefs = (
  items: RedisKeyListItem[]
): ColDef[] => {
  const fields = Object.keys(
    REDIS_GROUP_OVERVIEW_COLUMN_LABELS
  ) as RedisGroupOverviewField[];

  const columns = buildMappedColumnsFromKeys(fields).map(column => ({
    ...column,
    aliasFieldName:
      REDIS_GROUP_OVERVIEW_COLUMN_LABELS[
        column.originalName as RedisGroupOverviewField
      ],
  }));

  return buildDynamicColumnDefs({
    columns,
    rows: buildRedisGroupOverviewRows(items) as RowData[],
    columnKeyBy: 'field',
  }).map(colDef => {
    const formatter = CELL_FORMATTERS[colDef.field as RedisGroupOverviewField];
    return formatter ? { ...colDef, valueFormatter: formatter } : colDef;
  });
};
