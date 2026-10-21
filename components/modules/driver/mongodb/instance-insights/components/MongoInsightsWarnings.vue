<script setup lang="ts">
defineProps<{
  warnings: string[] | undefined;
}>();
</script>

<template>
  <BaseNotice
    v-if="warnings?.length"
    variant="secondary"
    class="shrink-0 text-xs"
  >
    <p class="font-medium">Some metrics could not be collected</p>
    <p class="text-muted-foreground">
      The connected user may lack the <code>clusterMonitor</code> role, or the
      hosting tier restricts these commands.
    </p>
    <ul class="mt-1 list-disc pl-4 text-muted-foreground">
      <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
    </ul>
  </BaseNotice>
</template>
