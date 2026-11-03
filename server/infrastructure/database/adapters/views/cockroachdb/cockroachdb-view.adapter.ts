import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getSqlDialect } from '~/core/sql-dialect';
import type { ViewMeta, ViewOverviewMetadata } from '~/core/types';
import { PostgresViewAdapter } from '../postgres/postgres-view.adapter';
import type { DatabaseViewAdapterParams } from '../types';

export class CockroachViewAdapter extends PostgresViewAdapter {
  override readonly dbType: DatabaseClientType = DatabaseClientType.COCKROACHDB;

  static override async create(
    params: DatabaseViewAdapterParams
  ): Promise<CockroachViewAdapter> {
    const adapter = await CockroachViewAdapter.resolveAdapter(
      params,
      DatabaseClientType.COCKROACHDB
    );
    return new CockroachViewAdapter(adapter);
  }

  // pg_description must be scoped to pg_class: built-in function oids collide
  // with relation oids in CockroachDB.
  override async getOverviewViews(
    schema: string
  ): Promise<ViewOverviewMetadata[]> {
    const query = `
      SELECT
        c.relname AS name,
        n.nspname AS schema,
        CASE c.relkind
          WHEN 'v' THEN 'VIEW'
          WHEN 'm' THEN 'MATERIALIZED VIEW'
        END AS type,
        pg_get_userbyid(c.relowner) AS owner,
        d.description AS comment
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      LEFT JOIN pg_description d
        ON d.objoid = c.oid
        AND d.objsubid = 0
        AND d.classoid = 'pg_catalog.pg_class'::REGCLASS
      WHERE n.nspname = ?
        AND c.relkind IN ('v', 'm')
      ORDER BY c.relname;
    `;

    return this.adapter.rawQuery(query, [schema]);
  }

  // No relation-size functions in CockroachDB, so sizes are omitted.
  override async getViewMeta(
    schema: string,
    viewName: string
  ): Promise<ViewMeta> {
    const query = `
      SELECT
        c.relkind,
        COALESCE(v.is_updatable = 'YES', false) AS is_updatable
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      LEFT JOIN information_schema.views v
        ON v.table_schema = n.nspname
        AND v.table_name = c.relname
      WHERE c.relname = ?
        AND n.nspname = ?
        AND c.relkind IN ('v', 'm');
    `;

    const [row] = await this.adapter.rawQuery<{
      relkind: string;
      is_updatable: boolean;
    }>(query, [viewName, schema]);

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'View not found',
      });
    }

    return {
      type: row.relkind === 'm' ? 'materialized' : 'normal',
      isUpdatable: row.is_updatable ?? false,
    };
  }

  // CockroachDB returns the plan in an `info` column, one line per row.
  override async getViewExplainPlan(
    schema: string,
    viewName: string
  ): Promise<string> {
    const qualifiedName = getSqlDialect(this.dbType).qualifyTableName(
      viewName,
      schema
    );
    const rows = await this.adapter.rawQuery<{ info: string }>(
      `EXPLAIN SELECT * FROM ${qualifiedName}`
    );

    return rows.map(row => row.info).join('\n');
  }
}
