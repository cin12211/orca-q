import type { RawQueryDriverDescriptor } from '~/components/modules/raw-query/contracts';
import { MARIADB_RAW_QUERY_CAPABILITIES } from '../capabilities';
import { mariadbCommandResult } from '../services';

/** Static MariaDB configuration for the raw query shell. */
export const MARIADB_RAW_QUERY_DESCRIPTOR: RawQueryDriverDescriptor = {
  capabilities: MARIADB_RAW_QUERY_CAPABILITIES,
  commandResultHandler: mariadbCommandResult,
};
