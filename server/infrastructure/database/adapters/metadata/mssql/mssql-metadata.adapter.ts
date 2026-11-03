import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  DatabaseMetadata,
  FunctionSchema,
  IndexMetadata,
  ReservedTableSchemas,
  SchemaColumnMetadata,
  SchemaMetaData,
  TableDetailMetadata,
  TableMetadata,
  ViewDetailMetadata,
  ViewMetadata,
} from '~/core/types';
import { FunctionSchemaEnum, ViewSchemaEnum } from '~/core/types';
import { BaseDomainAdapter } from '../../shared';
import { resolveMetadataTypeAlias } from '../type-alias.constants';
import type {
  DatabaseMetadataAdapterParams,
  IDatabaseMetadataAdapter,
  SchemaMetadataQueryOptions,
} from '../types';
import {
  MssqlCatalog,
  SYSTEM_SCHEMAS,
  formatMssqlType,
  type MssqlColumnRow,
  type MssqlForeignKeyRow,
  type MssqlIndexColumnRow,
  type MssqlKeyColumnRow,
} from './mssql-catalog';

const objectKey = (schema: string, name: string) => `${schema}\u0000${name}`;

// lodash-es is a frontend-only devDependency and is not bundled into the
// server runtime, so the grouping stays local.
function groupBy<T>(
  rows: T[],
  key: (row: T) => string
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  for (const row of rows) {
    (groups[key(row)] ??= []).push(row);
  }

  return groups;
}

