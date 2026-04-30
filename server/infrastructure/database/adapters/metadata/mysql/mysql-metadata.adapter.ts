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

const EXCLUDED_SCHEMAS = [
  'information_schema',
  'mysql',
  'performance_schema',
  'sys',
];
const EXCLUDED_SCHEMA_PLACEHOLDERS = EXCLUDED_SCHEMAS.map(() => '?').join(', ');

interface MysqlTableRow {
  table_schema: string;
  table_name: string;
  table_type: string;
  table_rows: number | null;
  table_comment: string | null;
}

interface MysqlColumnRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
  column_type: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
}

interface MysqlPrimaryKeyRow {
  table_schema: string;
  table_name: string;
  column_name: string;
}

interface MysqlForeignKeyRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  referenced_table_schema: string;
  referenced_table_name: string;
  referenced_column_name: string;
}

interface MysqlRoutineRow {
  routine_schema: string;
  routine_name: string;
  routine_type: 'FUNCTION' | 'PROCEDURE';
}

interface MysqlDatabaseInfoRow {
  database_name: string | null;
  version: string;
}

export class MysqlMetadataAdapter
  extends BaseDomainAdapter
  implements IDatabaseMetadataAdapter
{
  readonly dbType: DatabaseClientType;

  constructor(
    adapter: Awaited<ReturnType<typeof MysqlMetadataAdapter.resolveAdapter>>,
    dbType: DatabaseClientType
  ) {
    super(adapter);
    this.dbType = dbType;
  }

  static async create(
    params: DatabaseMetadataAdapterParams,
    dbType: DatabaseClientType = DatabaseClientType.MYSQL
  ): Promise<MysqlMetadataAdapter> {
    const adapter = await MysqlMetadataAdapter.resolveAdapter(params, dbType);
    return new MysqlMetadataAdapter(adapter, dbType);
  }

  private async loadMetadataRows() {
    const [schemas, tables, columns, primaryKeys, foreignKeys, routines] =
      await Promise.all([
        this.adapter.rawQuery<{ schema_name: string }>(
          `
            SELECT schema_name AS schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN (${EXCLUDED_SCHEMA_PLACEHOLDERS})
            ORDER BY schema_name
          `,
          EXCLUDED_SCHEMAS
        ),
        this.adapter.rawQuery<MysqlTableRow>(
          `
            SELECT
              table_schema AS table_schema,
              table_name AS table_name,
              table_type AS table_type,
              table_rows AS table_rows,
              table_comment AS table_comment
            FROM information_schema.tables
            WHERE table_schema NOT IN (${EXCLUDED_SCHEMA_PLACEHOLDERS})
            ORDER BY table_schema, table_name
          `,
          EXCLUDED_SCHEMAS
        ),
        this.adapter.rawQuery<MysqlColumnRow>(
          `
            SELECT
              table_schema AS table_schema,
              table_name AS table_name,
              column_name AS column_name,
              ordinal_position AS ordinal_position,
              column_type AS column_type,
              data_type AS data_type,
              is_nullable AS is_nullable,
              column_default AS column_default
            FROM information_schema.columns
            WHERE table_schema NOT IN (${EXCLUDED_SCHEMA_PLACEHOLDERS})
            ORDER BY table_schema, table_name, ordinal_position
          `,
          EXCLUDED_SCHEMAS
        ),
        this.adapter.rawQuery<MysqlPrimaryKeyRow>(
          `
            SELECT
              table_schema AS table_schema,
              table_name AS table_name,
              column_name AS column_name
            FROM information_schema.key_column_usage
            WHERE constraint_name = 'PRIMARY'
              AND table_schema NOT IN (${EXCLUDED_SCHEMA_PLACEHOLDERS})
            ORDER BY table_schema, table_name, ordinal_position
          `,
          EXCLUDED_SCHEMAS
        ),
        this.adapter.rawQuery<MysqlForeignKeyRow>(
          `
            SELECT
              table_schema AS table_schema,
              table_name AS table_name,
              column_name AS column_name,
              referenced_table_schema AS referenced_table_schema,
              referenced_table_name AS referenced_table_name,
              referenced_column_name AS referenced_column_name
            FROM information_schema.key_column_usage
            WHERE referenced_table_name IS NOT NULL
              AND table_schema NOT IN (${EXCLUDED_SCHEMA_PLACEHOLDERS})
            ORDER BY table_schema, table_name, ordinal_position
          `,
          EXCLUDED_SCHEMAS
        ),
        this.adapter.rawQuery<MysqlRoutineRow>(
          `
            SELECT
              routine_schema AS routine_schema,
              routine_name AS routine_name,
              routine_type AS routine_type
            FROM information_schema.routines
            WHERE routine_schema NOT IN (${EXCLUDED_SCHEMA_PLACEHOLDERS})
            ORDER BY routine_schema, routine_name
          `,
          EXCLUDED_SCHEMAS
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
              raw_type_name: column.column_type,
              name: column.column_name,
              ordinal_position: column.ordinal_position,
              type: column.column_type,
              short_type_name: resolveMetadataTypeAlias(
                this.dbType,
                column.column_type
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
              raw_type_name: column.column_type,
              name: column.column_name,
              ordinal_position: column.ordinal_position,
              type: column.column_type,
              short_type_name: resolveMetadataTypeAlias(
                this.dbType,
                column.column_type
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

      const functions = routines
        .filter(routine => routine.routine_schema === schema_name)
        .map<FunctionSchema>(routine => ({
          oId: `${schema_name}.${routine.routine_name}`,
          name: routine.routine_name,
          type:
            routine.routine_type === 'PROCEDURE'
              ? FunctionSchemaEnum.Procedure
              : FunctionSchemaEnum.Function,
          parameters: '',
        }));

      const views = schemaViews.map<ViewSchema>(view => ({
        name: view.table_name,
        type: ViewSchemaEnum.View,
        oid: `${schema_name}.${view.table_name}`,
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
    const [databaseInfo] = await this.adapter.rawQuery<MysqlDatabaseInfoRow>(
      'SELECT DATABASE() AS database_name, VERSION() AS version'
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
      databaseName: databaseInfo?.database_name || '',
      version: databaseInfo?.version || '',
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
        rows: table.table_rows || 0,
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
