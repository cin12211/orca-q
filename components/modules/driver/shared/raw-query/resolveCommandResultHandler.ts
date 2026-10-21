import { postgresCommandResult } from '~/components/modules/driver/postgres/raw-query/services';
import { genericCommandResult } from '~/components/modules/driver/shared/raw-query/services';
import type { CommandResultHandlerResolver } from '~/components/modules/raw-query/contracts';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import { resolveRawQueryDescriptor } from './resolveRawQueryDescriptor';

/**
 * Picks the result-tab summary handler for the engine a result tab ran on.
 * Preserves the historical factory fallbacks: no type -> PostgreSQL,
 * unlisted type -> generic.
 */
export const resolveCommandResultHandler: CommandResultHandlerResolver = type =>
  resolveRawQueryDescriptor(type as DatabaseClientType | undefined)
    ?.commandResultHandler ??
  (type ? genericCommandResult : postgresCommandResult);
