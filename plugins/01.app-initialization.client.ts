import { initIDB } from '~/core/persist';
import {
  useWorkspacesStore,
  useManagementConnectionStore,
  useWSStateStore,
} from '~/core/stores';

export default defineNuxtPlugin(async nuxtApp => {
  // 1. Initialize IndexedDB
  await initIDB();

  // 2. Hydrate Essential Stores
  // These are required for any route to function properly
  const workspaceStore = useWorkspacesStore();
  const connectionStore = useManagementConnectionStore();
  const wsStateStore = useWSStateStore();

  try {
    // Parallel loading for efficiency
    await Promise.all([
      workspaceStore.loadPersistData(),
      connectionStore.loadPersistData(),
      wsStateStore.loadPersistData(),
    ]);

    console.log('[Init Plugin] Essential stores hydrated successfully.');
  } catch (error) {
    console.error('[Init Plugin] Failed to hydrate stores:', error);
  }
});
