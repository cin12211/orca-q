import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  ViewOverviewMetadata,
  ViewDefinitionResponse,
  ViewSchemaEnum,
} from '~/core/types';
import { BaseDomainAdapter } from '../../shared';
import type { IDatabaseViewAdapter, DatabaseViewAdapterParams } from '../types';

export class PostgresViewAdapter
  extends BaseDomainAdapter
  implements IDatabaseViewAdapter
{
  readonly dbType = DatabaseClientType.POSTGRES;

  static async create(
    params: DatabaseViewAdapterParams
  ): Promise<PostgresViewAdapter> {
    const adapter = await PostgresViewAdapter.resolveAdapter(
      params,
      DatabaseClientType.POSTGRES
    );
    return new PostgresViewAdapter(adapter);
  }

  async getOverviewViews(schema: string): Promise<ViewOverviewMetadata[]> {
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
      LEFT JOIN pg_description d ON c.oid = d.objoid AND d.objsubid = 0
      WHERE n.nspname = ?
        AND c.relkind IN ('v', 'm')
      ORDER BY c.relname;
    `;

    return await this.adapter.rawQuery(query, [schema]);
  }

  async getViewDefinition(viewId: string): Promise<ViewDefinitionResponse> {
    const query = `
      SELECT
        c.relname AS view_name,
        n.nspname AS schema_name,
        CASE c.relkind
          WHEN 'v' THEN 'VIEW'
          WHEN 'm' THEN 'MATERIALIZED_VIEW'
        END AS view_type,
        pg_get_viewdef(c.oid, true) AS definition
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.oid = ?::oid
        AND c.relkind IN ('v', 'm');
    `;

    const result = await this.adapter.rawQuery(query, [viewId]);
    const row = result?.[0];

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'View not found',
      });
    }

    const isMaterialized = row.view_type === 'MATERIALIZED_VIEW';
    const createPrefix = isMaterialized
      ? 'CREATE MATERIALIZED VIEW'
      : 'CREATE OR REPLACE VIEW';

    const fullDefinition = `${createPrefix} "${row.schema_name}"."${row.view_name}" AS\n${row.definition}`;

    return {
      viewName: row.view_name,
      schemaName: row.schema_name,
      viewType: row.view_type as ViewSchemaEnum,
      definition: fullDefinition,
    };
  }
}
