import type { FieldDef } from 'pg';
import type { DatabaseDriverError } from '~/core/types';
import type { Connection } from '~/core/types/entities';
import type {
  MongoRawQueryLogEntry,
  MongoRawQueryMutationSummary,
} from '~/core/types/mongodb-raw-query.types';

export type { MappedRawColumn } from '~/core/types/mapped-column.types';

// Defined inline to avoid importing from dynamic-table utils which has browser API dependencies
type RowData = { [key: string]: unknown };

export interface EditorCursor {
  line: number;
  column: number;
}

export enum ViewMode {
  RESULT = 'result',
  ERROR = 'error',
  INFO = 'info',
  RAW = 'raw',
  EXPLAIN = 'explain',
  CHART = 'chart',
  /** MongoDB script execution log output. */
  CONSOLE = 'console',
}

export interface ExecutedResultItem {
  id: string;
  metadata: {
    queryTime: number;
    statementQuery: string;
    executedAt: Date;
    executeErrors:
      | {
          message: string;
          data: Partial<DatabaseDriverError>;
        }
      | undefined;
    fieldDefs?: FieldDef[];
    connection?: Connection | undefined;
    command?: string;
    rowCount?: number;
    /** MongoDB: the shape of the script's return value (cursor, document, scalar, ...). */
    resultKind?: string;
    /** MongoDB: console.log/info/warn/error calls captured during script execution. */
    logs?: MongoRawQueryLogEntry[];
    /** MongoDB: summary of an insert/update/delete operation's effect. */
    mutationSummary?: MongoRawQueryMutationSummary;
    /** MongoDB: the raw (non-cursor) value the script returned. */
    rawResult?: unknown;
    /** MongoDB: whether the result set was truncated by the server-side row cap. */
    truncated?: boolean;
  };
  result: RowData[];
  seqIndex: number;
  view: ViewMode;
}

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  HORIZONTAL_BAR = 'horizontal-bar',
  AREA = 'area',
  STACKED_BAR = 'stacked-bar',
  PIE = 'pie',
  DONUT = 'donut',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  RADAR = 'radar',
}

export enum AggregationType {
  NONE = 'none',
  SUM = 'sum',
  AVG = 'avg',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
}

export enum SortByType {
  NONE = 'none',
  X_ASC = 'x-asc',
  X_DESC = 'x-desc',
  Y_ASC = 'y-asc',
  Y_DESC = 'y-desc',
}
