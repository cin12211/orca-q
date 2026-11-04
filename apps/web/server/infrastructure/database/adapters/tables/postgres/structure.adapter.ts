import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { TableSize, TableStructure } from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { resolveMetadataTypeAlias } from '../../metadata/type-alias.constants';

export class PostgresTableStructureAdapter {
  constructor(private readonly adapter: IDatabaseAdapter) {}

  async getTableStructure(
    schema: string,
    tableName: string
  ): Promise<TableStructure[]> {
    const query = `
      SELECT
        a.attname AS column_name,
        format_type(a.atttypid, a.atttypmod) AS raw_type_name,
        NOT a.attnotnull AS is_nullable,
        PG_GET_EXPR(d.adbin, d.adrelid) AS default_value,
        COALESCE(fk_info.fk_text, '') AS foreign_keys,
        fk_info.on_update,
        fk_info.on_delete,
        COALESCE(COL_DESCRIPTION(a.attrelid, a.attnum), '') AS column_comment
      FROM
        pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_type t ON a.atttypid = t.oid
        LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid
        AND a.attnum = d.adnum
        LEFT JOIN LATERAL (
          SELECT
            STRING_AGG(
              '→ ' || confrel.relname || '.' || af.attname ,
              '\n'
            ) AS fk_text,
            MAX(
              CASE rc.confdeltype
                WHEN 'a' THEN 'NO ACTION'
                WHEN 'r' THEN 'RESTRICT'
                WHEN 'c' THEN 'CASCADE'
                WHEN 'n' THEN 'SET NULL'
                WHEN 'd' THEN 'SET DEFAULT'
              END
            ) AS on_delete,
            MAX(
              CASE rc.confupdtype
                WHEN 'a' THEN 'NO ACTION'
                WHEN 'r' THEN 'RESTRICT'
                WHEN 'c' THEN 'CASCADE'
                WHEN 'n' THEN 'SET NULL'
                WHEN 'd' THEN 'SET DEFAULT'
              END
            ) AS on_update
          FROM
            pg_constraint rc
            JOIN pg_class confrel ON rc.confrelid = confrel.oid
            JOIN pg_attribute af ON af.attrelid = rc.confrelid
            AND af.attnum = rc.confkey[1]
          WHERE
            rc.conrelid = a.attrelid
            AND rc.contype = 'f'
            AND a.attnum = ANY (rc.conkey)
        ) fk_info ON TRUE
      WHERE
        c.relname = ?
        AND n.nspname = ?
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY
        a.attnum
    `;

    const rows = await this.adapter.rawQuery<
      Omit<TableStructure, 'data_type'> & { raw_type_name: string }
    >(query, [tableName, schema]);

    return rows.map(row => {
      const shortType = resolveMetadataTypeAlias(
        DatabaseClientType.POSTGRES,
        row.raw_type_name
      );

      return {
        ...row,
        short_type_name: shortType,
        data_type: shortType,
      };
    });
  }

