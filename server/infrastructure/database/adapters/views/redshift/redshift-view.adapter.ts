import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { ViewMeta } from '~/core/types';
import { PostgresViewAdapter } from '../postgres/postgres-view.adapter';
import type { DatabaseViewAdapterParams } from '../types';

export class RedshiftViewAdapter extends PostgresViewAdapter {
  override readonly dbType = DatabaseClientType.REDSHIFT;

  static override async create(
    params: DatabaseViewAdapterParams
  ): Promise<RedshiftViewAdapter> {
    const adapter = await RedshiftViewAdapter.resolveAdapter(
      params,
      DatabaseClientType.REDSHIFT
    );
    return new RedshiftViewAdapter(adapter);
  }

  // Redshift has no pg_size_pretty()/pg_total_relation_size()/
  // pg_relation_size()/pg_indexes_size(). The inherited Postgres query only
  // reaches these inside a `CASE relkind WHEN 'm' THEN ... END` branch, but
  // that doesn't help here — the wire-compatible planner validates every
  // function reference at plan time regardless of which CASE branch would
  // actually run.
  override async getViewMeta(
    schema: string,
    viewName: string
  ): Promise<ViewMeta> {
    const query = `
      SELECT
        c.relkind,
        c.relname,
        pg_get_userbyid(c.relowner) AS owner,
        CASE c.relkind
          WHEN 'v' THEN (
            SELECT is_updatable::boolean
            FROM information_schema.views
            WHERE table_schema = n.nspname AND table_name = c.relname
          )
          ELSE false
        END AS is_updatable,
        CASE c.relkind
          WHEN 'm' THEN c.relispopulated
          ELSE NULL
        END AS is_populated,
        CASE c.relkind
          WHEN 'm' THEN c.reltuples::bigint
          ELSE NULL
        END AS row_estimate
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = ?
        AND n.nspname = ?
        AND c.relkind IN ('v', 'm');
    `;

    const rows = await this.adapter.rawQuery(query, [viewName, schema]);
    const row = rows?.[0];

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'View not found',
      });
    }

    const isMaterialized = row.relkind === 'm';

    return {
      type: isMaterialized ? 'materialized' : 'normal',
      isUpdatable: row.is_updatable ?? false,
      isPopulated: row.is_populated ?? undefined,
      totalSize: isMaterialized ? '0 bytes' : undefined,
      tableSize: isMaterialized ? '0 bytes' : undefined,
      indexSize: isMaterialized ? '0 bytes' : undefined,
      rowEstimate:
        row.row_estimate != null ? Number(row.row_estimate) : undefined,
    };
  }
}
