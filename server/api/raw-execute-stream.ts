import { readBody, defineEventHandler, createError } from 'h3';
import QueryStream from 'pg-query-stream';
import { getDatabaseSource } from '../utils/db-connection';

/**
 * Number of rows to buffer before flushing as a single NDJSON message.
 * Balances between per-row overhead and time-to-first-paint.
 */
const STREAM_BATCH_SIZE = 10_000;

/**
 * NDJSON streaming endpoint for raw SQL execution.
 *
 * Protocol (newline-delimited JSON):
 *   {"type":"meta","fields":[...],"command":"SELECT"}
 *   {"type":"rows","data":[[1,"a"],[2,"b"],...]}
 *   {"type":"done","rowCount":4,"queryTime":123.45}
 *   {"type":"error","message":"..."}
 */
export default defineEventHandler(async event => {
  const body = await readBody<{
    query: string;
    dbConnectionString: string;
    params?: Record<string, unknown>;
  }>(event);

  if (!body.query || !body.dbConnectionString) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: query, dbConnectionString',
    });
  }

  const res = event.node.res;

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const startTime = performance.now();

  const adapter = await getDatabaseSource({
    dbConnectionString: body.dbConnectionString,
    type: 'postgres',
  });

  const { bindings, sql } = adapter.getNativeSql(body.query, body.params || {});

  const client = await adapter.acquireRawConnection();

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
        text: body.query,
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
    // We still need field metadata before we can send rows.
    // pg-query-stream emits 'fields' on the underlying Result object.

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
    await adapter.releaseRawConnection(client);
  }
});
