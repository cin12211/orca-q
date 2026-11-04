import { describe, it, expect } from 'vitest';
import {
  buildMappedColumnsFromRows,
  buildMappedColumnsFromKeys,
} from '@/core/helpers/mapped-columns';

describe('mapped-columns', () => {
  it('returns empty array for empty rows', () => {
    expect(buildMappedColumnsFromRows([])).toEqual([]);
  });

  it('builds mapped columns from row keys', () => {
    const rows = [{ id: 1, name: 'x' }];
    const cols = buildMappedColumnsFromRows(rows as any);
    expect(cols).toHaveLength(2);
    expect(cols[0]).toHaveProperty('originalName', 'id');
  });

  it('builds mapped columns from keys array', () => {
    const keys = ['a', 'b', 'c'] as const;
    const cols = buildMappedColumnsFromKeys(keys);
    expect(cols).toHaveLength(3);
    expect(cols.map(c => c.originalName)).toEqual(['a', 'b', 'c']);
  });

  it('mapped column default flags are false', () => {
    const cols = buildMappedColumnsFromKeys(['x']);
    expect(cols[0].isPrimaryKey).toBe(false);
    expect(cols[0].isForeignKey).toBe(false);
  });

  it('aliasFieldName equals key by default', () => {
    const cols = buildMappedColumnsFromKeys(['col1']);
    expect(cols[0].aliasFieldName).toBe('col1');
  });

  it('queryFieldName equals key by default', () => {
    const cols = buildMappedColumnsFromKeys(['k']);
    expect(cols[0].queryFieldName).toBe('k');
  });

  it('tableName is empty by default', () => {
    const cols = buildMappedColumnsFromKeys(['k']);
    expect(cols[0].tableName).toBe('');
  });

  it('canMutate is false by default', () => {
    const cols = buildMappedColumnsFromKeys(['k']);
    expect(cols[0].canMutate).toBe(false);
  });

  it('preserves order of keys', () => {
    const cols = buildMappedColumnsFromKeys(['z', 'a', 'm']);
    expect(cols.map(c => c.originalName)).toEqual(['z', 'a', 'm']);
  });

  it('buildMappedColumnsFromRows uses first row keys only', () => {
    const cols = buildMappedColumnsFromRows([{ a: 1 }, { b: 2 }] as any);
    expect(cols.map(c => c.originalName)).toEqual(['a']);
  });
});
