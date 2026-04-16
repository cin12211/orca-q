import type { VersionedMigration } from '../../types';
import type { RowQueryFileV1OrV2, RowQueryFileV2 } from './types';

export default {
  collection: 'rowQueryFiles',
  version: 2,
  description: 'Store raw query variables in file metadata',
  up(doc: RowQueryFileV1OrV2): RowQueryFileV2 {
    const variables =
      'variables' in doc && typeof doc.variables === 'string'
        ? doc.variables
        : '';

    return {
      ...doc,
      variables,
    };
  },
} satisfies VersionedMigration<RowQueryFileV1OrV2, RowQueryFileV2>;
