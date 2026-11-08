import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    console.log('[AG-Grid Plugin] Registering Community Modules.');

    ModuleRegistry.registerModules([AllCommunityModule]);
  }
});
