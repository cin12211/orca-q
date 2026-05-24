import { describe, expect, it, vi } from 'vitest';
import { buildRawQueryUpdates } from '~/components/modules/raw-query/utils/buildRawQueryUpdates';
import type { RawQueryEditedCell } from '~/components/modules/raw-query/utils/buildRawQueryUpdates';
import type { MappedRawColumn } from '~/core/types/mapped-column.types';

vi.mock('~/core/sql-dialect', () => ({
  getSqlDialect: () => ({
    toLiteral: (v: unknown) => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'string') return `'${v}'`;
      return String(v);
    },
    quoteIdentifier: (v: string) => `"${v}"`,
    qualifyTableName: (schema: string, table: string) =>
      `"${schema}"."${table}"`,
  }),
}));

const col = (overrides: Partial<MappedRawColumn> = {}): MappedRawColumn => ({
  isPrimaryKey: false,
  isForeignKey: false,
  queryFieldName: 'col',
  originalName: 'col',
  aliasFieldName: 'col',
  tableName: 'users',
  schemaName: 'public',
  ...overrides,
});

const columns: MappedRawColumn[] = [
  col({ originalName: 'id', isPrimaryKey: true }),
  col({ originalName: 'email' }),
  col({ originalName: 'name' }),
];

const rows: Record<string, unknown>[] = [
  { id: 1, email: 'alice@test.com', name: 'Alice' },
  { id: 2, email: 'bob@test.com', name: 'Bob' },
];

describe('buildRawQueryUpdates', () => {
  it('groups edits into a single table group with correct structure', () => {
    const edits: RawQueryEditedCell[] = [
      { rowId: 0, fieldId: 'email', newValue: 'new@test.com' },
    ];

    const result = buildRawQueryUpdates({
      editedCells: edits,
      columns,
      rows,
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].tableName).toBe('users');
    expect(result.groups[0].schemaName).toBe('public');
    expect(result.groups[0].pKeys).toEqual(['id']);
    expect(result.groups[0].updates).toHaveLength(1);
    expect(result.groups[0].updates[0].update).toEqual({
      email: 'new@test.com',
    });
    expect(result.groups[0].updates[0].pKeyValue).toEqual({ id: 1 });
    expect(result.skipped).toHaveLength(0);
  });

  it('collapses multiple edits on same row into one update', () => {
    const edits: RawQueryEditedCell[] = [
      { rowId: 0, fieldId: 'email', newValue: 'new@test.com' },
      { rowId: 0, fieldId: 'name', newValue: 'NewAlice' },
    ];

    const result = buildRawQueryUpdates({
      editedCells: edits,
      columns,
      rows,
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].updates).toHaveLength(1);
    expect(result.groups[0].updates[0].update).toEqual({
      email: 'new@test.com',
      name: 'NewAlice',
    });
  });

  it('creates separate updates for different rows', () => {
    const edits: RawQueryEditedCell[] = [
      { rowId: 0, fieldId: 'email', newValue: 'new@test.com' },
      { rowId: 1, fieldId: 'email', newValue: 'changed@test.com' },
    ];

    const result = buildRawQueryUpdates({
      editedCells: edits,
      columns,
      rows,
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].updates).toHaveLength(2);
  });

  it('skips edits targeting PK columns', () => {
    const edits: RawQueryEditedCell[] = [
      { rowId: 0, fieldId: 'id', newValue: 999 },
    ];

    const result = buildRawQueryUpdates({
      editedCells: edits,
      columns,
      rows,
    });

    expect(result.groups).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it('skips edits when PK value is null', () => {
    const nullPkRows = [{ id: null, email: 'a@b.com', name: 'Alice' }];
    const edits: RawQueryEditedCell[] = [
      { rowId: 0, fieldId: 'email', newValue: 'new@b.com' },
    ];

    const result = buildRawQueryUpdates({
      editedCells: edits,
      columns,
      rows: nullPkRows,
    });

    expect(result.groups).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it('skips edits referencing unknown fieldId', () => {
    const edits: RawQueryEditedCell[] = [
      { rowId: 0, fieldId: 'nonexistent', newValue: 'x' },
    ];

    const result = buildRawQueryUpdates({
      editedCells: edits,
      columns,
      rows,
    });

    expect(result.groups).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it('skips edits referencing out-of-range rowId', () => {
    const edits: RawQueryEditedCell[] = [
      { rowId: 99, fieldId: 'email', newValue: 'x' },
    ];

    const result = buildRawQueryUpdates({
      editedCells: edits,
      columns,
      rows,
    });

    expect(result.groups).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it('groups edits across multiple tables from a JOIN result', () => {
    const joinColumns: MappedRawColumn[] = [
      col({ originalName: 'user_id', isPrimaryKey: true }),
      col({ originalName: 'email' }),
      col({
        originalName: 'post_id',
        isPrimaryKey: true,
        tableName: 'posts',
      }),
      col({ originalName: 'title', tableName: 'posts' }),
    ];

    const joinRows = [
      { user_id: 1, email: 'a@b.com', post_id: 10, title: 'Hello' },
    ];

    const edits: RawQueryEditedCell[] = [
      { rowId: 0, fieldId: 'email', newValue: 'new@b.com' },
      { rowId: 0, fieldId: 'title', newValue: 'Updated' },
    ];

    const result = buildRawQueryUpdates({
      editedCells: edits,
      columns: joinColumns,
      rows: joinRows,
    });

    expect(result.groups).toHaveLength(2);

    const userGroup = result.groups.find(g => g.tableName === 'users');
    const postGroup = result.groups.find(g => g.tableName === 'posts');

    expect(userGroup).toBeDefined();
    expect(userGroup!.updates[0].update).toEqual({ email: 'new@b.com' });

    expect(postGroup).toBeDefined();
    expect(postGroup!.updates[0].update).toEqual({ title: 'Updated' });
  });

  it('generates SQL preview strings for each group', () => {
    const edits: RawQueryEditedCell[] = [
      { rowId: 0, fieldId: 'email', newValue: 'new@test.com' },
    ];

    const result = buildRawQueryUpdates({
      editedCells: edits,
      columns,
      rows,
    });

    expect(result.groups[0].sqlStatements).toHaveLength(1);
    expect(result.groups[0].sqlStatements[0]).toContain('UPDATE');
  });

  it('returns empty groups and empty skipped for no edits', () => {
    const result = buildRawQueryUpdates({
      editedCells: [],
      columns,
      rows,
    });

    expect(result.groups).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('skips edits on columns without schemaName', () => {
    const noSchemaColumns: MappedRawColumn[] = [
      col({
        originalName: 'id',
        isPrimaryKey: true,
        schemaName: undefined,
      }),
      col({ originalName: 'email', schemaName: undefined }),
    ];

    const edits: RawQueryEditedCell[] = [
      { rowId: 0, fieldId: 'email', newValue: 'new@test.com' },
    ];

    const result = buildRawQueryUpdates({
      editedCells: edits,
      columns: noSchemaColumns,
      rows,
    });

    expect(result.groups).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });
});
