import { BaseCommandResultHandler } from '~/components/modules/driver/shared/raw-query/services';
import type { CommandResult } from '~/components/modules/raw-query/contracts';

class Sqlite3CommandResultHandler extends BaseCommandResultHandler {
  protected override isMutation(): boolean {
    if (this.commandKey === 'TRUNCATE') return true;
    return super.isMutation();
  }

  protected override getMessage(isMutation: boolean): string {
    if (this.commandKey === 'INSERT') {
      return `INSERT successful. ${this.rowCount} row(s) affected.`;
    }
    return super.getMessage(isMutation);
  }
}

class BetterSqlite3CommandResultHandler extends Sqlite3CommandResultHandler {}

export const sqlite3CommandResult = (
  command: string,
  rowCount: number
): CommandResult => new Sqlite3CommandResultHandler(command, rowCount).build();

export const betterSqlite3CommandResult = (
  command: string,
  rowCount: number
): CommandResult =>
  new BetterSqlite3CommandResultHandler(command, rowCount).build();
