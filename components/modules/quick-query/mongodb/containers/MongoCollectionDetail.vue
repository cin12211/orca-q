<script setup lang="ts">
import { ref, toRef, watch } from 'vue';
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
} = useMongoCollectionQuery({ connection, collectionName });

const viewMode = ref<MongoCollectionViewMode>('table');

watch(collectionName, fetchDocuments, { immediate: true });
</script>

<template>
  <div class="flex flex-col h-full w-full">
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
      @update:view-mode="mode => (viewMode = mode)"
    />

    <div class="flex-1 overflow-hidden px-1">
      <MongoCollectionTableView
        v-if="viewMode === 'table'"
        :documents="documents"
      />
      <MongoCollectionListView
        v-else-if="viewMode === 'list'"
        :documents="documents"
      />
      <MongoCollectionObjectListView v-else :documents="documents" />
    </div>
  </div>
</template>
