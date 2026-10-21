<script setup lang="ts">
import { MongoDatabaseOverview } from '~/components/modules/driver/mongodb/quick-query/containers';
import { useTabViewPage } from '~/core/composables/useTabViewPage';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import type { MongoDatabaseOverviewMetadata } from '~/core/types/entities/tab-view.entity';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
  notAllowBottomPanel: true,
  notAllowRightPanel: true,
});

const { connectionId, metadata, workspaceId } =
  useTabViewPage<MongoDatabaseOverviewMetadata>();
</script>

<template>
  <MongoDatabaseOverview
    :connection-id="connectionId"
    :workspace-id="workspaceId"
    :database-name="metadata?.databaseName || ''"
  />
</template>
