import type { DuckDBConnection } from '@duckdb/node-api';
import { createError } from 'h3';
import { DatabaseClientType, BULK_CHUNK_SIZE } from '~/core/constants';
import { duckdbDialect } from '~/core/sql-dialect';
import type {
  BulkUpdateResponse,
  RLSPolicy,
  RLSStatus,
  TableIndex,
  TableMeta,
  TableOverviewMetadata,
  TableRule,
  TableSize,
  TableStructure,
  TableTrigger,
} from '~/core/types';
import { resolveMetadataTypeAlias } from '../../metadata/type-alias.constants';
import { BaseDomainAdapter } from '../../shared';
import type {
  DatabaseTableAdapterParams,
  IDatabaseTableAdapter,
} from '../types';

const EMPTY_SIZE = '0 B';

interface DuckDbConstraintRow {
  constraint_type: 'PRIMARY KEY' | 'FOREIGN KEY';
  constraint_name: string;
  constraint_column_names: string[];
  referenced_table: string | null;
  referenced_column_names: string[];
}

function resolveDuckDbSchema(schema?: string) {
  return !schema || schema === 'public' ? 'main' : schema;
}

function buildQualifiedTable(schema: string, tableName: string) {
  return duckdbDialect.qualifyTableName(tableName, resolveDuckDbSchema(schema));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export class DuckDbTableAdapter
  extends BaseDomainAdapter
  implements IDatabaseTableAdapter
{
  readonly dbType = DatabaseClientType.DUCKDB;

  static async create(
    params: DatabaseTableAdapterParams
  ): Promise<DuckDbTableAdapter> {
    const adapter = await DuckDbTableAdapter.resolveAdapter(
      params,
      DatabaseClientType.DUCKDB
    );

    return new DuckDbTableAdapter(adapter);
  }

  private getConstraints(schema: string, tableName: string) {
    return this.adapter.rawQuery<DuckDbConstraintRow>(
      `
        SELECT
          constraint_type,
          constraint_name,
          constraint_column_names,
          referenced_table,
          referenced_column_names
        FROM duckdb_constraints()
        WHERE database_name = current_database()
          AND schema_name = ?
          AND table_name = ?
          AND constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
      `,
      [resolveDuckDbSchema(schema), tableName]
    );
  }

  async getOverviewTables(schema: string): Promise<TableOverviewMetadata[]> {
    return this.adapter.rawQuery<TableOverviewMetadata>(
      `
        SELECT
          table_name AS name,
          schema_name AS "schema",
          'TABLE' AS kind,
          schema_name AS owner,
          CAST(estimated_size AS DOUBLE) AS estimated_row,
          '${EMPTY_SIZE}' AS total_size,
          '${EMPTY_SIZE}' AS data_size,
          '${EMPTY_SIZE}' AS index_size,
          comment
        FROM duckdb_tables()
        WHERE database_name = current_database()
          AND schema_name = ?
          AND NOT internal
        ORDER BY table_name
      `,
      [resolveDuckDbSchema(schema)]
    );
  }

  async getTableStructure(
    schema: string,
    tableName: string
  ): Promise<TableStructure[]> {
    const [columns, constraints] = await Promise.all([
      this.adapter.rawQuery<{
        column_name: string;
        data_type: string;
        is_nullable: boolean;
        column_default: string | null;
        comment: string | null;
      }>(
        `
          SELECT column_name, data_type, is_nullable, column_default, comment
          FROM duckdb_columns()
          WHERE database_name = current_database()
            AND schema_name = ?
            AND table_name = ?
          ORDER BY column_index
        `,
        [resolveDuckDbSchema(schema), tableName]
      ),
      this.getConstraints(schema, tableName),
    ]);

    const foreignKeyLabels = new Map<string, string[]>();

    constraints
      .filter(constraint => constraint.constraint_type === 'FOREIGN KEY')
      .forEach(constraint => {
        constraint.constraint_column_names.forEach((column, index) => {
          const labels = foreignKeyLabels.get(column) || [];
          labels.push(
            ` -> ${constraint.referenced_table}(${constraint.referenced_column_names[index]})`
          );
          foreignKeyLabels.set(column, labels);
        });
      });

    return columns.map<TableStructure>(column => ({
      column_name: column.column_name,
      data_type: column.data_type,
      short_type_name: resolveMetadataTypeAlias(this.dbType, column.data_type),
      is_nullable: column.is_nullable ? 'YES' : 'NO',
      default_value: column.column_default,
      foreign_keys: (foreignKeyLabels.get(column.column_name) || []).join('\n'),
      column_comment: column.comment || '',
    }));
  }

  async getTableSize(_schema: string, _tableName: string): Promise<TableSize> {
    return {
      tableSize: EMPTY_SIZE,
      dataSize: EMPTY_SIZE,
      indexSize: EMPTY_SIZE,
    };
  }

  async getTableMeta(schema: string, tableName: string): Promise<TableMeta> {
    const [countRow] = await this.adapter.rawQuery<{
      row_count: number | string;
    }>(
      `SELECT COUNT(*) AS row_count FROM ${buildQualifiedTable(schema, tableName)}`
    );

    return {
      type: 'TABLE',
      owner: schema,
      rowEstimate: Number(countRow?.row_count ?? 0),
      totalSize: EMPTY_SIZE,
      tableSize: EMPTY_SIZE,
      indexSize: EMPTY_SIZE,
    };
  }

  async getTableDdl(schema: string, tableName: string): Promise<string> {
    const [row] = await this.adapter.rawQuery<{ sql: string | null }>(
      `
        SELECT sql
        FROM duckdb_tables()
        WHERE database_name = current_database()
          AND schema_name = ?
          AND table_name = ?
      `,
      [resolveDuckDbSchema(schema), tableName]
    );

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }

    return row.sql || '';
  }

  async getTableIndexes(
    schema: string,
    tableName: string
  ): Promise<TableIndex[]> {
    const [indexes, constraints] = await Promise.all([
      this.adapter.rawQuery<{
        index_name: string;
        is_unique: boolean;
        is_primary: boolean;
        sql: string | null;
      }>(
        `
          SELECT index_name, is_unique, is_primary, sql
          FROM duckdb_indexes()
          WHERE database_name = current_database()
            AND schema_name = ?
            AND table_name = ?
          ORDER BY index_name
        `,
        [resolveDuckDbSchema(schema), tableName]
      ),
      this.getConstraints(schema, tableName),
    ]);

    // duckdb_indexes() leaves out the index backing a PRIMARY KEY constraint.
    const primaryKeyIndexes = constraints
      .filter(constraint => constraint.constraint_type === 'PRIMARY KEY')
      .map<TableIndex>(constraint => ({
        indexName: constraint.constraint_name,
        isUnique: true,
        isPrimary: true,
        method: 'ART',
        definition: constraint.constraint_column_names.join(', '),
      }));

    return [
      ...primaryKeyIndexes,
      ...indexes.map<TableIndex>(index => ({
        indexName: index.index_name,
        isUnique: index.is_unique,
        isPrimary: index.is_primary,
        method: 'ART',
        definition: index.sql || '',
      })),
    ];
  }

  async getTableRlsStatus(): Promise<RLSStatus> {
    return { enabled: false };
  }

  async getTableRlsPolicies(): Promise<RLSPolicy[]> {
    return [];
  }

  async getTableRules(): Promise<TableRule[]> {
    return [];
  }

  async getTableTriggers(): Promise<TableTrigger[]> {
    return [];
  }

  private async executeStatements(
    statements: string[]
  ): Promise<BulkUpdateResponse> {
    const startTime = performance.now();
    const data = [] as NonNullable<BulkUpdateResponse['data']>;
    const connection: DuckDBConnection =
      await this.adapter.acquireRawConnection();

    try {
      await connection.run('BEGIN TRANSACTION');

      for (const chunk of chunkArray(statements, BULK_CHUNK_SIZE)) {
        for (const statement of chunk) {
          const result = await connection.run(statement);
          data.push({
            query: statement,
            affectedRows: result.rowsChanged,
            results: [],
          });
        }
      }

      await connection.run('COMMIT');

      return {
        success: true,
        data,
        queryTime: Number((performance.now() - startTime).toFixed(2)),
      };
    } catch (error: unknown) {
      try {
        await connection.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('[DuckDbTableAdapter] Rollback failed', rollbackError);
      }

      const message =
        error instanceof Error ? error.message : 'Failed to execute statements';

      // The client only surfaces failures sent as an HTTP error; a 200 with
      // `success: false` would read as "saved" while nothing was written.
      throw createError({
        statusCode: 422,
        statusMessage: 'Failed to execute statements',
        message,
        data: { driverError: { dbType: this.dbType, message } },
      });
    } finally {
      await this.adapter.releaseRawConnection(connection);
    }
  }

  async executeBulkDelete(statements: string[]): Promise<BulkUpdateResponse> {
    return this.executeStatements(statements);
  }

  async executeBulkUpdate(statements: string[]): Promise<BulkUpdateResponse> {
    return this.executeStatements(statements);
  }

  async exportTableData(schema: string, tableName: string): Promise<any> {
    return this.adapter.rawQuery(
      `SELECT * FROM ${buildQualifiedTable(schema, tableName)}`
    );
  }
}
