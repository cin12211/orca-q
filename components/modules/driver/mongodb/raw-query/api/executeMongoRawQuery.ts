import type {
  MongoRawQueryApprovalResponse,
  MongoRawQueryRequest,
  MongoRawQueryStreamMessage,
} from '~/core/types/mongodb-raw-query.types';
import { isMongoRawQueryStreamMessage } from '~/core/types/mongodb-raw-query.types';

export interface MongoRawQueryCallbacks {
  onMeta?: (
    message: Extract<MongoRawQueryStreamMessage, { type: 'meta' }>
  ) => void;
  onRows?: (rows: Record<string, unknown>[], totalRows: number) => void;
  onResult?: (
    message: Extract<MongoRawQueryStreamMessage, { type: 'result' }>
  ) => void;
  onLog?: (
    entry: Extract<MongoRawQueryStreamMessage, { type: 'log' }>['entry']
  ) => void;
  onApprovalRequired?: (
    message: Extract<MongoRawQueryStreamMessage, { type: 'approval-required' }>
  ) => void;
  onDone?: (
    message: Extract<MongoRawQueryStreamMessage, { type: 'done' }>
  ) => void;
  onError?: (
    error: Error,
    message?: Extract<MongoRawQueryStreamMessage, { type: 'error' }>
  ) => void;
}

export interface MongoRawQueryExecution {
  finished: Promise<void>;
  abort(): void;
}

export function executeMongoRawQuery(
  options: MongoRawQueryRequest & MongoRawQueryCallbacks
): MongoRawQueryExecution {
  const controller = new AbortController();
  const finished = (async () => {
    try {
      const response = await fetch('/api/mongodb/raw-query-stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(options),
        signal: controller.signal,
      });
      if (!response.ok || !response.body)
        throw new Error(`Mongo query failed (${response.status})`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let rowCount = 0;
      const consume = (line: string) => {
        if (!line.trim()) return;
        let payload: unknown;
        try {
          payload = JSON.parse(line);
        } catch {
          options.onError?.(new Error('Malformed Mongo NDJSON event'));
          return;
        }
        if (!isMongoRawQueryStreamMessage(payload)) {
          options.onError?.(new Error('Unknown Mongo NDJSON event'));
          return;
        }
        if (payload.type === 'meta') options.onMeta?.(payload);
        else if (payload.type === 'rows') {
          rowCount += payload.data.length;
          options.onRows?.(payload.data, rowCount);
        } else if (payload.type === 'result') options.onResult?.(payload);
        else if (payload.type === 'log') options.onLog?.(payload.entry);
        else if (payload.type === 'approval-required')
          options.onApprovalRequired?.(payload);
        else if (payload.type === 'done') options.onDone?.(payload);
        else if (payload.type === 'error')
          options.onError?.(new Error(payload.message), payload);
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        lines.forEach(consume);
      }
      buffer += decoder.decode();
      consume(buffer);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      options.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  })();
  return { finished, abort: () => controller.abort() };
}

export async function approveMongoRawQuery(
  challengeId: string
): Promise<MongoRawQueryApprovalResponse> {
  const response = await fetch('/api/mongodb/raw-query-approve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challengeId }),
  });
  if (!response.ok)
    throw new Error(`Mongo approval failed (${response.status})`);
  return response.json() as Promise<MongoRawQueryApprovalResponse>;
}
