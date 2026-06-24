import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  ConfigMetadata,
  DatabaseMetadata,
  FunctionSchema,
  ReservedTableSchemas,
  SchemaMetaData,
  TableMetadata,
  ViewMetadata,
  ViewSchema,
} from '~/core/types';
import { FunctionSchemaEnum, ViewSchemaEnum } from '~/core/types';
import { BaseDomainAdapter } from '../../shared';
import { resolveMetadataTypeAlias } from '../type-alias.constants';
import type {
  DatabaseMetadataAdapterParams,
  IDatabaseMetadataAdapter,
} from '../types';

interface MssqlTableRow {
  table_schema: string;
  table_name: string;
  table_type: string;
}

interface MssqlColumnRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
}

interface MssqlPrimaryKeyRow {
  table_schema: string;
  table_name: string;
  column_name: string;
}

interface MssqlForeignKeyRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  referenced_table_schema: string;
  referenced_table_name: string;
  referenced_column_name: string;
}

interface MssqlRoutineRow {
  routine_schema: string;
  routine_name: string;
  routine_type: string;
  parameters: string;
}

export class MssqlMetadataAdapter
  extends BaseDomainAdapter
  implements IDatabaseMetadataAdapter
{
  readonly dbType = DatabaseClientType.MSSQL;

  static async create(
    params: DatabaseMetadataAdapterParams
  ): Promise<MssqlMetadataAdapter> {
    const adapter = await MssqlMetadataAdapter.resolveAdapter(
      params,
      DatabaseClientType.MSSQL
    );
    return new MssqlMetadataAdapter(adapter);
  }

  private async loadMetadataRows() {
    const [schemas, tables, columns, primaryKeys, foreignKeys, routines] = await Promise.all([
      this.adapter.rawQuery<{ schema_name: string }>(
        `
          SELECT name AS schema_name
          FROM sys.schemas
          WHERE name NOT IN ('sys', 'db_owner', 'db_accessadmin', 'db_securityadmin', 'db_ddladmin', 'db_backupoperator', 'db_datareader', 'db_datawriter', 'db_denydatareader', 'db_denydatawriter', 'INFORMATION_SCHEMA')
          ORDER BY name
        `
      ),
      this.adapter.rawQuery<MssqlTableRow>(
        `
          SELECT
            s.name AS table_schema,
            t.name AS table_name,
            CASE WHEN t.type = 'V' THEN 'VIEW' ELSE 'BASE TABLE' END AS table_type
          FROM sys.objects t
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          WHERE t.type IN ('U', 'V') AND s.name NOT IN ('sys', 'INFORMATION_SCHEMA')
          ORDER BY s.name, t.name
        `
      ),
      this.adapter.rawQuery<MssqlColumnRow>(
        `
          SELECT
            s.name AS table_schema,
            t.name AS table_name,
            c.name AS column_name,
            c.column_id AS ordinal_position,
            ty.name AS data_type,
            CASE WHEN c.is_nullable = 1 THEN 'YES' ELSE 'NO' END AS is_nullable,
            OBJECT_DEFINITION(c.default_object_id) AS column_default
          FROM sys.columns c
          INNER JOIN sys.objects t ON c.object_id = t.object_id
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
          WHERE t.type IN ('U', 'V') AND s.name NOT IN ('sys', 'INFORMATION_SCHEMA')
          ORDER BY s.name, t.name, c.column_id
        `
      ),
      this.adapter.rawQuery<MssqlPrimaryKeyRow>(
        `
          SELECT
            s.name AS table_schema,
            t.name AS table_name,
            c.name AS column_name
          FROM sys.indexes i
          INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
          INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
          INNER JOIN sys.tables t ON i.object_id = t.object_id
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          WHERE i.is_primary_key = 1
        `
      ),
      this.adapter.rawQuery<MssqlForeignKeyRow>(
        `
          SELECT
            s.name AS table_schema,
            t.name AS table_name,
            col.name AS column_name,
            refs.name AS referenced_table_schema,
            reft.name AS referenced_table_name,
            refcol.name AS referenced_column_name
          FROM sys.foreign_keys fk
          INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
          INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          INNER JOIN sys.columns col ON fkc.parent_object_id = col.object_id AND fkc.parent_column_id = col.column_id
          INNER JOIN sys.tables reft ON fk.referenced_object_id = reft.object_id
          INNER JOIN sys.schemas refs ON reft.schema_id = refs.schema_id
          INNER JOIN sys.columns refcol ON fkc.referenced_object_id = refcol.object_id AND fkc.referenced_column_id = refcol.column_id
        `
      ),
      this.adapter.rawQuery<MssqlRoutineRow>(
        `
          SELECT
            r.ROUTINE_SCHEMA  AS routine_schema,
            r.ROUTINE_NAME    AS routine_name,
            r.ROUTINE_TYPE    AS routine_type,
            ISNULL(
              STUFF((
                SELECT ', ' + p.PARAMETER_NAME + ' ' + p.DATA_TYPE
                FROM INFORMATION_SCHEMA.PARAMETERS p
                WHERE p.SPECIFIC_SCHEMA = r.ROUTINE_SCHEMA
                  AND p.SPECIFIC_NAME   = r.ROUTINE_NAME
                  AND p.ORDINAL_POSITION > 0
                ORDER BY p.ORDINAL_POSITION
                FOR XML PATH(''), TYPE
              ).value('.', 'NVARCHAR(MAX)'), 1, 2, ''),
              ''
            ) AS parameters
          FROM INFORMATION_SCHEMA.ROUTINES r
          WHERE r.ROUTINE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
          ORDER BY r.ROUTINE_SCHEMA, r.ROUTINE_TYPE, r.ROUTINE_NAME
        `
      ),
    ]);

    return {
      schemas,
      tables,
      columns,
      primaryKeys,
      foreignKeys,
      routines,
    };
  }

  async getSchemaMetaData(): Promise<SchemaMetaData[]> {
    const { schemas, tables, columns, primaryKeys, foreignKeys, routines } =
      await this.loadMetadataRows();

    return schemas.map(({ schema_name }) => {
      const schemaTables = tables.filter(
        table => table.table_schema === schema_name
      );
      const baseTables = schemaTables.filter(
        table => table.table_type === 'BASE TABLE'
      );
      const schemaViews = schemaTables.filter(
        table => table.table_type === 'VIEW'
      );

      const table_details = Object.fromEntries(
        baseTables.map(table => {
          const tableColumns = columns
            .filter(
              column =>
                column.table_schema === schema_name &&
                column.table_name === table.table_name
            )
            .map(column => ({
              raw_type_name: column.data_type,
              name: column.column_name,
              ordinal_position: column.ordinal_position,
              type: column.data_type,
              short_type_name: resolveMetadataTypeAlias(
                this.dbType,
                column.data_type
              ),
              is_nullable: column.is_nullable === 'YES',
              default_value: column.column_default,
            }));

          const tablePrimaryKeys = primaryKeys
            .filter(
              primaryKey =>
                primaryKey.table_schema === schema_name &&
                primaryKey.table_name === table.table_name
            )
            .map(primaryKey => ({ column: primaryKey.column_name }));

          const tableForeignKeys = foreignKeys
            .filter(
              foreignKey =>
                foreignKey.table_schema === schema_name &&
                foreignKey.table_name === table.table_name
            )
            .map(foreignKey => ({
              column: foreignKey.column_name,
              referenced_column: foreignKey.referenced_column_name,
              referenced_table: foreignKey.referenced_table_name,
              referenced_table_schema: foreignKey.referenced_table_schema,
            }));

          return [
            table.table_name,
            {
              columns: tableColumns,
              foreign_keys: tableForeignKeys,
              primary_keys: tablePrimaryKeys,
              table_id: `${schema_name}.${table.table_name}`,
            },
          ];
        })
      );

      const view_details = Object.fromEntries(
        schemaViews.map(view => {
          const viewColumns = columns
            .filter(
              column =>
                column.table_schema === schema_name &&
                column.table_name === view.table_name
            )
            .map(column => ({
              raw_type_name: column.data_type,
              name: column.column_name,
              ordinal_position: column.ordinal_position,
              type: column.data_type,
              short_type_name: resolveMetadataTypeAlias(
                this.dbType,
                column.data_type
              ),
              is_nullable: column.is_nullable === 'YES',
              default_value: column.column_default,
            }));

          return [
            view.table_name,
            {
              columns: viewColumns,
              view_id: `${schema_name}.${view.table_name}`,
              type: ViewSchemaEnum.View,
            },
          ];
        })
      );

      const views = schemaViews.map<ViewSchema>(view => ({
        name: view.table_name,
        type: ViewSchemaEnum.View,
        oid: `${schema_name}.${view.table_name}`,
      }));

      const functions: FunctionSchema[] = (routines ?? [])
        .filter(r => r.routine_schema === schema_name)
        .map(r => ({
          oId: `${r.routine_schema}.${r.routine_name}`,
          name: r.routine_name,
          type:
            r.routine_type === 'PROCEDURE'
              ? FunctionSchemaEnum.Procedure
              : FunctionSchemaEnum.Function,
          parameters: r.parameters,
        }));

      return {
        name: schema_name,
        tables: baseTables.map(table => table.table_name),
        views,
        functions,
        table_details,
        view_details,
      };
    });
  }

  async getErdData(): Promise<DatabaseMetadata> {
    const [dbInfo] = await this.adapter.rawQuery<{ dbName: string; version: string }>(
      'SELECT DB_NAME() AS dbName, @@VERSION AS version'
    );
    const schemaMeta = await this.getSchemaMetaData();

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
      databaseName: dbInfo?.dbName || '',
      version: dbInfo?.version || '',
      config: [] as ConfigMetadata[],
    };
  }

  async getReverseSchemas(): Promise<ReservedTableSchemas[]> {
    const { tables, primaryKeys, foreignKeys } = await this.loadMetadataRows();

    return tables
      .filter(table => table.table_type === 'BASE TABLE')
      .map(table => ({
        schema: table.table_schema,
        table: table.table_name,
        rows: 0,
        type: table.table_type,
        primary_keys: primaryKeys
          .filter(
            primaryKey =>
              primaryKey.table_schema === table.table_schema &&
              primaryKey.table_name === table.table_name
          )
          .map(primaryKey => ({ column: primaryKey.column_name })),
        used_by: foreignKeys
          .filter(
            foreignKey =>
              foreignKey.referenced_table_schema === table.table_schema &&
              foreignKey.referenced_table_name === table.table_name
          )
          .map(foreignKey => ({
            referencing_schema: foreignKey.table_schema,
            referencing_table: foreignKey.table_name,
            foreign_key_name: `${foreignKey.table_name}.${foreignKey.column_name}`,
            fk_column: foreignKey.column_name,
            referenced_column: foreignKey.referenced_column_name,
          })),
      }));
  }
}
