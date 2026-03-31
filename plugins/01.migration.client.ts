/**
 * Migration plugin — runs BEFORE app-initialization (02.app-initialization.client.ts).
 *
 * Responsibilities:
 *  1. Warm the platform KV cache so schema version reads are synchronous.
 *  2. Run all pending schema-version migrations.
 *  3. Expose migration progress via `useMigrationState` so the `MigrationScreen`
 *     component can show a blocking loading screen while work is in progress.
 *
 * Because Nuxt awaits each plugin before rendering, the SPA loading template covers
 * any time spent here. The Vue `MigrationScreen` overlay then acts as a safety net
 * for edge cases (hot-reload in dev, future deferred-init patterns).
 */
import { useMigrationState } from '~/core/composables/useMigrationState';
import { runSchemaMigrations } from '~/core/persist/adapters/migration';
import { runLegacyStoreMigrations } from '~/core/persist/adapters/migration/legacyStoreMigration';
import { ALL_MIGRATIONS } from '~/core/persist/adapters/migration/versions';
import { initPlatformStorage } from '~/core/persist/storage-adapter';

export default defineNuxtPlugin(async () => {
  const migration = useMigrationState();
  migration.start();

  try {
    // 1. Warm the KV cache so storage reads are synchronous from this point on.
    await initPlatformStorage();

    // 2. Copy legacy store data into the new persist collections once.
    await runLegacyStoreMigrations();

    // 3. Apply any pending schema migrations.
    await runSchemaMigrations(ALL_MIGRATIONS, {
      onStep: step => migration.progress(step),
    });

    migration.done();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Plugin:migration] Schema migration failed:', message);
    migration.fail(message);
    // Do NOT rethrow — let the app mount so the error state is visible.
  }
});
