import type { RawQueryDriverDescriptor } from '~/components/modules/raw-query/contracts';
import { SQLITE_RAW_QUERY_CAPABILITIES } from '../capabilities';
import { sqlite3CommandResult } from '../services';

/** Static SQLite configuration for the raw query shell. */
export const SQLITE_RAW_QUERY_DESCRIPTOR: RawQueryDriverDescriptor = {
  capabilities: SQLITE_RAW_QUERY_CAPABILITIES,
  commandResultHandler: sqlite3CommandResult,
};
