<script setup lang="ts">
import type { RedisKeyspaceInsight } from '~/core/types/instance-insights.types';

const props = defineProps<{
  keyspace: RedisKeyspaceInsight | undefined;
}>();

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 md:grid-cols-4">
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Expired key count</p>
        <p class="mt-1 text-lg font-medium">
          {{ fmt(keyspace?.expiredKeyCount) }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Avg TTL</p>
        <p class="mt-1 text-lg font-medium">{{ fmt(keyspace?.avgTtl) }}</p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Keys without TTL</p>
        <p class="mt-1 text-lg font-medium">
          {{ fmt(keyspace?.keysWithoutTtl) }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Sampled keys</p>
        <p class="mt-1 text-lg font-medium">{{ fmt(keyspace?.sampledKeys) }}</p>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-lg border p-3">
        <h3 class="text-sm font-medium">Databases</h3>
        <div class="mt-3 space-y-2 text-sm">
          <div
            v-for="db in keyspace?.databases || []"
            :key="db.database"
            class="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2"
          >
            <span>{{ db.database }}</span>
            <span class="text-muted-foreground">
              {{ fmt(db.keyCount) }} keys · {{ fmt(db.expires) }} expiring · avg
              TTL {{ fmt(db.avgTtl) }}
            </span>
          </div>
        </div>
      </div>

      <div class="rounded-lg border p-3">
        <h3 class="text-sm font-medium">Top prefixes</h3>
        <div class="mt-3 space-y-2 text-sm">
          <div
            v-for="prefix in keyspace?.topPrefixes || []"
            :key="prefix.prefix"
            class="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2"
          >
            <span>{{ prefix.prefix }}</span>
            <span class="text-muted-foreground">
              {{ fmt(prefix.keyCount) }} keys
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-lg border p-3">
      <h3 class="text-sm font-medium">Key type distribution</h3>
      <div class="mt-3 flex flex-wrap gap-2">
        <Badge
          v-for="item in keyspace?.keyTypeDistribution || []"
          :key="item.type"
          variant="outline"
        >
          {{ item.type }} · {{ fmt(item.count) }}
        </Badge>
      </div>
      <p class="mt-3 text-xs text-muted-foreground">
        {{ keyspace?.hotKeysNote }}
      </p>
    </div>
  </div>
</template>
