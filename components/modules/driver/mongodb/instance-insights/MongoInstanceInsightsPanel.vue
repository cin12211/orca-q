<script setup lang="ts">
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { MongoOverviewSection } from './components';
import { MONGO_INSIGHTS_SECTIONS } from './constants';
import { useMongoInstanceInsights } from './hooks';

const connectionStore = useManagementConnectionStore();
const connection = computed(() => connectionStore.selectedConnection);

const {
  activeSection,
  autoRefresh,
  error,
  isInitialLoading,
  isLoading,
  insights,
  refreshSignal,
  refresh,
} = useMongoInstanceInsights({ connection });

// Flips on every completed fetch (including silent auto-refresh) so the
// refresh icon rotates to signal a refresh just happened.
const isRefreshIconFlipped = ref(false);

watch(refreshSignal, () => {
  isRefreshIconFlipped.value = !isRefreshIconFlipped.value;
});

const TAB_CONTENT_CLASS =
  'flex-1 min-h-0 overflow-hidden rounded-lg border bg-background p-3 mt-0 data-[state=inactive]:hidden';
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
      <TabsList size="sm" class="max-w-full justify-start! shrink-0">
        <TabsTrigger
          v-for="section in MONGO_INSIGHTS_SECTIONS"
          :key="section.id"
          size="xs"
          :value="section.id"
          class="min-w-fit shrink-0 cursor-pointer rounded-sm"
        >
          {{ section.label }}
        </TabsTrigger>
      </TabsList>

      <BaseNotice v-if="error" variant="destructive" class="shrink-0">
        {{ error }}
      </BaseNotice>

      <TabsContent value="overview" :class="TAB_CONTENT_CLASS">
        <MongoOverviewSection
          :overview="insights.overview"
          :is-initial-loading="isInitialLoading"
        />
      </TabsContent>
    </Tabs>
  </div>
</template>
