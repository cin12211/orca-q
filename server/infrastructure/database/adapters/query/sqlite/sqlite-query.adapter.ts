import type { H3Event } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseDriverNormalizerError as ErrorNormalizer } from '~/core/helpers';
import type {
  DatabaseDriverError,
  DatabaseField,
  QueryResult,
  RawQueryResultWithMetadata,
} from '~/core/types';
import {
  createSyntheticFields,
  mapArrayRowsToObjects,
} from '~/server/infrastructure/driver/result-rows';
import { BaseDomainAdapter } from '../../shared';
import type {
  DatabaseQueryAdapterParams,
  IDatabaseQueryAdapter,
} from '../types';

const STREAM_BATCH_SIZE = 10_000;

/**
 * Binary value as a Node.js `Buffer`, whatever the SQLite driver returned:
 * `sqlite3` / `better-sqlite3` give a `Buffer`, `@libsql/client` (Turso) an
 * `ArrayBuffer`, which JSON would turn into `{}` and lose the bytes.
 * A `Buffer` reaches the browser as `{ type: 'Buffer', data: [...] }`, the
 * same shape as pg / mysql binary columns, so the grid shows `BINARY - n
 * bytes`, edits it in the binary editor and saves it as an `X'…'` literal.
 */
export function toTransportSqliteValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return value;
}

/** Serialize a single SQLite row (named object) for JSON transport. */
export function serializeSqliteRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = toTransportSqliteValue(value);
  }
  return out;
}

export class SqliteQueryAdapter
  extends BaseDomainAdapter
  implements IDatabaseQueryAdapter
{
  readonly dbType = DatabaseClientType.SQLITE3;

  static async create(
    params: DatabaseQueryAdapterParams
  ): Promise<SqliteQueryAdapter> {
    const adapter = await SqliteQueryAdapter.resolveAdapter(
      params,
      DatabaseClientType.SQLITE3
    );

    return new SqliteQueryAdapter(adapter);
  }

  async execute(query: string): Promise<QueryResult> {
    const { result, queryTime } = await this.withTiming(() =>
      this.adapter.rawQuery<Record<string, unknown>>(query)
    );

    return {
      // Quick Query reads through here: same binary shape as rawExecute.
      result: result.map(serializeSqliteRow),
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
      rows: mapArrayRowsToObjects(result.rows, fields).map(serializeSqliteRow),
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
      const result = await this.rawExecute(query, params);
      const fields =
        result.fields.length > 0
          ? result.fields
          : createSyntheticFields(Object.keys(result.rows[0] || {}));

      writeLine({
        type: 'meta',
        fields,
        command: query.trim().split(/\s+/, 1)[0]?.toUpperCase() || 'QUERY',
      });

      for (
        let index = 0;
        index < result.rows.length;
        index += STREAM_BATCH_SIZE
      ) {
        writeLine({
          type: 'rows',
          data: result.rows
            .slice(index, index + STREAM_BATCH_SIZE)
            .map(serializeSqliteRow),
        });
      }

      writeLine({
        type: 'done',
        rowCount: result.rows.length,
        queryTime: result.queryTime,
      });

      res.end();
    } catch (error: any) {
      const payloadError = {
        dbType: this.dbType,
        ...error,
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
