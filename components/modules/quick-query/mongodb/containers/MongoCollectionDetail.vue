<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import MongoCollectionListView from '../components/MongoCollectionListView.vue';
import MongoCollectionObjectListView from '../components/MongoCollectionObjectListView.vue';
import MongoCollectionTableView from '../components/MongoCollectionTableView.vue';
import MongoQuickQueryControlBar from '../components/MongoQuickQueryControlBar.vue';
import { useMongoCollectionQuery } from '../hooks';
import type { MongoCollectionViewMode } from '../types';

const props = defineProps<{
  connectionId: string;
  workspaceId: string;
  databaseName: string;
  collectionName: string;
}>();

const connectionStore = useManagementConnectionStore();
const connection = toRef(connectionStore, 'selectedConnection');
const collectionName = toRef(props, 'collectionName');
const databaseName = toRef(props, 'databaseName');

const {
  documents,
  total,
  isLoading,
  limit,
  skip,
  fetchDocuments,
  onNextPage,
  onPreviousPage,
  onRefresh,
} = useMongoCollectionQuery({ connection, collectionName, databaseName });

const viewMode = ref<MongoCollectionViewMode>('table');

const onPaginate = (value: { limit: number; offset: number }) => {
  limit.value = value.limit;
  skip.value = value.offset;
  fetchDocuments();
};

const isEmpty = computed(
  () => !isLoading.value && documents.value.length === 0
);

watch([databaseName, collectionName], fetchDocuments, { immediate: true });
</script>

<template>
  <div class="flex flex-col h-full w-full relative">
    <LoadingOverlay :visible="isLoading" />

    <div class="px-1">
      <MongoQuickQueryControlBar
        :total-rows="total"
        :current-total-rows="documents.length"
        :limit="limit"
        :skip="skip"
        :is-loading="isLoading"
        :view-mode="viewMode"
        @on-next-page="onNextPage"
        @on-previous-page="onPreviousPage"
        @on-refresh="onRefresh"
        @on-paginate="onPaginate"
        @update:view-mode="mode => (viewMode = mode)"
      />
    </div>

    <div class="flex-1 overflow-hidden px-1 mb-0.5">
      <BaseEmpty
        v-if="isEmpty"
        title="No documents found"
        desc="This collection has no documents matching the current query."
      />
      <template v-else>
        <MongoCollectionTableView
          v-if="viewMode === 'table'"
          :documents="documents"
        />
        <MongoCollectionListView
          v-else-if="viewMode === 'list'"
          :documents="documents"
        />
        <MongoCollectionObjectListView v-else :documents="documents" />
      </template>
    </div>
  </div>
</template>
