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
import type {
  DatabaseMetadataAdapterParams,
  IDatabaseMetadataAdapter,
} from '../types';

const SYSTEM_SCHEMAS = [
  'ANONYMOUS',
  'APPQOSSYS',
  'AUDSYS',
  'CTXSYS',
  'DBSNMP',
  'DVSYS',
  'GSMADMIN_INTERNAL',
  'LBACSYS',
  'MDSYS',
  'OJVMSYS',
  'ORDSYS',
  'OUTLN',
  'SYS',
  'SYSBACKUP',
  'SYSDG',
  'SYSKM',
  'SYSTEM',
  'WMSYS',
  'XDB',
];

function buildBindPlaceholders(count: number, start = 1) {
  return Array.from({ length: count }, (_, index) => `:${index + start}`).join(
    ', '
  );
}

function formatOracleType(column: {
  data_type: string;
  data_length: number | null;
  data_precision: number | null;
  data_scale: number | null;
}) {
  if (column.data_type === 'NUMBER' && column.data_precision !== null) {
    return column.data_scale !== null
      ? `NUMBER(${column.data_precision}, ${column.data_scale})`
      : `NUMBER(${column.data_precision})`;
  }

  if (
    ['VARCHAR2', 'NVARCHAR2', 'CHAR', 'NCHAR', 'RAW'].includes(
      column.data_type
    ) &&
    column.data_length !== null
  ) {
    return `${column.data_type}(${column.data_length})`;
  }

  return column.data_type;
}

interface OracleTableRow {
  owner: string;
  table_name: string;
  num_rows: number | null;
  comments?: string | null;
}

interface OracleViewRow {
  owner: string;
  view_name: string;
}

interface OracleColumnRow {
  owner: string;
  table_name: string;
  column_name: string;
  column_id: number;
  data_type: string;
  data_length: number | null;
  data_precision: number | null;
  data_scale: number | null;
  nullable: 'Y' | 'N';
  data_default: string | null;
}

interface OraclePrimaryKeyRow {
  owner: string;
  table_name: string;
  column_name: string;
}

interface OracleForeignKeyRow {
  owner: string;
  table_name: string;
  column_name: string;
  referenced_owner: string;
  referenced_table_name: string;
  referenced_column_name: string;
}

interface OracleRoutineRow {
  owner: string;
  object_name: string;
  object_type: 'FUNCTION' | 'PROCEDURE';
}

interface OracleDatabaseInfoRow {
  database_name: string;
  version: string | null;
}

