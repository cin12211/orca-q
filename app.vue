<script setup lang="ts">
// main.ts (or the entry that mounts Vue)
import { LoadingOverlay, TooltipProvider } from '#components';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import ChangelogPopup from './components/modules/changelog/ChangelogPopup.vue';
import Settings from './components/modules/settings/Settings.vue';
import { Toaster } from './components/ui/sonner';
import { DEFAULT_DEBOUNCE_INPUT } from './core/constants';
import { useAppContext } from './core/contexts';
import { useChangelogModal } from './core/contexts/useChangelogModal';
import { initIDB } from './core/persist';

initIDB();

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const { initialize } = useAmplitude();

const appLoading = useAppLoading();
const { isLoading } = useLoadingIndicator();

const { connectToConnection } = useAppContext();
const { autoShowIfNewVersion } = useChangelogModal();

const route = useRoute('workspaceId-connectionId');

useHead({
  title: 'Orca Query',
});

onBeforeMount(() => {
  initialize();
});

onMounted(async () => {
  // Auto-show changelog if there's a new version
  autoShowIfNewVersion();

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
    <ChangelogPopup />
    <Toaster position="top-right" :close-button="true" />
  </ClientOnly>
</template>

<style>
@import url('./assets/global.css');
</style>
