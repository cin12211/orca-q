import type { TableOverviewMetadata } from '~/core/types';
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
}
