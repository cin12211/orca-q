import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';

/**
 * Descriptor-only: satisfies `RawQueryDriverDescriptor`'s shape for the
 * shared resolver map (`resolveRawQueryDescriptor`), which every entry needs
 * to resolve a per-tab command-result summary. MongoDB's own container does
 * not read this object — its editor, execution, and variable handling are
 * entirely its own (see `components/modules/driver/mongodb/raw-query/hooks`).
 */
export const MONGODB_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'mongo',
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
};
