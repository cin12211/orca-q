<script setup lang="ts">
import { computed, ref, toRef, useTemplateRef, watch } from 'vue';
import QuickQueryErrorPopup from '~/components/modules/quick-query/QuickQueryErrorPopup.vue';
import { LocalStorageManager } from '~/core/persist/LocalStorageManager';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import MongoCollectionFilter from '../components/MongoCollectionFilter.vue';
import MongoCollectionInfoView from '../components/MongoCollectionInfoView.vue';
import MongoCollectionListView from '../components/MongoCollectionListView.vue';
import MongoCollectionTableView from '../components/MongoCollectionTableView.vue';
import MongoQuickQueryControlBar from '../components/MongoQuickQueryControlBar.vue';
import { useMongoCollectionQuery, useMongoCollectionShortcuts } from '../hooks';
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

const containerRef = ref<HTMLElement>();
const mongoFilterRef =
  useTemplateRef<InstanceType<typeof MongoCollectionFilter>>('mongoFilterRef');
const isShowFilters = ref(false);

const {
  documents,
  total,
  isLoading,
  limit,
  skip,
  activeFilterPayload,
  applyFilter,
  fetchDocuments,
  onNextPage,
  onPreviousPage,
  onRefresh,
  error,
} = useMongoCollectionQuery({ connection, collectionName, databaseName });

const openErrorModal = ref(false);

watch(error, newError => {
  if (newError) {
    openErrorModal.value = true;
  }
});

useMongoCollectionShortcuts({
  containerRef,
  mongoFilterRef,
  onRefresh,
});

const filterPersistKey = computed(() =>
  LocalStorageManager.mongoQueryBuilderKey(
    props.workspaceId,
    props.connectionId,
    databaseName.value,
    collectionName.value
  )
);

const activeFilterCount = computed(() =>
  activeFilterPayload.value ? Object.keys(activeFilterPayload.value).length : 0
);

const viewMode = ref<MongoCollectionViewMode>('list');

const tableViewRef =
  useTemplateRef<InstanceType<typeof MongoCollectionTableView>>(
    'tableViewRef'
  );
const listViewRef =
  useTemplateRef<InstanceType<typeof MongoCollectionListView>>(
    'listViewRef'
  );

watch(skip, () => {
  tableViewRef.value?.scrollToTop();
  listViewRef.value?.scrollToTop();
});

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
  <div ref="containerRef" class="flex flex-col h-full w-full relative">
    <LoadingOverlay :visible="isLoading" />

    <div class="px-1">
      <MongoQuickQueryControlBar
        :total-rows="total"
        :current-total-rows="documents.length"
        :limit="limit"
        :skip="skip"
        :is-loading="isLoading"
        :view-mode="viewMode"
        :is-show-filters="isShowFilters"
        :active-filter-count="activeFilterCount"
        @on-next-page="onNextPage"
        @on-previous-page="onPreviousPage"
        @on-refresh="onRefresh"
        @on-paginate="onPaginate"
        @on-toggle-filter="
          () => {
            isShowFilters = !isShowFilters;
            if (isShowFilters) {
              mongoFilterRef?.onShowSearch();
            }
          }
        "
        @update:view-mode="mode => (viewMode = mode)"
      />

      <MongoCollectionFilter
        ref="mongoFilterRef"
        v-model:is-show-filters="isShowFilters"
        :documents="documents"
        :is-loading="isLoading"
        :persist-key="filterPersistKey"
        @apply-filter="applyFilter"
      />
    </div>

    <div class="flex-1 overflow-hidden px-1 mb-0.5">
      <QuickQueryErrorPopup
        v-model:open="openErrorModal"
        :message="error || ''"
      />

      <MongoCollectionInfoView
        v-if="viewMode === 'info'"
        :connection="connection"
        :collection-name="collectionName"
        :database-name="databaseName"
      />
      <template v-else>
        <BaseEmpty
          v-if="isEmpty && !error"
          title="No documents found"
          desc="This collection has no documents matching the current query."
        />
        <div
          v-else-if="error"
          class="flex flex-col items-center justify-center h-full gap-2 p-4"
        >
          <Icon name="hugeicons:alert-02" class="text-destructive size-8" />
          <p class="text-sm font-medium text-destructive">Query Error</p>
          <p
            class="text-xs text-muted-foreground text-center max-w-md break-all"
          >
            {{ error }}
          </p>
          <Button size="sm" variant="outline" @click="openErrorModal = true"
            >View Details</Button
          >
        </div>
        <template v-else>
          <MongoCollectionTableView
            v-if="viewMode === 'table'"
            ref="tableViewRef"
            :documents="documents"
          />
          <MongoCollectionListView
            v-else-if="viewMode === 'list'"
            ref="listViewRef"
            :documents="documents"
          />
        </template>
      </template>
    </div>
  </div>
</template>
