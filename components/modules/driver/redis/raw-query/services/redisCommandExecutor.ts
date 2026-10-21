import type {
  RawQueryExecuteHandle,
  RawQueryExecuteHandlers,
  RawQueryExecuteRequest,
  RawQueryExecutor,
} from '~/components/modules/raw-query/contracts';
import type { DatabaseDriverError } from '~/core/types';
import { normalizeRedisResult } from '../utils';

interface RedisCommandResponse {
  command?: string[];
  result: unknown;
}

/**
 * Redis runs through a dedicated workbench endpoint and returns the whole
 * reply at once, so there is nothing to stream and nothing to abort.
 */
export const createRedisCommandExecutor = (
  databaseIndex: Ref<number> | undefined
): RawQueryExecutor => ({
  execute(
    request: RawQueryExecuteRequest,
    handlers: RawQueryExecuteHandlers
  ): RawQueryExecuteHandle {
    const connection = request.connection;
    const startedAt = Date.now();

    void (async () => {
      try {
        const response = await $fetch<RedisCommandResponse>(
          '/api/redis/workbench/execute',
          {
            method: 'POST',
            body: {
              method: connection?.method,
              stringConnection: connection?.connectionString,
              host: connection?.host,
              port: connection?.port,
              username: connection?.username,
              password: connection?.password,
              database: connection?.database,
              databaseIndex: databaseIndex?.value,
              ssl: connection?.ssl,
              ssh: connection?.ssh,
              command: request.query,
            },
          }
        );

        const normalized = normalizeRedisResult(response.result);
        const command =
          response.command?.[0] ||
          request.query.trim().split(/\s+/)[0]?.toUpperCase() ||
          'REDIS';

        handlers.onMeta(normalized.fields, command);
        handlers.onRows(normalized.rows, normalized.rows.length);
        handlers.onComplete({
          rowCount: normalized.rows.length,
          queryTime: Date.now() - startedAt,
        });
      } catch (error: unknown) {
        const failure = error as {
          data?: { message?: string };
          message?: string;
        };
        const message =
          failure?.data?.message ||
          failure?.message ||
          'Failed to execute Redis command.';

        handlers.onError({
          message,
          detail: (failure?.data ?? { message }) as DatabaseDriverError,
        });
      }
    })();

    return { abort: () => undefined };
  },
});
