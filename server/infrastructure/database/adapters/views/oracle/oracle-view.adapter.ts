import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  TableIndex,
  ViewColumn,
  ViewDefinitionResponse,
  ViewDependency,
  ViewMeta,
  ViewOverviewMetadata,
} from '~/core/types';
import { ViewSchemaEnum } from '~/core/types';
import { lowerCaseRowKeys } from '~/server/infrastructure/driver/result-rows';
import { BaseDomainAdapter } from '../../shared';
import type { DatabaseViewAdapterParams, IDatabaseViewAdapter } from '../types';

export class OracleViewAdapter
  extends BaseDomainAdapter
  implements IDatabaseViewAdapter
{
  readonly dbType = DatabaseClientType.ORACLE;

  static async create(
    params: DatabaseViewAdapterParams
  ): Promise<OracleViewAdapter> {
    const adapter = await OracleViewAdapter.resolveAdapter(
      params,
      DatabaseClientType.ORACLE
    );
    return new OracleViewAdapter(adapter);
  }

  // Catalog queries alias columns in lower case; see lowerCaseRowKeys.
  private async catalogQuery<T>(sql: string, bindings: string[] = []) {
    return lowerCaseRowKeys<T>(
      await this.adapter.rawQuery<Record<string, unknown>>(sql, bindings)
    );
  }

  async getOverviewViews(schema: string): Promise<ViewOverviewMetadata[]> {
    return this.catalogQuery<ViewOverviewMetadata>(
      `
      SELECT
        v.view_name AS name,
        v.owner AS schema,
        'VIEW' AS type,
        v.owner AS owner,
        c.comments AS "comment"
      FROM all_views v
      LEFT JOIN all_tab_comments c
        ON c.owner = v.owner AND c.table_name = v.view_name
      WHERE v.owner = :1
      ORDER BY v.view_name
      `,
      [schema]
    );
  }

  // `viewId` is `OWNER.VIEW_NAME` (see OracleMetadataAdapter).
  async getViewDefinition(viewId: string): Promise<ViewDefinitionResponse> {
    const separator = viewId.indexOf('.');
    const schema = viewId.slice(0, separator);
    const viewName = viewId.slice(separator + 1);
    const [row] = await this.catalogQuery<{ text: string | null }>(
      `SELECT text FROM all_views WHERE owner = :1 AND view_name = :2`,
      [schema, viewName]
    );

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'View not found' });
    }

    return {
      viewName,
      schemaName: schema,
      viewType: ViewSchemaEnum.View,
      definition: `CREATE OR REPLACE VIEW "${schema}"."${viewName}" AS\n${row.text ?? ''}`,
    };
  }

  async getViewMeta(schema: string, viewName: string): Promise<ViewMeta> {
    const [row] = await this.catalogQuery<{ read_only: string | null }>(
      `SELECT read_only FROM all_views WHERE owner = :1 AND view_name = :2`,
      [schema, viewName]
    );

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'View not found' });
    }

    return { type: 'normal', isUpdatable: row.read_only !== 'Y' };
  }

  async getViewColumns(
    schema: string,
    viewName: string
  ): Promise<ViewColumn[]> {
    const rows = await this.catalogQuery<{
      column_name: string;
      data_type: string;
      nullable: string;
    }>(
      `
      SELECT column_name, data_type, nullable
      FROM all_tab_columns
      WHERE owner = :1 AND table_name = :2
      ORDER BY column_id
      `,
      [schema, viewName]
    );

    return rows.map(row => ({
      columnName: row.column_name,
      dataType: row.data_type,
      isNullable: row.nullable === 'Y' ? 'YES' : 'NO',
      defaultValue: null,
    }));
  }

  async getViewDependencies(
    schema: string,
    viewName: string
  ): Promise<ViewDependency[]> {
    const rows = await this.catalogQuery<{
      referenced_owner: string;
      referenced_name: string;
    }>(
      `
      SELECT DISTINCT referenced_owner, referenced_name
      FROM all_dependencies
      WHERE owner = :1
        AND name = :2
        AND type = 'VIEW'
        AND referenced_type IN ('TABLE', 'VIEW')
      ORDER BY referenced_owner, referenced_name
      `,
      [schema, viewName]
    );

    return rows.map(row => ({
      dependsOn: `${row.referenced_owner}.${row.referenced_name}`,
    }));
  }

  // Oracle views carry no indexes of their own.
  async getViewIndexes(): Promise<TableIndex[]> {
    return [];
  }

  async getViewExplainPlan(): Promise<string> {
    throw createError({
      statusCode: 501,
      statusMessage: 'Oracle view explain plans are not available yet',
    });
  }
}
