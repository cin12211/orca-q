import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import type {
  ConfigMetadata,
  DatabaseMetadata,
  ReservedTableSchemas,
  SchemaColumnMetadata,
  SchemaMetaData,
  TableMetadata,
  ViewMetadata,
} from '~~/app/core/types';
import { FunctionSchemaEnum, ViewSchemaEnum } from '~~/app/core/types';
import { BaseDomainAdapter } from '../../shared';
import { resolveMetadataTypeAlias } from '../type-alias.constants';
import type {
  DatabaseMetadataAdapterParams,
  IDatabaseMetadataAdapter,
  SchemaMetadataQueryOptions,
} from '../types';

const SYSTEM_SCHEMAS = ['information_schema', 'pg_catalog'];

interface DuckDbTableRow {
  schema_name: string;
  table_name: string;
}

interface DuckDbViewRow {
  schema_name: string;
  view_name: string;
  view_oid: string;
  sql: string | null;
}

interface DuckDbMacroRow {
  schema_name: string;
  function_name: string;
  function_type: string;
  function_oid: string;
  parameters: string;
}

interface DuckDbColumnRow {
  schema_name: string;
  table_name: string;
  column_name: string;
  column_index: number;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
}

interface DuckDbConstraintRow {
  schema_name: string;
  table_name: string;
  constraint_type: 'PRIMARY KEY' | 'FOREIGN KEY';
  constraint_column_names: string[];
  referenced_table: string | null;
  referenced_column_names: string[];
}

function groupBySchemaAndTable<T extends DuckDbColumnRow | DuckDbConstraintRow>(
  rows: T[]
) {
  const grouped = new Map<string, T[]>();

  rows.forEach(row => {
    const key = `${row.schema_name}\0${row.table_name}`;
    grouped.set(key, [...(grouped.get(key) || []), row]);
  });

  return grouped;
}

function objectKey(schemaName: string, objectName: string) {
  return `${schemaName}\0${objectName}`;
}

