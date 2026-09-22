import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';

export const REDIS_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'redis',
  supportsVariables: false,
  supportsFormat: false,
  // Unused while supportsVariables is false; present to satisfy the contract.
  parameterStyle: 'colon',
};
