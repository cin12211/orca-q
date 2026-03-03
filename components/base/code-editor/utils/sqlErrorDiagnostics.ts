import type { Diagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';
import { knex, type Knex } from 'knex';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseDriverError as ErrorNormalizer } from '~/core/helpers';
import type { DatabaseDriverError } from '~/core/types';
import { pushDiagnostics } from './diagnostic-lint';

export interface ApplySqlErrorDiagnosticsOptions {
  editorView: EditorView | null | undefined;
  originalSql: string;
  statementFrom: number;
  fileParameters?: Record<string, unknown>;
  errorDetail?: DatabaseDriverError;
  clientType: DatabaseClientType;
  queryPrefix?: string;
}

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

export function applySqlErrorDiagnostics({
  editorView,
  originalSql,
  statementFrom,
  fileParameters = {},
  errorDetail,
  clientType,
  queryPrefix,
}: ApplySqlErrorDiagnosticsOptions): void {
  if (!editorView || !errorDetail) return;

  const { message, position: numericPosition } =
    (errorDetail as any).normalizeError ||
    new ErrorNormalizer(errorDetail).nomaltliztionErrror;

  if (!numericPosition) {
    pushFullLineError(editorView, statementFrom, originalSql, message);
    return;
  }

  const knexInstance: Knex = knex({
    client: clientType,
  });

  const mapOriginalSql = `${queryPrefix}${originalSql}`;

  const formatted = knexInstance
    .raw(mapOriginalSql, fileParameters)
    .toSQL()
    .toNative();

  const mappedPos = mapErrorPosition(
    mapOriginalSql,
    formatted.sql,
    numericPosition
  );

  const startOffset = Math.max(mappedPos - 1, 0) - (queryPrefix?.length || 0);

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
      message: message,
    },
  ];

  pushDiagnostics(editorView, diagnostics);
}

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
