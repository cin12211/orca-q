import { ref } from 'vue';
import { isElectron } from '~/core/helpers/environment';
import { persistMergeAll as electronPersistMergeAll } from '~/core/persist/adapters/electron/primitives';
import { idbMergeAll } from '~/core/persist/adapters/idb/primitives';
import {
  checkImportCompatibility,
  runMigrations,
} from '~/core/persist/migration';
import { migrationStateStorage } from '~/core/storage/entities/MigrationStateStorage';
import {
  PERSIST_COLLECTIONS,
  type PersistCollection,
} from '~/core/storage/idbRegistry';
import { useAgentStore } from '~/core/stores/agentStore';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useManagementExplorerStore } from '~/core/stores/managementExplorerStore';
import { useActivityBarStore } from '~/core/stores/useActivityBarStore';
import { useEnvironmentTagStore } from '~/core/stores/useEnvironmentTagStore';
import { useExplorerFileStore } from '~/core/stores/useExplorerFileStore';
import { useQuickQueryLogs } from '~/core/stores/useQuickQueryLogs';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';
import { useWSStateStore } from '~/core/stores/useWSStateStore';
import { useWorkspacesStore } from '~/core/stores/useWorkspacesStore';
import {
  getBackupSchemaVersion,
  isBackupData,
  mergeLocalStorageSnapshot,
  normalizeBackupPersistData,
  summarizeBackupData,
  type BackupData,
  type BackupSummary,
} from './backupData';

export const BACKUP_JSON_FILE_ACCEPT = 'application/json,.json';
const MIGRATION_STATE_RECORD_ID = 'applied-migrations';

// ── Validation ───────────────────────────────────────────────────────

function isValidBackup(data: unknown): data is BackupData {
  return isBackupData(data);
}

export function isBackupJsonFile(file: File): boolean {
  const normalizedName = file.name.toLowerCase();
  const normalizedType = file.type.toLowerCase();

  return (
    normalizedName.endsWith('.json') ||
    normalizedType === 'application/json' ||
    normalizedType === 'text/json'
  );
}

// ── Import strategies ────────────────────────────────────────────────

async function importIntoIdb(
  persist: Record<PersistCollection, unknown[]>,
  collections: PersistCollection[]
): Promise<void> {
  for (const collection of collections) {
    await idbMergeAll(
      collection,
      (persist[collection] ?? []) as Array<{ id: string }>
    );
  }
}

// ── Public composable ────────────────────────────────────────────────

