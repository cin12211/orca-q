import {
  MysqlCommandResultHandler,
  mysqlCommandResult,
} from '~/components/modules/driver/shared/raw-query/services';
import type { CommandResult } from '~/components/modules/raw-query/contracts';

class Mysql2CommandResultHandler extends MysqlCommandResultHandler {}

export { mysqlCommandResult };

export const mysql2CommandResult = (
  command: string,
  rowCount: number
): CommandResult => new Mysql2CommandResultHandler(command, rowCount).build();