export class MssqlMetadataAdapter
  extends BaseDomainAdapter
  implements IDatabaseMetadataAdapter
{
  readonly dbType = DatabaseClientType.MSSQL;

  private get catalog() {
    return new MssqlCatalog(this.adapter);
  }

  static async create(
    params: DatabaseMetadataAdapterParams
  ): Promise<MssqlMetadataAdapter> {
    const adapter = await MssqlMetadataAdapter.resolveAdapter(
      params,
      DatabaseClientType.MSSQL
    );

    return new MssqlMetadataAdapter(adapter);
  }

  private toSchemaColumn(column: MssqlColumnRow): SchemaColumnMetadata {
    const rawType = formatMssqlType(column);

    return {
      name: column.column_name,
      ordinal_position: column.column_id,
      type: rawType,
      raw_type_name: rawType,
      short_type_name: resolveMetadataTypeAlias(this.dbType, rawType),
      is_nullable: Boolean(column.is_nullable),
      default_value: column.default_value,
    };
  }

  async getSchemaMetaData(
    options?: SchemaMetadataQueryOptions
  ): Promise<SchemaMetaData[]> {
    const allSchemas = await this.catalog.getSchemas();
    const schemas = options?.schemaName
      ? allSchemas.filter(row => row.schema_name === options.schemaName)
      : options?.namesOnly
        ? allSchemas
        : allSchemas.filter(row => !SYSTEM_SCHEMAS.has(row.schema_name));

    if (options?.namesOnly) {
      return schemas.map(({ schema_name }) => ({
        name: schema_name,
        is_system: SYSTEM_SCHEMAS.has(schema_name),
        tables: null,
        views: null,
        functions: null,
        table_details: null,
        view_details: null,
      }));
    }

    const scope = options?.schemaName;
    const [tables, views, columns, primaryKeys, foreignKeys, routines] =
      await Promise.all([
        this.catalog.getTables(scope),
        this.catalog.getViews(scope),
        this.catalog.getColumns(scope),
        this.catalog.getPrimaryKeys(scope),
        this.catalog.getForeignKeys(scope),
        this.catalog.getRoutines(scope),
      ]);

    const columnsByObject = groupBy(columns, row =>
      objectKey(row.schema_name, row.object_name)
    );
    const pksByTable = groupBy(primaryKeys, row =>
      objectKey(row.schema_name, row.table_name)
    );
    const fksByTable = groupBy(foreignKeys, row =>
      objectKey(row.schema_name, row.table_name)
    );

    return schemas.map(({ schema_name }) => {
      const schemaTables = tables.filter(
        row => row.schema_name === schema_name
      );
      const schemaViews = views.filter(row => row.schema_name === schema_name);

      const table_details = Object.fromEntries(
        schemaTables.map(table => {
          const key = objectKey(schema_name, table.object_name);
          const detail: TableDetailMetadata = {
            table_id: String(table.object_id),
            columns: (columnsByObject[key] ?? []).map(column =>
              this.toSchemaColumn(column)
            ),
            primary_keys: (pksByTable[key] ?? []).map(pk => ({
              column: pk.column_name,
            })),
            foreign_keys: (fksByTable[key] ?? []).map(fk => ({
              column: fk.column_name,
              referenced_column: fk.referenced_column,
              referenced_table: fk.referenced_table,
              referenced_table_schema: fk.referenced_schema,
            })),
          };

          return [table.object_name, detail];
        })
      );

      const view_details = Object.fromEntries(
        schemaViews.map(view => {
          const detail: ViewDetailMetadata = {
            view_id: String(view.object_id),
            type: ViewSchemaEnum.View,
            columns: (
              columnsByObject[objectKey(schema_name, view.object_name)] ?? []
            ).map(column => this.toSchemaColumn(column)),
          };

          return [view.object_name, detail];
        })
      );

      const functions = routines
        .filter(routine => routine.schema_name === schema_name)
        .map<FunctionSchema>(routine => ({
          oId: String(routine.object_id),
          name: routine.object_name,
          type:
            routine.object_type === 'P'
              ? FunctionSchemaEnum.Procedure
              : FunctionSchemaEnum.Function,
          parameters: '',
        }));

      return {
        name: schema_name,
        is_system: SYSTEM_SCHEMAS.has(schema_name),
        tables: schemaTables.map(table => table.object_name),
        views: schemaViews.map(view => ({
          name: view.object_name,
          type: ViewSchemaEnum.View,
          oid: String(view.object_id),
        })),
        functions,
        table_details,
        view_details,
      };
    });
  }

  async getErdData(): Promise<DatabaseMetadata> {
    const [info, tables, views, columns, primaryKeys, foreignKeys, indexes] =
      await Promise.all([
        this.adapter.rawQuery<{ database_name: string; version: string }>(
          `SELECT DB_NAME() AS database_name,
            CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(128)) AS version`
        ),
        this.catalog.getTables(),
        this.catalog.getViews(),
        this.catalog.getColumns(),
        this.catalog.getPrimaryKeys(),
        this.catalog.getForeignKeys(),
        this.catalog.getIndexColumns(),
      ]);

    const columnsByObject = groupBy(columns, row =>
      objectKey(row.schema_name, row.object_name)
    );
    const pksByTable = groupBy(primaryKeys, row =>
      objectKey(row.schema_name, row.table_name)
    );
    const fksByTable = groupBy(foreignKeys, row =>
      objectKey(row.schema_name, row.table_name)
    );
    const indexesByTable = groupBy(indexes, row =>
      objectKey(row.schema_name, row.table_name)
    );

    const tableMetadata = tables.map<TableMetadata>(table => {
      const key = objectKey(table.schema_name, table.object_name);

      return {
        id: `${table.schema_name}.${table.object_name}`,
        schema: table.schema_name,
        table: table.object_name,
        rows: Number(table.row_count ?? 0),
        type: 'BASE TABLE',
        comment: table.comment ?? null,
        columns: (columnsByObject[key] ?? []).map(column => {
          const rawType = formatMssqlType(column);
          const isNumeric = ['decimal', 'numeric'].includes(
            column.type_name.toLowerCase()
          );

          return {
            name: column.column_name,
            ordinal_position: column.column_id,
            type: rawType,
            raw_type_name: rawType,
            short_type_name: resolveMetadataTypeAlias(this.dbType, rawType),
            character_maximum_length:
              column.max_length === -1 ? null : column.max_length,
            precision: isNumeric
              ? { precision: column.precision, scale: column.scale }
              : null,
            nullable: Boolean(column.is_nullable),
            default: column.default_value,
            collation: column.collation_name,
            comment: column.comment,
          };
        }),
        foreign_keys: (fksByTable[key] ?? []).map(fk => ({
          foreign_key_name: fk.constraint_name,
          column: fk.column_name,
          reference_schema: fk.referenced_schema,
          reference_table: fk.referenced_table,
          reference_column: fk.referenced_column,
          fk_def: `FOREIGN KEY (${fk.column_name}) REFERENCES ${fk.referenced_schema}.${fk.referenced_table}(${fk.referenced_column}) ON DELETE ${fk.delete_action} ON UPDATE ${fk.update_action}`,
        })),
        primary_keys: (pksByTable[key] ?? []).map(pk => ({
          column: pk.column_name,
          pk_def: `PRIMARY KEY (${pk.column_name})`,
        })),
        indexes: (indexesByTable[key] ?? []).map<IndexMetadata>(index => ({
          index_name: index.index_name,
          column: index.column_name,
          index_type: index.index_type,
          index_size: 0,
          is_unique: Boolean(index.is_unique),
          cardinality: 0,
          column_position: index.key_ordinal,
          direction: index.is_descending_key ? 'DESC' : 'ASC',
        })),
      };
    });

    return {
      tables: tableMetadata,
      views: views.map<ViewMetadata>(view => ({
        schema: view.schema_name,
        view_name: view.object_name,
        view_definition: '',
      })),
      databaseName: info[0]?.database_name ?? '',
      version: info[0]?.version ?? '',
      config: [],
    };
  }

  async getReverseSchemas(): Promise<ReservedTableSchemas[]> {
    const [tables, primaryKeys, foreignKeys] = await Promise.all([
      this.catalog.getTables(),
      this.catalog.getPrimaryKeys(),
      this.catalog.getForeignKeys(),
    ]);

    const pksByTable = groupBy(primaryKeys, row =>
      objectKey(row.schema_name, row.table_name)
    );
    const referencedBy = groupBy(foreignKeys, row =>
      objectKey(row.referenced_schema, row.referenced_table)
    );

    return tables.map(table => {
      const key = objectKey(table.schema_name, table.object_name);

      return {
        schema: table.schema_name,
        table: table.object_name,
        rows: Number(table.row_count ?? 0),
        type: 'BASE TABLE',
        primary_keys: (pksByTable[key] ?? []).map(pk => ({
          column: pk.column_name,
        })),
        used_by: (referencedBy[key] ?? []).map(fk => ({
          referencing_schema: fk.schema_name,
          referencing_table: fk.table_name,
          foreign_key_name: fk.constraint_name,
          fk_column: fk.column_name,
          referenced_column: fk.referenced_column,
        })),
      };
    });
  }
}
