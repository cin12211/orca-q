import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  RLSPolicy,
  RLSStatus,
  TableMeta,
  TableOverviewMetadata,
  TableRule,
  TableSize,
  TableTrigger,
} from '~/core/types';
import { PostgresTableAdapter } from '../postgres/postgres-table.adapter';
import type { DatabaseTableAdapterParams } from '../types';

export class RedshiftTableAdapter extends PostgresTableAdapter {
  override readonly dbType = DatabaseClientType.REDSHIFT;

  static override async create(
    params: DatabaseTableAdapterParams
  ): Promise<RedshiftTableAdapter> {
    const adapter = await RedshiftTableAdapter.resolveAdapter(
      params,
      DatabaseClientType.REDSHIFT
    );
    return new RedshiftTableAdapter(adapter);
  }

  // Redshift has no pg_size_pretty()/pg_total_relation_size()/
  // pg_relation_size()/pg_indexes_size() — the inherited Postgres query uses
  // them purely for decorative size fields.
  override async getOverviewTables(
    schema: string
  ): Promise<TableOverviewMetadata[]> {
    const query = `
        SELECT
            c.relname AS name,
            n.nspname AS schema,
            CASE
                WHEN c.relkind = 'r' THEN 'TABLE'
                ELSE c.relkind
            END AS kind,
            pg_get_userbyid(c.relowner) AS owner,
            s.n_live_tup AS estimated_row,
            '0 bytes' AS total_size,
            '0 bytes' AS data_size,
            '0 bytes' AS index_size,
            d.description AS comment
        FROM
            pg_class c
        JOIN
            pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN
            pg_stat_all_tables s ON c.oid = s.relid
        LEFT JOIN
            pg_description d ON c.oid = d.objoid
        WHERE
            n.nspname = ?
            AND c.relkind = 'r'
        ORDER BY
            c.relname;
    `;
    return this.adapter.rawQuery(query, [schema]);
  }

  override async getTableMeta(
    schema: string,
    tableName: string
  ): Promise<TableMeta> {
    const query = `
      SELECT
        CASE c.relkind
          WHEN 'r' THEN 'table'
          WHEN 'p' THEN 'partitioned'
          WHEN 'f' THEN 'foreign'
          ELSE c.relkind::text
        END AS table_type,
        pg_get_userbyid(c.relowner) AS owner,
        COALESCE(s.n_live_tup::bigint, c.reltuples::bigint) AS row_estimate,
        '0 bytes' AS total_size,
        '0 bytes' AS table_size,
        '0 bytes' AS index_size
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      LEFT JOIN pg_stat_all_tables s ON s.relid = c.oid
      WHERE n.nspname = ?
        AND c.relname = ?
        AND c.relkind IN ('r', 'p', 'f')
      LIMIT 1;
    `;

    const [row] = await this.adapter.rawQuery(query, [schema, tableName]);

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Table not found',
      });
    }

    const rawRowEstimate =
      row.row_estimate != null ? Number(row.row_estimate) : undefined;
    const rowEstimate =
      rawRowEstimate != null && rawRowEstimate >= 0
        ? rawRowEstimate
        : undefined;

    return {
      type: row.table_type as string,
      owner: row.owner as string,
      rowEstimate,
      totalSize: row.total_size as string,
      tableSize: row.table_size as string,
      indexSize: row.index_size as string,
    };
  }

  // Redshift has no pg_size_pretty()/pg_total_relation_size()/
  // pg_table_size()/pg_indexes_size().
  override async getTableSize(
    schema: string,
    tableName: string
  ): Promise<TableSize> {
    const query = `
      SELECT c.oid
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = ? AND c.relname = ?
      LIMIT 1;
    `;
    const [result] = await this.adapter.rawQuery(query, [schema, tableName]);
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }
    return {
      tableSize: '0 bytes',
      dataSize: '0 bytes',
      indexSize: '0 bytes',
    };
  }

  override async getTableRlsStatus(
    schema: string,
    tableName: string
  ): Promise<RLSStatus> {
    return { enabled: false };
  }

  override async getTableRlsPolicies(
    schema: string,
    tableName: string
  ): Promise<RLSPolicy[]> {
    return [];
  }

  override async getTableRules(
    schema: string,
    tableName: string
  ): Promise<TableRule[]> {
    return [];
  }

  override async getTableTriggers(
    schema: string,
    tableName: string
  ): Promise<TableTrigger[]> {
    return [];
  }
}
