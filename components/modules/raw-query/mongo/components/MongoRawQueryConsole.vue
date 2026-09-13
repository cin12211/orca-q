<script setup lang="ts">
import type { MongoRawQueryLogEntry } from '~/core/types/mongodb-raw-query.types';

defineProps<{ logs?: MongoRawQueryLogEntry[] }>();

const formatLogArgument = (argument: unknown) => {
  if (typeof argument === 'string') return argument;
  if (argument === undefined) return 'undefined';
  if (typeof argument === 'bigint') return `${argument}n`;

  try {
    return JSON.stringify(argument);
  } catch {
    return String(argument);
  }
};
</script>
<template>
  <div
    class="h-full overflow-auto rounded border border-border/70 bg-[#101416] p-3 font-mono text-xs leading-5 text-slate-200"
    data-testid="mongo-raw-query-console"
    aria-live="polite"
  >
    <pre v-if="logs?.length" class="m-0 whitespace-pre-wrap break-words">
      <span
      v-for="(entry, index) in logs"
      :key="index"
      :class="
        entry.level === 'error'
          ? 'text-red-300'
          : entry.level === 'warn'
            ? 'text-amber-300'
            : entry.level === 'info'
              ? 'text-sky-300'
              : ''
      "
      >[{{ entry.level }}] {{ entry.args.map(formatLogArgument).join(' ') }}{{
        index < logs.length - 1 ? '\n' : ''
      }}</span>
    </pre>
    <span v-else class="text-slate-500">No console output.</span>
  </div>
</template>
