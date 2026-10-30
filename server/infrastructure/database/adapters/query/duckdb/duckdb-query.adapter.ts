import type { H3Event } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseDriverNormalizerError as ErrorNormalizer } from '~/core/helpers';
import type {
  DatabaseField,
  QueryResult,
  RawQueryResultWithMetadata,
} from '~/core/types';
import type { RawQueryResult } from '~/server/infrastructure/driver/types';
import { BaseDomainAdapter } from '../../shared';
import type {
  DatabaseQueryAdapterParams,
  IDatabaseQueryAdapter,
} from '../types';

const STREAM_BATCH_SIZE = 10_000;

/**
 * STRUCT and MAP values arrive as plain objects, which the result grid would
 * show as "[object Object]"; their JSON text is what users can read and copy.
 */
function serializeDuckDbValue(value: unknown): unknown {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? JSON.stringify(value)
    : value;
}

function arrayRowsToObjects(
  rows: unknown[][],
  fields: DatabaseField[]
): Record<string, unknown>[] {
  return rows.map(row =>
    Object.fromEntries(
      fields.map((field, index) => [
        field.name,
        serializeDuckDbValue(row[index]),
      ])
    )
  );
}

export class DuckDbQueryAdapter
  extends BaseDomainAdapter
  implements IDatabaseQueryAdapter
{
  readonly dbType = DatabaseClientType.DUCKDB;

  static async create(
    params: DatabaseQueryAdapterParams
  ): Promise<DuckDbQueryAdapter> {
    const adapter = await DuckDbQueryAdapter.resolveAdapter(
      params,
      DatabaseClientType.DUCKDB
    );

    return new DuckDbQueryAdapter(adapter);
  }

  private resolveStatement(
    query: string,
    params?: any[] | Record<string, any>
  ): { sql: string; bindings: unknown[] } {
    if (Array.isArray(params)) {
      return { sql: query, bindings: params };
    }

    // Without named params the text must reach DuckDB untouched: Knex would
    // rewrite `?` and treat `:name` in slices and struct literals as bindings.
    if (!params || !Object.keys(params).length) {
      return { sql: query, bindings: [] };
    }

    const mappingParams = Object.fromEntries(
      Object.entries(params).map(([key, value]) => [
        key,
        Array.isArray(value)
          ? this.adapter.knex.raw(value.map(() => '?').join(', '), value)
          : value,
      ])
    );
    const nativeSql = this.adapter.getNativeSql(query, mappingParams);

    return {
      sql: nativeSql.sql,
      bindings: Array.from(nativeSql.bindings ?? []),
    };
  }

  private async runRawOut(
    query: string,
    params?: any[] | Record<string, any>
  ): Promise<{ output: RawQueryResult<unknown[]>; queryTime: number }> {
    const { sql, bindings } = this.resolveStatement(query, params);
    const { result, queryTime } = await this.withTiming(() =>
      this.adapter.rawOut<unknown[]>(sql, bindings as any[])
    );

    return { output: result, queryTime };
  }

  async execute(query: string): Promise<QueryResult> {
    const { output, queryTime } = await this.runRawOut(query);

    return {
      result: arrayRowsToObjects(
        output.rows,
        (output.fields ?? []) as DatabaseField[]
      ),
      queryTime,
    };
  }

  async rawExecute(
    query: string,
    params?: any[] | Record<string, any>
  ): Promise<RawQueryResultWithMetadata> {
    const { output, queryTime } = await this.runRawOut(query, params);
    const fields = (output.fields ?? []) as DatabaseField[];

    return {
      rows: arrayRowsToObjects(output.rows, fields),
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

    try {
      const { output, queryTime } = await this.runRawOut(query, params);
      const fields = (output.fields ?? []) as DatabaseField[];
      const rows = arrayRowsToObjects(output.rows, fields);

      writeLine({ type: 'meta', fields, command: output.command || 'QUERY' });

      for (let index = 0; index < rows.length; index += STREAM_BATCH_SIZE) {
        writeLine({
          type: 'rows',
          data: rows.slice(index, index + STREAM_BATCH_SIZE),
        });
      }

      writeLine({
        type: 'done',
        rowCount: output.rowCount ?? rows.length,
        queryTime,
      });

      res.end();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown query error';
      const normalizeError = new ErrorNormalizer({
        dbType: this.dbType,
        message,
      }).nomaltliztionErrror;

      writeLine({
        type: 'error',
        message,
        error: {
          dbType: this.dbType,
          message,
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
