import { PostgreSQL, type SQLDialect } from '@codemirror/lang-sql';
import { StateEffect, StateField } from '@codemirror/state';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { SQLDialectSupport } from '../constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SqlParserConfig {
  dialect: SQLDialect;
  isEnable: boolean;
  statementMode: 'sql' | 'line';
}

// ---------------------------------------------------------------------------
// Dialect mapping
// Allows callers to derive the correct SQLDialect from a connection's database
// type without importing CodeMirror lang-sql directly.
// Add a new entry here when a new database type is supported.
// ---------------------------------------------------------------------------

export const SQL_DIALECT_BY_DB_TYPE: Record<string, SQLDialect> = {
  [DatabaseClientType.POSTGRES]: SQLDialectSupport.PostgreSQLParserDialect,
  [DatabaseClientType.MYSQL]: SQLDialectSupport.MySQL,
  [DatabaseClientType.MYSQL2]: SQLDialectSupport.MySQL,
  [DatabaseClientType.MARIADB]: SQLDialectSupport.MariaSQL,
  [DatabaseClientType.SQLITE3]: SQLDialectSupport.SQLite,
  [DatabaseClientType.ORACLE]: SQLDialectSupport.PLSQL,
} as const;

/**
 * Resolve the CodeMirror SQLDialect for parsing/statement detection.
 * Use this when you need to accurately identify SQL blocks (e.g. PostgreSQL dollar quoting).
 */
export function resolveParserDialect(
  dbType: DatabaseClientType | undefined
): SQLDialect {
  if (!dbType || dbType === DatabaseClientType.POSTGRES) {
    return SQLDialectSupport.PostgreSQLParserDialect;
  }
  return (
    SQL_DIALECT_BY_DB_TYPE[dbType] ?? SQLDialectSupport.PostgreSQLParserDialect
  );
}

/**
 * Resolve the CodeMirror SQLDialect for UI display, highlighting, and suggestions.
 * Use this for the main editor extension to allow "looking inside" blocks like PostgreSQL $$.
 */
export function resolveHighlightDialect(
  dbType: DatabaseClientType | undefined
): SQLDialect {
  if (!dbType || dbType === DatabaseClientType.POSTGRES) {
    return SQLDialectSupport.PostgreSQLHighlightDialect;
  }
  return (
    SQL_DIALECT_BY_DB_TYPE[dbType] ?? SQLDialectSupport.PostgreSQLParserDialect
  );
}

/**
 * @deprecated Use resolveParserDialect or resolveHighlightDialect.
 */
export function resolveDialect(
  dbType: DatabaseClientType | undefined
): SQLDialect {
  return resolveParserDialect(dbType);
}

// ---------------------------------------------------------------------------
// StateEffect — dispatch this to update the parser config at runtime
// ---------------------------------------------------------------------------

export const updateSqlParserConfigEffect =
  StateEffect.define<SqlParserConfig>();

// ---------------------------------------------------------------------------
// StateField — holds the current SQL parser config inside EditorState
// ---------------------------------------------------------------------------

export const sqlParserConfigField = StateField.define<SqlParserConfig>({
  create: () => ({
    dialect: SQLDialectSupport.PostgreSQLParserDialect,
    isEnable: true,
    statementMode: 'sql',
  }),

  update(current, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(updateSqlParserConfigEffect)) return effect.value;
    }
    return current;
  },
});
