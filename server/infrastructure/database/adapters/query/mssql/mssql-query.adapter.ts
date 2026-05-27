import type { H3Event } from 'h3';
import { Readable } from 'node:stream';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseDriverNormalizerError as ErrorNormalizer } from '~/core/helpers';
import type {
  DatabaseDriverError,
  DatabaseField,
  QueryResult,
  RawQueryResultWithMetadata,
} from '~/core/types';
import { BaseDomainAdapter } from '../../shared';
import type {
  DatabaseQueryAdapterParams,
  IDatabaseQueryAdapter,
} from '../types';

const STREAM_BATCH_SIZE = 10_000;

function createSyntheticFields(columnNames: string[]): DatabaseField[] {
  return columnNames.map((name, index) => ({
    name,
    tableID: 0,
    columnID: index,
    dataTypeID: 0,
    dataTypeSize: 0,
    dataTypeModifier: 0,
    format: 'text',
  }));
}

function arrayRowsToObjects(
  rows: unknown[][],
  fields: DatabaseField[]
): Record<string, unknown>[] {
  return rows.map(row =>
    Object.fromEntries(fields.map((field, index) => [field.name, row[index]]))
  );
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

  async execute(query: string): Promise<QueryResult> {
    const { result, queryTime } = await this.withTiming(() =>
      this.adapter.rawQuery<Record<string, unknown>>(query)
    );

    return {
      result,
      queryTime,
    };
  }

  async rawExecute(
    query: string,
    params?: any[] | Record<string, any>
  ): Promise<RawQueryResultWithMetadata> {
    const mappingParams: Record<string, any> = {};

    if (params && !Array.isArray(params)) {
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          mappingParams[key] = this.adapter.knex.raw(
            value.map(() => '?').join(', '),
            value
          );
        } else {
          mappingParams[key] = value;
        }
      }
    }

    const nativeSql = Array.isArray(params)
      ? { sql: query, bindings: params }
      : this.adapter.getNativeSql(query, mappingParams || {});
    const nativeBindings = Array.from(nativeSql.bindings ?? []) as any[];

    const { result, queryTime } = await this.withTiming(() =>
      this.adapter.rawOut<unknown[]>(nativeSql.sql, nativeBindings)
    );

    const fields = (result.fields ?? []) as DatabaseField[];

    return {
      rows: arrayRowsToObjects(result.rows, fields),
      fields,
      queryTime,
    };
  }

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

    const trimmedQuery = query.trim().toUpperCase();
    const isSelectLike =
      trimmedQuery.startsWith('SELECT') ||
      trimmedQuery.startsWith('WITH') ||
      trimmedQuery.startsWith('EXEC') ||
      trimmedQuery.startsWith('EXECUTE');

    const startTime = performance.now();

    // Temporary fallback: mssql knex stream is hanging, use rawExecute for all queries
    try {
      const result = await this.rawExecute(query, params);
      
      const fields = result.fields || [];
      writeLine({
        type: 'meta',
        fields,
        command: trimmedQuery.split(/\s+/, 1)[0] || (isSelectLike ? 'SELECT' : 'QUERY'),
      });

      // Stream out the rows in batches to the client
      const rows = result.rows || [];
      const batchSize = STREAM_BATCH_SIZE;
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        writeLine({ type: 'rows', data: batch });
      }

      writeLine({
        type: 'done',
        rowCount: rows.length,
        queryTime: result.queryTime,
      });

      res.end();
    } catch (error: any) {
      this.handleStreamError(error, res, writeLine);
    }
  }

  private handleStreamError(error: any, res: any, writeLine: (data: Record<string, unknown>) => void) {
    const payloadError = {
      dbType: this.dbType,
      ...error,
    } as DatabaseDriverError;
    const normalizeError = new ErrorNormalizer(payloadError).nomaltliztionErrror;

    try {
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
    } catch {
      // response already closed
    }
  }
}
