import { ref } from 'vue';
import { isTauri, isElectron } from '~/core/helpers/environment';
import { idbGetAll } from '~/core/persist/adapters/idb/primitives';
import { PERSIST_COLLECTIONS } from '~/core/persist/adapters/tauri/primitives';
import { persistGetAll } from '~/core/persist/adapters/tauri/primitives';
import type { PersistCollection } from '~/core/persist/adapters/tauri/primitives';
import { persistGetAll as electronPersistGetAll } from '~/core/persist/adapters/electron/primitives';
import { useAgentStore } from '~/core/stores/agentStore';

export interface BackupData {
  version: number;
  exportedAt: string;
  persist: Record<PersistCollection, unknown[]>;
  agent: {
    histories: unknown[];
  };
}

async function collectTauriData(
  onStep: (done: number, total: number) => void
): Promise<Record<PersistCollection, unknown[]>> {
  const result: Partial<Record<PersistCollection, unknown[]>> = {};
  for (let i = 0; i < PERSIST_COLLECTIONS.length; i++) {
    const col = PERSIST_COLLECTIONS[i]!;
    result[col] = await persistGetAll<unknown>(col);
    onStep(i + 1, PERSIST_COLLECTIONS.length);
  }
  return result as Record<PersistCollection, unknown[]>;
}

async function collectIdbData(
  onStep: (done: number, total: number) => void
): Promise<Record<PersistCollection, unknown[]>> {
  const result: Partial<Record<PersistCollection, unknown[]>> = {};
  for (let i = 0; i < PERSIST_COLLECTIONS.length; i++) {
    const collection = PERSIST_COLLECTIONS[i]!;
    result[collection] = await idbGetAll<unknown>(collection);
    onStep(i + 1, PERSIST_COLLECTIONS.length);
  }
  return result as Record<PersistCollection, unknown[]>;
}

async function collectElectronData(
  onStep: (done: number, total: number) => void
): Promise<Record<PersistCollection, unknown[]>> {
  const result: Partial<Record<PersistCollection, unknown[]>> = {};
  for (let i = 0; i < PERSIST_COLLECTIONS.length; i++) {
    const col = PERSIST_COLLECTIONS[i]!;
    result[col] = await electronPersistGetAll<unknown>(col);
    onStep(i + 1, PERSIST_COLLECTIONS.length);
  }
  return result as Record<PersistCollection, unknown[]>;
}

export function useDataExport() {
  const isExporting = ref(false);
  const exportProgress = ref(0); // 0–100

  const exportData = async () => {
    isExporting.value = true;
    exportProgress.value = 0;
    try {
      const agentStore = useAgentStore();

      // Collections = N steps, agent = 1 step, serialize+download = 1 step
      const onStep = (done: number, total: number) => {
        // 0–85% for data collection
        exportProgress.value = Math.round((done / total) * 85);
      };

      const persist = isTauri()
        ? await collectTauriData(onStep)
        : isElectron()
          ? await collectElectronData(onStep)
          : await collectIdbData(onStep);

      exportProgress.value = 90; // agent step

      const backup: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        persist,
        agent: {
          histories: JSON.parse(JSON.stringify(agentStore.histories.value)),
        },
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const fileName = `orcaq-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      exportProgress.value = 100;
    } finally {
      isExporting.value = false;
    }
  };

  return { isExporting, exportProgress, exportData };
}
