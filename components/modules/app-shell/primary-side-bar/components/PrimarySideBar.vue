<script setup lang="ts">
import {
  ManagementErdDiagram,
  ManagementExplorer,
  ManagementSchemas,
  ManagementDatabaseTools,
  ManagementUsersAndPermission,
  ManagementAgent,
} from '#components';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import {
  ActivityBarItemType,
  useActivityBarStore,
} from '~/core/stores/useActivityBarStore';

const activityStore = useActivityBarStore();

const appConfigStore = useAppConfigStore();

const current = shallowRef();

watch(
  () => activityStore.activityActive,
  () => {
    if (activityStore.activityActive === ActivityBarItemType.Explorer) {
      current.value = ManagementExplorer;
    }
    if (activityStore.activityActive === ActivityBarItemType.Schemas) {
      current.value = ManagementSchemas;
    }
    if (activityStore.activityActive === ActivityBarItemType.ErdDiagram) {
      current.value = ManagementErdDiagram;
    }
    if (activityStore.activityActive === ActivityBarItemType.UsersRoles) {
      current.value = ManagementUsersAndPermission;
    }
    if (activityStore.activityActive === ActivityBarItemType.DatabaseTools) {
      current.value = ManagementDatabaseTools;
    }
    if (activityStore.activityActive === ActivityBarItemType.Agent) {
      current.value = ManagementAgent;
    }
  },
  {
    immediate: true,
  }
);
</script>

<template>
  <div class="w-full h-full flex flex-col" v-if="appConfigStore.layoutSize[0]">
    <KeepAlive>
      <component :is="current"></component>
    </KeepAlive>
  </div>
</template>
