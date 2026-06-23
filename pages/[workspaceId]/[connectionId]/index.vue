<script setup lang="ts">
import { resolveConnectionFamily } from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import {
  EConnectionFamily,
  EConnectionMethod,
} from '~/core/types/entities/connection.entity';

definePageMeta({
  layout: 'default',
});

const connectionStore = useManagementConnectionStore();

const currentFamily = computed(() =>
  resolveConnectionFamily(
    connectionStore.selectedConnection ?? {
      type: DatabaseClientType.POSTGRES,
      method: EConnectionMethod.STRING,
    }
  )
);

const emptyStateCopy = computed(() => {
  if (currentFamily.value === EConnectionFamily.REDIS) {
    return {
      title: 'No Redis workspace tab is open',
      description:
        'Open a Redis key browser or tools tab from the sidebar to begin.',
    };
  }

  return {
    title: 'No table is open',
    description: 'Click on a database table from the sidebar to begin',
  };
});
</script>

<template>
  <WorkspaceEmptyState
    :title="emptyStateCopy.title"
    :description="emptyStateCopy.description"
  />
</template>
