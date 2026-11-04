import { Migration } from '../MigrationInterface';
import { getPlatformOps } from '../platformOps';

export class RemoveConnectionIdFromRowQueryFiles1740477873002 extends Migration {
  readonly name = 'RemoveConnectionIdFromRowQueryFiles1740477873002';

  public async up(): Promise<void> {
    const { getAll, replaceAll } = getPlatformOps();
    const docs = await getAll<{ id: string } & Record<string, unknown>>(
      'rowQueryFiles'
    );
    if (docs.every(d => !('connectionId' in d))) return; // idempotent
    await replaceAll(
      'rowQueryFiles',
      docs.map(({ connectionId: _, ...rest }) => rest)
    );
  }

  public async down(): Promise<void> {
    // Cannot restore deleted field — no-op
  }
}
