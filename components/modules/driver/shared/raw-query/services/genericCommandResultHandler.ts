import type { CommandResult } from '~/components/modules/raw-query/contracts';
import { BaseCommandResultHandler } from './baseCommandResultHandler';

class GenericCommandResultHandler extends BaseCommandResultHandler {}

export const genericCommandResult = (
  command: string,
  rowCount: number
): CommandResult => new GenericCommandResultHandler(command, rowCount).build();
