<script setup lang="ts">
import { SchemaDiffContainer } from '~/components/modules/database-tools';

definePageMeta({
  keepalive: true,
});

const route = useRoute();

const connectionId = computed(() =>
  String(
    (route.params as Record<string, string | number | undefined>)
      .connectionId || ''
  )
);
</script>

<template>
  <div class="h-full">
    <div
      v-if="!connectionId"
      class="h-full p-4 flex flex-col items-center justify-center text-muted-foreground"
    >
      <Icon name="hugeicons:plug-socket" class="size-12 mb-2 opacity-50" />
      <p class="text-sm">Select a connection to open Schema Diff</p>
    </div>

    <SchemaDiffContainer v-else :source-connection-id="connectionId" />
  </div>
</template>
