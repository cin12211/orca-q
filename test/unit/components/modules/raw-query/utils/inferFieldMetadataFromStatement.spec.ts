import { describe, expect, it } from 'vitest';
import { inferFieldMetadataFromStatement } from '~/components/modules/raw-query/utils/inferFieldMetadataFromStatement';
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
          is_nullable: false,
          default_value: null,
        },
        {
          name: 'title',
          ordinal_position: 3,
          type: 'text',
          short_type_name: 'text',
          is_nullable: false,
          default_value: null,
        },
      ],
      primary_keys: [{ column: 'id' }],
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

describe('inferFieldMetadataFromStatement', () => {
  it('infers aliased source columns when field names alone are not enough', () => {
    const fields = inferFieldMetadataFromStatement({
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
    });

    expect(fields[0]).toMatchObject({
      tableName: 'posts',
      schemaName: 'public',
      sourceColumnName: 'author_id',
    });
  });

  it('preserves duplicate column names by aligning inferred metadata by select order', () => {
    const fields = inferFieldMetadataFromStatement({
      fieldDefs: [
        {
          name: 'id',
          tableID: 0,
          columnID: 0,
          dataTypeID: 23,
          dataTypeSize: 4,
          dataTypeModifier: 0,
          format: 'text',
        },
        {
          name: 'id',
          tableID: 0,
          columnID: 1,
          dataTypeID: 23,
          dataTypeSize: 4,
          dataTypeModifier: 0,
          format: 'text',
        },
      ] as any,
      statementQuery:
        'SELECT u.id, p.id FROM users u JOIN posts p ON p.author_id = u.id',
      schemas: [schema],
    });

    expect(fields).toMatchObject([
      {
        tableName: 'users',
        schemaName: 'public',
        sourceColumnName: 'id',
      },
      {
        tableName: 'posts',
        schemaName: 'public',
        sourceColumnName: 'id',
      },
    ]);
  });

  it('expands table wildcards using schema metadata', () => {
    const fields = inferFieldMetadataFromStatement({
      fieldDefs: [
        {
          name: 'id',
          tableID: 0,
          columnID: 0,
          dataTypeID: 23,
          dataTypeSize: 4,
          dataTypeModifier: 0,
          format: 'text',
        },
        {
          name: 'author_id',
          tableID: 0,
          columnID: 1,
          dataTypeID: 23,
          dataTypeSize: 4,
          dataTypeModifier: 0,
          format: 'text',
        },
        {
          name: 'title',
          tableID: 0,
          columnID: 2,
          dataTypeID: 25,
          dataTypeSize: 0,
          dataTypeModifier: 0,
          format: 'text',
        },
      ] as any,
      statementQuery: 'SELECT p.* FROM posts p',
      schemas: [schema],
    });

    expect(fields).toMatchObject([
      {
        tableName: 'posts',
        schemaName: 'public',
        sourceColumnName: 'id',
      },
      {
        tableName: 'posts',
        schemaName: 'public',
        sourceColumnName: 'author_id',
      },
      {
        tableName: 'posts',
        schemaName: 'public',
        sourceColumnName: 'title',
      },
    ]);
  });

  it('keeps unresolved computed expressions untouched', () => {
    const fields = inferFieldMetadataFromStatement({
      fieldDefs: [
        {
          name: 'total',
          tableID: 0,
          columnID: 0,
          dataTypeID: 20,
          dataTypeSize: 8,
          dataTypeModifier: 0,
          format: 'text',
        },
      ] as any,
      statementQuery: 'SELECT COUNT(*) AS total FROM posts p',
      schemas: [schema],
    });

    expect(fields[0]).toMatchObject({
      name: 'total',
      tableName: undefined,
      schemaName: undefined,
      sourceColumnName: undefined,
    });
  });

  it('supports uppercase output names from drivers like Oracle by using select order', () => {
    const fields = inferFieldMetadataFromStatement({
      fieldDefs: [
        {
          name: 'AUTHOR_ID',
          tableID: 0,
          columnID: 0,
          dataTypeID: 2,
          dataTypeSize: 22,
          dataTypeModifier: 0,
          format: 'text',
        },
      ] as any,
      statementQuery: 'SELECT p.author_id FROM public.posts p',
      schemas: [schema],
    });

    expect(fields[0]).toMatchObject({
      tableName: 'posts',
      schemaName: 'public',
      sourceColumnName: 'author_id',
    });
  });
});
