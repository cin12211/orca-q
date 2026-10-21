import { getConnectionParams } from '~/core/helpers/connection-helper';
import type {
  RawQueryExecuteHandle,
  RawQueryExecuteHandlers,
  RawQueryExecuteRequest,
  RawQueryExecutor,
} from '../contracts';
import { executeStreamingQuery } from '../hooks/useStreamingQuery';

/**
 * Default executor for every SQL engine: NDJSON streaming so rows render
 * progressively.
 */
export const sqlStreamingExecutor: RawQueryExecutor = {
  streaming: true,
  execute(
    request: RawQueryExecuteRequest,
    handlers: RawQueryExecuteHandlers
  ): RawQueryExecuteHandle {
    const connectionParams = getConnectionParams(request.connection);

    const { abort } = executeStreamingQuery({
      query: request.query,
      ...connectionParams,
      params: request.params,
      onMeta: (fields, command) => handlers.onMeta(fields, command),
      onRows: (rows, totalSoFar) => handlers.onRows(rows, totalSoFar),
      onDone: (rowCount, queryTime) =>
        handlers.onComplete({ rowCount, queryTime }),
      onError: (message, detail) => handlers.onError({ message, detail }),
    });

    return { abort };
  },
};
