import { Migration } from '../MigrationInterface';
import { getPlatformOps } from '../platformOps';

export class AddVariablesToRowQueryFiles1740477873003 extends Migration {
  readonly name = 'AddVariablesToRowQueryFiles1740477873003';

  public async up(): Promise<void> {
    const { getAll, replaceAll } = getPlatformOps();
    const docs = await getAll<{ id: string } & Record<string, unknown>>(
      'rowQueryFiles'
    );
    if (docs.every(d => 'variables' in d)) return; // idempotent
    await replaceAll(
      'rowQueryFiles',
      docs.map(d => ({
        ...d,
        variables: (d as { variables?: unknown }).variables ?? '',
      }))
    );
  }

  public async down(): Promise<void> {
    const { getAll, replaceAll } = getPlatformOps();
    const docs = await getAll<{ id: string } & Record<string, unknown>>(
      'rowQueryFiles'
    );
    await replaceAll(
      'rowQueryFiles',
      docs.map(({ variables: _, ...rest }) => rest)
    );
  }
}
