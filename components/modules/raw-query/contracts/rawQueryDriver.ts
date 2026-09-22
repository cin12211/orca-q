import type { RawQueryCapabilities } from './rawQueryCapabilities';

export interface CommandResult {
  isMutation: boolean;
  message: string;
  category: string;
}

/** Turns a command keyword and a row count into the result-tab summary line. */
export type CommandResultHandlerFactory = (
  command: string,
  rowCount: number
) => CommandResult;

/**
 * Everything static per engine. The executor is not part of it: Redis builds
 * its executor from a reactive database index, so the entry container supplies it.
 */
/** Picks the handler for the engine a result tab was executed on. */
export type CommandResultHandlerResolver = (
  type: string | undefined
) => CommandResultHandlerFactory;

export interface RawQueryDriverDescriptor {
  capabilities: RawQueryCapabilities;
  commandResultHandler: CommandResultHandlerFactory;
}
