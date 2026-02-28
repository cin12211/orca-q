import type { H3Event } from 'h3';
import type { QueryResult, RawQueryResultWithMetadata } from '~/core/types';
import type {
  BaseDatabaseAdapterParams,
  SupportedDatabaseType,
} from '../shared';

export type DatabaseQueryAdapterParams = BaseDatabaseAdapterParams;

export interface IDatabaseQueryAdapter {
  readonly dbType: SupportedDatabaseType;

  /**
   * Simple execution returning only array of data rows.
   */
  execute(query: string): Promise<QueryResult>;

  /**
   * Execution returning rows and field metadata.
   */
  rawExecute(
    query: string,
    params?: any[] | Record<string, any>
  ): Promise<RawQueryResultWithMetadata>;

  /**
   * Stream the query execution output directly to the HTTP response using NDJSON protocol.
   */
  rawExecuteStream(
    event: H3Event,
    query: string,
    params?: Record<string, unknown>
  ): Promise<void>;
}
