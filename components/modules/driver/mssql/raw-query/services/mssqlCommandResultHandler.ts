import { BaseCommandResultHandler } from '~/components/modules/driver/shared/raw-query/services';
import type { CommandResult } from '~/components/modules/raw-query/contracts';

class MssqlCommandResultHandler extends BaseCommandResultHandler {
  protected override getMessage(isMutation: boolean): string {
    if (this.commandKey === 'MERGE') {
      return `MERGE successful. ${this.rowCount} rows affected.`;
    }
    return super.getMessage(isMutation);
  }
}

export const mssqlCommandResult = (
  command: string,
  rowCount: number
): CommandResult => new MssqlCommandResultHandler(command, rowCount).build();
