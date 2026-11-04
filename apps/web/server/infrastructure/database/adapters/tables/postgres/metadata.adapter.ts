import { createError } from 'h3';
import type { TableMeta, TableOverviewMetadata } from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

export class PostgresTableMetadataAdapter {
  constructor(private readonly adapter: IDatabaseAdapter) {}

  async getOverviewTables(schema: string): Promise<TableOverviewMetadata[]> {
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
            pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
            pg_size_pretty(pg_relation_size(c.oid)) AS data_size,
            pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
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

  async getTableMeta(schema: string, tableName: string): Promise<TableMeta> {
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
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
        pg_size_pretty(pg_indexes_size(c.oid)) AS index_size
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
}
