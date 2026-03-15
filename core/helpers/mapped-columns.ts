import type { MappedRawColumn } from '~/components/modules/raw-query/interfaces';

export const buildMappedColumnsFromRows = (
  rows: Record<string, unknown>[]
): MappedRawColumn[] => {
  const sample = rows[0];
  if (!sample) return [];

  return Object.keys(sample).map(key => ({
    isForeignKey: false,
    isPrimaryKey: false,
    originalName: key,
    queryFieldName: key,
    tableName: '',
    canMutate: false,
    aliasFieldName: key,
  }));
};

export const buildMappedColumnsFromKeys = (
  keys: readonly string[]
): MappedRawColumn[] =>
  keys.map(key => ({
    isForeignKey: false,
    isPrimaryKey: false,
    originalName: key,
    queryFieldName: key,
    tableName: '',
    canMutate: false,
    aliasFieldName: key,
  }));
