import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getSqlDialect } from '~/core/sql-dialect';
import type {
  TableMeta,
  TableOverviewMetadata,
  TableRule,
  TableSize,
  TableStructure,
  TableTrigger,
} from '~/core/types';
import { resolveMetadataTypeAlias } from '../../metadata/type-alias.constants';
import { PostgresTableExportAdapter } from '../postgres/export.adapter';
import { PostgresTableAdapter } from '../postgres/postgres-table.adapter';
import type { DatabaseTableAdapterParams } from '../types';

// CockroachDB has no relation-size functions (pg_size_pretty,
// pg_total_relation_size, …); sizes are reported as unavailable.
const SIZE_UNAVAILABLE = 'N/A';

// Hidden columns (implicit `rowid`, hash-shard columns) are not part of
// `SELECT *` and must not be listed as table columns.
const VISIBLE_COLUMN_FILTER = `is_hidden = 'NO'`;

// `format_type()` reports `text(N+4)` for `STRING(N)` columns; drop the bogus
// modifier for text (oid 25).
const COLUMN_TYPE_SQL = `format_type(a.atttypid, CASE WHEN a.atttypid = 25 THEN NULL ELSE a.atttypmod END)`;

interface StructureRow {
  column_name: string;
  raw_type_name: string;
  is_nullable: TableStructure['is_nullable'];
  default_value: string | null;
  foreign_keys: string;
  on_update?: string;
  on_delete?: string;
  column_comment: string;
}

export class CockroachTableAdapter extends PostgresTableAdapter {
  override readonly dbType: DatabaseClientType = DatabaseClientType.COCKROACHDB;

  static override async create(
    params: DatabaseTableAdapterParams
  ): Promise<CockroachTableAdapter> {
    const adapter = await CockroachTableAdapter.resolveAdapter(
      params,
      DatabaseClientType.COCKROACHDB
    );
    return new CockroachTableAdapter(adapter);
  }

  override async getOverviewTables(
    schema: string
  ): Promise<TableOverviewMetadata[]> {
    const query = `
      SELECT
        c.relname AS name,
        n.nspname AS schema,
        'TABLE' AS kind,
        pg_get_userbyid(c.relowner) AS owner,
        s.estimated_row_count AS estimated_row,
        NULL AS total_size,
        NULL AS data_size,
        NULL AS index_size,
        d.description AS comment
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      LEFT JOIN crdb_internal.table_row_statistics s ON s.table_id = c.oid::INT8
      LEFT JOIN pg_description d
        ON d.objoid = c.oid
        AND d.objsubid = 0
        AND d.classoid = 'pg_catalog.pg_class'::REGCLASS
      WHERE n.nspname = ?
        AND c.relkind = 'r'
      ORDER BY c.relname;
    `;

    const rows = await this.adapter.rawQuery<TableOverviewMetadata>(query, [
      schema,
    ]);

    return rows.map(row => ({
      ...row,
      estimated_row:
        row.estimated_row != null ? Number(row.estimated_row) : null,
    }));
  }

