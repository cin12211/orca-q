<script setup lang="ts">
import type { RedisClientInsight } from '~/core/types/instance-insights.types';

defineProps<{
  clients: RedisClientInsight | undefined;
  isActionLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'kill-client', id: string): void;
}>();

const numberFormatter = new Intl.NumberFormat();

function fmt(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '0';
  return numberFormatter.format(Number(value));
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 md:grid-cols-2">
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Connected clients</p>
        <p class="mt-1 text-lg font-medium">
          {{ fmt(clients?.connectedClients) }}
        </p>
      </div>
      <div class="rounded-lg border p-3">
        <p class="text-xs text-muted-foreground">Suspicious clients</p>
        <p class="mt-1 text-lg font-medium">
          {{ fmt((clients?.suspiciousClients || []).length) }}
        </p>
      </div>
    </div>

    <div
      v-if="(clients?.suspiciousClients || []).length"
      class="rounded-lg border p-3"
    >
      <h3 class="text-sm font-medium">Suspicious clients</h3>
      <div class="mt-3 space-y-2 text-xs">
        <div
          v-for="warning in clients?.suspiciousClients || []"
          :key="`${warning.clientId}-${warning.reason}`"
          class="rounded-md bg-muted/20 px-3 py-2"
        >
          {{ warning.reason }}
        </div>
      </div>
    </div>

    <div class="rounded-lg border p-3">
      <h3 class="text-sm font-medium">Client list</h3>
      <div class="mt-3 space-y-2 text-xs">
        <div
          v-for="client in clients?.clients || []"
          :key="client.id"
          class="rounded-md bg-muted/20 px-3 py-2"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium">{{ client.addr }}</p>
              <p class="text-muted-foreground">
                {{ client.name }} · db {{ client.db }} · {{ client.cmd }}
              </p>
              <p class="text-muted-foreground">
                age {{ fmt(client.ageSeconds) }}s · idle
                {{ fmt(client.idleSeconds) }}s
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              :disabled="isActionLoading"
              @click="emit('kill-client', client.id)"
            >
              Kill client
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
