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

const { isLoading } = useLoadingIndicator();

const { schemaStore, connectToConnection, fetchReservedTableSchemas } =
  useAppContext();

const route = useRoute('workspaceId-connectionId');

onMounted(async () => {
  const workspaceId = route.params.workspaceId;
  const connectionId = route.params.connectionId;

  if (!workspaceId || !connectionId) {
    return;
  }

  const isHaveSchemasCaches = schemaStore.schemas.find(
    schema =>
      schema.connectionId === connectionId && schema.workspaceId === workspaceId
  );

  if (!isHaveSchemasCaches) {
    await connectToConnection({
      connId: connectionId,
      wsId: workspaceId,
      isRefresh: true,
    });
    return;
  }

  await fetchReservedTableSchemas({
    connId: connectionId,
    wsId: workspaceId,
  });
});
</script>

<template>
  <ClientOnly>
    <LoadingOverlay :visible="isLoading" />
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
