import { createError, type H3Event } from 'h3';
import QueryStream from 'pg-query-stream';
import type {
  QueryResult,
  RawQueryResultWithMetadata,
  DatabaseField,
} from '~/core/types';
import { BaseDomainAdapter, SupportedDatabaseType } from '../../shared';
import type {
  IDatabaseQueryAdapter,
  DatabaseQueryAdapterParams,
} from '../types';

const STREAM_BATCH_SIZE = 10_000;

export class PostgresQueryAdapter
  extends BaseDomainAdapter
  implements IDatabaseQueryAdapter
{
  readonly dbType = SupportedDatabaseType.POSTGRES;

  static async create(
    params: DatabaseQueryAdapterParams
  ): Promise<PostgresQueryAdapter> {
    const adapter = await PostgresQueryAdapter.resolveAdapter(
      params,
      SupportedDatabaseType.POSTGRES
    );
    return new PostgresQueryAdapter(adapter);
  }

  async execute(query: string): Promise<QueryResult> {
    const startTime = performance.now();
    const result = await this.adapter.rawQuery<Record<string, unknown>>(query);
    const endTime = performance.now();

    return {
      result,
      queryTime: Number((endTime - startTime).toFixed(2)),
    };
  }

  async rawExecute(
    query: string,
    params?: any[] | Record<string, any>
  ): Promise<RawQueryResultWithMetadata> {
    const startTime = performance.now();
    const result = await this.adapter.rawOut(query, params as any[]);
    const endTime = performance.now();

    return {
      rows: result.rows,
      fields: result.fields as DatabaseField[],
      queryTime: Number((endTime - startTime).toFixed(2)),
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

    const startTime = performance.now();
    const { bindings, sql } = this.adapter.getNativeSql(query, params || {});
    const client = await this.adapter.acquireRawConnection();

    /** Write a single NDJSON line to the response. */
    const writeLine = (data: Record<string, unknown>) => {
      res.write(JSON.stringify(data) + '\n');
    };

    try {
      // Detect query type: SELECT queries get cursor-based streaming,
      // everything else executes normally
      const trimmedQuery = sql.trim().toUpperCase();
      const isSelectLike =
        trimmedQuery.startsWith('SELECT') ||
        trimmedQuery.startsWith('WITH') ||
        trimmedQuery.startsWith('TABLE') ||
        trimmedQuery.startsWith('VALUES');

      if (!isSelectLike) {
        // Non-SELECT: execute once, send result directly
        const result = await client.query({
          text: sql,
          values: bindings,
          rowMode: 'array',
        });

        writeLine({
          type: 'meta',
          fields: result.fields || [],
          command: result.command || '',
        });

        if (result.rows?.length > 0) {
          writeLine({ type: 'rows', data: result.rows });
        }

        const endTime = performance.now();
        writeLine({
          type: 'done',
          rowCount: result.rowCount || 0,
          queryTime: Number((endTime - startTime).toFixed(2)),
        });

        res.end();
        return;
      }

      // SELECT: use pg-query-stream for cursor-based streaming.
      const queryStream = new QueryStream(sql, bindings as any, {
        batchSize: STREAM_BATCH_SIZE,
        rowMode: 'array',
        highWaterMark: STREAM_BATCH_SIZE,
      });

      const dbStream = client.query(queryStream);

      // Wait for the first data or end to extract fields from the cursor.
      let metaSent = false;
      let batch: unknown[][] = [];
      let totalRows = 0;

      const sendMeta = () => {
        if (metaSent) return;
        metaSent = true;

        // pg QueryStream exposes ._result.fields after the first read
        const fields =
          (dbStream as any)._result?.fields ||
          (dbStream as any).cursor?._result?.fields ||
          [];

        writeLine({
          type: 'meta',
          fields,
          command: 'SELECT',
        });
      };

      for await (const row of dbStream) {
        // Send meta on first row arrival
        if (!metaSent) {
          sendMeta();
        }

        batch.push(row);
        totalRows++;

        if (batch.length >= STREAM_BATCH_SIZE) {
          writeLine({ type: 'rows', data: batch });
          batch = [];
        }
      }

      // If query returned 0 rows, still send meta
      if (!metaSent) {
        sendMeta();
      }

      // Flush remaining rows
      if (batch.length > 0) {
        writeLine({ type: 'rows', data: batch });
      }

      const endTime = performance.now();
      writeLine({
        type: 'done',
        rowCount: totalRows,
        queryTime: Number((endTime - startTime).toFixed(2)),
      });

      res.end();
    } catch (error: any) {
      const message = error?.message || 'Unknown query error';

      try {
        writeLine({ type: 'error', message });
        res.end();
      } catch {
        // Response already destroyed
        throw createError({
          statusCode: 500,
          message,
        });
      }
    } finally {
      await this.adapter.releaseRawConnection(client);
    }
  }
}
