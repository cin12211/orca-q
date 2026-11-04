import { createError, type H3Event } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseDriverNormalizerError as ErrorNormalizer } from '~/core/helpers';
import type {
  DatabaseDriverError,
  DatabaseField,
  QueryResult,
  RawQueryResultWithMetadata,
} from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import {
  MssqlAdapter,
  inferMssqlCommand,
  type MssqlResultSet,
} from '~/server/infrastructure/driver/mssql.adapter';
import { mapArrayRowsToObjects } from '~/server/infrastructure/driver/result-rows';
import { BaseDomainAdapter } from '../../shared';
import type {
  DatabaseQueryAdapterParams,
  IDatabaseQueryAdapter,
} from '../types';
import { splitSqlServerBatches } from './split-batches';

const STREAM_BATCH_SIZE = 10_000;

interface ScriptResult {
  resultSet?: MssqlResultSet;
  rowsAffected: number;
}

export class MssqlQueryAdapter
  extends BaseDomainAdapter
  implements IDatabaseQueryAdapter
{
  readonly dbType = DatabaseClientType.MSSQL;

  static async create(
    params: DatabaseQueryAdapterParams
  ): Promise<MssqlQueryAdapter> {
    const adapter = await MssqlQueryAdapter.resolveAdapter(
      params,
      DatabaseClientType.MSSQL
    );
    return new MssqlQueryAdapter(adapter);
  }

  private get mssql(): MssqlAdapter {
    return MssqlQueryAdapter.asMssqlAdapter(this.adapter);
  }

  private static asMssqlAdapter(adapter: IDatabaseAdapter): MssqlAdapter {
    if (!(adapter instanceof MssqlAdapter)) {
      throw createError({
        statusCode: 500,
        statusMessage:
          'SQL Server query adapter requires a SQL Server connection',
      });
    }

    return adapter;
  }

  private mapParams(params?: Record<string, unknown>) {
    const mappingParams: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params ?? {})) {
      mappingParams[key] = Array.isArray(value)
        ? this.adapter.knex.raw(value.map(() => '?').join(', '), value)
        : value;
    }

    return mappingParams;
  }

  /**
   * Runs every `GO`-separated batch in order and keeps the last result set
   * that returned columns, which is what a single-grid result view can show.
   */
  private async runScript(
    query: string,
    params?: Record<string, unknown>
  ): Promise<ScriptResult> {
    const mappingParams = this.mapParams(params);
    const hasParams = Object.keys(mappingParams).length > 0;
    let resultSet: MssqlResultSet | undefined;
    let rowsAffected = 0;

    for (const batch of splitSqlServerBatches(query)) {
      const native = hasParams
        ? this.adapter.getNativeSql(batch.sql, mappingParams as never)
        : { sql: batch.sql, bindings: [] };

      for (let run = 0; run < batch.repeat; run += 1) {
        const result = await this.mssql.executeBatch(
          native.sql,
          Array.from(native.bindings ?? [])
        );

        rowsAffected += result.rowsAffected;
        resultSet = result.resultSets.at(-1) ?? resultSet;
      }
    }

    return { resultSet, rowsAffected };
  }

  async execute(query: string): Promise<QueryResult> {
    const { result, queryTime } = await this.withTiming(() =>
      this.adapter.rawQuery<Record<string, unknown>>(query)
    );

    return { result, queryTime };
  }

  async rawExecute(
    query: string,
    params?: any[] | Record<string, any>
  ): Promise<RawQueryResultWithMetadata> {
    const { result, queryTime } = await this.withTiming(() =>
      this.runScript(query, Array.isArray(params) ? undefined : params)
    );

    return {
      rows: mapArrayRowsToObjects(
        result.resultSet?.rows ?? [],
        result.resultSet?.fields ?? []
      ),
      fields: (result.resultSet?.fields ?? []) as DatabaseField[],
      queryTime,
    };
  }

  /**
   * Streams results as NDJSON. Rows of the final result set are sent in
   * chunks once the script finishes, because the result grid shows a single
   * result set and earlier ones in a multi-statement batch are superseded.
   */
  async rawExecuteStream(
    event: H3Event,
    query: string,
    params?: Record<string, unknown>
  ): Promise<void> {
    const res = event.node.res;

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const writeLine = (data: Record<string, unknown>) => {
      res.write(JSON.stringify(data) + '\n');
    };

    const startTime = performance.now();

    try {
      const { resultSet, rowsAffected } = await this.runScript(query, params);

      writeLine({
        type: 'meta',
        fields: resultSet?.fields ?? [],
        command: inferMssqlCommand(query),
      });

      const rows = resultSet?.rows ?? [];

      for (let index = 0; index < rows.length; index += STREAM_BATCH_SIZE) {
        writeLine({
          type: 'rows',
          data: rows.slice(index, index + STREAM_BATCH_SIZE),
        });
      }

      writeLine({
        type: 'done',
        rowCount: resultSet ? rows.length : rowsAffected,
        queryTime: Number((performance.now() - startTime).toFixed(2)),
      });

      res.end();
    } catch (error: any) {
      const payloadError = {
        dbType: this.dbType,
        ...error,
        message: error?.message,
      } as DatabaseDriverError;
      const normalizeError = new ErrorNormalizer(payloadError)
        .nomaltliztionErrror;

      writeLine({
        type: 'error',
        message: error?.message || 'Unknown query error',
        error: {
          ...payloadError,
          normalizeError: {
            dbType: this.dbType,
            ...normalizeError,
          },
        },
      });

      res.end();
    }
  }
}
