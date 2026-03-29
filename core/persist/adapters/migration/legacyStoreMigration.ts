import { createPersistApis } from '../../factory';
import { getPlatformStorage } from '../../storage-adapter';
import {
  LEGACY_AGENT_STORAGE_KEYS,
  LEGACY_APP_CONFIG_STORAGE_KEY,
  normalizeAgentState,
  normalizeAppConfigState,
} from '../../store-state';

const LEGACY_APP_CONFIG_MIGRATION_FLAG = 'orcaq-legacy-app-config-migrated-v1';
const LEGACY_AGENT_STATE_MIGRATION_FLAG =
  'orcaq-legacy-agent-state-migrated-v1';

const parseJson = <T>(value: string | null): T | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const parseBoolean = (value: string | null, fallback: boolean): boolean => {
  if (value === null) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;

  const parsed = parseJson<boolean>(value);
  return typeof parsed === 'boolean' ? parsed : fallback;
};

const parseNullableString = (value: string | null): string | null => {
  if (value === null) return null;
  if (value === 'null') return null;

  const parsed = parseJson<string | null>(value);
  if (typeof parsed === 'string' || parsed === null) {
    return parsed;
  }

  return value;
};

const isMigrationDone = (flagKey: string): boolean =>
  getPlatformStorage().getItem(flagKey) === 'true';

const markMigrationDone = (flagKey: string): void => {
  getPlatformStorage().setItem(flagKey, 'true');
};

async function migrateLegacyAppConfig(): Promise<void> {
  if (isMigrationDone(LEGACY_APP_CONFIG_MIGRATION_FLAG)) {
    return;
  }

  const persistApis = createPersistApis();
  const storage = getPlatformStorage();
  const existing = await persistApis.appConfigApi.get();

  if (existing) {
    storage.removeItem(LEGACY_APP_CONFIG_STORAGE_KEY);
    markMigrationDone(LEGACY_APP_CONFIG_MIGRATION_FLAG);
    return;
  }

  const legacyValue = storage.getItem(LEGACY_APP_CONFIG_STORAGE_KEY);
  const parsed = parseJson<unknown>(legacyValue);

  if (parsed) {
    await persistApis.appConfigApi.save(normalizeAppConfigState(parsed));
    storage.removeItem(LEGACY_APP_CONFIG_STORAGE_KEY);
  }

  markMigrationDone(LEGACY_APP_CONFIG_MIGRATION_FLAG);
}

async function migrateLegacyAgentState(): Promise<void> {
  if (isMigrationDone(LEGACY_AGENT_STATE_MIGRATION_FLAG)) {
    return;
  }

  const persistApis = createPersistApis();
  const storage = getPlatformStorage();
  const existing = await persistApis.agentApi.get();

  if (existing) {
    Object.values(LEGACY_AGENT_STORAGE_KEYS).forEach(key =>
      storage.removeItem(key)
    );
    markMigrationDone(LEGACY_AGENT_STATE_MIGRATION_FLAG);
    return;
  }

  const selectedNodeId = storage.getItem(
    LEGACY_AGENT_STORAGE_KEYS.selectedNodeId
  );
  const draftShowReasoning = storage.getItem(
    LEGACY_AGENT_STORAGE_KEYS.draftShowReasoning
  );
  const activeHistoryId = storage.getItem(
    LEGACY_AGENT_STORAGE_KEYS.activeHistoryId
  );
  const showAttachmentPanel = storage.getItem(
    LEGACY_AGENT_STORAGE_KEYS.showAttachmentPanel
  );
  const histories = storage.getItem(LEGACY_AGENT_STORAGE_KEYS.histories);

  const hasLegacyData = [
    selectedNodeId,
    draftShowReasoning,
    activeHistoryId,
    showAttachmentPanel,
    histories,
  ].some(value => value !== null);

  if (!hasLegacyData) {
    markMigrationDone(LEGACY_AGENT_STATE_MIGRATION_FLAG);
    return;
  }

  await persistApis.agentApi.save(
    normalizeAgentState({
      selectedNodeId: selectedNodeId ?? undefined,
      draftShowReasoning: parseBoolean(draftShowReasoning, true),
      activeHistoryId: parseNullableString(activeHistoryId),
      showAttachmentPanel: parseBoolean(showAttachmentPanel, false),
      histories: parseJson(histories) ?? undefined,
    })
  );

  Object.values(LEGACY_AGENT_STORAGE_KEYS).forEach(key =>
    storage.removeItem(key)
  );
  markMigrationDone(LEGACY_AGENT_STATE_MIGRATION_FLAG);
}

export async function runLegacyStoreMigrations(): Promise<void> {
  await migrateLegacyAppConfig();
  await migrateLegacyAgentState();
}
