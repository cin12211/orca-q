import type { FieldDef } from 'pg';
import type { DatabaseDriverError } from '~/core/types';
import type { Connection } from '~/core/types/entities';

export type { MappedRawColumn } from '~/core/types/mapped-column.types';

// Defined inline to avoid importing from dynamic-table utils which has browser API dependencies
type RowData = { [key: string]: unknown };

export interface EditorCursor {
  line: number;
  column: number;
}

export type ExplainAnalyzeOptionKey =
  | 'BUFFERS'
  | 'COSTS'
  | 'GENERIC_PLAN'
  | 'MEMORY'
  | 'SERIALIZE'
  | 'SETTINGS'
  | 'SUMMARY'
  | 'TIMING'
  | 'VERBOSE'
  | 'WAL';

export type ExplainAnalyzeToggleOptionKey = Exclude<
  ExplainAnalyzeOptionKey,
  'SERIALIZE'
>;

export type ExplainAnalyzeSerializeMode = 'NONE' | 'TEXT' | 'BINARY';

export interface ExplainAnalyzeOptionItem {
  key: ExplainAnalyzeToggleOptionKey;
  label: string;
  checked: boolean;
}

export enum ViewMode {
  RESULT = 'result',
  ERROR = 'error',
  INFO = 'info',
  RAW = 'raw',
  EXPLAIN = 'explain',
  CHART = 'chart',
}

export enum StatementRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled',
}

/** Final state of one statement run by the sequential runner. */
export type StatementRunOutcome =
  | StatementRunStatus.SUCCESS
  | StatementRunStatus.ERROR
  | StatementRunStatus.CANCELLED;

/**
 * Result of one statement inside a multi-statement run. Every statement of the
 * run lives in a single result tab, stacked vertically.
 */
export interface StatementResultItem {
  id: string;
  /** 0-based position in the selection. */
  index: number;
  /** Start offset of the statement in the editor, for error diagnostics. */
  from: number;
  statementQuery: string;
  status: StatementRunStatus;
  queryTime: number;
  rowCount?: number;
  command?: string;
  fieldDefs?: FieldDef[];
  connection?: Connection | undefined;
  executeErrors?: ExecutedResultItem['metadata']['executeErrors'];
  result: RowData[];
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
  };
  result: RowData[];
  seqIndex: number;
  view: ViewMode;
  /** Set when the tab holds a multi-statement run (one entry per statement). */
  statements?: StatementResultItem[];
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