export class DuckDbMetadataAdapter
  extends BaseDomainAdapter
  implements IDatabaseMetadataAdapter
{
  readonly dbType = DatabaseClientType.DUCKDB;

  static async create(
    params: DatabaseMetadataAdapterParams
  ): Promise<DuckDbMetadataAdapter> {
    const adapter = await DuckDbMetadataAdapter.resolveAdapter(
      params,
      DatabaseClientType.DUCKDB
    );

    return new DuckDbMetadataAdapter(adapter);
  }

  private async getSchemaNames(schemaName?: string) {
    const rows = await this.adapter.rawQuery<{ schema_name: string }>(
      `
        SELECT schema_name
        FROM duckdb_schemas()
        WHERE database_name = current_database()
          AND schema_name NOT IN (${SYSTEM_SCHEMAS.map(() => '?').join(', ')})
        ORDER BY schema_name
      `,
      SYSTEM_SCHEMAS
    );

    return rows
      .map(row => row.schema_name)
      .filter(name => !schemaName || name === schemaName);
  }

  private toColumnMetadata(column: DuckDbColumnRow): SchemaColumnMetadata {
    return {
      raw_type_name: column.data_type,
      name: column.column_name,
      ordinal_position: column.column_index,
      type: column.data_type,
      short_type_name: resolveMetadataTypeAlias(this.dbType, column.data_type),
      is_nullable: column.is_nullable,
      default_value: column.column_default,
    };
  }

  private buildSchemaMeta(input: {
    schemaName: string;
    tables: DuckDbTableRow[];
    views: DuckDbViewRow[];
    macros: DuckDbMacroRow[];
    columnsByObject: Map<string, DuckDbColumnRow[]>;
    constraintsByTable: Map<string, DuckDbConstraintRow[]>;
  }): SchemaMetaData {
    const { schemaName, columnsByObject, constraintsByTable } = input;
    const tables = input.tables.filter(row => row.schema_name === schemaName);
    const views = input.views.filter(row => row.schema_name === schemaName);

    const table_details = Object.fromEntries(
      tables.map(({ table_name: tableName }) => {
        const key = objectKey(schemaName, tableName);
        const constraints = constraintsByTable.get(key) || [];

        return [
          tableName,
          {
            columns: (columnsByObject.get(key) || []).map(column =>
              this.toColumnMetadata(column)
            ),
            foreign_keys: constraints
              .filter(row => row.constraint_type === 'FOREIGN KEY')
              .flatMap(row =>
                row.constraint_column_names.map((column, index) => ({
                  column,
                  referenced_column: row.referenced_column_names[index] || '',
                  referenced_table: row.referenced_table || '',
                  // DuckDB rejects foreign keys that cross schemas.
                  referenced_table_schema: schemaName,
                }))
              ),
            primary_keys: constraints
              .filter(row => row.constraint_type === 'PRIMARY KEY')
              .flatMap(row =>
                row.constraint_column_names.map(column => ({ column }))
              ),
            table_id: `${schemaName}.${tableName}`,
          },
        ];
      })
    );

    const view_details = Object.fromEntries(
      views.map(view => [
        view.view_name,
        {
          columns: (
            columnsByObject.get(objectKey(schemaName, view.view_name)) || []
          ).map(column => this.toColumnMetadata(column)),
          view_id: view.view_oid,
          type: ViewSchemaEnum.View,
        },
      ])
    );

    return {
      name: schemaName,
      tables: tables.map(table => table.table_name),
      views: views.map(view => ({
        name: view.view_name,
        type: ViewSchemaEnum.View,
        oid: view.view_oid,
      })),
      functions: input.macros
        .filter(row => row.schema_name === schemaName)
        .map(row => ({
          oId: row.function_oid,
          name: row.function_name,
          type:
            row.function_type === 'macro'
              ? FunctionSchemaEnum.Function
              : FunctionSchemaEnum.Procedure,
          parameters: row.parameters,
        })),
      table_details,
      view_details,
    };
  }

  async getSchemaMetaData(
    options?: SchemaMetadataQueryOptions
  ): Promise<SchemaMetaData[]> {
    const schemaNames = await this.getSchemaNames(options?.schemaName);

    if (options?.namesOnly) {
      return schemaNames.map(name => ({
        name,
        tables: null,
        views: null,
        functions: null,
        table_details: null,
        view_details: null,
      }));
    }

    const catalogFilter = 'database_name = current_database() AND NOT internal';
    const [tables, views, macros, columns, constraints] = await Promise.all([
      this.adapter.rawQuery<DuckDbTableRow>(
        `
          SELECT schema_name, table_name
          FROM duckdb_tables()
          WHERE ${catalogFilter}
          ORDER BY table_name
        `
      ),
      this.adapter.rawQuery<DuckDbViewRow>(
        `
          SELECT schema_name, view_name, CAST(view_oid AS VARCHAR) AS view_oid, sql
          FROM duckdb_views()
          WHERE ${catalogFilter}
          ORDER BY view_name
        `
      ),
      this.adapter.rawQuery<DuckDbMacroRow>(
        `
          SELECT
            schema_name,
            function_name,
            function_type,
            CAST(function_oid AS VARCHAR) AS function_oid,
            array_to_string(parameters, ', ') AS parameters
          FROM duckdb_functions()
          WHERE ${catalogFilter}
            AND function_type IN ('macro', 'table_macro')
          ORDER BY function_name
        `
      ),
      this.adapter.rawQuery<DuckDbColumnRow>(
        `
          SELECT
            schema_name,
            table_name,
            column_name,
            column_index,
            data_type,
            is_nullable,
            column_default
          FROM duckdb_columns()
          WHERE ${catalogFilter}
          ORDER BY schema_name, table_name, column_index
        `
      ),
      this.adapter.rawQuery<DuckDbConstraintRow>(
        `
          SELECT
            schema_name,
            table_name,
            constraint_type,
            constraint_column_names,
            referenced_table,
            referenced_column_names
          FROM duckdb_constraints()
          WHERE database_name = current_database()
            AND constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
        `
      ),
    ]);

    const columnsByObject = groupBySchemaAndTable(columns);
    const constraintsByTable = groupBySchemaAndTable(constraints);

    return schemaNames.map(schemaName =>
      this.buildSchemaMeta({
        schemaName,
        tables,
        views,
        macros,
        columnsByObject,
        constraintsByTable,
      })
    );
  }

  async getErdData(): Promise<DatabaseMetadata> {
    const [[versionRow], [databaseRow], schemaMeta] = await Promise.all([
      this.adapter.rawQuery<{ version: string }>('SELECT version() AS version'),
      this.adapter.rawQuery<{ name: string }>(
        'SELECT current_database() AS name'
      ),
      this.getSchemaMetaData(),
    ]);

    const tables = schemaMeta.flatMap<TableMetadata>(schema =>
      (schema.tables || []).map(tableName => {
        const detail = schema.table_details?.[tableName];

        return {
          id: detail?.table_id || `${schema.name}.${tableName}`,
          schema: schema.name,
          table: tableName,
          rows: 0,
          type: 'TABLE',
          comment: null,
          columns:
            detail?.columns.map(column => ({
              name: column.name,
              ordinal_position: column.ordinal_position,
              short_type_name: column.short_type_name,
              type: column.type,
              character_maximum_length: null,
              precision: null,
              nullable: column.is_nullable,
              default: column.default_value,
              collation: null,
              comment: null,
            })) || [],
          foreign_keys:
            detail?.foreign_keys.map(foreignKey => ({
              foreign_key_name: `${foreignKey.column}_fk`,
              column: foreignKey.column,
              reference_schema: foreignKey.referenced_table_schema,
              reference_table: foreignKey.referenced_table,
              reference_column: foreignKey.referenced_column,
              fk_def: `${foreignKey.column} -> ${foreignKey.referenced_table}.${foreignKey.referenced_column}`,
            })) || [],
          primary_keys:
            detail?.primary_keys.map(primaryKey => ({
              column: primaryKey.column,
              pk_def: `PRIMARY KEY (${primaryKey.column})`,
            })) || [],
          indexes: [],
        };
      })
    );

    const views = schemaMeta.flatMap<ViewMetadata>(schema =>
      (schema.views || []).map(view => ({
        schema: schema.name,
        view_name: view.name,
        view_definition: '',
      }))
    );

    return {
      tables,
      views,
      databaseName: databaseRow?.name || '',
      version: versionRow?.version || '',
      config: [] as ConfigMetadata[],
    };
  }

  async getReverseSchemas(): Promise<ReservedTableSchemas[]> {
    const schemaMeta = await this.getSchemaMetaData();

    return schemaMeta.flatMap<ReservedTableSchemas>(schema =>
      (schema.tables || []).map(tableName => {
        const detail = schema.table_details?.[tableName];

        return {
          schema: schema.name,
          table: tableName,
          rows: 0,
          type: 'TABLE',
          primary_keys: detail?.primary_keys || [],
          used_by: Object.entries(schema.table_details || {}).flatMap(
            ([referencingTable, referencingDetail]) =>
              referencingDetail.foreign_keys
                .filter(foreignKey => foreignKey.referenced_table === tableName)
                .map(foreignKey => ({
                  referencing_schema: schema.name,
                  referencing_table: referencingTable,
                  foreign_key_name: `${referencingTable}.${foreignKey.column}`,
                  fk_column: foreignKey.column,
                  referenced_column: foreignKey.referenced_column,
                }))
          ),
        };
      })
    );
  }
}
