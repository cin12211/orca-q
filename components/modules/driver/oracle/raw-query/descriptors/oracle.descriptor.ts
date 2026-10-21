import type { RawQueryDriverDescriptor } from '~/components/modules/raw-query/contracts';
import { ORACLE_RAW_QUERY_CAPABILITIES } from '../capabilities';
import { oracleCommandResult } from '../services';

/** Static Oracle configuration for the raw query shell. */
export const ORACLE_RAW_QUERY_DESCRIPTOR: RawQueryDriverDescriptor = {
  capabilities: ORACLE_RAW_QUERY_CAPABILITIES,
  commandResultHandler: oracleCommandResult,
};
