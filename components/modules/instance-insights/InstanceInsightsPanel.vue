<script setup lang="ts">
import type { ReplicationSlotDesiredStatus } from '~/core/types';
import {
  EDatabaseType,
  getDatabaseSupportByType,
} from '../connection/constants';
import InstanceInsightsActivitySection from './components/InstanceInsightsActivitySection.vue';
import InstanceInsightsConfigurationSection from './components/InstanceInsightsConfigurationSection.vue';
import InstanceInsightsReplicationSection from './components/InstanceInsightsReplicationSection.vue';
import InstanceInsightsStateSection from './components/InstanceInsightsStateSection.vue';
import { useInstanceInsights } from './hooks/useInstanceInsights';
import { formatDateTime } from './utils/formatters';

const props = defineProps<{
  dbConnectionString: string;
  databaseName: string;
  dbType?: EDatabaseType;
}>();

const sections = [
  {
    id: 'activity',
    tabLabel: 'Activity',
    subtitle: 'Sessions, TPS, tuples and block I/O',
    icon: 'hugeicons:artificial-intelligence-08',
  },
  {
    id: 'state',
    tabLabel: 'State',
    subtitle: 'Active sessions, locks, prepared transactions',
    icon: 'hugeicons:shield-01',
  },
  {
    id: 'configuration',
    tabLabel: 'Config',
    subtitle: 'Searchable pg_settings',
    icon: 'hugeicons:settings-01',
  },
  {
    id: 'replication',
    tabLabel: 'Replication',
    subtitle: 'Replication stats and slots',
    icon: 'hugeicons:database',
  },
] as const;

const connectionStringRef = computed(() => props.dbConnectionString);
const {
  activeSection,
  autoRefresh,
  error,
  isInitialLoading,
  isActionLoading,
  isDashboardLoading,
  isStateLoading,
  isConfigurationLoading,
  isReplicationLoading,
  dashboard,
  state,
  configuration,
  replication,
  configurationSearch,
  refreshSection,
  refreshAll,
  cancelQuery,
  terminateConnection,
  dropReplicationSlot,
  toggleReplicationSlotStatus,
} = useInstanceInsights(connectionStringRef);

const activeSectionMeta = computed(() =>
  sections.find(section => section.id === activeSection.value)
);

const lastCapturedAt = computed(() => {
  if (activeSection.value === 'activity') return dashboard.value?.capturedAt;
  if (activeSection.value === 'state') return state.value?.capturedAt;
  if (activeSection.value === 'configuration')
    return configuration.value?.capturedAt;
  return replication.value?.capturedAt;
});

const refreshActivity = () => refreshSection('activity');
const refreshState = () => refreshSection('state');
const refreshConfiguration = () => refreshSection('configuration');
const refreshReplication = () => refreshSection('replication');

const onToggleSlotStatus = (params: {
  slotName: string;
  desiredStatus: ReplicationSlotDesiredStatus;
  activePid?: number | null;
  slotType?: string | null;
}) => toggleReplicationSlotStatus(params);
</script>

<template>
  <div class="flex flex-col h-full p-3 gap-3 overflow-hidden">
    <div
      class="flex flex-col lg:flex-row lg:items-start lg:justify-between border rounded-lg p-3 gap-3 bg-background"
    >
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Icon name="hugeicons:database" class="size-5 text-primary" />
          <h2 class="text-lg font-medium">Instance Insights</h2>
        </div>

        <div class="text-sm text-muted-foreground flex items-center gap-0.5">
          connection:

          <div class="flex items-center gap-0.5">
            <component
              v-if="dbType"
              :is="getDatabaseSupportByType(dbType)?.icon"
              class="size-4!"
            />

            <span class="font-medium text-foreground">{{ databaseName }}</span>
          </div>
        </div>

        <div v-if="dashboard?.version" class="flex items-center gap-1.5 mt-0.5">
          <Badge variant="outline" class="text-[10px] h-5 px-1.5 font-normal">
            PostgreSQL {{ dashboard.version }}
          </Badge>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <div class="text-xs flex items-center gap-2">
          <Switch
            id="insights-auto-refresh"
            v-model:model-value="autoRefresh"
            class="cursor-pointer"
          />
          <label for="insights-auto-refresh" class="cursor-pointer">
            Auto refresh
          </label>
        </div>

        <Button
          variant="outline"
          size="sm"
          :disabled="isInitialLoading || isActionLoading"
          @click="refreshAll()"
          class="font-normal"
        >
          <Icon name="hugeicons:redo" class="size-4" />
          Refresh All
        </Button>
      </div>
    </div>

    <div class="flex items-center justify-between gap-2">
      <Tabs v-model="activeSection" class="gap-0 flex-1 min-w-0">
        <TabsList class="h-8 max-w-full overflow-x-auto justify-start!">
          <TabsTrigger
            v-for="section in sections"
            :key="section.id"
            :value="section.id"
            class="text-xs px-1.5 rounded-sm cursor-pointer min-w-fit shrink-0"
            @click="refreshSection(section.id, { silent: true })"
          >
            <Icon :name="section.icon" class="size-3.5!" />
            {{ section.tabLabel }}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div class="text-xs text-muted-foreground">
        Last updated: {{ formatDateTime(lastCapturedAt) }}
      </div>
    </div>

    <div
      v-if="error"
      class="border border-red-300 bg-red-50 text-red-700 rounded-lg p-3 text-sm"
    >
      {{ error }}
    </div>

    <div
      v-if="isInitialLoading && !dashboard"
      class="border rounded-lg p-6 flex items-center justify-center gap-2 text-muted-foreground"
    >
      <Icon name="hugeicons:redo" class="size-4 animate-spin" />
      Loading instance insights...
    </div>

    <div
      v-else
      class="flex-1 overflow-y-auto border rounded-lg p-3 bg-background"
    >
      <InstanceInsightsActivitySection
        v-show="activeSection === 'activity'"
        :dashboard="dashboard"
        :isLoading="isDashboardLoading"
        :isActionLoading="isActionLoading"
        :onRefresh="refreshActivity"
      />

      <InstanceInsightsStateSection
        v-show="activeSection === 'state'"
        :state="state"
        :isLoading="isStateLoading"
        :isActionLoading="isActionLoading"
        :onRefresh="refreshState"
        :onCancelQuery="cancelQuery"
        :onTerminateConnection="terminateConnection"
      />

      <InstanceInsightsConfigurationSection
        v-show="activeSection === 'configuration'"
        v-model:search="configurationSearch"
        :configuration="configuration"
        :isLoading="isConfigurationLoading"
        :isActionLoading="isActionLoading"
        :onRefresh="refreshConfiguration"
      />

      <InstanceInsightsReplicationSection
        v-show="activeSection === 'replication'"
        :replication="replication"
        :isLoading="isReplicationLoading"
        :isActionLoading="isActionLoading"
        :onRefresh="refreshReplication"
        :onDropSlot="dropReplicationSlot"
        :onToggleSlotStatus="onToggleSlotStatus"
      />
    </div>
  </div>
</template>
