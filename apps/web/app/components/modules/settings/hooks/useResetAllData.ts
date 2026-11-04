import { isElectron } from '#shared/helpers/environment';
import {
  PERSIST_COLLECTIONS,
  type PersistCollection,
} from '#shared/storage/idbRegistry';
import { idbReplaceAll } from '~/core/persist/adapters/idb/primitives';

async function clearBrowserPersistedData(): Promise<void> {
  await Promise.all(
    PERSIST_COLLECTIONS.map(collection =>
      idbReplaceAll(collection as PersistCollection, [])
    )
  );
}

export function useResetAllData() {
  const isResetting = ref(false);

  const resetAllData = async (): Promise<void> => {
    if (isResetting.value) {
      return;
    }

    isResetting.value = true;

    try {
      if (isElectron()) {
        if (!window.electronAPI?.window.resetAllData) {
          throw new Error('Desktop reset is unavailable in this build.');
        }

        await window.electronAPI.window.resetAllData();
      } else {
        await clearBrowserPersistedData();
      }

      localStorage.clear();
      window.sessionStorage?.clear();
      window.location.reload();
    } finally {
      isResetting.value = false;
    }
  };

  return {
    isResetting,
    resetAllData,
  };
}
