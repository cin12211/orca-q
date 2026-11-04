import { describe, expect, it } from 'vitest';
import { formatColumnsInfo } from '~/components/modules/raw-query/utils/formatColumnsInfo';
import type { Schema } from '~/core/types';

const schema: Schema = {
  id: 'workspace-connection-public',
  workspaceId: 'workspace',
  connectionId: 'connection',
  name: 'public',
  tables: ['users', 'posts'],
  views: [],
  functions: [],
  tableDetails: {
    users: {
      table_id: '10',
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
          name: 'email',
          ordinal_position: 2,
          type: 'text',
          short_type_name: 'text',
          is_nullable: false,
          default_value: null,
        },
      ],
      primary_keys: [{ column: 'id' }],
      foreign_keys: [],
    },
    posts: {
      table_id: '20',
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
          name: 'author_id',
          ordinal_position: 2,
          type: 'integer',
          short_type_name: 'int4',
          is_nullable: true,
          default_value: null,
        },
      ],
      primary_keys: [],
      foreign_keys: [
        {
          column: 'author_id',
          referenced_column: 'id',
          referenced_table: 'users',
          referenced_table_schema: 'public',
        },
      ],
    },
  },
};

const getTableInfoById = (tableId: string, sourceSchema: Schema) => {
  for (const [tableName, tableInfo] of Object.entries(
    sourceSchema.tableDetails || {}
  )) {
    if (tableInfo.table_id === tableId) {
      return { tableName, tableInfo };
    }
  }
};

describe('formatColumnsInfo', () => {
  it('maps PostgreSQL field table IDs to table and primary key metadata', () => {
    const columns = formatColumnsInfo({
      fieldDefs: [
        {
          name: 'id',
          tableID: 10,
          columnID: 1,
          dataTypeID: 23,
          dataTypeSize: 4,
          dataTypeModifier: -1,
          format: 'text',
        },
      ] as any,
      schemas: [schema],
      getTableInfoById,
    });

    expect(columns[0]).toMatchObject({
      tableName: 'users',
      schemaName: 'public',
      originalName: 'id',
      sourceColumnName: 'id',
      isPrimaryKey: true,
      isForeignKey: false,
    });
  });

  it('maps named field metadata to source foreign key columns', () => {
    const columns = formatColumnsInfo({
      fieldDefs: [
        {
          name: 'author',
          tableID: 0,
          columnID: 0,
          dataTypeID: 3,
          dataTypeSize: 11,
          dataTypeModifier: 0,
          format: 'text',
          schemaName: 'public',
          tableName: 'posts',
          sourceColumnName: 'author_id',
        },
      ] as any,
      schemas: [schema],
      getTableInfoById,
    });

    expect(columns[0]).toMatchObject({
      tableName: 'posts',
      schemaName: 'public',
      originalName: 'author',
      sourceColumnName: 'author_id',
      isPrimaryKey: false,
      isForeignKey: true,
      foreignKey: {
        referenced_table: 'users',
        referenced_column: 'id',
      },
    });
  });

  it('infers relation metadata from the executed statement when driver fields are synthetic', () => {
    const columns = formatColumnsInfo({
      fieldDefs: [
        {
          name: 'author',
          tableID: 0,
          columnID: 0,
          dataTypeID: 3,
          dataTypeSize: 11,
          dataTypeModifier: 0,
          format: 'text',
        },
      ] as any,
      statementQuery: 'SELECT p.author_id AS author FROM posts p',
      schemas: [schema],
      getTableInfoById,
    });

    expect(columns[0]).toMatchObject({
      tableName: 'posts',
      schemaName: 'public',
      originalName: 'author',
      sourceColumnName: 'author_id',
      isPrimaryKey: false,
      isForeignKey: true,
      foreignKey: {
        referenced_table: 'users',
        referenced_column: 'id',
      },
    });
  });
});