  override async getTableMeta(
    schema: string,
    tableName: string
  ): Promise<TableMeta> {
    const query = `
      SELECT
        pg_get_userbyid(c.relowner) AS owner,
        s.estimated_row_count AS row_estimate
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      LEFT JOIN crdb_internal.table_row_statistics s ON s.table_id = c.oid::INT8
      WHERE n.nspname = ?
        AND c.relname = ?
        AND c.relkind = 'r'
      LIMIT 1;
    `;

    const [row] = await this.adapter.rawQuery<{
      owner: string;
      row_estimate: string | number | null;
    }>(query, [schema, tableName]);

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Table not found',
      });
    }

    const rowEstimate =
      row.row_estimate != null ? Number(row.row_estimate) : undefined;

    return {
      type: 'table',
      owner: row.owner,
      rowEstimate:
        rowEstimate != null && rowEstimate >= 0 ? rowEstimate : undefined,
      totalSize: SIZE_UNAVAILABLE,
      tableSize: SIZE_UNAVAILABLE,
      indexSize: SIZE_UNAVAILABLE,
    };
  }

  override async getTableStructure(
    schema: string,
    tableName: string
  ): Promise<TableStructure[]> {
    const query = `
      SELECT
        a.attname AS column_name,
        ${COLUMN_TYPE_SQL} AS raw_type_name,
        NOT a.attnotnull AS is_nullable,
        pg_get_expr(d.adbin, d.adrelid) AS default_value,
        COALESCE(fk_info.fk_text, '') AS foreign_keys,
        fk_info.on_update,
        fk_info.on_delete,
        COALESCE(col_description(a.attrelid, a.attnum), '') AS column_comment
      FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN information_schema.columns ic
        ON ic.table_schema = n.nspname
        AND ic.table_name = c.relname
        AND ic.column_name = a.attname
      LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
      LEFT JOIN LATERAL (
        SELECT
          string_agg('→ ' || confrel.relname || '.' || af.attname, e'\\n') AS fk_text,
          max(
            CASE rc.confdeltype
              WHEN 'a' THEN 'NO ACTION'
              WHEN 'r' THEN 'RESTRICT'
              WHEN 'c' THEN 'CASCADE'
              WHEN 'n' THEN 'SET NULL'
              WHEN 'd' THEN 'SET DEFAULT'
            END
          ) AS on_delete,
          max(
            CASE rc.confupdtype
              WHEN 'a' THEN 'NO ACTION'
              WHEN 'r' THEN 'RESTRICT'
              WHEN 'c' THEN 'CASCADE'
              WHEN 'n' THEN 'SET NULL'
              WHEN 'd' THEN 'SET DEFAULT'
            END
          ) AS on_update
        FROM pg_constraint rc
        JOIN pg_class confrel ON rc.confrelid = confrel.oid
        JOIN pg_attribute af ON af.attrelid = rc.confrelid
          AND af.attnum = rc.confkey[1]
        WHERE rc.conrelid = a.attrelid
          AND rc.contype = 'f'
          AND a.attnum = ANY (rc.conkey)
      ) fk_info ON TRUE
      WHERE c.relname = ?
        AND n.nspname = ?
        AND a.attnum > 0
        AND NOT a.attisdropped
        AND ic.${VISIBLE_COLUMN_FILTER}
      ORDER BY a.attnum
    `;

    const rows = await this.adapter.rawQuery<StructureRow>(query, [
      tableName,
      schema,
    ]);

    return rows.map(row => {
      const shortType = resolveMetadataTypeAlias(
        DatabaseClientType.COCKROACHDB,
        row.raw_type_name
      );

      return {
        ...row,
        short_type_name: shortType,
        data_type: shortType,
      };
    });
  }

  override async getTableSize(
    _schema: string,
    _tableName: string
  ): Promise<TableSize> {
    return {
      tableSize: SIZE_UNAVAILABLE,
      dataSize: SIZE_UNAVAILABLE,
      indexSize: SIZE_UNAVAILABLE,
    };
  }

  override async getTableDdl(
    schema: string,
    tableName: string
  ): Promise<string> {
    const qualifiedName = getSqlDialect(this.dbType).qualifyTableName(
      tableName,
      schema
    );
    const [row] = await this.adapter.rawQuery<{ create_statement: string }>(
      `SHOW CREATE TABLE ${qualifiedName}`
    );

    if (!row?.create_statement) {
      throw createError({
        statusCode: 404,
        message: `Table ${schema}.${tableName} not found`,
      });
    }

    return `-- ${schema}.${tableName} definition\n\n${row.create_statement};`;
  }

  // CockroachDB has no CREATE RULE.
  override async getTableRules(
    _schema: string,
    _tableName: string
  ): Promise<TableRule[]> {
    return [];
  }

  // pg_get_triggerdef() is not available; triggers are not listed for now.
  override async getTableTriggers(
    _schema: string,
    _tableName: string
  ): Promise<TableTrigger[]> {
    return [];
  }

  override async exportTableData(
    schema: string,
    tableName: string,
    format: string
  ): Promise<unknown> {
    const exportAdapter = new PostgresTableExportAdapter(this.adapter, {
      columnFilter: VISIBLE_COLUMN_FILTER,
    });

    return exportAdapter.exportTableData(schema, tableName, format);
  }
}
