<script setup lang="ts">
import type { MongoRawQueryLogEntry } from '~/core/types/mongodb-raw-query.types';

defineProps<{ logs?: MongoRawQueryLogEntry[] }>();
</script>
<template>
  <div
    v-if="logs?.length"
    class="rounded border bg-muted/30 p-2 text-xs font-mono space-y-1"
  >
    <div
      v-for="(entry, index) in logs"
      :key="index"
      :class="
        entry.level === 'error' ? 'text-destructive' : 'text-muted-foreground'
      "
    >
      [{{ entry.level }}] {{ entry.args.map(String).join(' ') }}
    </div>
  </div>
</template>
