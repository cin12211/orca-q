<script setup lang="ts">
import {
  ManagementErdDiagram,
  ManagementExplorer,
  ManagementSchemas,
  ManagementExport,
  ManagementUsersAndPermission,
} from '#components';
import { useAppLayoutStore } from '~/core/stores/appLayoutStore';
import {
  ActivityBarItemType,
  useActivityBarStore,
} from '~/core/stores/useActivityBarStore';

const activityStore = useActivityBarStore();

const layout = useAppLayoutStore();

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
    if (activityStore.activityActive === ActivityBarItemType.DatabaseExport) {
      current.value = ManagementExport;
    }
  },
  {
    immediate: true,
  }
);
</script>

<template>
  <div class="w-full h-full flex flex-col" v-if="layout.layoutSize[0]">
    <KeepAlive>
      <component :is="current"></component>
    </KeepAlive>
  </div>
</template>
