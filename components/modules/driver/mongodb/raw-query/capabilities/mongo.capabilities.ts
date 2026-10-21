import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';

/**
 * Read by `MongoRawQuery.vue` (variables and format toggles) and by the shared
 * resolver map (`resolveRawQueryDescriptor`) for per-tab command-result
 * summaries. Editor, execution, and EJSON variable parsing stay MongoDB's own
 * (see `components/modules/driver/mongodb/raw-query/hooks`).
 */
export const MONGODB_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'mongo',
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
};
