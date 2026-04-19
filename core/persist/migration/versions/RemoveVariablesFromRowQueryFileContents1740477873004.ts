import { Migration } from '../MigrationInterface';
import { getPlatformOps } from '../platformOps';

export class RemoveVariablesFromRowQueryFileContents1740477873004 extends Migration {
  readonly name = 'RemoveVariablesFromRowQueryFileContents1740477873004';

  public async up(): Promise<void> {
    const { getAll, replaceAll } = getPlatformOps();
    const docs = await getAll<{ id: string } & Record<string, unknown>>(
      'rowQueryFileContents'
    );
    if (docs.every(d => !('variables' in d))) return; // idempotent
    await replaceAll(
      'rowQueryFileContents',
      docs.map(({ variables: _, ...rest }) => rest)
    );
  }

  public async down(): Promise<void> {
    // Cannot restore deleted field — no-op
  }
}
