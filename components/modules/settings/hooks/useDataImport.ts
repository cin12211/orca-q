import { ref } from 'vue';
import type { AgentHistorySession } from '~/components/modules/agent/types';
import type { BackupData } from '~/components/modules/settings/hooks/useDataExport';
import { isTauri } from '~/core/helpers/environment';
import { idbReplaceAll } from '~/core/persist/adapters/idb/primitives';
// Tauri adapters (desktop)
import {
  PERSIST_COLLECTIONS,
  persistReplaceAll,
} from '~/core/persist/adapters/tauri/primitives';
import type { PersistCollection } from '~/core/persist/adapters/tauri/primitives';
import { useAgentStore } from '~/core/stores/agentStore';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useWSStateStore } from '~/core/stores/useWSStateStore';
import { useWorkspacesStore } from '~/core/stores/useWorkspacesStore';

export const BACKUP_JSON_FILE_ACCEPT = 'application/json,.json';

// ── Validation ───────────────────────────────────────────────────────

function isValidBackup(data: unknown): data is BackupData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    'persist' in data &&
    (data as BackupData).version === 1
  );
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

      const persist = rawData.persist as Partial<
        Record<PersistCollection, unknown[]>
      >;
      const collections: PersistCollection[] = [...PERSIST_COLLECTIONS];

      if (isTauri()) {
        const step = Math.floor(80 / collections.length);
        for (let i = 0; i < collections.length; i++) {
          await persistReplaceAll(
            collections[i]!,
            persist[collections[i]!] ?? []
          );
          progress.value = 10 + step * (i + 1);
        }
      } else {
        await importIntoIdb(persist);
        progress.value = 90;
      }

      const appConfigStore = useAppConfigStore();
      const agentStore = useAgentStore();
      const hasPersistedAppConfig = (persist.appConfig?.length ?? 0) > 0;
      const hasPersistedAgentState = (persist.agentState?.length ?? 0) > 0;

      if (hasPersistedAppConfig) {
        await appConfigStore.loadPersistData();
      }

      if (hasPersistedAgentState) {
        await agentStore.loadPersistData();
      } else if (rawData.agent?.histories) {
        agentStore.replaceHistories(
          rawData.agent.histories as AgentHistorySession[]
        );
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
    importFromFile,
    importFromText,
    reset,
  };
}
