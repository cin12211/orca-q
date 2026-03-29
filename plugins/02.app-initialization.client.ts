import { initPersist } from '~/core/persist';
import {
  useAgentStore,
  useAppConfigStore,
  useWorkspacesStore,
  useManagementConnectionStore,
  useWSStateStore,
} from '~/core/stores';

export default defineNuxtPlugin(async () => {
  // Platform storage and schema migrations are handled by 01.migration.client.ts.
  // This plugin only wires up the persist APIs and hydrates essential stores.

  // 1. Initialize the runtime persistence adapter (creates window.*Api).
  await initPersist();

  // 2. Hydrate Essential Stores — required for any route to function properly.
  const appConfigStore = useAppConfigStore();
  const agentStore = useAgentStore();
  const workspaceStore = useWorkspacesStore();
  const connectionStore = useManagementConnectionStore();
  const wsStateStore = useWSStateStore();

  try {
    await Promise.all([
      appConfigStore.loadPersistData(),
      agentStore.loadPersistData(),
      workspaceStore.loadPersistData(),
      connectionStore.loadPersistData(),
      wsStateStore.loadPersistData(),
    ]);
    console.log('[Init Plugin] Essential stores hydrated.');
  } catch (error) {
    console.error('[Init Plugin] Failed to hydrate stores:', error);
  }
});
