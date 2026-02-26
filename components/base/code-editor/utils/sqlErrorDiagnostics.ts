import type { Diagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';
import { knex, type Knex } from 'knex';
import { pushDiagnostics } from './diagnostic-lint';

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

export type SupportedKnexClient =
  | 'pg'
  | 'mysql'
  | 'mysql2'
  | 'sqlite3'
  | 'better-sqlite3'
  | 'mssql'
  | 'oracledb';

interface SqlErrorDetail {
  position?: number | string;
  message?: string;
  [key: string]: unknown;
}

export interface ApplySqlErrorDiagnosticsOptions {
  editorView: EditorView | null | undefined;
  originalSql: string;
  statementFrom: number;
  fileParameters?: Record<string, unknown>;
  rawErrorMessage: string;
  clientType: SupportedKnexClient;
}

/* -------------------------------------------------------------------------- */
/*                         Map Error Position Logic                           */
/* -------------------------------------------------------------------------- */

/**
 * Map driver error position (1-based)
 * back to original SQL
 */
function mapErrorPosition(
  originalSql: string,
  runningSql: string,
  errorPos: number
): number {
  if (originalSql === runningSql) return errorPos;

  let origIdx = 0;
  let runIdx = 0;

  while (runIdx < errorPos && origIdx < originalSql.length) {
    const origChar = originalSql[origIdx];
    const runChar = runningSql[runIdx];

    const isOrigSpace = /\s/.test(origChar);
    const isRunSpace = /\s/.test(runChar);

    // Handle whitespace
    if (isOrigSpace && isRunSpace) {
      origIdx++;
      runIdx++;
      continue;
    }

    // Handle named → positional placeholder (:name → $1 / ?)
    if (origChar === ':' && (runChar === '$' || runChar === '?')) {
      while (
        origIdx < originalSql.length &&
        /[:a-zA-Z0-9_]/.test(originalSql[origIdx])
      ) {
        origIdx++;
      }

      // Skip $1 / $12
      if (runChar === '$') {
        while (
          runIdx < runningSql.length &&
          /[$0-9]/.test(runningSql[runIdx])
        ) {
          runIdx++;
        }
      } else {
        // Skip single ?
        runIdx++;
      }

      if (runIdx >= errorPos) return origIdx;
      continue;
    }

    if (origChar === runChar) {
      origIdx++;
      runIdx++;
    } else {
      origIdx++;
    }
  }

  return origIdx;
}

/* -------------------------------------------------------------------------- */
/*                          Main Public Function                              */
/* -------------------------------------------------------------------------- */

export function applySqlErrorDiagnostics({
  editorView,
  originalSql,
  statementFrom,
  fileParameters = {},
  rawErrorMessage,
  clientType,
}: ApplySqlErrorDiagnosticsOptions): void {
  if (!editorView || !rawErrorMessage) return;

  let errorDetail: SqlErrorDetail | null = null;

  try {
    errorDetail = JSON.parse(rawErrorMessage) as SqlErrorDetail;
  } catch {
    pushFullLineError(editorView, statementFrom, originalSql, rawErrorMessage);
    return;
  }

  if (!errorDetail?.position) {
    pushFullLineError(editorView, statementFrom, originalSql, rawErrorMessage);
    return;
  }

  const numericPosition =
    typeof errorDetail.position === 'string'
      ? Number(errorDetail.position)
      : errorDetail.position;

  if (!numericPosition || Number.isNaN(numericPosition)) {
    pushFullLineError(editorView, statementFrom, originalSql, rawErrorMessage);
    return;
  }

  // 🔥 Dynamic knex creation based on clientType
  const knexInstance: Knex = knex({
    client: clientType,
  });

  const formatted = knexInstance
    .raw(originalSql, fileParameters)
    .toSQL()
    .toNative();

  const mappedPos = mapErrorPosition(
    originalSql,
    formatted.sql,
    numericPosition
  );

  const startOffset = Math.max(mappedPos - 1, 0);

  const { from, to } = calculateTokenRange(
    originalSql,
    statementFrom,
    startOffset
  );

  const diagnostics: Diagnostic[] = [
    {
      from,
      to,
      severity: 'error',
      message: errorDetail.message || rawErrorMessage,
    },
  ];

  pushDiagnostics(editorView, diagnostics);
}

/* -------------------------------------------------------------------------- */
/*                                Helpers                                     */
/* -------------------------------------------------------------------------- */

function calculateTokenRange(
  sql: string,
  statementFrom: number,
  startOffset: number
): { from: number; to: number } {
  let endOffset = startOffset;

  while (endOffset < sql.length && !/[\s\n\r\t]/.test(sql[endOffset])) {
    endOffset++;
  }

  return {
    from: statementFrom + startOffset,
    to: statementFrom + endOffset,
  };
}

function pushFullLineError(
  editorView: EditorView,
  statementFrom: number,
  sql: string,
  message: string
): void {
  const diagnostics: Diagnostic[] = [
    {
      from: statementFrom,
      to: statementFrom + sql.length,
      severity: 'error',
      message,
    },
  ];

  pushDiagnostics(editorView, diagnostics);
}

export function clearSqlErrorDiagnostics(editorView: EditorView): void {
  pushDiagnostics(editorView, []);
}
