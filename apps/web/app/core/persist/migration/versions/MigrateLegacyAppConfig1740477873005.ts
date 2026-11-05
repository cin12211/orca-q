import { appConfigStorage } from '~/core/storage/entities/AppConfigStorage';
import { getPlatformStorage } from '~/core/persist/storage-adapter';
import {
  LEGACY_APP_CONFIG_STORAGE_KEY,
  normalizeAppConfigState,
} from '~/core/persist/store-state';
import { Migration } from '../MigrationInterface';

export class MigrateLegacyAppConfig1740477873005 extends Migration {
  readonly name = 'MigrateLegacyAppConfig1740477873005';

  public async up(): Promise<void> {
    const storage = getPlatformStorage();

    const existing = await appConfigStorage.getOne('app-config');
    if (existing) {
      // Already migrated or no legacy data — just clean up the legacy key
      storage.removeItem(LEGACY_APP_CONFIG_STORAGE_KEY);
      return;
    }

    const raw = storage.getItem(LEGACY_APP_CONFIG_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        await appConfigStorage.save(normalizeAppConfigState(parsed));
        storage.removeItem(LEGACY_APP_CONFIG_STORAGE_KEY);
      } catch {
        // Non-fatal — leave legacy key in place for manual recovery
        console.warn(
          '[MigrateLegacyAppConfig] Failed to parse legacy app config'
        );
      }
    }
  }

  public async down(): Promise<void> {
    // No-op — cannot undo data migration
  }
}
