import type { FieldDef } from 'pg';
import type { RowData } from '~/components/base/data-grid/utils';
import type { Connection } from '~/core/stores';
import type { DatabaseDriverError } from '~/core/types';

export interface RawQueryExecuteRequest {
  connection: Connection | undefined;
  /** Final statement text, prefix already applied by the caller. */
  query: string;
  params: Record<string, unknown>;
}

export interface RawQueryExecuteError {
  message: string;
  detail?: DatabaseDriverError;
}

export interface RawQueryExecuteHandlers {
  /** Column metadata; call once, before any rows. */
  onMeta(fields: FieldDef[], command?: string): void;
  /** A batch of rows plus the running total. Streaming engines call repeatedly. */
  onRows(rows: RowData[], totalSoFar: number): void;
  onComplete(summary: { rowCount: number; queryTime: number }): void;
  onError(error: RawQueryExecuteError): void;
}

export interface RawQueryExecuteHandle {
  abort(): void;
}

export interface RawQueryExecutor {
  /** True when rows arrive progressively, so the UI shows the streaming indicator. */
  readonly streaming?: boolean;
  execute(
    request: RawQueryExecuteRequest,
    handlers: RawQueryExecuteHandlers
  ): RawQueryExecuteHandle;
}
