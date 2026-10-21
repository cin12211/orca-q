<script setup lang="ts">
defineProps<{
  analysis: Record<string, unknown> | null;
  loading?: boolean;
  unavailableReason?: string;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
}>();
</script>

<template>
  <div class="h-full flex flex-col gap-3 p-4">
    <div class="flex justify-end">
      <Button
        size="sm"
        variant="outline"
        :disabled="loading || !!unavailableReason"
        @click="emit('refresh')"
      >
        Refresh Analysis
      </Button>
    </div>

    <BaseNotice v-if="unavailableReason" variant="secondary">
      {{ unavailableReason }}
    </BaseNotice>

    <BaseEmpty
      v-if="!analysis && !loading"
      title="No Redis analysis loaded"
      desc="Run analysis to inspect memory, keyspace hits, misses, and DB activity."
    />

    <div v-else-if="analysis" class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border p-3">
        <div class="text-xs text-muted-foreground">Keys</div>
        <div class="text-lg font-semibold">{{ analysis.keyCount }}</div>
      </div>
      <div class="rounded-lg border p-3">
        <div class="text-xs text-muted-foreground">Used Memory</div>
        <div class="text-lg font-semibold">{{ analysis.usedMemoryHuman }}</div>
      </div>
      <div class="rounded-lg border p-3">
        <div class="text-xs text-muted-foreground">Hits</div>
        <div class="text-lg font-semibold">{{ analysis.keyspaceHits }}</div>
      </div>
      <div class="rounded-lg border p-3">
        <div class="text-xs text-muted-foreground">Misses</div>
        <div class="text-lg font-semibold">{{ analysis.keyspaceMisses }}</div>
      </div>
      <div class="col-span-2 rounded-lg border p-3">
        <div class="text-xs text-muted-foreground">Selected DB</div>
        <pre class="mt-2 text-xs whitespace-pre-wrap">{{
          analysis.dbInfo || 'No keyspace info reported for this DB.'
        }}</pre>
      </div>
    </div>
  </div>
</template>
