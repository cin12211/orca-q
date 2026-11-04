import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { duckdbDialect } from '~/core/sql-dialect';
import {
  ViewSchemaEnum,
  type TableIndex,
  type ViewColumn,
  type ViewDefinitionResponse,
  type ViewDependency,
  type ViewMeta,
  type ViewOverviewMetadata,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';
import { BaseUnsupportedViewAdapter } from '../shared/base-unsupported-view.adapter';
import type { DatabaseViewAdapterParams } from '../types';

function resolveDuckDbSchema(schema?: string) {
  return !schema || schema === 'public' ? 'main' : schema;
}

export class DuckDbViewAdapter extends BaseUnsupportedViewAdapter {
  readonly dbType = DatabaseClientType.DUCKDB;

  private readonly adapter: IDatabaseAdapter;

  private constructor(adapter: IDatabaseAdapter) {
    super();
    this.adapter = adapter;
  }

  static async create(
    params: DatabaseViewAdapterParams
  ): Promise<DuckDbViewAdapter> {
    const adapter = await getDatabaseSource({
      ...params,
      type: DatabaseClientType.DUCKDB,
    });

    return new DuckDbViewAdapter(adapter);
  }

  override async getOverviewViews(
    schema: string
  ): Promise<ViewOverviewMetadata[]> {
    const resolvedSchema = resolveDuckDbSchema(schema);

    return this.adapter.rawQuery<ViewOverviewMetadata>(
      `
        SELECT
          view_name AS name,
          schema_name AS "schema",
          'VIEW' AS "type",
          schema_name AS owner,
          comment
        FROM duckdb_views()
        WHERE database_name = current_database()
          AND schema_name = ?
          AND NOT internal
        ORDER BY view_name
      `,
      [resolvedSchema]
    );
  }

  override async getViewDefinition(
    viewId: string
  ): Promise<ViewDefinitionResponse> {
    const [row] = await this.adapter.rawQuery<{
      view_name: string;
      schema_name: string;
      sql: string | null;
    }>(
      `
        SELECT view_name, schema_name, sql
        FROM duckdb_views()
        WHERE view_oid = CAST(? AS BIGINT)
      `,
      [viewId]
    );

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'View not found' });
    }

    return {
      viewName: row.view_name,
      schemaName: row.schema_name,
      viewType: ViewSchemaEnum.View,
      definition: row.sql || '',
    };
  }

  override async getViewMeta(
    schema: string,
    viewName: string
  ): Promise<ViewMeta> {
    const [row] = await this.adapter.rawQuery<{ row_count: number | string }>(
      `SELECT COUNT(*) AS row_count FROM ${duckdbDialect.qualifyTableName(viewName, resolveDuckDbSchema(schema))}`
    );

    return {
      type: 'normal',
      rowEstimate: Number(row?.row_count ?? 0),
    };
  }

  override async getViewColumns(
    schema: string,
    viewName: string
  ): Promise<ViewColumn[]> {
    return this.adapter.rawQuery<ViewColumn>(
      `
        SELECT
          column_name AS "columnName",
          data_type AS "dataType",
          CASE WHEN is_nullable THEN 'YES' ELSE 'NO' END AS "isNullable",
          column_default AS "defaultValue"
        FROM duckdb_columns()
        WHERE database_name = current_database()
          AND schema_name = ?
          AND table_name = ?
        ORDER BY column_index
      `,
      [resolveDuckDbSchema(schema), viewName]
    );
  }

  override async getViewDependencies(): Promise<ViewDependency[]> {
    return [];
  }

  override async getViewIndexes(): Promise<TableIndex[]> {
    return [];
  }

  override async getViewExplainPlan(
    schema: string,
    viewName: string
  ): Promise<string> {
    const rows = await this.adapter.rawQuery<{ explain_value: string }>(
      `EXPLAIN SELECT * FROM ${duckdbDialect.qualifyTableName(viewName, resolveDuckDbSchema(schema))}`
    );

    return rows.map(row => row.explain_value).join('\n');
  }
}
