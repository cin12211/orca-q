import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  ConfigMetadata,
  DatabaseMetadata,
  ReservedTableSchemas,
  SchemaMetaData,
  TableMetadata,
  ViewMetadata,
} from '~/core/types';
import { ViewSchemaEnum } from '~/core/types';
import { BaseDomainAdapter } from '../../shared';
import { resolveMetadataTypeAlias } from '../type-alias.constants';
import type {
  DatabaseMetadataAdapterParams,
  IDatabaseMetadataAdapter,
} from '../types';
import {
  buildTableDetailFromCreateSql,
  escapeSqliteIdentifier,
  isD1Connection,
  parseViewColumnsFromCreateSql,
  quoteSqliteString,
} from './sqlite-create-sql.parser';

// ---------------------------------------------------------------------------
// Row types returned by SQLite PRAGMA statements
// ---------------------------------------------------------------------------

interface SqliteDatabaseRow {
  seq: number;
  name: string;
  file: string;
}

interface SqliteMasterRow {
  name: string;
  type: 'table' | 'view';
  sql: string | null;
}

interface SqliteTableInfoRow {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface SqliteForeignKeyRow {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
}

// ---------------------------------------------------------------------------

export class SqliteMetadataAdapter
  extends BaseDomainAdapter
  implements IDatabaseMetadataAdapter
{
  readonly dbType = DatabaseClientType.SQLITE3;

  static async create(
    params: DatabaseMetadataAdapterParams
  ): Promise<SqliteMetadataAdapter> {
    const adapter = await SqliteMetadataAdapter.resolveAdapter(
      params,
      DatabaseClientType.SQLITE3
    );

    return new SqliteMetadataAdapter(adapter);
  }

  private async getDatabases() {
    try {
      return await this.adapter.rawQuery<SqliteDatabaseRow>(
        'PRAGMA database_list'
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? '');

      if (
        isD1Connection(this.adapter.connection) &&
        /SQLITE_AUTH/i.test(message)
      ) {
        return [
          {
            seq: 0,
            name: 'main',
            file: '',
          },
        ];
      }

      throw error;
    }
  }

  private async getSchemaObjects(schema: string) {
    return this.adapter.rawQuery<SqliteMasterRow>(
      `
        SELECT name, type, sql
        FROM ${escapeSqliteIdentifier(schema)}.sqlite_master
        WHERE type IN ('table', 'view')
          AND name NOT LIKE 'sqlite_%'
        ORDER BY type, name
      `
    );
  }

  private async getTableInfo(schema: string, tableName: string) {
    return this.adapter.rawQuery<SqliteTableInfoRow>(
      `PRAGMA ${escapeSqliteIdentifier(schema)}.table_info(${quoteSqliteString(tableName)})`
    );
  }

  private async getForeignKeys(schema: string, tableName: string) {
    return this.adapter.rawQuery<SqliteForeignKeyRow>(
      `PRAGMA ${escapeSqliteIdentifier(schema)}.foreign_key_list(${quoteSqliteString(tableName)})`
    );
  }

  async getSchemaMetaData(): Promise<SchemaMetaData[]> {
    const databases = await this.getDatabases();
    const schemaMeta: SchemaMetaData[] = [];

    for (const database of databases.filter(db => db.name !== 'temp')) {
      const objects = await this.getSchemaObjects(database.name);
      const tables = objects.filter(object => object.type === 'table');
      const views = objects.filter(object => object.type === 'view');

      const table_details = Object.fromEntries(
        await Promise.all(
          tables.map(async table => {
            if (isD1Connection(this.adapter.connection)) {
              return [
                table.name,
                buildTableDetailFromCreateSql(
                  database.name,
                  table.name,
                  table.sql
                ),
              ];
            }

            const [columns, foreignKeys] = await Promise.all([
              this.getTableInfo(database.name, table.name),
              this.getForeignKeys(database.name, table.name),
            ]);

            return [
              table.name,
              {
                columns: columns.map(column => ({
                  raw_type_name: column.type,
                  name: column.name,
                  ordinal_position: column.cid + 1,
                  type: column.type,
                  short_type_name: resolveMetadataTypeAlias(
                    this.dbType,
                    column.type
                  ),
                  is_nullable: column.notnull === 0,
                  default_value: column.dflt_value,
                })),
                foreign_keys: foreignKeys.map(foreignKey => ({
                  column: foreignKey.from,
                  referenced_column: foreignKey.to,
                  referenced_table: foreignKey.table,
                  referenced_table_schema: database.name,
                })),
                primary_keys: columns
                  .filter(column => column.pk > 0)
                  .sort((left, right) => left.pk - right.pk)
                  .map(column => ({ column: column.name })),
                table_id: `${database.name}.${table.name}`,
              },
            ];
          })
        )
      );

      const view_details = Object.fromEntries(
        await Promise.all(
          views.map(async view => {
            if (isD1Connection(this.adapter.connection)) {
              return [
                view.name,
                parseViewColumnsFromCreateSql(
                  view.sql,
                  database.name,
                  view.name
                ),
              ];
            }

            const columns = await this.getTableInfo(database.name, view.name);

            return [
              view.name,
              {
                columns: columns.map(column => ({
                  raw_type_name: column.type,
                  name: column.name,
                  ordinal_position: column.cid + 1,
                  type: column.type,
                  short_type_name: resolveMetadataTypeAlias(
                    this.dbType,
                    column.type
                  ),
                  is_nullable: column.notnull === 0,
                  default_value: column.dflt_value,
                })),
                view_id: `${database.name}.${view.name}`,
                type: ViewSchemaEnum.View,
              },
            ];
          })
        )
      );

      schemaMeta.push({
        name: database.name,
        tables: tables.map(table => table.name),
        views: views.map(view => ({
          name: view.name,
          type: ViewSchemaEnum.View,
          oid: `${database.name}.${view.name}`,
        })),
        functions: [],
        table_details,
        view_details,
      });
    }

    return schemaMeta;
  }

  async getErdData(): Promise<DatabaseMetadata> {
    const [versionRow] = await this.adapter.rawQuery<{ version: string }>(
      'SELECT sqlite_version() AS version'
    );
    const databases = await this.getDatabases();
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

    const mainDatabase = databases.find(database => database.name === 'main');

    return {
      tables,
      views,
      databaseName: mainDatabase?.file || mainDatabase?.name || '',
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
          used_by: schemaMeta.flatMap(otherSchema =>
            Object.entries(otherSchema.table_details || {}).flatMap(
              ([referencingTable, referencingDetail]) =>
                (referencingDetail.foreign_keys || [])
                  .filter(
                    foreignKey =>
                      foreignKey.referenced_table_schema === schema.name &&
                      foreignKey.referenced_table === tableName
                  )
                  .map(foreignKey => ({
                    referencing_schema: otherSchema.name,
                    referencing_table: referencingTable,
                    foreign_key_name: `${referencingTable}.${foreignKey.column}`,
                    fk_column: foreignKey.column,
                    referenced_column: foreignKey.referenced_column,
                  }))
            )
          ),
        };
      })
    );
  }
}
