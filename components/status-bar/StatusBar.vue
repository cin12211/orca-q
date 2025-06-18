<script setup lang="ts">
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '#components';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { getDatabaseSupportByType } from '../modules/management-connection/constants';
import ConnectionMetricMonitor from './ConnectionMetricMonitor.vue';

const { workspaceStore, connectionStore } = useAppContext();
const onBackToHome = () => {
  navigateTo('/');
};
</script>
<template>
  <div
    class="w-full h-6 min-h-6 border-t px-2 flex items-center justify-between"
  >
    <div class="flex items-center gap-3 h-full">
      <div
        class="flex items-center h-full gap-0.5 hover:bg-muted px-1 rounded cursor-pointer"
        @click="onBackToHome"
      >
        <Icon name="hugeicons:home-06" class="size-4!" />
        <p class="text-xs inline">Home</p>
      </div>

      <Breadcrumb>
        <BreadcrumbList class="gap-0.5!">
          <!-- <BreadcrumbItem class="text-xs">
            <WorkspaceSelector
              class="h-4! px-1 rounded-sm! text-xs border-none shadow"
            />
          </BreadcrumbItem> -->

          <BreadcrumbItem class="text-xs">
            <Icon
              v-if="workspaceStore?.selectedWorkspace?.icon"
              :name="workspaceStore.selectedWorkspace.icon"
              class="size-3!"
            />
            {{ workspaceStore?.selectedWorkspace?.name }}
          </BreadcrumbItem>

          <BreadcrumbSeparator />
          <BreadcrumbItem class="text-xs">
            <component
              v-if="connectionStore?.selectedConnection?.type"
              :is="
                getDatabaseSupportByType(
                  connectionStore?.selectedConnection?.type
                )?.icon
              "
              class="size-3!"
            />

            {{ connectionStore?.selectedConnection?.name }}
          </BreadcrumbItem>
          <!-- <BreadcrumbSeparator />
        <BreadcrumbItem class="text-xs">
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem> -->
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <div class="text-muted-foreground text-xs">
      Table :
      <p class="text-black/80 inline">Positions</p>
    </div>

    <ConnectionMetricMonitor />
  </div>
</template>
