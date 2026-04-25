import { ref } from 'vue';
import { isElectron } from '~/core/helpers/environment';
import { persistGetAll as electronPersistGetAll } from '~/core/persist/adapters/electron/primitives';
import { idbGetAll } from '~/core/persist/adapters/idb/primitives';
import { getApplied } from '~/core/persist/migration';
import { type PersistCollection } from '~/core/storage/idbRegistry';
import {
  collectBackupPersistData,
  createBackupData,
  snapshotLocalStorage,
} from './backupData';

export function useDataExport() {
  const isExporting = ref(false);
  const exportProgress = ref(0);

  const exportData = async () => {
    isExporting.value = true;
    exportProgress.value = 0;
    try {
      const onStep = (done: number, total: number) => {
        exportProgress.value = Math.round((done / total) * 85);
      };

      const loadCollection = isElectron()
        ? (collection: PersistCollection) =>
            electronPersistGetAll<unknown>(collection)
        : (collection: PersistCollection) => idbGetAll<unknown>(collection);

      const persist = await collectBackupPersistData(loadCollection, onStep);

      exportProgress.value = 90;

      const backup = createBackupData(
        persist,
        await getApplied(),
        snapshotLocalStorage()
      );

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
