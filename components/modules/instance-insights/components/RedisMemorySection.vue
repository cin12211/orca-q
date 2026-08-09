<script setup lang="ts">
import {
  getRedisKeyIcon,
  getRedisKeyIconClass,
} from '~/components/modules/management/redis-browser/hooks/useRedisTreeData';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import type { RedisMemoryInsight } from '~/core/types/instance-insights.types';
import InsightKpiCard from './InsightKpiCard.vue';
import InsightScopeBadge from './InsightScopeBadge.vue';

const props = defineProps<{
  memory: RedisMemoryInsight | undefined;
  dbIndex?: number;
}>();

const bigKeySearch = ref('');
const prefixSearch = ref('');

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || Number.isNaN(Number(bytes)) || Number(bytes) <= 0) return '0 B';
  const num = Number(bytes);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(
    Math.floor(Math.log(num) / Math.log(1024)),
    units.length - 1
  );
  return `${(num / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

const memoryInfoTooltip = computed(() => {
  if (!props.memory) return undefined;
  const { totalSystemMemoryHuman, maxmemoryHuman, maxmemoryPolicy } =
    props.memory;
  return {
    systemMemory: totalSystemMemoryHuman || 'N/A',
    maxMemory: maxmemoryHuman || 'Unlimited',
    maxMemoryPolicy: maxmemoryPolicy || 'noeviction',
  };
});

const memorySubtext = computed(() => {
  if (!props.memory) return undefined;
  const { usedMemory, maxmemory, totalSystemMemory } = props.memory;
  if (maxmemory && maxmemory > 0) {
    const pct = ((usedMemory / maxmemory) * 100).toFixed(1);
    return `${pct}% of Max Memory limit`;
  }
  if (totalSystemMemory && totalSystemMemory > 0) {
    const pct = ((usedMemory / totalSystemMemory) * 100).toFixed(1);
    return `${pct}% of System RAM`;
  }
  return undefined;
});

const memoryValue = computed(() => {
  if (!props.memory) return '0 B';
  const { usedMemoryHuman, maxmemory, maxmemoryHuman, totalSystemMemoryHuman } =
    props.memory;
  if (maxmemory && maxmemory > 0 && maxmemoryHuman) {
    return `${usedMemoryHuman} / ${maxmemoryHuman}`;
  }
  if (totalSystemMemoryHuman) {
    return `${usedMemoryHuman} / ${totalSystemMemoryHuman}`;
  }
  return `${usedMemoryHuman} / Unlimited`;
});

const memoryProgress = computed(() => {
  if (!props.memory) return undefined;
  const { usedMemory, maxmemory, totalSystemMemory } = props.memory;
  if (maxmemory && maxmemory > 0) {
    return Math.round((usedMemory / maxmemory) * 100);
  }
  if (totalSystemMemory && totalSystemMemory > 0) {
    return Math.round((usedMemory / totalSystemMemory) * 100);
  }
  return undefined;
});

const filteredBigKeys = computed(() => {
  const list = props.memory?.bigKeys || [];
  const q = bigKeySearch.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    k => k.key.toLowerCase().includes(q) || k.type.toLowerCase().includes(q)
  );
});

const filteredPrefixes = computed(() => {
  const list = props.memory?.topPrefixesByMemory || [];
  const q = prefixSearch.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(p => p.prefix.toLowerCase().includes(q));
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-y-auto space-y-4 pr-1">
    <!-- Memory Top KPI Cards -->
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 shrink-0">
      <InsightKpiCard
        label="Used memory"
        :value="memoryValue"
        :show-badge="false"
        icon="hugeicons:database"
        :progress="memoryProgress"
        :subtext="memorySubtext"
        :info-tooltip="memoryInfoTooltip"
      />
      <InsightKpiCard
        label="Peak memory"
        :value="memory?.usedMemoryPeakHuman || '0 B'"
        :show-badge="false"
        icon="hugeicons:activity-02"
        subtext="Historical peak memory usage"
      />
      <InsightKpiCard
        label="Fragmentation ratio"
        :value="memory ? memory.memoryFragmentationRatio.toFixed(2) : '1.00'"
        :show-badge="false"
        :tone="
          memory && memory.memoryFragmentationRatio >= 1.5
            ? 'warning'
            : 'default'
        "
        subtext="Ratio of allocated to used memory"
      />
      <InsightKpiCard
        label="Maxmemory policy"
        :value="memory?.maxmemoryPolicy || 'noeviction'"
        :show-badge="false"
        subtext="Eviction policy when limit reached"
      />
    </div>

    <!-- Warnings Notice -->
    <BaseNotice
      v-for="warning in memory?.warnings || []"
      :key="warning"
      variant="secondary"
      class="shrink-0 text-xs"
    >
      <div class="flex items-center gap-2">
        <Icon
          name="hugeicons:alert-circle"
          class="size-4 text-amber-500 shrink-0"
        />
        <span>{{ warning }}</span>
      </div>
    </BaseNotice>

    <!-- Main Split: Big Keys & Memory Prefixes -->
    <div class="grid gap-4 lg:grid-cols-2 flex-1 min-h-0">
      <!-- Big Keys Table with Search -->
      <div class="rounded-lg border bg-card/60 p-3 flex flex-col min-h-[240px]">
        <div
          class="flex h-6 items-center justify-between pb-2.5 border-b mb-2.5 shrink-0 gap-2"
        >
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-medium">Big Keys Detector</h3>
            <InsightScopeBadge scope="database" :db-index="dbIndex" />
          </div>

          <div class="relative w-44">
            <Icon
              name="hugeicons:search-01"
              class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground"
            />
            <Input
              v-model="bigKeySearch"
              placeholder="Search key..."
              class="h-6 pl-7 text-[11px] bg-background"
            />
          </div>
        </div>

        <div
          class="flex-1 min-h-0 overflow-y-auto rounded-md border bg-background"
        >
          <Table class="text-xs">
            <TableHeader
              class="bg-muted/60 text-muted-foreground sticky top-0 z-10"
            >
              <TableRow>
                <TableHead class="py-1.5 px-2.5 font-medium"
                  >Key Name</TableHead
                >
                <TableHead class="py-1.5 px-2.5 font-medium text-center"
                  >Type</TableHead
                >
                <TableHead class="py-1.5 px-2.5 font-medium text-right"
                  >Size</TableHead
                >
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-if="filteredBigKeys.length === 0"
                class="hover:bg-transparent"
              >
                <TableCell colspan="3" class="py-6">
                  <BaseEmpty desc="No big keys found." hidden-icon />
                </TableCell>
              </TableRow>
              <TableRow
                v-for="key in filteredBigKeys"
                :key="key.key"
                class="hover:bg-muted/30"
              >
                <TableCell
                  class="py-1.5 px-2.5 font-mono truncate max-w-[200px]"
                  :title="key.key"
                >
                  {{ key.key }}
                </TableCell>
                <TableCell class="py-1.5 px-2.5 text-center">
                  <Badge
                    variant="outline"
                    class="text-xxs px-1.5 py-0.5 uppercase gap-1 inline-flex items-center font-mono"
                  >
                    <Icon
                      :name="getRedisKeyIcon(key.type)"
                      class="size-3"
                      :class="getRedisKeyIconClass(key.type)"
                    />
                    <span>{{ key.type }}</span>
                  </Badge>
                </TableCell>
                <TableCell
                  class="py-1.5 px-2.5 text-right font-mono font-medium text-amber-600 dark:text-amber-400"
                >
                  {{ formatBytes(key.memoryBytes) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <!-- Top Prefixes By Memory -->
      <div class="rounded-lg border bg-card/60 p-3 flex flex-col min-h-[240px]">
        <div
          class="flex h-6 items-center justify-between pb-2.5 border-b mb-2.5 shrink-0 gap-2"
        >
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-medium">Top Prefixes by Memory</h3>
            <InsightScopeBadge scope="database" :db-index="dbIndex" />
          </div>

          <div class="relative w-44">
            <Icon
              name="hugeicons:search-01"
              class="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground"
            />
            <Input
              v-model="prefixSearch"
              placeholder="Filter prefix..."
              class="h-6 pl-7 text-[11px] bg-background"
            />
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
          <BaseEmpty
            v-if="filteredPrefixes.length === 0"
            desc="No memory prefixes recorded."
            hidden-icon
            class="py-6"
          />
          <div
            v-for="prefix in filteredPrefixes"
            :key="prefix.prefix"
            class="flex items-center justify-between rounded-md bg-background border px-3 py-2 text-xs"
          >
            <div>
              <code class="font-mono font-medium text-foreground">{{
                prefix.prefix
              }}</code>
              <p class="text-[11px] text-muted-foreground mt-0.5">
                {{ fmt(prefix.keyCount) }} keys sampled
              </p>
            </div>
            <span class="font-mono font-semibold text-primary">
              {{ formatBytes(prefix.memoryBytes) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
