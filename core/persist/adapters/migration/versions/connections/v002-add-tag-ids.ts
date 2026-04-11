import type { VersionedMigration } from '../../types';
import type { ConnectionV1, ConnectionV2 } from './types';

export default {
  collection: 'connections',
  version: 2,
  description: 'Add tagIds array to connections for environment tag support',
  up(doc: ConnectionV1): ConnectionV2 {
    return { ...doc, tagIds: [] };
  },
} satisfies VersionedMigration<ConnectionV1, ConnectionV2>;
