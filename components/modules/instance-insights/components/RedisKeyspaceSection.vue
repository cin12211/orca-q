<script setup lang="ts">
import {
  getRedisKeyIcon,
  getRedisKeyIconClass,
} from '~/components/modules/management/redis-browser/hooks/useRedisTreeData';
import type { RedisKeyspaceInsight } from '~/core/types/instance-insights.types';
import InsightKpiCard from './InsightKpiCard.vue';
import InsightScopeBadge from './InsightScopeBadge.vue';

const props = defineProps<{
  keyspace: RedisKeyspaceInsight | undefined;
  dbIndex?: number;
  isInitialLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-db', index: number): void;
}>();

const prefixSearch = ref('');
const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}

function getKeyTypeBgClass(type: string): string {
  const textClass = getRedisKeyIconClass(type);
  if (textClass.startsWith('text-')) {
    return textClass.replace('text-', 'bg-');
  }
  return 'bg-primary';
}

const keyDistributionWithPct = computed(() => {
  const list = props.keyspace?.keyTypeDistribution || [];
  const total = list.reduce((acc, item) => acc + item.count, 0);
  return list.map(item => ({
    ...item,
    percentage: total > 0 ? (item.count / total) * 100 : 0,
  }));
});

const filteredPrefixes = computed(() => {
  const list = props.keyspace?.topPrefixes || [];
  const q = prefixSearch.value.trim().toLowerCase();
  const filtered = q
    ? list.filter(p => p.prefix.toLowerCase().includes(q))
    : list;
  return [...filtered].sort((left, right) => right.keyCount - left.keyCount);
});

const selectedDbKeyCount = computed(() => {
  if (!props.keyspace?.databases) return 0;
  const targetDbName = `db${props.dbIndex ?? 0}`;
  const found = props.keyspace.databases.find(
    db => db.database.toLowerCase() === targetDbName
  );
  return found ? found.keyCount : 0;
});

const totalInstanceKeys = computed(() => {
  if (!props.keyspace?.databases) return 0;
  return props.keyspace.databases.reduce((sum, db) => sum + db.keyCount, 0);
});

function getDatabaseNumber(dbName: string): number {
  const match = dbName.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}
</script>

<template>
  <div
    class="relative flex h-full min-h-0 flex-col overflow-y-auto space-y-4 pr-1"
  >
    <LoadingOverlay :visible="!!isInitialLoading" />
    <!-- Top KPI Cards -->
    <div class="grid gap-3 md:grid-cols-4 shrink-0">
      <InsightKpiCard
        label="Total Instance Keys"
        :value="fmt(totalInstanceKeys)"
        scope="instance"
        icon="hugeicons:database"
        subtext="Total keys across all databases"
      />
      <InsightKpiCard
        label="Keys in DB"
        :value="fmt(selectedDbKeyCount)"
        scope="database"
        :db-index="dbIndex"
        icon="hugeicons:database-sync-01"
        :subtext="`Total keys stored in DB /${dbIndex ?? 0}`"
      />
      <InsightKpiCard
        label="Keys without TTL"
        :value="fmt(keyspace?.keysWithoutTtl)"
        scope="database"
        :db-index="dbIndex"
        subtext="Persistent keys with no expiration"
      />
      <InsightKpiCard
        label="Sampled keys count"
        :value="fmt(keyspace?.sampledKeys)"
        scope="database"
        :db-index="dbIndex"
        subtext="Keys scanned for type distribution"
      />
    </div>

    <!-- Key Type Distribution Bar -->
    <div class="rounded-lg border bg-card/60 p-3 space-y-2 shrink-0">
      <div class="flex items-center justify-between pb-2.5 border-b mb-2.5">
        <h3
          class="text-xs font-medium tracking-tight flex items-center gap-1.5"
        >
          <span>Key Type Distribution</span>
        </h3>
        <InsightScopeBadge scope="database" :db-index="dbIndex" />
      </div>

      <div class="h-3 w-full rounded-full bg-muted/60 flex overflow-hidden">
        <div
          v-for="item in keyDistributionWithPct"
          :key="item.type"
          :class="getKeyTypeBgClass(item.type)"
          :style="{ width: `${item.percentage}%` }"
          :title="`${item.type}: ${fmt(item.count)} (${item.percentage.toFixed(1)}%)`"
          class="h-full transition-all"
        />
      </div>

      <div class="flex flex-wrap gap-3 pt-1 text-xs">
        <div
          v-for="item in keyDistributionWithPct"
          :key="item.type"
          class="flex items-center gap-1.5"
        >
          <Icon
            :name="getRedisKeyIcon(item.type)"
            class="size-3.5 shrink-0"
            :class="getRedisKeyIconClass(item.type)"
          />
          <span class="font-medium text-foreground uppercase text-[11px]"
            >{{ item.type }}:</span
          >
          <span class="text-muted-foreground"
            >{{ fmt(item.count) }} ({{ item.percentage.toFixed(1) }}%)</span
          >
        </div>
      </div>
    </div>

    <!-- Main Grid: Databases List & Searchable Top Prefixes -->
    <div class="grid gap-4 lg:grid-cols-2 flex-1 min-h-0">
      <!-- Databases Table -->
      <div class="rounded-lg border bg-card/60 p-3 flex flex-col min-h-[220px]">
        <div
          class="flex h-6 items-center justify-between pb-2.5 border-b mb-2.5 shrink-0"
        >
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-medium">Registered Databases</h3>
            <InsightScopeBadge scope="instance" />
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
          <BaseEmpty
            v-if="!(keyspace?.databases || []).length"
            desc="No registered databases."
            hidden-icon
            class="py-6"
          />
          <div
            v-for="db in keyspace?.databases || []"
            :key="db.database"
            class="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs transition-colors hover:border-primary/40"
            :class="{
              'border-primary bg-primary/5':
                getDatabaseNumber(db.database) === dbIndex,
            }"
          >
            <div>
              <span class="font-mono font-semibold text-primary uppercase">{{
                db.database
              }}</span>
              <p class="text-[11px] text-muted-foreground mt-0.5">
                {{ fmt(db.keyCount) }} keys · {{ fmt(db.expires) }} expiring
              </p>
            </div>

            <Badge
              v-if="getDatabaseNumber(db.database) === dbIndex"
              variant="secondary"
              class="text-xxs"
            >
              Active
            </Badge>
          </div>
        </div>
      </div>

      <!-- Top Prefixes Panel with Search -->
      <div class="rounded-lg border bg-card/60 p-3 flex flex-col min-h-[220px]">
        <div
          class="flex h-6 items-center justify-between pb-2.5 border-b mb-2.5 shrink-0 gap-2"
        >
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-medium">Top Key Prefixes</h3>
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
            desc="No prefixes matching criteria."
            hidden-icon
            class="py-6"
          />
          <div
            v-for="prefix in filteredPrefixes"
            :key="prefix.prefix"
            class="flex items-center justify-between rounded-md bg-background border px-3 py-1.5 text-xs"
          >
            <code class="font-mono font-medium text-foreground">{{
              prefix.prefix
            }}</code>
            <Badge variant="secondary" class="text-xxs">
              {{ fmt(prefix.keyCount) }} keys
            </Badge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
