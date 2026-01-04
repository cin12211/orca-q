<script setup lang="ts">
import {
  ModulesManagementErdDiagram,
  ModulesManagementExplorer,
  ModulesManagementSchemas,
} from '#components';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import {
  ActivityBarItemType,
  useActivityBarStore,
} from '~/shared/stores/useActivityBarStore';

const activityStore = useActivityBarStore();

const layout = useAppLayoutStore();

const current = shallowRef();

watch(
  () => activityStore.activityActive,
  () => {
    if (activityStore.activityActive === ActivityBarItemType.Explorer) {
      current.value = ModulesManagementExplorer;
    }
    if (activityStore.activityActive === ActivityBarItemType.Schemas) {
      current.value = ModulesManagementSchemas;
    }
    if (activityStore.activityActive === ActivityBarItemType.ErdDiagram) {
      current.value = ModulesManagementErdDiagram;
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
