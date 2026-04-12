import type { VersionedMigration } from '../../types';
import type { RowQueryFileContentV0, RowQueryFileContentV1 } from './types';

export default {
  collection: 'rowQueryFileContents',
  version: 1,
  description: 'Remove variables from raw query content records',
  up(doc: RowQueryFileContentV0): RowQueryFileContentV1 {
    const { variables: _variables, ...rest } = doc;
    return rest;
  },
} satisfies VersionedMigration<RowQueryFileContentV0, RowQueryFileContentV1>;
