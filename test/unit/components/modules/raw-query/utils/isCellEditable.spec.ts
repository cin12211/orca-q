import { describe, expect, it } from 'vitest';
import {
  groupColumnsByTable,
  isCellEditable,
  isColumnPotentiallyEditable,
} from '~/components/modules/raw-query/utils/isCellEditable';
import type { MappedRawColumn } from '~/core/types/mapped-column.types';

const col = (overrides: Partial<MappedRawColumn> = {}): MappedRawColumn => {
  const originalName = overrides.originalName || 'col';
  return {
    isPrimaryKey: false,
    isForeignKey: false,
    queryFieldName: originalName,
    originalName: originalName,
    aliasFieldName: originalName,
    tableName: 'users',
    schemaName: 'public',
    ...overrides,
  };
};

describe('groupColumnsByTable', () => {
  it('groups columns by schema.table', () => {
    const columns: MappedRawColumn[] = [
      col({ originalName: 'id', isPrimaryKey: true }),
      col({ originalName: 'email' }),
      col({
        originalName: 'post_id',
        isPrimaryKey: true,
        tableName: 'posts',
      }),
    ];

    const groups = groupColumnsByTable(columns);

    expect(groups.size).toBe(2);
    expect(groups.get('public.users')!.primaryKeyFields).toEqual(['id']);
    expect(groups.get('public.posts')!.primaryKeyFields).toEqual(['post_id']);
  });

  it('skips columns without tableName or schemaName', () => {
    const columns: MappedRawColumn[] = [
      col({ tableName: '', schemaName: 'public' }),
      col({ tableName: 'users', schemaName: undefined }),
    ];

    const groups = groupColumnsByTable(columns);
    expect(groups.size).toBe(0);
  });

  it('returns empty map for empty columns', () => {
    expect(groupColumnsByTable([]).size).toBe(0);
  });
});

describe('isCellEditable', () => {
  const columns: MappedRawColumn[] = [
    col({ originalName: 'id', isPrimaryKey: true }),
    col({ originalName: 'email' }),
    col({ originalName: 'name' }),
  ];
  const tableGroups = groupColumnsByTable(columns);
  const row = { id: 1, email: 'a@b.com', name: 'Alice' };

  it('returns true for a non-PK column with all PKs present in row', () => {
    expect(
      isCellEditable({
        column: col({ originalName: 'email' }),
        row,
        tableGroups,
      })
    ).toBe(true);
  });

  it('returns false for a primary-key column', () => {
    expect(
      isCellEditable({
        column: col({ originalName: 'id', isPrimaryKey: true }),
        row,
        tableGroups,
      })
    ).toBe(false);
  });

  it('returns false when PK value is null', () => {
    expect(
      isCellEditable({
        column: col({ originalName: 'email' }),
        row: { id: null, email: 'a@b.com', name: 'Alice' },
        tableGroups,
      })
    ).toBe(false);
  });

  it('returns false when PK value is undefined', () => {
    expect(
      isCellEditable({
        column: col({ originalName: 'email' }),
        row: { email: 'a@b.com', name: 'Alice' },
        tableGroups,
      })
    ).toBe(false);
  });

  it('returns false when row is null or undefined', () => {
    expect(
      isCellEditable({
        column: col({ originalName: 'email' }),
        row: null,
        tableGroups,
      })
    ).toBe(false);

    expect(
      isCellEditable({
        column: col({ originalName: 'email' }),
        row: undefined,
        tableGroups,
      })
    ).toBe(false);
  });

  it('returns false when column has no tableName', () => {
    expect(
      isCellEditable({
        column: col({ originalName: 'email', tableName: '' }),
        row,
        tableGroups,
      })
    ).toBe(false);
  });

  it('returns false when column has no schemaName', () => {
    expect(
      isCellEditable({
        column: col({ originalName: 'email', schemaName: undefined }),
        row,
        tableGroups,
      })
    ).toBe(false);
  });

  it('returns false when table has no PKs projected', () => {
    const noPkColumns: MappedRawColumn[] = [
      col({ originalName: 'email' }),
      col({ originalName: 'name' }),
    ];
    const noPkGroups = groupColumnsByTable(noPkColumns);

    expect(
      isCellEditable({
        column: col({ originalName: 'email' }),
        row: { email: 'a@b.com', name: 'Alice' },
        tableGroups: noPkGroups,
      })
    ).toBe(false);
  });
});

describe('isColumnPotentiallyEditable', () => {
  const columns: MappedRawColumn[] = [
    col({ originalName: 'id', isPrimaryKey: true }),
    col({ originalName: 'email' }),
  ];
  const tableGroups = groupColumnsByTable(columns);

  it('returns true for non-PK column in a table with PKs', () => {
    expect(
      isColumnPotentiallyEditable({
        column: col({ originalName: 'email' }),
        tableGroups,
      })
    ).toBe(true);
  });

  it('returns false for a PK column', () => {
    expect(
      isColumnPotentiallyEditable({
        column: col({ originalName: 'id', isPrimaryKey: true }),
        tableGroups,
      })
    ).toBe(false);
  });

  it('returns false when column has no tableName', () => {
    expect(
      isColumnPotentiallyEditable({
        column: col({ originalName: 'email', tableName: '' }),
        tableGroups,
      })
    ).toBe(false);
  });
});
