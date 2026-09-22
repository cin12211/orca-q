import type { RawQueryDriverDescriptor } from '~/components/modules/raw-query/contracts';
import { MYSQL_RAW_QUERY_CAPABILITIES } from '../capabilities';
import { mysqlCommandResult } from '../services';

/** Static MySQL configuration for the raw query shell. */
export const MYSQL_RAW_QUERY_DESCRIPTOR: RawQueryDriverDescriptor = {
  capabilities: MYSQL_RAW_QUERY_CAPABILITIES,
  commandResultHandler: mysqlCommandResult,
};
