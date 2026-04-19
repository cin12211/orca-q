import { createPersistApis } from '~/core/persist/factory';
import { getPlatformStorage } from '~/core/persist/storage-adapter';
import {
  LEGACY_AGENT_STORAGE_KEYS,
  normalizeAgentState,
} from '~/core/persist/store-state';
import { Migration } from '../MigrationInterface';

export class MigrateLegacyAgentState1740477873006 extends Migration {
  readonly name = 'MigrateLegacyAgentState1740477873006';

  public async up(): Promise<void> {
    const storage = getPlatformStorage();

    const apis = createPersistApis();
    const existing = await apis.agentApi.get();
    if (existing) {
      // Already migrated — clean up all legacy keys
      Object.values(LEGACY_AGENT_STORAGE_KEYS).forEach(k =>
        storage.removeItem(k)
      );
      return;
    }

    const rawHistories = storage.getItem(LEGACY_AGENT_STORAGE_KEYS.histories);
    const rawSelectedNode = storage.getItem(
      LEGACY_AGENT_STORAGE_KEYS.selectedNodeId
    );
    const rawActiveHistory = storage.getItem(
      LEGACY_AGENT_STORAGE_KEYS.activeHistoryId
    );
    const rawDraftReasoning = storage.getItem(
      LEGACY_AGENT_STORAGE_KEYS.draftShowReasoning
    );
    const rawAttachmentPanel = storage.getItem(
      LEGACY_AGENT_STORAGE_KEYS.showAttachmentPanel
    );

    const hasLegacyData = rawHistories || rawSelectedNode || rawActiveHistory;

    if (hasLegacyData) {
      try {
        const state = normalizeAgentState({
          selectedNodeId: rawSelectedNode ?? undefined,
          draftShowReasoning:
            rawDraftReasoning === 'true'
              ? true
              : rawDraftReasoning === 'false'
                ? false
                : undefined,
          activeHistoryId: rawActiveHistory
            ? JSON.parse(rawActiveHistory)
            : undefined,
          showAttachmentPanel: rawAttachmentPanel === 'true',
          histories: rawHistories ? JSON.parse(rawHistories) : [],
        });
        await apis.agentApi.save(state);
      } catch {
        console.warn(
          '[MigrateLegacyAgentState] Failed to parse legacy agent state'
        );
      }
    }

    Object.values(LEGACY_AGENT_STORAGE_KEYS).forEach(k =>
      storage.removeItem(k)
    );
  }

  public async down(): Promise<void> {
    // No-op — cannot undo data migration
  }
}
