<script setup lang="ts">
// main.ts (or the entry that mounts Vue)
import { LoadingOverlay, TooltipProvider } from '#components';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Toaster } from './components/ui/sonner';
import { useAppContext } from './shared/contexts';
import { useWSStateStore } from './shared/stores';
import { DEFAULT_DEBOUNCE_INPUT } from './utils/constants';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const { isLoading } = useLoadingIndicator();

const { setConnectionId, wsStateStore, tabViewStore } = useAppContext();

const route = useRoute('workspaceId');

onMounted(async () => {
  const workspaceId = route.params.workspaceId;
  console.log('🚀 ~ onMounted ~ workspaceId:', workspaceId);

  wsStateStore.setActiveWSId(workspaceId);

  if (!wsStateStore.connectionId) {
    return;
  }

  await setConnectionId({ connectionId: wsStateStore.connectionId });

  await tabViewStore.onActiveCurrentTab();
});
</script>

<template>
  <LoadingOverlay :visible="isLoading" />
  <NuxtLoadingIndicator
    :color="'repeating-linear-gradient(to right, #ffffff 0%, #000000 100%)'"
  />
  <TooltipProvider :delay-duration="DEFAULT_DEBOUNCE_INPUT">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </TooltipProvider>

  <ClientOnly>
    <Toaster position="top-right" :close-button="true" />
  </ClientOnly>
</template>

<style>
@import url('./assets/global.css');
</style>
