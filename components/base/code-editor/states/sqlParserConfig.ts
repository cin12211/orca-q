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
}

// ---------------------------------------------------------------------------
// Dialect mapping
// Allows callers to derive the correct SQLDialect from a connection's database
// type without importing CodeMirror lang-sql directly.
// Add a new entry here when a new database type is supported.
// ---------------------------------------------------------------------------

export const SQL_DIALECT_BY_DB_TYPE: Record<string, SQLDialect> = {
  [DatabaseClientType.POSTGRES]: SQLDialectSupport.PostgreSQL,
  [DatabaseClientType.MYSQL]: SQLDialectSupport.MySQL,
} as const;

/**
 * Resolve the CodeMirror SQLDialect for a given connection type.
 * Falls back to PostgreSQL when the type is not (yet) mapped.
 */
export function resolveDialect(dbType: DatabaseClientType | undefined): SQLDialect {
  if (!dbType) return PostgreSQL;
  return SQL_DIALECT_BY_DB_TYPE[dbType] ?? PostgreSQL;
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
  create: () => ({ dialect: PostgreSQL, isEnable: true }),

  update(current, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(updateSqlParserConfigEffect)) return effect.value;
    }
    return current;
  },
});
