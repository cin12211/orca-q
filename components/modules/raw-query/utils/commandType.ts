// command-result.factory.ts
import { DatabaseClientType } from '~/core/constants/database-client-type';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type CommandCategory =
  | 'DML'
  | 'DDL'
  | 'DCL'
  | 'TCL'
  | 'SYSTEM'
  | 'UNKNOWN';

export interface CommandResult {
  isMutation: boolean;
  message: string;
  category: CommandCategory | 'UNKNOWN';
}

// ─────────────────────────────────────────────
// Command category map
// ─────────────────────────────────────────────
export const COMMAND_CATEGORIES: Record<string, CommandCategory> = {
  // Data Manipulation (DML)
  SELECT: 'DML',
  INSERT: 'DML',
  UPDATE: 'DML',
  DELETE: 'DML',
  MERGE: 'DML',
  VALUES: 'DML',
  TRUNCATE: 'DML',
  COPY: 'DML',

  // Data Definition (DDL)
  CREATE: 'DDL',
  ALTER: 'DDL',
  DROP: 'DDL',
  COMMENT: 'DDL',
  ANALYZE: 'DDL',
  VACUUM: 'DDL',
  REINDEX: 'DDL',
  CLUSTER: 'DDL',
  'REFRESH MATERIALIZED VIEW': 'DDL',
  'IMPORT FOREIGN SCHEMA': 'DDL',
  'SECURITY LABEL': 'DDL',

  // Data Control (DCL)
  GRANT: 'DCL',
  REVOKE: 'DCL',

  // Transaction Control (TCL)
  BEGIN: 'TCL',
  COMMIT: 'TCL',
  ROLLBACK: 'TCL',
  SAVEPOINT: 'TCL',
  'RELEASE SAVEPOINT': 'TCL',
  'ROLLBACK TO SAVEPOINT': 'TCL',
  'PREPARE TRANSACTION': 'TCL',
  'COMMIT PREPARED': 'TCL',
  'ROLLBACK PREPARED': 'TCL',
  'SET TRANSACTION': 'TCL',

  // Session / System
  SET: 'SYSTEM',
  SHOW: 'SYSTEM',
  RESET: 'SYSTEM',
  DISCARD: 'SYSTEM',
  EXPLAIN: 'SYSTEM',
  LOAD: 'SYSTEM',
  LOCK: 'SYSTEM',
  MOVE: 'SYSTEM',
  FETCH: 'SYSTEM',
  CLOSE: 'SYSTEM',
  DECLARE: 'SYSTEM',
  DEALLOCATE: 'SYSTEM',
  PREPARE: 'SYSTEM',
  EXECUTE: 'SYSTEM',
  LISTEN: 'SYSTEM',
  UNLISTEN: 'SYSTEM',
  NOTIFY: 'SYSTEM',
  DO: 'SYSTEM',
  ABORT: 'SYSTEM',
  CHECKPOINT: 'SYSTEM',
};

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────
export const isMutationCommand = (command: string): boolean => {
  const cmd = command.toUpperCase().trim();

  const isQuery = ['SELECT', 'VALUES', 'SHOW', 'EXPLAIN', 'TABLE'].some(
    q => cmd === q || cmd.startsWith(q + ' ')
  );
  if (isQuery) return false;

  const category = COMMAND_CATEGORIES[cmd];

  if (
    [
      'INSERT',
      'UPDATE',
      'DELETE',
      'TRUNCATE',
      'COPY',
      'MERGE',
      'CALL',
      'DO',
    ].includes(cmd)
  )
    return true;

  if (category === 'DDL' || category === 'DCL') return true;

  if (
    [
      'SET',
      'RESET',
      'GRANT',
      'REVOKE',
      'COMMENT',
      'ANALYZE',
      'VACUUM',
      'REINDEX',
      'CLUSTER',
    ].includes(cmd)
  )
    return true;

  if (
    cmd.startsWith('CREATE') ||
    cmd.startsWith('DROP') ||
    cmd.startsWith('ALTER')
  )
    return true;

  return false;
};

export const getMutationMessage = (
  command: string,
  rowCount: number
): string => {
  const cmd = command || 'Query';
  const count = rowCount ?? 0;

  if (['INSERT', 'UPDATE', 'DELETE'].includes(cmd.toUpperCase())) {
    return `${cmd} successful. ${count} rows affected.`;
  }

  return `${cmd} successful.`;
};

