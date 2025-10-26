<script setup lang="ts">
import { LoadingOverlay, TooltipProvider } from '#components';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import Settings from './components/modules/settings/Settings.vue';
import { Toaster } from './components/ui/sonner';
import { initIDB } from './shared/persist';
import { useConnectionsService } from './shared/services/useConnectionService';
import { useWorkspacesService } from './shared/services/useWorkspacesService';
import { useAppStatesService } from './shared/services/useWsStateService';
import { buildAppStateId } from './shared/services/useWsStateStore';
import { DEFAULT_DEBOUNCE_INPUT } from './utils/constants';

initIDB();

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

useHead({
  title: 'Orca Query',
});

const { initialize } = useAmplitude();

const appLoading = useAppLoading();
const { isLoading } = useLoadingIndicator();

// const { connectToConnection } = useAppContext();
const {
  loadAll: loadAppStates,
  store: appStateStore,
  isLoading: isLoadingStates,
} = useAppStatesService();
const { loadAll: loadWorkspaces, isLoading: isLoadingWorkspaces } =
  useWorkspacesService();
const { loadAll: loadConnections, isLoading: isLoadingConnections } =
  useConnectionsService();

const route = useRoute('workspaceId-connectionId');

onBeforeMount(async () => {
  initialize();
  Promise.all([loadAppStates(), loadWorkspaces(), loadConnections()]);
});

onMounted(async () => {
  //  const workspaceId = route.params.workspaceId;
  // const connectionId = route.params.connectionId;
  // if (!workspaceId || !connectionId) {
  //   return;
  // }
  // await connectToConnection({
  //   connId: connectionId,
  //   wsId: workspaceId,
  //   isRefresh: true,
  // });
});

watch(
  () => route.params,
  () => {
    if (route.params.workspaceId && route.params.connectionId) {
      const stateId = buildAppStateId(
        route.params.workspaceId,
        route.params.connectionId
      );
      const state = appStateStore.byId(stateId);
      if (!state.value) {
        navigateTo('/');
      }
    }
  },
  {
    deep: true,
    immediate: true,
  }
);
</script>

<template>
  <ClientOnly>
    <LoadingOverlay
      :visible="
        isLoading ||
        appLoading.isLoading.value ||
        isLoadingStates ||
        isLoadingWorkspaces ||
        isLoadingConnections
      "
    />
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
