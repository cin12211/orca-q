import {
  StatementRunStatus,
  type StatementResultItem,
  type StatementRunOutcome,
} from '../types';

interface StatementSource {
  text: string;
  from: number;
}

/**
 * Builds one pending result entry per selected statement.
 */
export function createPendingStatementResults(
  statements: StatementSource[],
  createId: () => string
): StatementResultItem[] {
  return statements.map((statement, index) => ({
    id: createId(),
    index,
    from: statement.from,
    statementQuery: statement.text,
    status: StatementRunStatus.PENDING,
    queryTime: 0,
    result: [],
  }));
}

/**
 * Runs statements one after another.
 *
 * Stops at the first error: the statements after it are reported as
 * `skipped`. A cancel (either an outcome of `cancelled` or `isCancelled()`
 * turning true between statements) marks the rest as `cancelled`.
 *
 * @returns the final status of every statement, in order.
 */
export async function runStatementsSequentially({
  count,
  runOne,
  isCancelled,
  onNotRun,
}: {
  count: number;
  runOne: (index: number) => Promise<StatementRunOutcome>;
  isCancelled: () => boolean;
  onNotRun?: (
    index: number,
    status: StatementRunStatus.SKIPPED | StatementRunStatus.CANCELLED
  ) => void;
}): Promise<StatementRunStatus[]> {
  const statuses: StatementRunStatus[] = [];
  let stopReason:
    | StatementRunStatus.SKIPPED
    | StatementRunStatus.CANCELLED
    | null = null;

  for (let index = 0; index < count; index += 1) {
    if (!stopReason && isCancelled()) {
      stopReason = StatementRunStatus.CANCELLED;
    }

    if (stopReason) {
      statuses.push(stopReason);
      onNotRun?.(index, stopReason);
      continue;
    }

    const outcome = await runOne(index);
    statuses.push(outcome);

    if (outcome === StatementRunStatus.ERROR) {
      stopReason = StatementRunStatus.SKIPPED;
    } else if (outcome === StatementRunStatus.CANCELLED) {
      stopReason = StatementRunStatus.CANCELLED;
    }
  }

  return statuses;
}

export interface StatementRunSummary {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  cancelled: number;
  pending: number;
  totalQueryTime: number;
}

/**
 * Counts statements per status and sums their query time.
 */
export function summarizeStatementResults(
  statements: Pick<StatementResultItem, 'status' | 'queryTime'>[]
): StatementRunSummary {
  const summary: StatementRunSummary = {
    total: statements.length,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
    pending: 0,
    totalQueryTime: 0,
  };

  for (const statement of statements) {
    summary.totalQueryTime += statement.queryTime || 0;

    switch (statement.status) {
      case StatementRunStatus.SUCCESS:
        summary.succeeded += 1;
        break;
      case StatementRunStatus.ERROR:
        summary.failed += 1;
        break;
      case StatementRunStatus.SKIPPED:
        summary.skipped += 1;
        break;
      case StatementRunStatus.CANCELLED:
        summary.cancelled += 1;
        break;
      default:
        summary.pending += 1;
    }
  }

  return summary;
}

/**
 * One-line preview of a statement for block headers: whitespace collapsed,
 * cut at `maxLength` with an ellipsis.
 */
export function toStatementPreview(sql: string, maxLength = 120): string {
  const singleLine = sql.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) {
    return singleLine;
  }

  return `${singleLine.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
