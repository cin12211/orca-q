<script setup lang="ts">
import RedisDBSelector from '~/components/modules/selectors/RedisDBSelector.vue';
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
  refresh,
  killClient,
} = useRedisInstanceInsights({
  connection,
  databaseIndex: computed(() => props.databaseIndex),
});
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-hidden p-3">
    <div
      class="flex flex-col gap-3 rounded-lg border bg-background p-3 lg:flex-row lg:items-start lg:justify-between"
    >
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Icon name="hugeicons:activity-02" class="size-5 text-primary" />
          <h2 class="text-lg font-medium">Redis Instance Insight</h2>
        </div>

        <div class="flex items-center gap-1 text-sm text-muted-foreground">
          <component
            v-if="dbType === DatabaseClientType.REDIS"
            :is="'hugeicons:database-sync-01'"
          />
          <span class="font-medium text-foreground">{{ databaseName }}</span>
          <Badge variant="outline" class="text-xxs h-5 px-1.5 font-normal">
            DB {{ databaseIndex }}
          </Badge>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <RedisDBSelector
          compact
          trigger-id="redis-instance-insights-db-index"
          trigger-class="bg-background"
          :databases="databases"
          :database-index="databaseIndex"
          @update:database-index="emit('update:databaseIndex', $event)"
        />

        <div class="flex items-center gap-2 text-xs">
          <Switch
            id="redis-insights-auto-refresh"
            v-model:model-value="autoRefresh"
          />
          <label for="redis-insights-auto-refresh" class="cursor-pointer">
            Auto refresh
          </label>
        </div>

        <Button
          size="sm"
          variant="outline"
          :disabled="isLoading || isActionLoading"
          @click="refresh"
        >
          <Icon name="hugeicons:redo" class="size-4" />
          Refresh
        </Button>
      </div>
    </div>

    <Tabs v-model="activeSection" class="flex flex-1 min-h-0 flex-col gap-0">
      <TabsList class="h-8 max-w-full justify-start! shrink-0 overflow-x-auto">
        <TabsTrigger
          v-for="section in sections"
          :key="section.id"
          :value="section.id"
          class="min-w-fit shrink-0 cursor-pointer rounded-sm px-1.5 text-xs"
        >
          {{ section.label }}
        </TabsTrigger>
      </TabsList>

      <BaseNotice v-if="error" variant="destructive">{{ error }}</BaseNotice>

      <div
        v-if="isInitialLoading && !insights"
        class="flex flex-1 items-center justify-center gap-2 rounded-lg border bg-background text-muted-foreground"
      >
        <Icon name="hugeicons:redo" class="size-4 animate-spin" />
        Loading Redis instance insights...
      </div>

      <div
        v-else
        class="flex-1 overflow-y-auto rounded-lg border bg-background p-3"
      >
        <RedisOverviewSection
          v-show="activeSection === 'overview'"
          :overview="insights?.overview"
        />

        <RedisKeyspaceSection
          v-show="activeSection === 'keyspace'"
          :keyspace="insights?.keyspace"
        />

        <RedisMemorySection
          v-show="activeSection === 'memory'"
          :memory="insights?.memory"
        />

        <RedisPerformanceSection
          v-show="activeSection === 'performance'"
          :performance="insights?.performance"
        />

        <RedisClientsSection
          v-show="activeSection === 'clients'"
          :clients="insights?.clients"
          :is-action-loading="isActionLoading"
          @kill-client="killClient"
        />

        <RedisPersistenceSection
          v-show="activeSection === 'persistence'"
          :persistence="insights?.persistence"
        />

        <RedisReplicationSection
          v-show="activeSection === 'replication'"
          :replication="insights?.replication"
        />

        <RedisConfigSection
          v-show="activeSection === 'config'"
          :config="insights?.config"
        />
      </div>
    </Tabs>
  </div>
</template>
