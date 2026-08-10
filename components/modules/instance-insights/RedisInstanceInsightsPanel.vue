<script setup lang="ts">
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import type { RedisDatabaseOption } from '~/core/types/redis-workspace.types';
import RedisClientsSection from './components/RedisClientsSection.vue';
import RedisConfigSection from './components/RedisConfigSection.vue';
import RedisKeyspaceSection from './components/RedisKeyspaceSection.vue';
import RedisMemorySection from './components/RedisMemorySection.vue';
import RedisOverviewSection from './components/RedisOverviewSection.vue';
import RedisPerformanceSection from './components/RedisPerformanceSection.vue';
import RedisPersistenceSection from './components/RedisPersistenceSection.vue';
import RedisReplicationSection from './components/RedisReplicationSection.vue';
import { useRedisInstanceInsights } from './hooks/useRedisInstanceInsights';

const props = defineProps<{
  databaseName: string;
  databaseIndex: number;
  databases: RedisDatabaseOption[];
  dbType?: DatabaseClientType;
}>();

const emit = defineEmits<{
  (e: 'update:databaseIndex', value: number): void;
}>();

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'keyspace', label: 'Keyspace' },
  { id: 'memory', label: 'Memory' },
  { id: 'performance', label: 'Performance' },
  { id: 'clients', label: 'Clients' },
  { id: 'persistence', label: 'Persistence' },
  { id: 'replication', label: 'Replication / Cluster' },
  { id: 'config', label: 'Config' },
] as const;

const connectionStore = useManagementConnectionStore();
const connection = computed(() => connectionStore.selectedConnection);

const {
  activeSection,
  autoRefresh,
  error,
  isInitialLoading,
  isLoading,
  isActionLoading,
  insights,
  refreshSignal,
  refresh,
  killClient,
} = useRedisInstanceInsights({
  connection,
  databaseIndex: computed(() => props.databaseIndex),
});

// Flips on every completed fetch (including silent auto-refresh) so the
// refresh icon rotates 180deg to signal a refresh just happened.
const isRefreshIconFlipped = ref(false);

watch(refreshSignal, () => {
  isRefreshIconFlipped.value = !isRefreshIconFlipped.value;
});
</script>

<template>
  <div
    class="flex h-full relative flex-col gap-2.5 overflow-hidden p-3 min-h-0"
  >
    <ToolPageHeader icon="hugeicons:activity-02" title="Instance Insights">
      <template #context>
        <component
          v-if="dbType === DatabaseClientType.REDIS"
          :is="'hugeicons:database-sync-01'"
        />
      </template>

      <template #actions>
        <div class="flex items-center gap-2 text-xs">
          <Switch
            id="redis-insights-auto-refresh"
            v-model:model-value="autoRefresh"
          />
          <label
            for="redis-insights-auto-refresh"
            class="cursor-pointer select-none"
          >
            Auto refresh
          </label>
        </div>

        <Button
          size="xxs"
          variant="outline"
          :disabled="isLoading || isActionLoading"
          @click="refresh"
        >
          <Icon
            name="hugeicons:redo"
            class="size-3.5! transition-transform duration-500"
            :style="{
              transform: isRefreshIconFlipped
                ? 'rotate(180deg)'
                : 'rotate(0deg)',
            }"
          />
          Refresh
        </Button>
      </template>
    </ToolPageHeader>

    <Tabs
      v-model="activeSection"
      class="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden"
    >
      <TabsList
        size="sm"
        class="max-w-full justify-start! shrink-0 overflow-x-auto"
      >
        <TabsTrigger
          size="xs"
          v-for="section in sections"
          :key="section.id"
          :value="section.id"
          class="min-w-fit shrink-0 cursor-pointer rounded-sm"
        >
          {{ section.label }}
        </TabsTrigger>
      </TabsList>

      <BaseNotice v-if="error" variant="destructive" class="shrink-0">{{
        error
      }}</BaseNotice>

      <TabsContent
        value="overview"
        class="flex-1 min-h-0 overflow-hidden rounded-lg border bg-background p-3 mt-0 data-[state=inactive]:hidden"
      >
        <RedisOverviewSection
          :overview="insights?.overview"
          :keyspace="insights?.keyspace"
          :db-index="databaseIndex"
          :is-initial-loading="isInitialLoading"
        />
      </TabsContent>

      <TabsContent
        value="keyspace"
        class="flex-1 min-h-0 overflow-hidden rounded-lg border bg-background p-3 mt-0 data-[state=inactive]:hidden"
      >
        <RedisKeyspaceSection
          :keyspace="insights?.keyspace"
          :db-index="databaseIndex"
          :is-initial-loading="isInitialLoading"
          @select-db="emit('update:databaseIndex', $event)"
        />
      </TabsContent>

      <TabsContent
        value="memory"
        class="flex-1 min-h-0 overflow-hidden rounded-lg border bg-background p-3 mt-0 data-[state=inactive]:hidden"
      >
        <RedisMemorySection
          :memory="insights?.memory"
          :db-index="databaseIndex"
          :is-initial-loading="isInitialLoading"
        />
      </TabsContent>

      <TabsContent
        value="performance"
        class="flex-1 min-h-0 overflow-hidden rounded-lg border bg-background p-3 mt-0 data-[state=inactive]:hidden"
      >
        <RedisPerformanceSection
          :performance="insights?.performance"
          :db-index="databaseIndex"
          :is-initial-loading="isInitialLoading"
        />
      </TabsContent>

      <TabsContent
        value="clients"
        class="flex-1 min-h-0 overflow-hidden rounded-lg border bg-background p-3 mt-0 data-[state=inactive]:hidden"
      >
        <RedisClientsSection
          :clients="insights?.clients"
          :db-index="databaseIndex"
          :is-action-loading="isActionLoading"
          :is-initial-loading="isInitialLoading"
          @kill-client="killClient"
        />
      </TabsContent>

      <TabsContent
        value="persistence"
        class="flex-1 min-h-0 overflow-hidden rounded-lg border bg-background p-3 mt-0 data-[state=inactive]:hidden"
      >
        <RedisPersistenceSection
          :persistence="insights?.persistence"
          :db-index="databaseIndex"
          :is-initial-loading="isInitialLoading"
        />
      </TabsContent>

      <TabsContent
        value="replication"
        class="flex-1 min-h-0 overflow-hidden rounded-lg border bg-background p-3 mt-0 data-[state=inactive]:hidden"
      >
        <RedisReplicationSection
          :replication="insights?.replication"
          :db-index="databaseIndex"
          :is-initial-loading="isInitialLoading"
        />
      </TabsContent>

      <TabsContent
        value="config"
        class="flex-1 min-h-0 overflow-hidden rounded-lg border bg-background p-3 mt-0 data-[state=inactive]:hidden"
      >
        <RedisConfigSection
          :config="insights?.config"
          :db-index="databaseIndex"
          :is-initial-loading="isInitialLoading"
        />
      </TabsContent>
    </Tabs>
  </div>
</template>
