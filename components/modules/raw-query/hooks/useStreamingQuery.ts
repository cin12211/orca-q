import type { FieldDef } from 'pg';
import type { RowData } from '~/components/base/dynamic-table/utils';
import type { DatabaseDriverError } from '~/core/types';
import type { IManagedSqliteConfig } from '~/core/types/entities/connection.entity';
import type { ExecutedResultItem } from '../interfaces';

/**
 * NDJSON message types sent by the streaming endpoint.
 */
interface StreamMetaMessage {
  type: 'meta';
  fields: FieldDef[];
  command: string;
}

interface StreamRowsMessage {
  type: 'rows';
  data: RowData[];
}

interface StreamDoneMessage {
  type: 'done';
  rowCount: number;
  queryTime: number;
}

interface StreamErrorMessage {
  type: 'error';
  message: string;
  error?: Record<string, any>;
}

type StreamMessage =
  | StreamMetaMessage
  | StreamRowsMessage
  | StreamDoneMessage
  | StreamErrorMessage;

export interface StreamingQueryCallbacks {
  onMeta?: (fields: FieldDef[], command: string) => void;
  onRows?: (rows: RowData[], totalSoFar: number) => void;
  onDone?: (rowCount: number, queryTime: number) => void;
  onError?: (message: string, errorDetail?: DatabaseDriverError) => void;
}

/**
 * Executes a streaming query via the NDJSON endpoint.
 *
 * Returns an AbortController so the caller can cancel mid-flight.
 *
 * @example
 * ```ts
 * const { abort } = executeStreamingQuery({
 *   query: 'SELECT * FROM big_table',
 *   dbConnectionString: '...',
 *   onMeta: (fields) => { ... },
 *   onRows: (batch, total) => { ... },
 *   onDone: (count, time) => { ... },
 *   onError: (msg) => { ... },
 * });
 *
 * // To cancel:
 * abort();
 * ```
 */
export function executeStreamingQuery({
  query,
  dbConnectionString,
  type,
  providerKind,
  managedSqlite,
  params,
  onMeta,
  onRows,
  onDone,
  onError,
}: {
  query: string;
  dbConnectionString: string;
  type?: string;
  providerKind?: string;
  managedSqlite?: IManagedSqliteConfig;
  params?: Record<string, unknown>;
} & StreamingQueryCallbacks) {
  const controller = new AbortController();
  let totalRows = 0;

  const run = async () => {
    try {
      const response = await fetch('/api/query/raw-execute-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          dbConnectionString,
          type,
          providerKind,
          managedSqlite,
          params: params || {},
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        onError?.(errorText || `HTTP ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError?.('No readable stream available');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines (NDJSON = one JSON object per line)
        const lines = buffer.split('\n');
        // Keep incomplete last line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const message: StreamMessage = JSON.parse(trimmed);

            switch (message.type) {
              case 'meta':
                onMeta?.(message.fields, message.command);
                break;

              case 'rows':
                totalRows += message.data.length;
                onRows?.(message.data, totalRows);
                break;

              case 'done':
                onDone?.(message.rowCount, message.queryTime);
                break;

              case 'error':
                onError?.(
                  message.message,
                  message.error as DatabaseDriverError
                );
                break;
            }
          } catch {
            // Skip malformed lines
            console.warn('[StreamingQuery] Malformed NDJSON line:', trimmed);
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          const message: StreamMessage = JSON.parse(buffer.trim());
          if (message.type === 'done') {
            onDone?.(message.rowCount, message.queryTime);
          } else if (message.type === 'error') {
            onError?.(message.message);
          }
        } catch {
          // Ignore
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Query was cancelled by user — not an error
        return;
      }
      onError?.(error.message || 'Stream connection failed');
    }
  };

  // Fire and forget — the callbacks drive the state
  run();

  return {
    abort: () => controller.abort(),
  };
}
