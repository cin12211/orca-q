import type { H3Event } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseDriverNormalizerError as ErrorNormalizer } from '~/core/helpers';
import type {
  DatabaseField,
  QueryResult,
  RawQueryResultWithMetadata,
} from '~/core/types';
import type { DuckDbAdapter } from '~/server/infrastructure/driver/duckdb.adapter';
import type { RawQueryResult } from '~/server/infrastructure/driver/types';
import { BaseDomainAdapter } from '../../shared';
import type {
  DatabaseQueryAdapterParams,
  IDatabaseQueryAdapter,
} from '../types';

const STREAM_BATCH_SIZE = 10_000;

function isPlainObject(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * STRUCT values, and the entry lists that MAP and LIST of STRUCT arrive as, would
 * show as "[object Object]" in the result grid; their JSON text is readable.
 */
function serializeDuckDbValue(value: unknown): unknown {
  const isNested =
    isPlainObject(value) || (Array.isArray(value) && value.some(isPlainObject));

  return isNested ? JSON.stringify(value) : value;
}

// Strings, comments, casts, slices and struct literals pass through untouched,
// so `[1:n]` and `{'k': v}` are not read as variables.
const NAMED_PARAM_TOKENS =
  /'(?:[^']|'')*'|"(?:[^"]|"")*"|--[^\n]*|\/\*[\s\S]*?\*\/|::|\[[^\]]*\]|\{[^}]*\}|(?<![\w:]):([A-Za-z_]\w*)/g;

function compileNamedParams(
  query: string,
  params: Record<string, any>
): { sql: string; bindings: unknown[] } {
  const bindings: unknown[] = [];

  const sql = query.replace(
    NAMED_PARAM_TOKENS,
    (token, name: string | undefined) => {
      if (!name || !(name in params)) {
        return token;
      }

      const value = params[name];

      if (Array.isArray(value)) {
        bindings.push(...value);
        return value.map(() => '?').join(', ');
      }

      bindings.push(value);
      return '?';
    }
  );

  return { sql, bindings };
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

  private get driver() {
    return this.adapter as DuckDbAdapter;
  }

  private resolveStatement(
    query: string,
    params?: any[] | Record<string, any>
  ): { sql: string; bindings: unknown[] } {
    if (Array.isArray(params)) {
      return { sql: query, bindings: params };
    }

    if (!params || !Object.keys(params).length) {
      return { sql: query, bindings: [] };
    }

    return compileNamedParams(query, params);
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
    const { result, queryTime } = await this.withTiming(() =>
      this.adapter.rawQuery<Record<string, unknown>>(query)
    );

    return {
      result: result.map(row =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            serializeDuckDbValue(value),
          ])
        )
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

    let isClientGone = false;
    const onClose = () => {
      isClientGone = true;
      void this.driver.interruptQuery();
    };

    res.once('close', onClose);

    // Honours backpressure so a slow client cannot pile results up in memory.
    const writeLine = async (data: Record<string, unknown>) => {
      if (res.write(JSON.stringify(data) + '\n') || isClientGone) {
        return;
      }

      await new Promise<void>(resolve => {
        res.once('drain', resolve);
        res.once('close', resolve);
      });
    };

    const startTime = performance.now();
    let fields: DatabaseField[] = [];
    let pendingRows: Record<string, unknown>[] = [];

    const flushRows = async () => {
      if (pendingRows.length) {
        const data = pendingRows;
        pendingRows = [];
        await writeLine({ type: 'rows', data });
      }
    };

    try {
      const { sql, bindings } = this.resolveStatement(query, params);

      for await (const event of this.driver.streamResult(sql, bindings)) {
        if (isClientGone) {
          break;
        }

        if (event.type === 'meta') {
          fields = event.fields;
          await writeLine({
            type: 'meta',
            fields,
            command: event.command || 'QUERY',
          });
        } else if (event.type === 'rows') {
          pendingRows.push(...arrayRowsToObjects(event.rows, fields));

          if (pendingRows.length >= STREAM_BATCH_SIZE) {
            await flushRows();
          }
        } else {
          await flushRows();
          await writeLine({
            type: 'done',
            rowCount: event.rowCount,
            queryTime: Number((performance.now() - startTime).toFixed(2)),
          });
        }
      }

      res.end();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown query error';
      if (isClientGone) {
        res.end();
        return;
      }

      const normalizeError = new ErrorNormalizer({
        dbType: this.dbType,
        message,
      }).nomaltliztionErrror;

      await writeLine({
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
    } finally {
      res.off('close', onClose);
    }
  }
}
