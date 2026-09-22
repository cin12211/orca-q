import type { RawQueryDriverDescriptor } from '~/components/modules/raw-query/contracts';
import { POSTGRES_RAW_QUERY_CAPABILITIES } from '../capabilities';
import { postgresCommandResult } from '../services';

/**
 * Static PostgreSQL descriptor for the shell. Built here because containers
 * must not reach into `services/` directly.
 */
export function usePostgresRawQueryDescriptor(): RawQueryDriverDescriptor {
  return {
    capabilities: POSTGRES_RAW_QUERY_CAPABILITIES,
    commandResultHandler: postgresCommandResult,
  };
}
