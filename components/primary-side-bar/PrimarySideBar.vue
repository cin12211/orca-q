<script setup lang="ts">
import { ModulesManagementErdDiagram } from '#components';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import {
  ActivityBarItemType,
  useActivityBarStore,
} from '~/shared/stores/useActivityBarStore';

const activityStore = useActivityBarStore();

//TODO: fix v-if="layout.layoutSize[0]"
const layout = useAppLayoutStore();
</script>

<template>
  <div class="w-full h-full flex flex-col" v-if="layout.layoutSize[0]">
    <ModulesManagementExplorer
      v-if="activityStore.activityActive === ActivityBarItemType.Explorer"
    />

    <ModulesManagementSchemas
      v-if="activityStore.activityActive === ActivityBarItemType.Schemas"
    />
    <ModulesManagementErdDiagram
      v-if="activityStore.activityActive === ActivityBarItemType.ErdDiagram"
    />

    <!-- <ModulesManagementExplorer
      :class="[
        activityStore.activityActive === ActivityBarItemType.Explorer
          ? ''
          : 'hidden',
      ]"
    />

    <ModulesManagementSchemas
      :class="[
        activityStore.activityActive === ActivityBarItemType.Schemas
          ? ''
          : 'hidden',
      ]"
    /> -->

    <!-- TODO: open later -->
    <!-- <div class="h-11 border-t w-full">
      <ActivityBarHorizontalBottom />
    </div> -->
  </div>
</template>
