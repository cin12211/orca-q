import type { CommandResult } from '~/components/modules/raw-query/contracts';
import { COMMAND_CATEGORIES, type CommandCategory } from '../constants';

const COMMAND_PREFIXES = Object.keys(COMMAND_CATEGORIES).sort(
  (left, right) => right.length - left.length
);

const resolveCommandKeyword = (command: string): string => {
  if (!command) return '';
  const normalized = command.toUpperCase().trim().replace(/;$/, '');

  for (const prefix of COMMAND_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(`${prefix} `)) {
      return prefix;
    }
  }

  return normalized.split(/\s+/)[0] || normalized;
};

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────
const isMutationCommand = (command: string): boolean => {
  if (!command) return false;
  const cmd = command.toUpperCase().trim();
  const commandKey = resolveCommandKeyword(cmd);

  const isQuery = ['SELECT', 'VALUES', 'SHOW', 'EXPLAIN', 'TABLE'].includes(
    commandKey
  );
  if (isQuery) return false;

  const category = COMMAND_CATEGORIES[commandKey];

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
    ].includes(commandKey)
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
    ].includes(commandKey)
  )
    return true;

  if (['CREATE', 'DROP', 'ALTER'].includes(commandKey)) return true;

  return false;
};

const getMutationMessage = (command: string, rowCount: number): string => {
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
export abstract class BaseCommandResultHandler {
  protected readonly cmd: string;
  protected readonly commandKey: string;
  protected readonly rowCount: number;

  constructor(command: string, rowCount: number) {
    this.cmd = (command || '').toUpperCase().trim();
    this.commandKey = resolveCommandKeyword(this.cmd);
    this.rowCount = rowCount;
  }

  protected isMutation(): boolean {
    return isMutationCommand(this.cmd);
  }

  protected getMessage(isMutation: boolean): string {
    return isMutation ? getMutationMessage(this.cmd, this.rowCount) : '';
  }

  protected getCategory(): CommandCategory | 'UNKNOWN' {
    return COMMAND_CATEGORIES[this.commandKey] ?? 'UNKNOWN';
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