export class OracleMetadataAdapter
  extends BaseDomainAdapter
  implements IDatabaseMetadataAdapter
{
  readonly dbType = DatabaseClientType.ORACLE;

  static async create(
    params: DatabaseMetadataAdapterParams
  ): Promise<OracleMetadataAdapter> {
    const adapter = await OracleMetadataAdapter.resolveAdapter(
      params,
      DatabaseClientType.ORACLE
    );

    return new OracleMetadataAdapter(adapter);
  }

  private async loadMetadataRows() {
    const schemaPlaceholders = buildBindPlaceholders(SYSTEM_SCHEMAS.length);

    const [
      schemas,
      tables,
      views,
      columns,
      primaryKeys,
      foreignKeys,
      routines,
    ] = await Promise.all([
      this.adapter.rawQuery<{ schema_name: string }>(
        `
            SELECT username AS schema_name
            FROM all_users
            WHERE username NOT IN (${schemaPlaceholders})
            ORDER BY username
          `,
        SYSTEM_SCHEMAS
      ),
      this.adapter.rawQuery<OracleTableRow>(
        `
            SELECT t.owner, t.table_name, t.num_rows, c.comments
            FROM all_tables t
            LEFT JOIN all_tab_comments c
              ON c.owner = t.owner
              AND c.table_name = t.table_name
            WHERE t.owner NOT IN (${schemaPlaceholders})
            ORDER BY t.owner, t.table_name
          `,
        SYSTEM_SCHEMAS
      ),
      this.adapter.rawQuery<OracleViewRow>(
        `
            SELECT owner, view_name
            FROM all_views
            WHERE owner NOT IN (${schemaPlaceholders})
            ORDER BY owner, view_name
          `,
        SYSTEM_SCHEMAS
      ),
      this.adapter.rawQuery<OracleColumnRow>(
        `
            SELECT
              owner,
              table_name,
              column_name,
              column_id,
              data_type,
              data_length,
              data_precision,
              data_scale,
              nullable,
              TRIM(data_default) AS data_default
            FROM all_tab_columns
            WHERE owner NOT IN (${schemaPlaceholders})
            ORDER BY owner, table_name, column_id
          `,
        SYSTEM_SCHEMAS
      ),
      this.adapter.rawQuery<OraclePrimaryKeyRow>(
        `
            SELECT acc.owner, acc.table_name, acc.column_name
            FROM all_constraints ac
            JOIN all_cons_columns acc
              ON acc.owner = ac.owner
              AND acc.constraint_name = ac.constraint_name
            WHERE ac.constraint_type = 'P'
              AND ac.owner NOT IN (${schemaPlaceholders})
            ORDER BY acc.owner, acc.table_name, acc.position
          `,
        SYSTEM_SCHEMAS
      ),
      this.adapter.rawQuery<OracleForeignKeyRow>(
        `
            SELECT
              acc.owner,
              acc.table_name,
              acc.column_name,
              r_acc.owner AS referenced_owner,
              r_acc.table_name AS referenced_table_name,
              r_acc.column_name AS referenced_column_name
            FROM all_constraints ac
            JOIN all_cons_columns acc
              ON acc.owner = ac.owner
              AND acc.constraint_name = ac.constraint_name
            JOIN all_constraints r_ac
              ON r_ac.owner = ac.r_owner
              AND r_ac.constraint_name = ac.r_constraint_name
            JOIN all_cons_columns r_acc
              ON r_acc.owner = r_ac.owner
              AND r_acc.constraint_name = r_ac.constraint_name
              AND r_acc.position = acc.position
            WHERE ac.constraint_type = 'R'
              AND ac.owner NOT IN (${schemaPlaceholders})
            ORDER BY acc.owner, acc.table_name, acc.position
          `,
        SYSTEM_SCHEMAS
      ),
      this.adapter.rawQuery<OracleRoutineRow>(
        `
            SELECT owner, object_name, object_type
            FROM all_objects
            WHERE object_type IN ('FUNCTION', 'PROCEDURE')
              AND owner NOT IN (${schemaPlaceholders})
            ORDER BY owner, object_name
          `,
        SYSTEM_SCHEMAS
      ),
    ]);

    return {
      schemas,
      tables,
      views,
      columns,
      primaryKeys,
      foreignKeys,
      routines,
    };
  }

  async getSchemaMetaData(): Promise<SchemaMetaData[]> {
    const {
      schemas,
      tables,
      views,
      columns,
      primaryKeys,
      foreignKeys,
      routines,
    } = await this.loadMetadataRows();

    return schemas.map(({ schema_name }) => {
      const schemaTables = tables.filter(table => table.owner === schema_name);
      const schemaViews = views.filter(view => view.owner === schema_name);

      const table_details = Object.fromEntries(
        schemaTables.map(table => {
          const tableColumns = columns
            .filter(
              column =>
                column.owner === schema_name &&
                column.table_name === table.table_name
            )
            .map(column => ({
              name: column.column_name,
              ordinal_position: column.column_id,
              type: formatOracleType(column),
              short_type_name: column.data_type,
              is_nullable: column.nullable === 'Y',
              default_value: column.data_default,
            }));

          const tablePrimaryKeys = primaryKeys
            .filter(
              primaryKey =>
                primaryKey.owner === schema_name &&
                primaryKey.table_name === table.table_name
            )
            .map(primaryKey => ({ column: primaryKey.column_name }));

          const tableForeignKeys = foreignKeys
            .filter(
              foreignKey =>
                foreignKey.owner === schema_name &&
                foreignKey.table_name === table.table_name
            )
            .map(foreignKey => ({
              column: foreignKey.column_name,
              referenced_column: foreignKey.referenced_column_name,
              referenced_table: foreignKey.referenced_table_name,
              referenced_table_schema: foreignKey.referenced_owner,
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
                column.owner === schema_name &&
                column.table_name === view.view_name
            )
            .map(column => ({
              name: column.column_name,
              ordinal_position: column.column_id,
              type: formatOracleType(column),
              short_type_name: column.data_type,
              is_nullable: column.nullable === 'Y',
              default_value: column.data_default,
            }));

          return [
            view.view_name,
            {
              columns: viewColumns,
              view_id: `${schema_name}.${view.view_name}`,
              type: ViewSchemaEnum.View,
            },
          ];
        })
      );

      const functions = routines
        .filter(routine => routine.owner === schema_name)
        .map<FunctionSchema>(routine => ({
          oId: `${schema_name}.${routine.object_name}`,
          name: routine.object_name,
          type:
            routine.object_type === 'PROCEDURE'
              ? FunctionSchemaEnum.Procedure
              : FunctionSchemaEnum.Function,
          parameters: '',
        }));

      const schemaViewsList = schemaViews.map<ViewSchema>(view => ({
        name: view.view_name,
        type: ViewSchemaEnum.View,
        oid: `${schema_name}.${view.view_name}`,
      }));

      return {
        name: schema_name,
        tables: schemaTables.map(table => table.table_name),
        views: schemaViewsList,
        functions,
        table_details,
        view_details,
      };
    });
  }

  async getErdData(): Promise<DatabaseMetadata> {
    const [databaseInfo] = await this.adapter.rawQuery<OracleDatabaseInfoRow>(
      `
        SELECT
          SYS_CONTEXT('USERENV', 'DB_NAME') AS database_name,
          (
            SELECT version
            FROM product_component_version
            WHERE product LIKE 'Oracle Database%'
              AND ROWNUM = 1
          ) AS version
        FROM dual
      `
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

    return tables.map(table => ({
      schema: table.owner,
      table: table.table_name,
      rows: table.num_rows || 0,
      type: 'TABLE',
      primary_keys: primaryKeys
        .filter(
          primaryKey =>
            primaryKey.owner === table.owner &&
            primaryKey.table_name === table.table_name
        )
        .map(primaryKey => ({ column: primaryKey.column_name })),
      used_by: foreignKeys
        .filter(
          foreignKey =>
            foreignKey.referenced_owner === table.owner &&
            foreignKey.referenced_table_name === table.table_name
        )
        .map(foreignKey => ({
          referencing_schema: foreignKey.owner,
          referencing_table: foreignKey.table_name,
          foreign_key_name: `${foreignKey.table_name}.${foreignKey.column_name}`,
          fk_column: foreignKey.column_name,
          referenced_column: foreignKey.referenced_column_name,
        })),
    }));
  }
}