// ─────────────────────────────────────────────
// Base handler
// ─────────────────────────────────────────────
abstract class BaseCommandResultHandler {
  protected readonly cmd: string;
  protected readonly rowCount: number;

  constructor(command: string, rowCount: number) {
    this.cmd = command.toUpperCase().trim();
    this.rowCount = rowCount;
  }

  protected isMutation(): boolean {
    return isMutationCommand(this.cmd);
  }

  protected getMessage(isMutation: boolean): string {
    return isMutation ? getMutationMessage(this.cmd, this.rowCount) : '';
  }

  protected getCategory(): CommandCategory | 'UNKNOWN' {
    return COMMAND_CATEGORIES[this.cmd] ?? 'UNKNOWN';
  }

  build(): CommandResult {
    const mutation = this.isMutation();
    return {
      isMutation: mutation,
      message: this.getMessage(mutation),
      category: this.getCategory(),
    };
  }
}

// ─────────────────────────────────────────────
// Per-dialect handlers
// ─────────────────────────────────────────────
class PostgresCommandResultHandler extends BaseCommandResultHandler {
  protected override isMutation(): boolean {
    if (['VACUUM', 'ANALYZE', 'REINDEX', 'CLUSTER'].includes(this.cmd))
      return true;
    return super.isMutation();
  }
}

class MysqlCommandResultHandler extends BaseCommandResultHandler {
  protected override isMutation(): boolean {
    if (this.cmd.startsWith('OPTIMIZE')) return true;
    return super.isMutation();
  }

  protected override getMessage(isMutation: boolean): string {
    if (this.cmd === 'TRUNCATE' || this.cmd.startsWith('TRUNCATE ')) {
      return 'TRUNCATE successful.';
    }
    return super.getMessage(isMutation);
  }
}

class Mysql2CommandResultHandler extends MysqlCommandResultHandler {}

class Sqlite3CommandResultHandler extends BaseCommandResultHandler {
  protected override isMutation(): boolean {
    if (this.cmd.startsWith('TRUNCATE')) return true;
    return super.isMutation();
  }

  protected override getMessage(isMutation: boolean): string {
    if (this.cmd === 'INSERT') {
      return `INSERT successful. Last insert row id: ${this.rowCount}.`;
    }
    return super.getMessage(isMutation);
  }
}

class BetterSqlite3CommandResultHandler extends Sqlite3CommandResultHandler {}

class MssqlCommandResultHandler extends BaseCommandResultHandler {
  protected override getMessage(isMutation: boolean): string {
    if (this.cmd === 'MERGE') {
      return `MERGE successful. ${this.rowCount} rows affected.`;
    }
    return super.getMessage(isMutation);
  }
}

class OracleCommandResultHandler extends BaseCommandResultHandler {
  protected override getMessage(isMutation: boolean): string {
    if (this.cmd === 'TRUNCATE' || this.cmd.startsWith('TRUNCATE ')) {
      return 'TRUNCATE successful.';
    }
    if (this.cmd === 'MERGE') {
      return `MERGE successful. ${this.rowCount} rows affected.`;
    }
    return super.getMessage(isMutation);
  }
}

// ─────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────
const HANDLER_REGISTRY: Record<
  DatabaseClientType,
  new (command: string, rowCount: number) => BaseCommandResultHandler
> = {
  [DatabaseClientType.POSTGRES]: PostgresCommandResultHandler,
  [DatabaseClientType.MYSQL]: MysqlCommandResultHandler,
  [DatabaseClientType.MYSQL2]: Mysql2CommandResultHandler,
  [DatabaseClientType.SQLITE3]: Sqlite3CommandResultHandler,
  [DatabaseClientType.BETTER_SQLITE3]: BetterSqlite3CommandResultHandler,
  [DatabaseClientType.MSSQL]: MssqlCommandResultHandler,
  [DatabaseClientType.ORACLE]: OracleCommandResultHandler,
};

// ─────────────────────────────────────────────
// Public factory
// ─────────────────────────────────────────────
export const createCommandResultFactory = (
  command: string,
  rowCount: number = 0,
  dbType: DatabaseClientType = DatabaseClientType.POSTGRES
): CommandResult => {
  const HandlerClass = HANDLER_REGISTRY[dbType];

  if (!HandlerClass) {
    throw new Error(`Unsupported database client type: "${dbType}"`);
  }

  return new HandlerClass(command, rowCount).build();
};
