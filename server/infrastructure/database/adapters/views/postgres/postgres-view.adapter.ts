import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  ViewOverviewMetadata,
  ViewDefinitionResponse,
  ViewSchemaEnum,
  ViewMeta,
  ViewDependency,
  ViewColumn,
  TableIndex,
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

  async getViewMeta(schema: string, viewName: string): Promise<ViewMeta> {
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
          WHEN 'm' THEN pg_size_pretty(pg_total_relation_size(c.oid))
          ELSE NULL
        END AS total_size,
        CASE c.relkind
          WHEN 'm' THEN pg_size_pretty(pg_relation_size(c.oid))
          ELSE NULL
        END AS table_size,
        CASE c.relkind
          WHEN 'm' THEN pg_size_pretty(pg_indexes_size(c.oid))
          ELSE NULL
        END AS index_size,
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
      totalSize: row.total_size ?? undefined,
      tableSize: row.table_size ?? undefined,
      indexSize: row.index_size ?? undefined,
      rowEstimate:
        row.row_estimate != null ? Number(row.row_estimate) : undefined,
    };
  }

  async getViewColumns(
    schema: string,
    viewName: string
  ): Promise<ViewColumn[]> {
    const query = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default AS default_value
      FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = ?
      ORDER BY ordinal_position;
    `;

    const rows = await this.adapter.rawQuery(query, [schema, viewName]);

    return rows.map(
      (row: Record<string, unknown>): ViewColumn => ({
        columnName: row.column_name as string,
        dataType: row.data_type as string,
        isNullable: row.is_nullable as string,
        defaultValue: (row.default_value as string) ?? null,
      })
    );
  }

  async getViewDependencies(
    schema: string,
    viewName: string
  ): Promise<ViewDependency[]> {
    const query = `
      SELECT DISTINCT
        ref_n.nspname AS depends_on_schema,
        ref_c.relname AS depends_on_name
      FROM pg_depend d
      JOIN pg_rewrite r ON d.objid = r.oid
      JOIN pg_class c ON r.ev_class = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_class ref_c ON d.refobjid = ref_c.oid
      JOIN pg_namespace ref_n ON ref_c.relnamespace = ref_n.oid
      WHERE c.relname = ?
        AND n.nspname = ?
        AND d.refobjid != c.oid
        AND d.deptype = 'n'
        AND ref_n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY depends_on_schema, depends_on_name;
    `;

    const rows = await this.adapter.rawQuery(query, [viewName, schema]);

    return rows.map(
      (row: Record<string, unknown>): ViewDependency => ({
        dependsOn: `${row.depends_on_schema as string}.${row.depends_on_name as string}`,
      })
    );
  }

  async getViewIndexes(
    schema: string,
    viewName: string
  ): Promise<TableIndex[]> {
    const query = `
      SELECT
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary,
        am.amname AS method,
        pg_get_indexdef(ix.indexrelid) AS definition
      FROM pg_class t
      JOIN pg_namespace n ON t.relnamespace = n.oid
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_am am ON i.relam = am.oid
      WHERE t.relname = ?
        AND n.nspname = ?
        AND t.relkind = 'm'
      ORDER BY i.relname;
    `;

    const rows = await this.adapter.rawQuery(query, [viewName, schema]);

    return rows.map(
      (row: Record<string, unknown>): TableIndex => ({
        indexName: row.index_name as string,
        isUnique: row.is_unique as boolean,
        isPrimary: row.is_primary as boolean,
        method: row.method as string,
        definition: row.definition as string,
      })
    );
  }

  async getViewExplainPlan(schema: string, viewName: string): Promise<string> {
    const query = `EXPLAIN SELECT * FROM "${schema}"."${viewName}"`;
    const rows = await this.adapter.rawQuery(query, []);

    return rows
      .map((row: Record<string, unknown>) => row['QUERY PLAN'] as string)
      .join('\n');
  }
}
