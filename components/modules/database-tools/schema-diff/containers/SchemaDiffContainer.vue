<script setup lang="ts">
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import type { Connection } from '~/core/types/entities/connection.entity';
import SchemaDiffConnectionSelector from '../components/SchemaDiffConnectionSelector.vue';
import SchemaDiffSqlPanel from '../components/SchemaDiffSqlPanel.vue';
import SchemaDiffTree from '../components/SchemaDiffTree.vue';
import { useSchemaDiff } from '../hooks/useSchemaDiff';

const props = defineProps<{
  sourceConnectionId: string;
}>();

const connectionStore = useManagementConnectionStore();

const sourceConnection = computed<Connection | null>(
  () =>
    connectionStore.connections.find(
      (c: Connection) => c.id === props.sourceConnectionId
    ) ?? null
);

const availableTargets = computed<Connection[]>(() =>
  connectionStore.connections.filter(
    (c: Connection) => c.id !== props.sourceConnectionId
  )
);

const targetConnection = ref<Connection | null>(null);

const {
  result,
  isLoading,
  error,
  safeMode,
  currentSql,
  hasDifferences,
  runDiff,
} = useSchemaDiff();

const handleRun = async () => {
  if (!sourceConnection.value || !targetConnection.value) return;
  await runDiff(sourceConnection.value, targetConnection.value);
};

const destructiveCount = computed(
  () => result.value?.sql.statements.filter(s => s.destructive).length ?? 0
);

// active display tab
const displayTab = ref<'diff' | 'sql'>('diff');
</script>

<template>
  <div class="flex h-full flex-col gap-4 overflow-hidden p-4">
    <!-- Header -->
    <div>
      <h2 class="text-base font-medium">Schema Diff</h2>
      <p class="text-xs text-muted-foreground">
        Compare schemas between two database connections and generate sync SQL.
      </p>
    </div>

    <!-- Connection selector -->
    <SchemaDiffConnectionSelector
      :source-connection="sourceConnection"
      :target-connection="targetConnection"
      :connections="availableTargets"
      :is-loading="isLoading"
      @update:target-connection="val => (targetConnection = val)"
      @run="handleRun"
    />

    <!-- Error -->
    <Alert v-if="error" class="border-border bg-muted/30">
      <Icon name="hugeicons:alert-circle" class="size-4 text-destructive" />
      <AlertTitle class="text-destructive">Diff Failed</AlertTitle>
      <AlertDescription class="text-muted-foreground">{{
        error
      }}</AlertDescription>
    </Alert>

    <!-- Results -->
    <template v-if="result">
      <!-- Tab bar -->
      <div class="flex items-center justify-between gap-2">
        <Tabs v-model="displayTab" class="min-w-0 flex-1 gap-0">
          <TabsList class="h-8 max-w-full justify-start! overflow-x-auto">
            <TabsTrigger
              value="diff"
              class="min-w-fit shrink-0 cursor-pointer rounded-sm px-1.5 text-xs"
              @click="displayTab = 'diff'"
            >
              <Icon name="hugeicons:git-compare" class="shrink-0 size-3.5" />
              Diff View
              <span
                v-if="hasDifferences"
                class="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground"
              >
                {{
                  result.summary.added +
                  result.summary.removed +
                  result.summary.modified
                }}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="sql"
              class="min-w-fit shrink-0 cursor-pointer rounded-sm px-1.5 text-xs"
              @click="displayTab = 'sql'"
            >
              <Icon name="hugeicons:code" class="shrink-0 size-3.5" />
              SQL
              <span
                v-if="result.sql.statements.length > 0"
                class="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {{ result.sql.statements.length }}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div class="text-xs text-muted-foreground">
          {{
            displayTab === 'diff'
              ? 'Visualize structural differences'
              : 'Review synchronization script'
          }}
        </div>
      </div>

      <!-- Diff tree -->
      <div v-if="displayTab === 'diff'" class="flex-1 overflow-y-auto">
        <SchemaDiffTree :result="result" />
      </div>

      <!-- SQL panel -->
      <div v-else class="flex-1 overflow-y-auto">
        <SchemaDiffSqlPanel
          :sql="currentSql"
          :safe-mode="safeMode"
          :statement-count="result.sql.statements.length"
          :destructive-count="destructiveCount"
          @update:safe-mode="safeMode = $event"
        />
      </div>
    </template>

    <!-- Empty state (no run yet) -->
    <div
      v-else-if="!isLoading"
      class="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <Icon name="hugeicons:git-compare" class="size-14 opacity-30" />
      <p class="text-sm">Select a target connection and run the diff</p>
    </div>
  </div>
</template>
