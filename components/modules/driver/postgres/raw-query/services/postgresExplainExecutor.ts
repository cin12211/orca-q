import type { FieldDef } from 'pg';
import type { RowData } from '~/components/base/data-grid/utils';
import type {
  RawQueryExecuteHandle,
  RawQueryExecuteHandlers,
  RawQueryExecuteRequest,
  RawQueryExecutor,
} from '~/components/modules/raw-query/contracts';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { DatabaseDriverError } from '~/core/types';

interface RawExecuteResponse {
  rows: RowData[];
  fields: FieldDef[];
  queryTime?: number;
}

/**
 * EXPLAIN returns one plan row, so it uses the non-streaming endpoint.
 * Streaming would add a round trip for no benefit.
 */
export const postgresExplainExecutor: RawQueryExecutor = {
  execute(
    request: RawQueryExecuteRequest,
    handlers: RawQueryExecuteHandlers
  ): RawQueryExecuteHandle {
    const connectionParams = getConnectionParams(request.connection);

    void (async () => {
      try {
        const result = await $fetch<RawExecuteResponse>(
          '/api/query/raw-execute',
          {
            method: 'POST',
            body: {
              ...connectionParams,
              query: request.query,
              params: request.params,
            },
          }
        );

        handlers.onMeta(result.fields, undefined);
        handlers.onRows(result.rows, result.rows.length);
        handlers.onComplete({
          rowCount: result.rows.length,
          queryTime: result.queryTime ?? 0,
        });
      } catch (error: unknown) {
        const failure = error as {
          data?: { message?: string; data?: DatabaseDriverError };
          message?: string;
        };
        const message =
          failure?.data?.message ||
          failure?.message ||
          'Failed to run EXPLAIN.';

        handlers.onError({
          message, // `failure.data` is the whole H3 body; the driver error is nested in its `data`.
          detail:
            failure?.data?.data ??
            (failure?.data as DatabaseDriverError | undefined),
        });
      }
    })();

    return { abort: () => undefined };
  },
};
