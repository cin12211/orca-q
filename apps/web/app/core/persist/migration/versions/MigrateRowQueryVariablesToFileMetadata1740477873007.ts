import { Migration } from '../MigrationInterface';
import { getPlatformOps } from '../platformOps';

type RowQueryFileLegacy = {
  id: string;
  variables?: string;
  [key: string]: unknown;
};
type RowQueryFileContentLegacy = {
  id: string;
  contents?: string;
  variables?: string;
  [key: string]: unknown;
};

export class MigrateRowQueryVariablesToFileMetadata1740477873007 extends Migration {
  readonly name = 'MigrateRowQueryVariablesToFileMetadata1740477873007';

  public async up(): Promise<void> {
    const { getAll, replaceAll } = getPlatformOps();

    const [rowQueryFiles, rowQueryFileContents] = await Promise.all([
      getAll<RowQueryFileLegacy>('rowQueryFiles'),
      getAll<RowQueryFileContentLegacy>('rowQueryFileContents'),
    ]);

    const hasLegacyVariables = rowQueryFileContents.some(c => 'variables' in c);

    if (!hasLegacyVariables) {
      return;
    }

    const variablesByFileId = new Map(
      rowQueryFileContents.map(c => [c.id, c.variables ?? ''])
    );

    const migratedFiles = rowQueryFiles.map(f => ({
      ...f,
      variables: f.variables ?? variablesByFileId.get(f.id) ?? '',
    }));

    const migratedContents = rowQueryFileContents.map(
      ({ variables: _, ...rest }) => rest
    );

    await Promise.all([
      replaceAll('rowQueryFiles', migratedFiles),
      replaceAll('rowQueryFileContents', migratedContents),
    ]);
  }

  public async down(): Promise<void> {
    // No-op — cannot reverse data movement
  }
}
