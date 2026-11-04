<script setup lang="ts">
import type { Connection } from '~/core/stores';
import {
  MongoOverviewSection,
  MongoReplicationSection,
} from '../components/insights';
import { useMongoInstanceInsights } from '../hooks';

const props = defineProps<{
  connection: Connection;
}>();

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'replication', label: 'Replication' },
] as const;

const connection = computed(() => props.connection);

const {
  activeSection,
  autoRefresh,
  error,
  isInitialLoading,
  isLoading,
  overview,
  replication,
  opcounterRates,
  refreshSignal,
  refresh,
} = useMongoInstanceInsights({ connection });

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
      <template #actions>
        <div class="flex items-center gap-2 text-xs">
          <Switch
            id="mongo-insights-auto-refresh"
            v-model:model-value="autoRefresh"
          />
          <label
            for="mongo-insights-auto-refresh"
            class="cursor-pointer select-none"
          >
            Auto refresh
          </label>
        </div>

        <Button
          size="xxs"
          variant="outline"
          :disabled="isLoading"
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
          v-for="section in sections"
          :key="section.id"
          size="xs"
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
        <MongoOverviewSection
          :overview="overview"
          :opcounter-rates="opcounterRates"
          :is-initial-loading="isInitialLoading"
        />
      </TabsContent>

      <TabsContent
        value="replication"
        class="flex-1 min-h-0 overflow-hidden rounded-lg border bg-background p-3 mt-0 data-[state=inactive]:hidden"
      >
        <MongoReplicationSection
          :replication="replication"
          :is-initial-loading="isInitialLoading"
        />
      </TabsContent>
    </Tabs>
  </div>
</template>
