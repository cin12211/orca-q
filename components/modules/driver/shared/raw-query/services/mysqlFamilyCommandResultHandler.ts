import type { CommandResult } from '~/components/modules/raw-query/contracts';
import { BaseCommandResultHandler } from './baseCommandResultHandler';

export class MysqlCommandResultHandler extends BaseCommandResultHandler {
  protected override isMutation(): boolean {
    if (this.commandKey === 'OPTIMIZE') return true;
    return super.isMutation();
  }

  protected override getMessage(isMutation: boolean): string {
    if (this.commandKey === 'TRUNCATE') {
      return 'TRUNCATE successful.';
    }
    return super.getMessage(isMutation);
  }
}

export const mysqlCommandResult = (
  command: string,
  rowCount: number
): CommandResult => new MysqlCommandResultHandler(command, rowCount).build();
