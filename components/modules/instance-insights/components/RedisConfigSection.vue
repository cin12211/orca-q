<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import type { RedisConfigEntry } from '~/core/types/instance-insights.types';

const props = defineProps<{
  config: RedisConfigEntry[] | undefined;
  dbIndex?: number;
  isInitialLoading?: boolean;
}>();

const searchQuery = ref('');
const selectedCategory = ref<
  'all' | 'memory' | 'persistence' | 'network' | 'general'
>('all');

const categoryKeywords: Record<string, string[]> = {
  memory: ['maxmemory', 'eviction', 'policy', 'databases'],
  persistence: ['append', 'aof', 'save', 'rdb'],
  network: ['timeout', 'keepalive', 'tcp', 'port', 'bind'],
};

const configEntries = computed(() => props.config || []);

const filteredEntries = computed(() => {
  let list = configEntries.value;

  if (selectedCategory.value !== 'all') {
    const keywords = categoryKeywords[selectedCategory.value] || [];
    list = list.filter(entry =>
      keywords.some(kw => entry.name.toLowerCase().includes(kw))
    );
  }

  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    entry =>
      entry.name.toLowerCase().includes(q) ||
      entry.value.toLowerCase().includes(q)
  );
});
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-col gap-3 overflow-hidden">
    <LoadingOverlay :visible="!!isInitialLoading" />
    <div class="flex items-center justify-between shrink-0">
      <h3
        class="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
      >
        <Icon
          name="hugeicons:globe-02"
          class="size-3.5 shrink-0 text-muted-foreground"
        />
        <span>Instance Overview</span>
      </h3>
    </div>

    <!-- Header & Search Toolbar -->
    <div
      class="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b mb-1 shrink-0"
    >
      <div class="flex items-center gap-2">
        <h3 class="text-xs font-medium">Redis Runtime Configuration</h3>
        <Badge variant="secondary" class="text-xxs">
          {{ filteredEntries.length }} of {{ configEntries.length }} keys
        </Badge>
      </div>

      <div class="flex items-center gap-2">
        <!-- Category Filter Tabs -->
        <Tabs v-model="selectedCategory" class="shrink-0">
          <TabsList size="xxs">
            <TabsTrigger
              v-for="cat in [
                'all',
                'memory',
                'persistence',
                'network',
              ] as const"
              :key="cat"
              size="xs"
              :value="cat"
              class="capitalize text-xxs px-2 h-5 cursor-pointer"
            >
              {{ cat }}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div class="relative w-56">
          <Icon
            name="hugeicons:search-01"
            class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
          />
          <Input
            v-model="searchQuery"
            placeholder="Search config key or value..."
            class="h-7 pl-8 text-xs bg-background"
          />
        </div>
      </div>
    </div>

    <!-- Searchable Config Table with Sticky Header & Internal Scroll -->
    <div class="flex-1 min-h-0 overflow-y-auto rounded-md border bg-background">
      <Table class="text-xs">
        <TableHeader class="bg-muted/60 sticky top-0 z-10 backdrop-blur-xs">
          <TableRow>
            <TableHead class="py-2 px-3 font-medium w-1/2"
              >Configuration Key</TableHead
            >
            <TableHead class="py-2 px-3 font-medium w-1/2">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-if="filteredEntries.length === 0"
            class="hover:bg-transparent"
          >
            <TableCell colspan="2" class="py-8">
              <BaseEmpty
                desc="No configuration entries match your filter."
                hidden-icon
              />
            </TableCell>
          </TableRow>
          <TableRow
            v-for="entry in filteredEntries"
            :key="entry.name"
            class="hover:bg-muted/30 transition-colors"
          >
            <TableCell class="py-2 px-3 font-mono font-medium text-foreground">
              {{ entry.name }}
            </TableCell>
            <TableCell class="py-2 px-3 font-mono text-muted-foreground">
              <code
                class="bg-muted/60 px-1.5 py-0.5 rounded text-[11px] text-primary"
              >
                {{ entry.value || 'not set' }}
              </code>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
