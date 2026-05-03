<script setup lang="ts">
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { formatBytes } from '~/core/helpers/bytes-formatter';
import { RedisBrowserViewMode } from '~/core/stores/useRedisWorkspaceStore';
import type { RedisKeyListItem } from '~/core/types/redis-workspace.types';
import {
  useRedisTreeData,
  type RedisTreeNodeData,
} from '../hooks/useRedisTreeData';

const props = withDefaults(
  defineProps<{
    keys: RedisKeyListItem[];
    selectedKey?: string | null;
    loading?: boolean;
    searchQuery?: string;
    viewMode?: RedisBrowserViewMode;
  }>(),
  {
    selectedKey: null,
    loading: false,
    searchQuery: '',
    viewMode: RedisBrowserViewMode.Tree,
  }
);

const emit = defineEmits<{
  (e: 'select', key: string): void;
}>();

const fileTreeRef = useTemplateRef<typeof FileTree | null>('fileTreeRef');
const flatTreeRef = useTemplateRef<typeof FileTree | null>('flatTreeRef');

const searchQueryRef = toRef(props, 'searchQuery');
const keysRef = toRef(props, 'keys');

const { fileTreeData, flatFileTreeData, defaultFolderOpenIds, visibleKeys } =
  useRedisTreeData(keysRef, searchQueryRef);

const formatTtl = (ttl: number | undefined) => {
  if (ttl === undefined || ttl < 0) {
    return 'persisted';
  }

  if (ttl < 60) {
    return `${ttl}s`;
  }

  if (ttl < 3600) {
    return `${Math.floor(ttl / 60)}m`;
  }

  if (ttl < 86400) {
    return `${Math.floor(ttl / 3600)}h`;
  }

  return `${Math.floor(ttl / 86400)}d`;
};

const getRedisNodeData = (
  node: FileNode<Record<string, unknown>> | undefined
): RedisTreeNodeData | null => {
  if (!node?.data || typeof node.data.kind !== 'string') {
    return null;
  }

  return node.data as RedisTreeNodeData;
};

const getNodeMeta = (
  node: FileNode<Record<string, unknown>> | undefined
): Array<{ label: string; title: string }> => {
  const data = getRedisNodeData(node);

  if (!data) {
    return [];
  }

  if (data.kind === 'group') {
    const labels: Array<{ label: string; title: string }> = [];

    if (typeof data.keyCount === 'number') {
      labels.push({
        label: `${data.keyCount} keys`,
        title: `Total keys: ${data.keyCount}`,
      });
    }

    const memoryLabel =
      data.memoryUsage === null || data.memoryUsage === undefined
        ? null
        : formatBytes(data.memoryUsage);

    if (memoryLabel) {
      labels.push({
        label: memoryLabel,
        title: `Approx. size: ${memoryLabel}`,
      });
    }

    return labels;
  }

  const labels: Array<{ label: string; title: string }> = [];

  if (data.memoryUsageHuman) {
    labels.push({
      label: data.memoryUsageHuman,
      title: `Size: ${data.memoryUsageHuman}`,
    });
  }

  labels.push({
    label: `ttl ${formatTtl(data.ttl)}`,
    title:
      data.ttl !== undefined && data.ttl >= 0
        ? `Expires in ${Math.max(data.ttl, 0)} seconds`
        : 'No expiration',
  });

  return labels;
};

const handleListClick = (nodeId: string) => {
  const node = flatFileTreeData.value[nodeId];
  const redisKey = node?.data?.redisKey;

  if (node?.data?.kind === 'key' && redisKey) {
    emit('select', redisKey);
  }
};

const handleTreeClick = (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  const redisKey = node?.data?.redisKey;

  if (node?.data?.kind === 'key' && redisKey) {
    emit('select', redisKey);
  }
};

watch(
  () => props.selectedKey,
  selectedKey => {
    const activeRef =
      props.viewMode === RedisBrowserViewMode.Tree
        ? fileTreeRef.value
        : flatTreeRef.value;

    if (!activeRef) {
      return;
    }

    if (!selectedKey) {
      activeRef.clearSelection();
      return;
    }

    activeRef.focusItem(`redis-key:${selectedKey}`);
  },
  { flush: 'post', immediate: true }
);

watch(
  () => props.searchQuery,
  async query => {
    if (!fileTreeRef.value || !query.trim()) {
      return;
    }

    await nextTick();
    fileTreeRef.value.expandAll();
  }
);

const collapseAll = () => {
  fileTreeRef.value?.collapseAll();
};

const expandAll = () => {
  fileTreeRef.value?.expandAll();
};

const isExpandedAll = computed(() => fileTreeRef.value?.isExpandedAll ?? false);

defineExpose({
  collapseAll,
  expandAll,
  isExpandedAll,
});
</script>

<template>
  <div class="min-h-0 flex-1 overflow-hidden">
    <div v-if="loading" class="px-3 py-4 text-sm text-muted-foreground">
      Loading Redis keys...
    </div>

    <div
      v-else-if="visibleKeys.length === 0"
      class="flex h-full items-center justify-center"
    >
      <BaseEmpty
        title="No keys found"
        desc="No keys matched the current filter. Try adjusting the search or key pattern."
      />
    </div>

    <div
      v-else-if="props.viewMode === RedisBrowserViewMode.Tree"
      class="h-full"
    >
      <FileTree
        ref="fileTreeRef"
        :init-expanded-ids="defaultFolderOpenIds"
        :initial-data="fileTreeData"
        storage-key="redis-key-tree"
        :allow-drag-and-drop="false"
        :delay-focus="0"
        @click="handleTreeClick"
      >
        <template #actions="{ node }">
          <div class="flex items-center gap-1.5 text-xxs text-muted-foreground">
            <span
              v-for="meta in getNodeMeta(node)"
              :key="`${node.id}-${meta.label}`"
              class="truncate"
              :title="meta.title"
            >
              {{ meta.label }}
            </span>
          </div>
        </template>
      </FileTree>
    </div>

    <div v-else class="h-full">
      <FileTree
        ref="flatTreeRef"
        :init-expanded-ids="[]"
        :initial-data="flatFileTreeData"
        storage-key="redis-key-list"
        :allow-drag-and-drop="false"
        :delay-focus="0"
        @click="handleListClick"
      >
        <template #actions="{ node }">
          <div class="flex items-center gap-1.5 text-xxs text-muted-foreground">
            <span
              v-for="meta in getNodeMeta(node)"
              :key="`${node.id}-${meta.label}`"
              class="truncate"
              :title="meta.title"
            >
              {{ meta.label }}
            </span>
          </div>
        </template>
      </FileTree>
    </div>
  </div>
</template>
