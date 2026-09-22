import type { RawQueryDriverDescriptor } from '~/components/modules/raw-query/contracts';
import { MSSQL_RAW_QUERY_CAPABILITIES } from '../capabilities';
import { mssqlCommandResult } from '../services';

/** Static SQL Server configuration for the raw query shell. */
export const MSSQL_RAW_QUERY_DESCRIPTOR: RawQueryDriverDescriptor = {
  capabilities: MSSQL_RAW_QUERY_CAPABILITIES,
  commandResultHandler: mssqlCommandResult,
};
