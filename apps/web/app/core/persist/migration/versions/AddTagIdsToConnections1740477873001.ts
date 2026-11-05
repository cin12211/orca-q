import { Migration } from '../MigrationInterface';
import { getPlatformOps } from '../platformOps';

export class AddTagIdsToConnections1740477873001 extends Migration {
  readonly name = 'AddTagIdsToConnections1740477873001';

  public async up(): Promise<void> {
    const { getAll, replaceAll } = getPlatformOps();
    const docs = await getAll<{ id: string } & Record<string, unknown>>(
      'connections'
    );
    if (docs.every(d => 'tagIds' in d)) return; // idempotent
    await replaceAll(
      'connections',
      docs.map(d => ({
        ...d,
        tagIds: (d as { tagIds?: unknown }).tagIds ?? [],
      }))
    );
  }

  public async down(): Promise<void> {
    const { getAll, replaceAll } = getPlatformOps();
    const docs = await getAll<{ id: string } & Record<string, unknown>>(
      'connections'
    );
    await replaceAll(
      'connections',
      docs.map(({ tagIds: _, ...rest }) => rest)
    );
  }
}
