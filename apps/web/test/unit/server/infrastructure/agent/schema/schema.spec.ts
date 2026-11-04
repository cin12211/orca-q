import { describe, expect, it } from 'vitest';
import type { DbAgentSchemaSnapshot } from '~/components/modules/agent/types';
import {
  buildSchemaSummary,
  buildSchemaTableList,
  buildTableSchemaDetail,
} from '~/server/infrastructure/agent/schema/schema';

const mockSnapshot: DbAgentSchemaSnapshot = {
  id: 'test-schema-1',
  connectionId: 'conn-1',
  workspaceId: 'ws-1',
  name: 'public',
  tables: ['users', 'orders', 'products'],
  views: [
    {
      name: 'active_users',
      type: 'VIEW' as any,
      oid: '',
    },
  ],
  functions: [
    {
      name: 'get_user_count',
      type: 'FUNCTION' as any,
      parameters: 'none',
      oId: '',
    },
  ],
  tableDetails: {
    users: {
      table_id: 'users',

      columns: [
        {
          name: 'id',
          ordinal_position: 1,
          type: 'integer',
          short_type_name: 'int4',
          default_value: null,
          is_nullable: false,
        },
        {
          name: 'email',
          ordinal_position: 2,
          type: 'character varying',
          short_type_name: 'varchar',
          is_nullable: false,
          default_value: null,
        },
        {
          name: 'name',
          ordinal_position: 3,
          type: 'character varying',
          short_type_name: 'varchar',
          is_nullable: true,
          default_value: null,
        },
      ],
      primary_keys: [{ column: 'id' }],
      foreign_keys: [],
    },
    orders: {
      table_id: 'orders',
      columns: [
        {
          name: 'id',
          ordinal_position: 1,
          type: 'integer',
          short_type_name: 'int4',
          is_nullable: false,
          default_value: null,
        },
        {
          name: 'user_id',
          ordinal_position: 2,
          type: 'integer',
          short_type_name: 'int4',
          is_nullable: false,
          default_value: null,
        },
      ],
      primary_keys: [{ column: 'id' }],
      foreign_keys: [
        {
          column: 'user_id',
          referenced_table_schema: 'public',
          referenced_table: 'users',
          referenced_column: 'id',
        },
      ],
    },
    products: {
      table_id: 'products',
      columns: [
        {
          name: 'id',
          ordinal_position: 1,
          type: 'integer',
          short_type_name: 'int4',
          is_nullable: false,
          default_value: null,
        },
      ],
      primary_keys: [{ column: 'id' }],
      foreign_keys: [],
    },
  },
};

describe('buildSchemaSummary', () => {
  it('returns fallback when no snapshots provided', () => {
    const result = buildSchemaSummary(undefined);
    expect(result).toContain('No schema context');
    expect(result).toContain('list_schemas');
  });

  it('returns fallback for empty array', () => {
    const result = buildSchemaSummary([]);
    expect(result).toContain('No schema context');
  });

  it('returns summary with table/view/function counts', () => {
    const result = buildSchemaSummary([mockSnapshot]);
    expect(result).toContain('1 schema(s)');
    expect(result).toContain('"public"');
    expect(result).toContain('3 tables');
    expect(result).toContain('1 views');
    expect(result).toContain('1 functions');
    expect(result).toContain('list_schemas');
    expect(result).toContain('get_table_schema');
  });

  it('does not include column-level detail', () => {
    const result = buildSchemaSummary([mockSnapshot]);
    expect(result).not.toContain('varchar');
    expect(result).not.toContain('email');
    expect(result).not.toContain('user_id');
  });
});

describe('buildSchemaTableList', () => {
  it('returns empty array for no snapshots', () => {
    expect(buildSchemaTableList(undefined)).toEqual([]);
    expect(buildSchemaTableList([])).toEqual([]);
  });

  it('returns schema names with table/view/function names', () => {
    const result = buildSchemaTableList([mockSnapshot]);
    expect(result).toHaveLength(1);
    expect(result[0].schemaName).toBe('public');
    expect(result[0].tables).toEqual(['users', 'orders', 'products']);
    expect(result[0].views).toEqual(['active_users']);
    expect(result[0].functions).toEqual(['get_user_count']);
  });
});

describe('buildTableSchemaDetail', () => {
  it('throws for unknown schema', () => {
    expect(() =>
      buildTableSchemaDetail([mockSnapshot], 'unknown', 'users')
    ).toThrow('Schema "unknown" not found');
  });

  it('throws for unknown table', () => {
    expect(() =>
      buildTableSchemaDetail([mockSnapshot], 'public', 'nonexistent')
    ).toThrow();
  });

  it('returns detailed column info for a valid table', () => {
    const result = buildTableSchemaDetail([mockSnapshot], 'public', 'users');
    expect(result.schemaName).toBe('public');
    expect(result.tableName).toBe('users');
    expect(result.columns).toHaveLength(3);

    const idCol = result.columns.find(c => c.name === 'id');
    expect(idCol?.isPrimaryKey).toBe(true);
    expect(idCol?.type).toBe('int4');

    const emailCol = result.columns.find(c => c.name === 'email');
    expect(emailCol?.isPrimaryKey).toBe(false);
    expect(emailCol?.isForeignKey).toBe(false);
    expect(emailCol?.isNullable).toBe(false);
  });

  it('returns foreign key details', () => {
    const result = buildTableSchemaDetail([mockSnapshot], 'public', 'orders');
    expect(result.foreignKeys).toHaveLength(1);
    expect(result.foreignKeys[0].column).toBe('user_id');
    expect(result.foreignKeys[0].referencedTable).toBe('users');
    expect(result.foreignKeys[0].referencedColumn).toBe('id');
  });

  it('returns primary keys', () => {
    const result = buildTableSchemaDetail([mockSnapshot], 'public', 'users');
    expect(result.primaryKeys).toEqual(['id']);
  });

  it('handles case-insensitive schema lookup', () => {
    const result = buildTableSchemaDetail([mockSnapshot], 'PUBLIC', 'users');
    expect(result.schemaName).toBe('public');
  });
});
