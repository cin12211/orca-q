import { ref } from 'vue';
import { isElectron } from '~/core/helpers/environment';
import { persistReplaceAll as electronPersistReplaceAll } from '~/core/persist/adapters/electron/primitives';
import { idbReplaceAll } from '~/core/persist/adapters/idb/primitives';
// IDB primitives (shared collections definition)
import { PERSIST_COLLECTIONS } from '~/core/persist/adapters/idb/primitives';
import type { PersistCollection } from '~/core/persist/adapters/idb/primitives';
import {
  checkImportCompatibility,
  runMigrations,
} from '~/core/persist/migration';
import { migrationStateStorage } from '~/core/storage/entities/MigrationStateStorage';
import { useAgentStore } from '~/core/stores/agentStore';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useManagementExplorerStore } from '~/core/stores/managementExplorerStore';
import { useActivityBarStore } from '~/core/stores/useActivityBarStore';
import { useWSStateStore } from '~/core/stores/useWSStateStore';
import { useWorkspacesStore } from '~/core/stores/useWorkspacesStore';
import {
  getBackupSchemaVersion,
  isBackupData,
  restoreLocalStorageSnapshot,
  type BackupData,
} from './backupData';

export const BACKUP_JSON_FILE_ACCEPT = 'application/json,.json';

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
  persist: Partial<Record<PersistCollection, unknown[]>>
): Promise<void> {
  for (const collection of PERSIST_COLLECTIONS) {
    await idbReplaceAll(
      collection,
      (persist[collection] ?? []) as Array<{ id: string }>
    );
  }
}

// ── Public composable ────────────────────────────────────────────────

export function useDataImport() {
  const isImporting = ref(false);
  const error = ref<string | null>(null);
  const success = ref(false);
  const progress = ref(0); // 0–100
  const showIncompatibleDialog = ref(false);
  const incompatibleMigrations = ref<string[]>([]);

  // Shared core: parse → validate → write → restore agent
  const doImport = async (rawData: unknown): Promise<void> => {
    isImporting.value = true;
    error.value = null;
    success.value = false;
    progress.value = 0;

    try {
      if (!isValidBackup(rawData)) {
        error.value =
          'Invalid backup file. Please use a file exported from OrcaQ.';
        return;
      }

      progress.value = 10; // parsed + validated

      // ── Migration compatibility check ────────────────────────────────────
      // New-format backups (023+) carry migrationState as a collection record.
      // Old-format backups (022) carry it as top-level schemaVersion only.
      const backupData = rawData as BackupData;
      const backupSchemaVersion = getBackupSchemaVersion(backupData);
      const compatibility = checkImportCompatibility(backupSchemaVersion);

      if (!compatibility.compatible) {
        incompatibleMigrations.value = compatibility.unknownMigrations;
        showIncompatibleDialog.value = true;
        isImporting.value = false;
        return;
      }

      // ── Write data to storage ─────────────────────────────────────────────
      const persist = backupData.persist as Partial<
        Record<PersistCollection, unknown[]>
      >;
      const collections: PersistCollection[] = [...PERSIST_COLLECTIONS];

      if (isElectron()) {
        const step = Math.floor(65 / collections.length);
        for (let i = 0; i < collections.length; i++) {
          await electronPersistReplaceAll(
            collections[i]!,
            persist[collections[i]!] ?? []
          );
          progress.value = 10 + step * (i + 1);
        }
      } else {
        await importIntoIdb(persist);
        progress.value = 75;
      }

      // ── Gap migration seed fallback for old backups (pre-023) ────────────
      // Old backups have no migrationState collection record. If the
      // replaceAll loop above left migrationState empty, seed it from
      // backupSchemaVersion so the runner skips already-applied migrations.
      const restoredMigState = await migrationStateStorage.get();
      if (!restoredMigState && backupSchemaVersion.length > 0) {
        await migrationStateStorage.save(backupSchemaVersion);
      }

      // ── Run gap migrations ────────────────────────────────────────────────
      try {
        await runMigrations();
      } catch {
        error.value =
          'Import succeeded but schema upgrade failed. Restart the app to retry.';
        return;
      }

      progress.value = 90;

      // ── Reload stores ─────────────────────────────────────────────────────
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
        restoreLocalStorageSnapshot(backupData.localStorage);

        const activityBarStore = useActivityBarStore();
        const managementExplorerStore = useManagementExplorerStore();
        activityBarStore.$hydrate();
        managementExplorerStore.$hydrate();
      }

      progress.value = 100;
      success.value = true;

      // Reload stores so the UI reflects the imported data without a page refresh
      const workspaceStore = useWorkspacesStore();
      const connectionStore = useManagementConnectionStore();
      const wsStateStore = useWSStateStore();
      await Promise.all([
        workspaceStore.loadPersistData(),
        connectionStore.loadPersistData(),
        wsStateStore.loadPersistData(),
      ]);
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : 'Import failed. Please try again.';
    } finally {
      isImporting.value = false;
    }
  };

  const importFromFile = async (file: File): Promise<void> => {
    if (!isBackupJsonFile(file)) {
      error.value = 'Please select a valid .json backup file.';
      isImporting.value = false;
      return;
    }

    try {
      const text = await file.text();
      const data: unknown = JSON.parse(text);

      await doImport(data);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to read file.';
      isImporting.value = false;
    }
  };

  const importFromText = async (jsonText: string): Promise<void> => {
    try {
      const data: unknown = JSON.parse(jsonText);
      await doImport(data);
    } catch {
      error.value = 'Invalid JSON. Please check your input and try again.';
    }
  };

  const reset = () => {
    error.value = null;
    success.value = false;
    progress.value = 0;
  };

  return {
    isImporting,
    error,
    success,
    progress,
    showIncompatibleDialog,
    incompatibleMigrations,
    importFromFile,
    importFromText,
    reset,
  };
}
