import type { H3Event } from 'h3';
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

/**
 * Serialize a single SQLite row (named object) for JSON transport.
 * Node.js Buffer values (BLOB columns) are converted to hex strings so they
 * survive JSON.stringify without turning into {"type":"Buffer","data":[...]} objects.
 */
function serializeSqliteRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = Buffer.isBuffer(value)
      ? (value as Buffer).toString('hex')
      : value;
  }
  return out;
}

function arrayRowsToObjects(
  rows: unknown[][],
  fields: DatabaseField[]
): Record<string, unknown>[] {
  return rows.map(row =>
    Object.fromEntries(fields.map((field, index) => [field.name, row[index]]))
  );
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
      rows: arrayRowsToObjects(result.rows, fields).map(serializeSqliteRow),
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
