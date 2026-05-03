<script setup lang="ts">
import type { RedisPersistenceInsight } from '~/core/types/instance-insights.types';

defineProps<{
  persistence: RedisPersistenceInsight | undefined;
}>();

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">RDB enabled</p>
        <p class="mt-1 text-lg font-medium">
          {{ persistence?.rdbEnabled ? 'Yes' : 'No' }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">AOF enabled</p>
        <p class="mt-1 text-lg font-medium">
          {{ persistence?.aofEnabled ? 'Yes' : 'No' }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">AOF rewrite</p>
        <p class="mt-1 text-lg font-medium">
          {{ persistence?.aofRewriteInProgress ? 'In progress' : 'Idle' }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Changes since save</p>
        <p class="mt-1 text-lg font-medium">
          {{ fmt(persistence?.changesSinceLastSave) }}
        </p>
      </div>
    </div>

    <BaseNotice
      v-for="warning in persistence?.warnings || []"
      :key="warning"
      variant="secondary"
    >
      {{ warning }}
    </BaseNotice>

    <div class="rounded-lg border p-3 text-sm text-muted-foreground space-y-1">
      <p>
        Last save status:
        {{ persistence?.lastSaveStatus || 'unknown' }}
      </p>
      <p>
        Last save time:
        {{ persistence?.lastSaveTime || 'unknown' }}
      </p>
      <p>
        AOF last rewrite status:
        {{ persistence?.aofLastRewriteStatus || 'unknown' }}
      </p>
      <p v-if="persistence?.lastBgsaveError">
        Last bgsave error: {{ persistence.lastBgsaveError }}
      </p>
    </div>
  </div>
</template>