  async getTableSize(schema: string, tableName: string): Promise<TableSize> {
    const query = `
      SELECT
        pg_size_pretty(pg_total_relation_size(c.oid)) AS table_size,
        pg_size_pretty(pg_table_size(c.oid)) AS data_size,
        pg_size_pretty(pg_indexes_size(c.oid)) AS index_size
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_description d ON d.objoid = c.oid AND d.classoid = 'pg_class'::regclass
      WHERE n.nspname = ? AND c.relname = ?
      LIMIT 1;
    `;
    const [result] = await this.adapter.rawQuery(query, [schema, tableName]);
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }
    return {
      tableSize: result.table_size,
      dataSize: result.data_size,
      indexSize: result.index_size,
    };
  }

  async getTableDdl(schema: string, tableName: string): Promise<string> {
    const ddlQuery = `
      WITH table_info AS (
        SELECT
          c.oid AS table_oid,
          c.relname AS table_name,
          n.nspname AS schema_name,
          pg_get_userbyid(c.relowner) AS table_owner
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = ?
          AND c.relname = ?
          AND c.relkind = 'r'
      ),
      columns AS (
        SELECT
          a.attname AS column_name,
          a.attnum AS ordinal_position,
          CASE
            WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character varying%'
              THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character varying', 'varchar')
            WHEN format_type(a.atttypid, a.atttypmod) LIKE 'character%'
              THEN REPLACE(format_type(a.atttypid, a.atttypmod), 'character', 'char')
            WHEN format_type(a.atttypid, a.atttypmod) = 'double precision' THEN 'float8'
            WHEN format_type(a.atttypid, a.atttypmod) = 'integer' THEN 'int4'
            WHEN format_type(a.atttypid, a.atttypmod) = 'smallint' THEN 'int2'
            WHEN format_type(a.atttypid, a.atttypmod) = 'bigint' THEN 'int8'
            WHEN format_type(a.atttypid, a.atttypmod) = 'boolean' THEN 'bool'
            WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp without time zone' THEN 'timestamp'
            WHEN format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone' THEN 'timestamptz'
            ELSE format_type(a.atttypid, a.atttypmod)
          END AS data_type,
          CASE WHEN a.attnotnull THEN 'NOT NULL' ELSE 'NULL' END AS nullable,
          pg_get_expr(d.adbin, d.adrelid) AS default_value
        FROM pg_attribute a
        JOIN table_info ti ON a.attrelid = ti.table_oid
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY a.attnum
      ),
      constraints AS (
        SELECT
          con.conname AS constraint_name,
          con.contype AS constraint_type,
          pg_get_constraintdef(con.oid) AS constraint_def
        FROM pg_constraint con
        JOIN table_info ti ON con.conrelid = ti.table_oid
        WHERE con.contype IN ('p', 'u', 'c')
      ),
      indexes AS (
        SELECT
          i.relname AS index_name,
          pg_get_indexdef(i.oid) AS index_def
        FROM pg_index ix
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN table_info ti ON ix.indrelid = ti.table_oid
        WHERE NOT ix.indisprimary
          AND NOT ix.indisunique
      ),
      foreign_keys AS (
        SELECT
          con.conname AS fk_name,
          'ALTER TABLE "' || ti.schema_name || '"."' || ti.table_name || '" ADD CONSTRAINT ' || con.conname || ' FOREIGN KEY (' ||
            string_agg(att.attname, ', ' ORDER BY u.seq) ||
            ') REFERENCES ' || nf.nspname || '.' || cf.relname || '(' ||
            string_agg(af.attname, ', ' ORDER BY u.seq) || ')' AS fk_def
        FROM pg_constraint con
        JOIN table_info ti ON con.conrelid = ti.table_oid
        CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS u(conkey, confkey, seq)
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.conkey
        JOIN pg_class cf ON cf.oid = con.confrelid
        JOIN pg_namespace nf ON nf.oid = cf.relnamespace
        JOIN pg_attribute af ON af.attrelid = con.confrelid AND af.attnum = u.confkey
        WHERE con.contype = 'f'
        GROUP BY con.conname, nf.nspname, cf.relname, ti.schema_name, ti.table_name
      ),
      grants AS (
        SELECT
          'GRANT ' || privilege_type || ' ON TABLE "' || table_schema || '"."' || table_name || '" TO ' || grantee || ';' AS grant_def
        FROM information_schema.table_privileges
        WHERE table_schema = ?
          AND table_name = ?
      )
      SELECT
        json_build_object(
          'schema_name', (SELECT schema_name FROM table_info),
          'table_name', (SELECT table_name FROM table_info),
          'table_owner', (SELECT table_owner FROM table_info),
          'columns', (SELECT json_agg(row_to_json(columns.*) ORDER BY ordinal_position) FROM columns),
          'constraints', (SELECT json_agg(row_to_json(constraints.*)) FROM constraints),
          'indexes', (SELECT json_agg(row_to_json(indexes.*)) FROM indexes),
          'foreign_keys', (SELECT json_agg(fk_def) FROM foreign_keys),
          'grants', (SELECT json_agg(grant_def) FROM grants)
        ) AS ddl_data
    `;

    const result = await this.adapter.rawQuery(ddlQuery, [
      schema,
      tableName,
      schema,
      tableName,
    ]);

    if (
      !result ||
      result.length === 0 ||
      !result[0].ddl_data ||
      !result[0].ddl_data.schema_name
    ) {
      throw createError({
        statusCode: 404,
        message: `Table ${schema}.${tableName} not found`,
      });
    }

    const ddlData = result[0].ddl_data;
    const lines: string[] = [];
    lines.push(`-- ${schema}.${tableName} definition`);
    lines.push('');
    lines.push('-- Drop table');
    lines.push('');
    lines.push(`-- DROP TABLE ${schema}.${tableName};`);
    lines.push('');
    lines.push(`CREATE TABLE ${schema}.${tableName} (`);

    const columns = ddlData.columns || [];
    const constraints = ddlData.constraints || [];

    const columnDefs = columns.map(
      (col: {
        column_name: string;
        data_type: string;
        default_value: string | null;
        nullable: string;
      }) => {
        const parts = ['\t' + col.column_name, col.data_type];
        if (col.default_value) parts.push('DEFAULT ' + col.default_value);
        parts.push(col.nullable);
        return parts.join(' ');
      }
    );

    const constraintDefs = constraints.map(
      (con: { constraint_name: string; constraint_def: string }) =>
        '\tCONSTRAINT "' + con.constraint_name + '" ' + con.constraint_def
    );

    lines.push([...columnDefs, ...constraintDefs].join(',\n'));
    lines.push(');');

    const indexes = ddlData.indexes || [];
    indexes.forEach((idx: { index_def: string }) => {
      lines.push(idx.index_def + ';');
    });

    const tableOwner = ddlData.table_owner;
    if (tableOwner) {
      lines.push('');
      lines.push('-- Permissions');
      lines.push('');
      lines.push(`ALTER TABLE ${schema}.${tableName} OWNER TO ${tableOwner};`);
      const grants = ddlData.grants || [];
      grants.forEach((grant: string) => {
        lines.push(grant);
      });
    }

    const foreignKeys = ddlData.foreign_keys || [];
    if (foreignKeys.length > 0) {
      lines.push('');
      lines.push('');
      lines.push(`-- ${schema}.${tableName} foreign keys`);
      lines.push('');
      foreignKeys.forEach((fk: string) => {
        lines.push(fk + ';');
      });
    }

    return lines.join('\n');
  }
}
