<script setup lang="ts">
import { toRef } from 'vue';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { TabViewType } from '~/core/types/entities/tab-view.entity';
import { useMongoSchemaTreeData } from './hooks';

const connectionStore = useManagementConnectionStore();
const { fileTreeData } = useMongoSchemaTreeData({
  connection: toRef(connectionStore, 'selectedConnection'),
});
const { openMongoDatabaseTab, openMongoCollectionTab } = useTabManagement();

const handleTreeClick = async (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  const tabViewType = node.data?.tabViewType as TabViewType | undefined;

  if (tabViewType === TabViewType.MongoDatabaseOverview) {
    await openMongoDatabaseTab({ databaseName: node.name });
    return;
  }

  if (tabViewType === TabViewType.MongoCollectionDetail) {
    await openMongoCollectionTab({
      databaseName: node.parentId || '',
      collectionName: node.name,
    });
  }
};
</script>

<template>
  <div class="h-full">
    <FileTree :initial-data="fileTreeData" @click="handleTreeClick" />
  </div>
</template>
