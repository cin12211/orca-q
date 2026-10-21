import { BaseCommandResultHandler } from '~/components/modules/driver/shared/raw-query/services';
import type { CommandResult } from '~/components/modules/raw-query/contracts';

class PostgresCommandResultHandler extends BaseCommandResultHandler {
  protected override isMutation(): boolean {
    if (['VACUUM', 'ANALYZE', 'REINDEX', 'CLUSTER'].includes(this.commandKey))
      return true;
    return super.isMutation();
  }
}

export const postgresCommandResult = (
  command: string,
  rowCount: number
): CommandResult => new PostgresCommandResultHandler(command, rowCount).build();
