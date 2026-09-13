<script setup lang="ts">
import type { MongoRawQueryLogEntry } from '~/core/types/mongodb-raw-query.types';
import { formatMongoEjsonConsoleValue } from '../utils/mongoEjson';

defineProps<{ logs?: MongoRawQueryLogEntry[] }>();

const formatLogArgument = formatMongoEjsonConsoleValue;
</script>
<template>
  <div
    class="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border/70 bg-background text-foreground shadow-xs"
    data-testid="mongo-raw-query-console"
    aria-live="polite"
  >
    <div
      class="flex shrink-0 items-center justify-between border-b border-border/60 bg-muted/35 px-3 py-2"
    >
      <div class="flex min-w-0 items-center gap-2">
        <Icon
          name="hugeicons:command-line"
          class="size-4 text-muted-foreground"
        />
        <span data-testid="mongo-console-title" class="text-xs font-medium">
          Console
        </span>
        <span class="text-[11px] text-muted-foreground">
          {{ logs?.length ?? 0 }} {{ logs?.length === 1 ? 'entry' : 'entries' }}
        </span>
      </div>
      <span class="text-[11px] text-muted-foreground">MongoDB Raw Query</span>
    </div>

    <div
      v-if="logs?.length"
      class="min-h-0 flex-1 overflow-auto p-2 font-mono text-xs leading-5"
    >
      <span
        v-for="(entry, index) in logs"
        :key="index"
        data-testid="mongo-console-entry"
        class="flex gap-2 rounded px-2 py-1 whitespace-pre-wrap break-words transition-colors hover:bg-muted/45"
        :class="
          entry.level === 'error'
            ? 'text-destructive'
            : entry.level === 'warn'
              ? 'text-amber-600 dark:text-amber-400'
              : entry.level === 'info'
                ? 'text-sky-600 dark:text-sky-400'
                : ''
        "
      >
        <span class="shrink-0 text-muted-foreground">{{ index + 1 }}</span>
        <span data-testid="mongo-console-message"
          >[{{ entry.level }}]
          {{ entry.args.map(formatLogArgument).join(' ') }}</span
        >
      </span>
    </div>
    <div
      v-else
      data-testid="mongo-console-empty"
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <Icon
        name="hugeicons:command-line"
        class="size-7 text-muted-foreground/70"
      />
      <div>
        <p class="text-xs font-medium">No console output</p>
        <p class="mt-1 text-[11px] text-muted-foreground">
          Add console.log(), console.info(), console.warn(), or console.error()
          to debug this script.
        </p>
      </div>
    </div>
  </div>
</template>
