<script setup lang="ts">
import {
  ActivityBarItemType,
  useActivityBarStore,
} from '~/shared/stores/useActivityBarStore';

const activityStore = useActivityBarStore();
</script>

<template>
  <div class="w-full h-full flex flex-col bg-sidebar">
    <!-- <KeepAlive> -->
    <ModulesManagementExplorer
      v-if="activityStore.activityActive === ActivityBarItemType.Explorer"
    />
    <!-- </KeepAlive> -->

    <!-- <KeepAlive> -->
    <ModulesManagementSchemas
      v-if="activityStore.activityActive === ActivityBarItemType.Schemas"
    />
    <!-- </KeepAlive> -->

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

    <div class="h-10 border-t w-full">
      <ActivityBarHorizontalBottom />
    </div>
  </div>
</template>
