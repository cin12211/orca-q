import type { Diagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseDriverNormalizerError as ErrorNormalizer } from '~/core/helpers';
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

// ─────────────────────────────────────────────────────────────────────────────
// substituteParams — browser-safe replacement for knex .raw().toSQL().toNative()
// ─────────────────────────────────────────────────────────────────────────────

/** The placeholder styles supported across the currently supported drivers. */
export type SqlDialectStyle =
  | 'postgres-positional'
  | 'oracle-positional'
  | 'question-mark';

/**
 * Options for {@link substituteParams}.
 * Designed to be extensible — new options can be added without breaking callers.
 */
export interface SubstituteParamsOptions {
  /**
   * Override the placeholder style.
   * When omitted the style is derived from `clientType`:
   * - `DatabaseClientType.POSTGRES` → `'postgres-positional'` (`$1`, `$2`, …)
   * - `DatabaseClientType.ORACLE`   → `'oracle-positional'` (`:1`, `:2`, …)
   * - all other clients             → `'question-mark'` (`?`)
   */
  style?: SqlDialectStyle;
  /**
   * Starting index for positional (`$N`) placeholders.
   * Useful when composing multi-fragment queries. Default: `1`.
   */
  startIndex?: number;
}

/**
 * Returns the SQL placeholder style that matches a given database client.
 * Exported so callers can inspect the dialect before calling `substituteParams`.
 */
export function getDialectStyle(
  clientType: DatabaseClientType
): SqlDialectStyle {
  if (clientType === DatabaseClientType.POSTGRES) {
    return 'postgres-positional';
  }

  if (clientType === DatabaseClientType.ORACLE) {
    return 'oracle-positional';
  }

  return 'question-mark';
}

/**
 * Substitutes named SQL parameters (`:name` syntax) with driver-appropriate
 * placeholders — browser-safe, no Node.js dependencies.
 *
 * Behaviour matches Knex's `.raw().toSQL().toNative()`:
 * - `:name` → `$N` for PostgreSQL, `:N` for Oracle, `?` for all other clients.
 * - The same named parameter used multiple times gets its own slot each time.
 * - Parameters inside **single-quoted string literals** (`'…'`) are skipped.
 * - Parameters inside **double-quoted identifiers** (`"…"`) are skipped.
 * - Unknown parameter names (absent from `params`) are left verbatim.
 * - Colons not followed by `[a-zA-Z_]` (e.g. `::text` casts) are left verbatim.
 *
 * @param sql        SQL string containing `:name` placeholders.
 * @param params     Map of name → value (only keys are used for substitution).
 * @param clientType Target database client — used to determine placeholder style.
 * @param options    Optional overrides for `style` and `startIndex`.
 */
export function substituteParams(
  sql: string,
  params: Record<string, unknown>,
  clientType: DatabaseClientType,
  options: SubstituteParamsOptions = {}
): string {
  // Fast path: nothing to substitute
  if (!Object.keys(params).length) return sql;

  const style = options.style ?? getDialectStyle(clientType);
  let paramIndex = options.startIndex ?? 1;

  let result = '';
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    // ── Single-quoted string literals (''): skip content, handle '' escapes ──
    if (ch === "'") {
      const start = i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2; // SQL escaped quote — keep scanning
        } else if (sql[i] === "'") {
          i++; // closing quote
          break;
        } else {
          i++;
        }
      }
      result += sql.slice(start, i);
      continue;
    }

    // ── Double-quoted identifiers: skip entire span ──
    if (ch === '"') {
      const start = i++;
      while (i < sql.length && sql[i] !== '"') i++;
      i++; // closing "
      result += sql.slice(start, i);
      continue;
    }

    // ── Named parameter: must be ':' followed by [a-zA-Z_] ──
    if (ch === ':' && i + 1 < sql.length && /[a-zA-Z_]/.test(sql[i + 1])) {
      const colonPos = i++;
      let name = '';
      while (i < sql.length && /[a-zA-Z0-9_]/.test(sql[i])) {
        name += sql[i++];
      }

      if (name in params) {
        if (style === 'postgres-positional') {
          result += `$${paramIndex++}`;
        } else if (style === 'oracle-positional') {
          result += `:${paramIndex++}`;
        } else {
          result += '?';
        }
      } else {
        // Unknown param — preserve verbatim
        result += sql.slice(colonPos, i);
      }
      continue;
    }

    result += ch;
    i++;
  }

  return result;
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
    if (
      origChar === ':' &&
      (runChar === '$' || runChar === '?' || runChar === ':')
    ) {
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
      } else if (runChar === ':') {
        while (
          runIdx < runningSql.length &&
          /[:0-9]/.test(runningSql[runIdx])
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

  const mapOriginalSql = `${queryPrefix}${originalSql}`;

  // Substitute named parameters (:name → $N / ?) inline, without the
  // Node.js-only `knex` package which cannot evaluate in the browser.
  const formattedSql = substituteParams(
    mapOriginalSql,
    fileParameters,
    clientType
  );

  const mappedPos = mapErrorPosition(
    mapOriginalSql,
    formattedSql,
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
