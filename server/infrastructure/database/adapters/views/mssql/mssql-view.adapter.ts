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
import { formatMssqlType } from '../../metadata/mssql/mssql-catalog';
import { BaseDomainAdapter } from '../../shared';
import type { DatabaseViewAdapterParams, IDatabaseViewAdapter } from '../types';

const VIEW_IN_SCHEMA = `
  FROM sys.views v
  JOIN sys.schemas s ON s.schema_id = v.schema_id
  WHERE s.name = ? AND v.name = ?`;

export class MssqlViewAdapter
  extends BaseDomainAdapter
  implements IDatabaseViewAdapter
{
  readonly dbType = DatabaseClientType.MSSQL;

  static async create(
    params: DatabaseViewAdapterParams
  ): Promise<MssqlViewAdapter> {
    const adapter = await MssqlViewAdapter.resolveAdapter(
      params,
      DatabaseClientType.MSSQL
    );
    return new MssqlViewAdapter(adapter);
  }

  async getOverviewViews(schema: string): Promise<ViewOverviewMetadata[]> {
    return this.adapter.rawQuery<ViewOverviewMetadata>(
      `
      SELECT
        v.name AS name,
        s.name AS [schema],
        'VIEW' AS type,
        COALESCE(USER_NAME(v.principal_id), USER_NAME(s.principal_id)) AS owner,
        CAST(ep.value AS NVARCHAR(4000)) AS comment
      FROM sys.views v
      JOIN sys.schemas s ON s.schema_id = v.schema_id
      LEFT JOIN sys.extended_properties ep
        ON ep.class = 1 AND ep.major_id = v.object_id AND ep.minor_id = 0
        AND ep.name = 'MS_Description'
      WHERE s.name = ? AND v.is_ms_shipped = 0
      ORDER BY v.name
      `,
      [schema]
    );
  }

  // `viewId` is the view's object_id (see MssqlMetadataAdapter).
  async getViewDefinition(viewId: string): Promise<ViewDefinitionResponse> {
    const [row] = await this.adapter.rawQuery<{
      view_name: string;
      schema_name: string;
      definition: string | null;
    }>(
      `
      SELECT
        v.name AS view_name,
        s.name AS schema_name,
        OBJECT_DEFINITION(v.object_id) AS definition
      FROM sys.views v
      JOIN sys.schemas s ON s.schema_id = v.schema_id
      WHERE v.object_id = ?
      `,
      [Number(viewId)]
    );

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'View not found' });
    }

    return {
      viewName: row.view_name,
      schemaName: row.schema_name,
      viewType: ViewSchemaEnum.View,
      // OBJECT_DEFINITION returns the full CREATE VIEW statement; it is NULL
      // for views created WITH ENCRYPTION.
      definition:
        row.definition ?? '-- The view definition is encrypted or hidden.',
    };
  }

  async getViewMeta(schema: string, viewName: string): Promise<ViewMeta> {
    const [row] = await this.adapter.rawQuery<{ is_indexed: number }>(
      `
      SELECT CAST(OBJECTPROPERTY(v.object_id, 'IsIndexed') AS INT) AS is_indexed
      ${VIEW_IN_SCHEMA}
      `,
      [schema, viewName]
    );

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'View not found' });
    }

    // Indexed views are SQL Server's closest equivalent to materialized views.
    return {
      type: row.is_indexed ? 'materialized' : 'normal',
    };
  }

  async getViewColumns(
    schema: string,
    viewName: string
  ): Promise<ViewColumn[]> {
    const rows = await this.adapter.rawQuery<{
      column_name: string;
      type_name: string;
      max_length: number;
      precision: number;
      scale: number;
      is_nullable: boolean;
    }>(
      `
      SELECT
        c.name AS column_name,
        ty.name AS type_name,
        c.max_length,
        c.precision,
        c.scale,
        c.is_nullable
      FROM sys.columns c
      JOIN sys.views v ON v.object_id = c.object_id
      JOIN sys.schemas s ON s.schema_id = v.schema_id
      JOIN sys.types ty ON ty.user_type_id = c.user_type_id
      WHERE s.name = ? AND v.name = ?
      ORDER BY c.column_id
      `,
      [schema, viewName]
    );

    return rows.map(row => ({
      columnName: row.column_name,
      dataType: formatMssqlType(row),
      isNullable: row.is_nullable ? 'YES' : 'NO',
      defaultValue: null,
    }));
  }

  async getViewDependencies(
    schema: string,
    viewName: string
  ): Promise<ViewDependency[]> {
    const rows = await this.adapter.rawQuery<{
      depends_on_schema: string | null;
      depends_on_name: string;
    }>(
      `
      SELECT DISTINCT
        COALESCE(d.referenced_schema_name, OBJECT_SCHEMA_NAME(d.referenced_id)) AS depends_on_schema,
        d.referenced_entity_name AS depends_on_name
      FROM sys.sql_expression_dependencies d
      JOIN sys.views v ON v.object_id = d.referencing_id
      JOIN sys.schemas s ON s.schema_id = v.schema_id
      WHERE s.name = ? AND v.name = ?
      `,
      [schema, viewName]
    );

    return rows.map(row => ({
      dependsOn: row.depends_on_schema
        ? `${row.depends_on_schema}.${row.depends_on_name}`
        : row.depends_on_name,
    }));
  }

  async getViewIndexes(
    schema: string,
    viewName: string
  ): Promise<TableIndex[]> {
    const rows = await this.adapter.rawQuery<{
      index_name: string;
      is_unique: boolean;
      is_primary_key: boolean;
      type_desc: string;
    }>(
      `
      SELECT i.name AS index_name, i.is_unique, i.is_primary_key, i.type_desc
      FROM sys.indexes i
      JOIN sys.views v ON v.object_id = i.object_id
      JOIN sys.schemas s ON s.schema_id = v.schema_id
      WHERE s.name = ? AND v.name = ? AND i.index_id > 0
      ORDER BY i.name
      `,
      [schema, viewName]
    );

    return rows.map(row => ({
      indexName: row.index_name,
      isUnique: Boolean(row.is_unique),
      isPrimary: Boolean(row.is_primary_key),
      method: row.type_desc.toLowerCase(),
      definition: `${row.type_desc} INDEX ${row.index_name}`,
    }));
  }

  async getViewExplainPlan(): Promise<string> {
    throw createError({
      statusCode: 501,
      statusMessage: 'SQL Server view explain plans are not available yet',
    });
  }
}
