<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import {
  MongoCollectionDetail,
  MongoDatabaseOverview,
} from '~/components/modules/quick-query/mongodb/containers';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';
import type {
  MongoCollectionDetailMetadata,
  MongoDatabaseOverviewMetadata,
} from '~/core/types/entities/tab-view.entity';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

const route = useRoute('workspaceId-connectionId-mongodb-tabViewId');
const tabViewStore = useTabViewsStore();
const { tabViews } = storeToRefs(tabViewStore);

const tabInfo = computed(() =>
  tabViews.value.find(tab => tab.id === route.params.tabViewId)
);

const activeComponent = computed(() => {
  if (tabInfo.value?.type === TabViewType.MongoCollectionDetail) {
    return MongoCollectionDetail;
  }
  return MongoDatabaseOverview;
});

const databaseOverviewProps = computed(() => {
  const metadata = tabInfo.value?.metadata as
    | MongoDatabaseOverviewMetadata
    | undefined;
  return { databaseName: metadata?.databaseName || '' };
});

const collectionDetailProps = computed(() => {
  const metadata = tabInfo.value?.metadata as
    | MongoCollectionDetailMetadata
    | undefined;
  return {
    databaseName: metadata?.databaseName || '',
    collectionName: metadata?.collectionName || '',
  };
});
</script>

<template>
  <component
    :is="activeComponent"
    :connection-id="String(route.params.connectionId)"
    :workspace-id="String(route.params.workspaceId)"
    v-bind="
      tabInfo?.type === TabViewType.MongoCollectionDetail
        ? collectionDetailProps
        : databaseOverviewProps
    "
  />
</template>
