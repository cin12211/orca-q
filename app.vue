<script setup lang="ts">
// main.ts (or the entry that mounts Vue)
import { LoadingOverlay, TooltipProvider } from '#components';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import Settings from './components/modules/settings/Settings.vue';
import { Toaster } from './components/ui/sonner';
import { useAppContext } from './shared/contexts';
import { initIDB } from './shared/persist';
import { DEFAULT_DEBOUNCE_INPUT } from './utils/constants';

initIDB();

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const { initialize } = useAmplitude();

const appLoading = useAppLoading();
const { isLoading } = useLoadingIndicator();

const { connectToConnection } = useAppContext();

const route = useRoute('workspaceId-connectionId');

useHead({
  title: 'Orca Query',
});

onBeforeMount(() => {
  initialize();
});

onMounted(async () => {
  const workspaceId = route.params.workspaceId;
  const connectionId = route.params.connectionId;

  if (!workspaceId || !connectionId) {
    return;
  }

  await connectToConnection({
    connId: connectionId,
    wsId: workspaceId,
    isRefresh: true,
  });
});
</script>

<template>
  <ClientOnly>
    <LoadingOverlay :visible="isLoading || appLoading.isLoading.value" />
    <NuxtLoadingIndicator
      :color="'repeating-linear-gradient(to right, #ffffff 0%, #000000 100%)'"
    />
    <TooltipProvider :delay-duration="DEFAULT_DEBOUNCE_INPUT">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </TooltipProvider>

    <Settings />
    <Toaster position="top-right" :close-button="true" />
  </ClientOnly>
</template>

<style>
@import url('./assets/global.css');
</style>
