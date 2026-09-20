<script setup lang="ts">
import type { Component } from 'vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useManagementConnectionStore } from '~/core/stores';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import {
  ActivityBarItemType,
  useActivityBarStore,
} from '~/core/stores/useActivityBarStore';
import { useVisibleActivityItems } from '../../activity-bar/hooks';
import {
  AgentSidebarPanel,
  DatabaseToolsSidebarPanel,
  ErdDiagramSidebarPanel,
  ExplorerSidebarPanel,
  SchemasSidebarPanel,
  UsersRolesSidebarPanel,
} from '../components';

type SidebarPlaceholderCopy = {
  eyebrow: string;
  title: string;
  description: string;
};

const activityStore = useActivityBarStore();
const managementConnectionStore = useManagementConnectionStore();

const appConfigStore = useAppConfigStore();

const { capabilityProfile, visibleActivityItems } = useVisibleActivityItems();

const selectedConnectionType = computed(
  () =>
    managementConnectionStore.selectedConnection?.type as
      | DatabaseClientType
      | undefined
);

watch(
  capabilityProfile,
  profile => {
    activityStore.ensureActivityVisible(
      visibleActivityItems.value,
      profile.defaultActivityItem
    );
  },
  {
    immediate: true,
  }
);

// Each activity panel resolves its own per-db-type component
const current = computed<Component | null>(() => {
  switch (activityStore.activityActive) {
    case ActivityBarItemType.Explorer:
      return ExplorerSidebarPanel;
    case ActivityBarItemType.Schemas:
      return SchemasSidebarPanel;
    case ActivityBarItemType.ErdDiagram:
      return ErdDiagramSidebarPanel;
    case ActivityBarItemType.UsersRoles:
      return UsersRolesSidebarPanel;
    case ActivityBarItemType.DatabaseTools:
      return DatabaseToolsSidebarPanel;
    case ActivityBarItemType.Agent:
      return AgentSidebarPanel;
    default:
      return null;
  }
});

const placeholderCopy = computed<SidebarPlaceholderCopy | null>(() => {
  return null;
});
</script>

<template>
  <div class="w-full h-full flex flex-col" v-if="appConfigStore.layoutSize[0]">
    <KeepAlive v-if="current">
      <component :is="current" :db-type="selectedConnectionType"></component>
    </KeepAlive>

    <div
      v-else-if="placeholderCopy"
      class="h-full px-4 py-5 flex flex-col gap-3 text-sm text-muted-foreground"
    >
      <span
        class="text-xs font-medium uppercase tracking-[0.18em] text-primary/70"
      >
        {{ placeholderCopy.eyebrow }}
      </span>
      <h2 class="text-base font-semibold text-foreground">
        {{ placeholderCopy.title }}
      </h2>
      <p class="leading-6">
        {{ placeholderCopy.description }}
      </p>
    </div>
  </div>
</template>
