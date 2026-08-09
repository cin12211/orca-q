<script setup lang="ts">
import type { RedisPersistenceInsight } from '~/core/types/instance-insights.types';
import InsightKpiCard from './InsightKpiCard.vue';

defineProps<{
  persistence: RedisPersistenceInsight | undefined;
  dbIndex?: number;
}>();

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-y-auto space-y-4 pr-1">
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

    <!-- Top Persistence KPI Cards -->
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 shrink-0">
      <InsightKpiCard
        label="RDB Persistence"
        :value="persistence?.rdbEnabled ? 'Enabled' : 'Disabled'"
        :show-badge="false"
        icon="hugeicons:database"
        :tone="persistence?.rdbEnabled ? 'success' : 'warning'"
        subtext="Point-in-time snapshot persistence"
      />
      <InsightKpiCard
        label="AOF Persistence"
        :value="persistence?.aofEnabled ? 'Enabled' : 'Disabled'"
        :show-badge="false"
        icon="hugeicons:activity-02"
        :tone="persistence?.aofEnabled ? 'success' : 'warning'"
        subtext="Append-only log persistence"
      />
      <InsightKpiCard
        label="AOF Rewrite status"
        :value="persistence?.aofRewriteInProgress ? 'In progress' : 'Idle'"
        :show-badge="false"
        :tone="persistence?.aofRewriteInProgress ? 'info' : 'default'"
        subtext="Background log compaction"
      />
      <InsightKpiCard
        label="Changes since last save"
        :value="fmt(persistence?.changesSinceLastSave)"
        :show-badge="false"
        subtext="Unsaved memory operations"
      />
    </div>

    <!-- Warnings Notice -->
    <BaseNotice
      v-for="warning in persistence?.warnings || []"
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

    <!-- Details Card Container -->
    <div class="rounded-lg border bg-card/60 p-4 space-y-3 shrink-0">
      <div class="flex items-center justify-between pb-2.5 border-b mb-2.5">
        <h3 class="text-xs font-medium tracking-tight">
          Persistence Details & Last Save Status
        </h3>
      </div>

      <div class="grid gap-3 md:grid-cols-2 text-xs">
        <div class="rounded-md border bg-background p-3 space-y-1.5">
          <p class="text-muted-foreground font-medium">RDB Last Save Status</p>
          <div class="flex items-center gap-2">
            <span
              class="size-2 rounded-full inline-block"
              :class="
                persistence?.lastSaveStatus === 'ok'
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
              "
            />
            <span class="font-semibold uppercase">{{
              persistence?.lastSaveStatus || 'Unknown'
            }}</span>
          </div>
          <p class="text-muted-foreground text-[11px]">
            Last successful save:
            <span class="font-mono text-foreground">{{
              persistence?.lastSaveTime || 'N/A'
            }}</span>
          </p>
          <p
            v-if="persistence?.lastBgsaveError"
            class="text-rose-500 font-medium text-[11px]"
          >
            Bgsave Error: {{ persistence.lastBgsaveError }}
          </p>
        </div>

        <div class="rounded-md border bg-background p-3 space-y-1.5">
          <p class="text-muted-foreground font-medium">
            AOF Last Rewrite Status
          </p>
          <div class="flex items-center gap-2">
            <span
              class="size-2 rounded-full inline-block"
              :class="
                persistence?.aofLastRewriteStatus === 'ok'
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              "
            />
            <span class="font-semibold uppercase">{{
              persistence?.aofLastRewriteStatus || 'Unknown'
            }}</span>
          </div>
          <p class="text-muted-foreground text-[11px]">
            AOF Rewrite Status:
            <span class="font-mono text-foreground">{{
              persistence?.aofRewriteInProgress ? 'Active' : 'Idle'
            }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
