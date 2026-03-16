<script setup lang="ts">
// main.ts (or the entry that mounts Vue)
import { LoadingOverlay, TooltipProvider } from '#components';
import { CommandPaletteView } from '@/components/modules/command-palette';
import ChangelogPopup from './components/modules/changelog/ChangelogPopup.vue';
import Settings from './components/modules/settings';
import { Toaster } from './components/ui/sonner';
import { DEFAULT_DEBOUNCE_INPUT } from './core/constants';
import { useAppContext } from './core/contexts';
import { useChangelogModal } from './core/contexts/useChangelogModal';

// initIDB() init in plugins/01.app-initialization.client.ts

// AG-Grid Module registration load in plugins/00.ag-grid.client.ts

// Analytics initialization load in plugins/03.analytics.client.ts

const appLoading = useAppLoading();
const { isLoading } = useLoadingIndicator();

const { connectToConnection } = useAppContext();
const { autoShowIfNewVersion } = useChangelogModal();

const route = useRoute('workspaceId-connectionId');

useHead({
  title: 'Orca Query',
});

// React to route changes and initial mount
watch(
  () => [route.params.workspaceId, route.params.connectionId],
  async ([workspaceId, connectionId]) => {
    if (!workspaceId || !connectionId) return;

    await connectToConnection({
      connId: connectionId as string,
      wsId: workspaceId as string,
      isRefresh: false, // Default to false for transitions
    });
  },
  { immediate: true }
);

onMounted(async () => {
  // Auto-show changelog if there's a new version
  autoShowIfNewVersion();
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

    <CommandPaletteView />
    <Settings />
    <ChangelogPopup />
    <Toaster position="top-right" :close-button="true" />
  </ClientOnly>
</template>

<style>
@import url('./assets/global.css');
</style>