export function useDataImport() {
  type HydratableStore = {
    $hydrate?: () => void;
  };

  const isImporting = ref(false);
  const error = ref<string | null>(null);
  const success = ref(false);
  const progress = ref(0);
  const showIncompatibleDialog = ref(false);
  const incompatibleMigrations = ref<string[]>([]);
  const showImportWarningDialog = ref(false);
  const pendingBackupData = ref<BackupData | null>(null);
  const pendingBackupSummary = ref<BackupSummary | null>(null);

  const clearPendingImport = () => {
    pendingBackupData.value = null;
    pendingBackupSummary.value = null;
    showImportWarningDialog.value = false;
  };

  const stageImport = async (rawData: unknown): Promise<void> => {
    error.value = null;
    success.value = false;
    progress.value = 0;

    if (!isValidBackup(rawData)) {
      clearPendingImport();
      error.value =
        'Invalid backup file. Please use a file exported from OrcaQ.';
      return;
    }

    const backupData = rawData as BackupData;
    const backupSchemaVersion = getBackupSchemaVersion(backupData);
    const compatibility = checkImportCompatibility(backupSchemaVersion);

    if (!compatibility.compatible) {
      clearPendingImport();
      incompatibleMigrations.value = compatibility.unknownMigrations;
      showIncompatibleDialog.value = true;
      return;
    }

    pendingBackupData.value = backupData;
    pendingBackupSummary.value = summarizeBackupData(backupData);
    showImportWarningDialog.value = true;
  };

  const doImport = async (backupData: BackupData): Promise<void> => {
    isImporting.value = true;
    error.value = null;
    success.value = false;
    progress.value = 0;

    try {
      progress.value = 10;

      const backupSchemaVersion = getBackupSchemaVersion(backupData);
      const existingMigrationNames =
        (await migrationStateStorage.get())?.names ?? [];

      const persist = normalizeBackupPersistData(backupData.persist);
      const collections = PERSIST_COLLECTIONS.filter(
        collection => collection !== 'migrationState'
      );

      if (isElectron()) {
        const electronAPI = (
          window as Window & {
            electronAPI?: { persist?: { mergeAll?: unknown } };
          }
        ).electronAPI;

        if (typeof electronAPI?.persist?.mergeAll !== 'function') {
          throw new Error(
            'Electron restore is unavailable because the preload persist bridge is missing mergeAll(). Restart the app and try again.'
          );
        }

        const step = Math.floor(65 / collections.length);
        for (let i = 0; i < collections.length; i++) {
          await electronPersistMergeAll(
            collections[i]!,
            persist[collections[i]!] ?? []
          );
          progress.value = 10 + step * (i + 1);
        }
      } else {
        await importIntoIdb(persist, collections);
        progress.value = 75;
      }

      const mergedMigrationNames = [
        ...new Set([...existingMigrationNames, ...backupSchemaVersion]),
      ];

      if (mergedMigrationNames.length > 0) {
        await migrationStateStorage.save(mergedMigrationNames);

        if (isElectron()) {
          await electronPersistMergeAll('migrationState', [
            {
              id: MIGRATION_STATE_RECORD_ID,
              names: mergedMigrationNames,
            },
          ]);
        }
      }

      try {
        await runMigrations();
      } catch {
        error.value =
          'Import succeeded but schema upgrade failed. Restart the app to retry.';
        return;
      }

      progress.value = 90;

      const appConfigStore = useAppConfigStore();
      const agentStore = useAgentStore();
      const hasPersistedAppConfig = (persist.appConfig?.length ?? 0) > 0;
      const hasPersistedAgentState = (persist.agentState?.length ?? 0) > 0;

      if (hasPersistedAppConfig) {
        await appConfigStore.loadPersistData();
      }

      if (hasPersistedAgentState) {
        await agentStore.loadPersistData();
      }

      if (backupData.localStorage) {
        mergeLocalStorageSnapshot(backupData.localStorage);

        const activityBarStore = useActivityBarStore();
        const managementExplorerStore = useManagementExplorerStore();
        (activityBarStore as HydratableStore).$hydrate?.();
        (managementExplorerStore as HydratableStore).$hydrate?.();
      }

      progress.value = 100;
      success.value = true;

      const workspaceStore = useWorkspacesStore();
      const connectionStore = useManagementConnectionStore();
      const wsStateStore = useWSStateStore();
      const tabViewsStore = useTabViewsStore();

      const environmentTagStore = useEnvironmentTagStore();

      await Promise.all([
        workspaceStore.loadPersistData(),
        connectionStore.loadPersistData(),
        wsStateStore.loadPersistData(),
        tabViewsStore.loadPersistData(),
        environmentTagStore.loadTags(),
      ]);
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : 'Import failed. Please try again.';
    } finally {
      isImporting.value = false;
      clearPendingImport();
    }
  };

  const confirmImport = async (): Promise<void> => {
    if (!pendingBackupData.value || isImporting.value) {
      return;
    }

    const backupData = pendingBackupData.value;
    showImportWarningDialog.value = false;
    await doImport(backupData);
  };

  const cancelImportWarning = (): void => {
    if (isImporting.value) {
      return;
    }

    clearPendingImport();
  };

  const importFromFile = async (file: File): Promise<void> => {
    if (!isBackupJsonFile(file)) {
      error.value = 'Please select a valid .json backup file.';
      return;
    }

    try {
      const text = await file.text();
      const data: unknown = JSON.parse(text);

      await stageImport(data);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to read file.';
    }
  };

  const importFromText = async (jsonText: string): Promise<void> => {
    try {
      const data: unknown = JSON.parse(jsonText);
      await stageImport(data);
    } catch {
      error.value = 'Invalid JSON. Please check your input and try again.';
    }
  };

  const reset = () => {
    error.value = null;
    success.value = false;
    progress.value = 0;
    incompatibleMigrations.value = [];
    showIncompatibleDialog.value = false;
    clearPendingImport();
  };

  return {
    isImporting,
    error,
    success,
    progress,
    showIncompatibleDialog,
    incompatibleMigrations,
    showImportWarningDialog,
    pendingBackupSummary,
    importFromFile,
    importFromText,
    confirmImport,
    cancelImportWarning,
    reset,
  };
}
