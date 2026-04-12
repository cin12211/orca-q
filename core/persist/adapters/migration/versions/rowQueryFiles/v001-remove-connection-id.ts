import type { VersionedMigration } from '../../types';
import type { RowQueryFileV0, RowQueryFileV1 } from './types';

export default {
  collection: 'rowQueryFiles',
  version: 1,
  description: 'Remove persisted connectionId from raw query files and folders',
  up(doc: RowQueryFileV0): RowQueryFileV1 {
    const { connectionId: _connectionId, ...rest } = doc;
    return rest;
  },
} satisfies VersionedMigration<RowQueryFileV0, RowQueryFileV1>;
