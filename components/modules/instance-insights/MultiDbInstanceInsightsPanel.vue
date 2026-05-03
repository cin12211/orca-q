<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { getDatabaseSupportByType } from '../connection';
import InstanceInsightsSectionRenderer from './components/InstanceInsightsSectionRenderer.vue';
import { useMultiDbInstanceInsights } from './hooks/useMultiDbInstanceInsights';
import { formatDateTime } from './utils/formatters';

const props = defineProps<{
  dbConnectionString: string;
  databaseName: string;
  dbType?: DatabaseClientType;
}>();

const connectionStore = useManagementConnectionStore();
const { selectedConnection } = storeToRefs(connectionStore);

const {
  view,
  activeSection,
  autoRefresh,
  configurationSearch,
  error,
  isInitialLoading,
  isViewLoading,
  refreshSection,
  refreshAll,
} = useMultiDbInstanceInsights(selectedConnection);

const activeSectionData = computed(
  () =>
    view.value?.sections.find(section => section.id === activeSection.value) ||
    null
);

const lastCapturedAt = computed(
  () => activeSectionData.value?.capturedAt || view.value?.capturedAt || null
);

const actionBadgeClass = (
  state: 'supported' | 'unsupported' | 'conditional'
) => {
  if (state === 'supported') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  }

  if (state === 'conditional') {
    return 'border-amber-300 bg-amber-50 text-amber-700';
  }

  return 'border-slate-300 bg-slate-50 text-slate-700';
};
</script>

<template>
  <div class="flex flex-col h-full p-3 gap-3 overflow-hidden">
    <div
      class="flex flex-col lg:flex-row lg:items-start lg:justify-between border rounded-lg p-3 gap-3 bg-background"
    >
      <div class="space-y-2">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <Icon name="hugeicons:database" class="size-5 text-primary" />
            <h2 class="text-base font-medium">Instance Insights</h2>
          </div>

          <div class="text-sm text-muted-foreground flex items-center gap-0.5">
            connection:

            <div class="flex items-center gap-0.5">
              <component
                v-if="dbType"
                :is="getDatabaseSupportByType(dbType)?.icon"
                class="size-4!"
              />

              <span class="font-medium text-foreground">{{
                databaseName
              }}</span>
            </div>
          </div>

          <div v-if="view?.version" class="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" class="text-xxs h-5 px-1.5 font-normal">
              {{
                dbType === DatabaseClientType.MARIADB
                  ? 'MariaDB'
                  : dbType === DatabaseClientType.ORACLE
                    ? 'Oracle'
                    : dbType === DatabaseClientType.SQLITE3
                      ? 'SQLite'
                      : 'MySQL'
              }}
              {{ view.version }}
            </Badge>
          </div>
        </div>

        <div v-if="view?.actions?.length" class="flex gap-2 flex-wrap">
          <Badge
            v-for="action in view.actions"
            :key="action.id"
            :class="actionBadgeClass(action.state)"
            variant="outline"
          >
            {{ action.label }} · {{ action.state }}
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
          :disabled="isInitialLoading || isViewLoading"
          class="font-normal"
          @click="refreshAll()"
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
            v-for="section in view?.sections || []"
            :key="section.id"
            :value="section.id"
            class="text-xs px-1.5 rounded-sm cursor-pointer min-w-fit shrink-0"
            @click="refreshSection(section.id, { silent: true })"
          >
            {{ section.title }}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div class="text-xs text-muted-foreground">
        Last updated: {{ formatDateTime(lastCapturedAt) }}
      </div>
    </div>

    <div
      v-if="activeSectionData?.searchable"
      class="border rounded-lg p-3 bg-background"
    >
      <div class="relative">
        <Icon
          name="hugeicons:search-01"
          class="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />

        <Input
          v-model="configurationSearch"
          type="text"
          :placeholder="activeSectionData.searchPlaceholder || 'Search...'"
          class="h-8 w-full pl-8 pr-3"
        />
      </div>
    </div>

    <div
      v-if="error"
      class="border border-red-300 bg-red-50 text-red-700 rounded-lg p-3 text-sm"
    >
      {{ error }}
    </div>

    <div
      v-if="isInitialLoading && !view"
      class="border rounded-lg p-6 flex items-center justify-center gap-2 text-muted-foreground"
    >
      <Icon name="hugeicons:redo" class="size-4 animate-spin" />
      Loading instance insights...
    </div>

    <div
      v-else
      class="flex-1 overflow-y-auto border rounded-lg p-3 bg-background"
    >
      <InstanceInsightsSectionRenderer
        :section="activeSectionData"
        :search="configurationSearch"
      />
    </div>
  </div>
</template>
