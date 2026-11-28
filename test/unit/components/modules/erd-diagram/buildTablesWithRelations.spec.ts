import { describe, expect, it } from 'vitest';
import {
  buildTablesWithRelations,
  getDirectRelatedTables,
} from '~/components/modules/erd-diagram/hooks/useExpandableErd';
import { buildTableNodeId } from '~/components/modules/erd-diagram/utils';
import type { TableMetadata } from '~/core/types';

const table = (name: string, refs: string[] = []): TableMetadata =>
  ({
    id: `public.${name}`,
    schema: 'public',
    table: name,
    rows: 0,
    type: 'table',
    comment: null,
    columns: [],
    primary_keys: [{ column: 'id' }],
    foreign_keys: refs.map(ref => ({
      foreign_key_name: `fk_${name}_${ref}`,
      column: `${ref}_id`,
      reference_schema: 'public',
      reference_table: ref,
      reference_column: 'id',
    })),
  }) as unknown as TableMetadata;

const idOf = (t: TableMetadata) =>
  buildTableNodeId({ schemaName: t.schema, tableName: t.table });

describe('buildTablesWithRelations', () => {
  const tables = [
    table('users'),
    table('orders', ['users']),
    table('order_items', ['orders', 'products']),
    table('products'),
    table('audit_log'),
    table('tree', ['tree']), // self reference only
    table('orphan', ['missing_table']), // references a table not in the list
  ];

  it('matches getDirectRelatedTables for every table', () => {
    const related = buildTablesWithRelations(tables);

    for (const t of tables) {
      const { leftTables, rightTables } = getDirectRelatedTables(
        idOf(t),
        tables
      );
      expect(related.has(idOf(t))).toBe(
        leftTables.length > 0 || rightTables.length > 0
      );
    }
  });

  it('ignores self references and references to missing tables', () => {
    const related = buildTablesWithRelations(tables);

    expect(related.has(idOf(table('tree')))).toBe(false);
    expect(related.has(idOf(table('orphan')))).toBe(false);
    expect(related.has(idOf(table('audit_log')))).toBe(false);
    expect(related.has(idOf(table('products')))).toBe(true);
  });
});
