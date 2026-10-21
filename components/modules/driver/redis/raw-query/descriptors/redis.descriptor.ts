import { genericCommandResult } from '~/components/modules/driver/shared/raw-query/services';
import type { RawQueryDriverDescriptor } from '~/components/modules/raw-query/contracts';
import { REDIS_RAW_QUERY_CAPABILITIES } from '../capabilities';

/** Static Redis configuration for the raw query shell. */
export const REDIS_RAW_QUERY_DESCRIPTOR: RawQueryDriverDescriptor = {
  capabilities: REDIS_RAW_QUERY_CAPABILITIES,
  commandResultHandler: genericCommandResult,
};
