<script setup lang="ts">
import type { RedisPerformanceInsight } from '~/core/types/instance-insights.types';

defineProps<{
  performance: RedisPerformanceInsight | undefined;
}>();

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 md:grid-cols-3">
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Ops/sec</p>
        <p class="mt-1 text-lg font-medium">
          {{ fmt(performance?.instantaneousOpsPerSec) }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Total commands</p>
        <p class="mt-1 text-lg font-medium">
          {{ fmt(performance?.totalCommandsProcessed) }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Blocked clients</p>
        <p class="mt-1 text-lg font-medium">
          {{ fmt(performance?.blockedClients) }}
        </p>
      </div>
    </div>

    <div class="rounded-lg border p-3">
      <h3 class="text-sm font-medium">Latency doctor</h3>
      <pre class="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{{
        performance?.latencyDoctor || 'No latency doctor output available.'
      }}</pre>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-lg border p-3">
        <h3 class="text-sm font-medium">Slowlog</h3>
        <div class="mt-3 space-y-2 text-xs">
          <div
            v-for="entry in performance?.slowlog || []"
            :key="entry.id"
            class="rounded-md bg-muted/20 px-3 py-2"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium">{{
                entry.command || 'unknown command'
              }}</span>
              <span>{{ fmt(entry.durationMicros) }} µs</span>
            </div>
            <p class="mt-1 text-muted-foreground">
              {{ entry.clientAddr || 'n/a' }} ·
              {{ entry.timestamp || 'unknown time' }}
            </p>
          </div>
        </div>
      </div>

      <div class="rounded-lg border p-3">
        <h3 class="text-sm font-medium">Command stats</h3>
        <div class="mt-3 space-y-2 text-xs">
          <div
            v-for="command in performance?.commandStats || []"
            :key="command.command"
            class="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2"
          >
            <span>{{ command.command }}</span>
            <span class="text-muted-foreground">
              {{ fmt(command.calls) }} calls ·
              {{ command.usecPerCall.toFixed(2) }} µs/call
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-lg border p-3">
      <h3 class="text-sm font-medium">Long-running Lua scripts</h3>
      <div class="mt-3 space-y-2 text-xs">
        <div
          v-if="!(performance?.longRunningLuaScripts || []).length"
          class="text-muted-foreground"
        >
          No active Lua script clients detected.
        </div>
        <div
          v-for="client in performance?.longRunningLuaScripts || []"
          :key="client.id"
          class="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2"
        >
          <span>{{ client.addr }}</span>
          <span class="text-muted-foreground">
            {{ client.cmd }} · age {{ fmt(client.ageSeconds) }}s
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
