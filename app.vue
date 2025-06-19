<script setup lang="ts">
// main.ts (or the entry that mounts Vue)
import { LoadingOverlay, TooltipProvider } from '#components';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Toaster } from './components/ui/sonner';
import { useWSStateStore } from './shared/stores';
import { DEFAULT_DEBOUNCE_INPUT } from './utils/constants';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const wsStateStore = useWSStateStore();

const route = useRoute('workspaceId');

onMounted(() => {
  const workspaceId = route.params.workspaceId;
  console.log('🚀 ~ onMounted ~ workspaceId:', workspaceId);

  wsStateStore.setActiveWSId(workspaceId);
});
</script>

<template>
  <!-- <LoadingOverlay :visible="true" /> -->
  <NuxtLoadingIndicator />
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
