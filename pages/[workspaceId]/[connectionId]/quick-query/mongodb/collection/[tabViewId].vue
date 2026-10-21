<script setup lang="ts">
import { MongoCollectionDetail } from '~/components/modules/driver/mongodb/quick-query/containers';
import { useTabViewPage } from '~/core/composables/useTabViewPage';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import type { MongoCollectionDetailMetadata } from '~/core/types/entities/tab-view.entity';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
  notAllowBottomPanel: true,
  notAllowRightPanel: true,
});

const { connectionId, metadata, workspaceId } =
  useTabViewPage<MongoCollectionDetailMetadata>();
</script>

<template>
  <MongoCollectionDetail
    :connection-id="connectionId"
    :workspace-id="workspaceId"
    :database-name="metadata?.databaseName || ''"
    :collection-name="metadata?.collectionName || ''"
  />
</template>
