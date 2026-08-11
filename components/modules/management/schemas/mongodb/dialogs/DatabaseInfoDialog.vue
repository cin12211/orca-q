<script setup lang="ts">
import type { MongoDatabaseStats } from '~/components/modules/quick-query/mongodb/types';
import { formatBytes } from '~/core/helpers/bytes-formatter';

interface Props {
  open: boolean;
  databaseName: string;
  stats?: MongoDatabaseStats;
  loading?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const rows = (stats: MongoDatabaseStats) => [
  { label: 'Collections', value: `${stats.collections}` },
  { label: 'Views', value: `${stats.views}` },
  { label: 'Objects', value: `${stats.objects}` },
  { label: 'Avg. object size', value: formatBytes(stats.avgObjectSize) },
  { label: 'Data size', value: formatBytes(stats.dataSize) },
  { label: 'Storage size', value: formatBytes(stats.storageSize) },
  { label: 'Indexes', value: `${stats.indexes}` },
  { label: 'Index size', value: formatBytes(stats.indexSize) },
  { label: 'Total size', value: formatBytes(stats.totalSize) },
];
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>{{ databaseName }}</DialogTitle>
      </DialogHeader>

      <div v-if="loading" class="py-4 text-sm text-muted-foreground">
        Loading database info...
      </div>

      <div v-else-if="stats" class="grid grid-cols-2 gap-y-2 text-sm">
        <template v-for="row in rows(stats)" :key="row.label">
          <span class="text-muted-foreground">{{ row.label }}</span>
          <span class="font-medium text-right">{{ row.value }}</span>
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>
