<script setup lang="ts">
defineProps<{
  scope: 'instance' | 'database';
  dbIndex?: number;
}>();
</script>

<template>
  <Badge
    v-if="scope === 'instance'"
    variant="outline"
    class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xxs px-1.5 py-0.5 h-4 font-medium tracking-tight gap-1 select-none"
    title="Global metric covering full Redis Instance"
  >
    <Icon name="hugeicons:database" class="size-2.5" />
    Full Instance
  </Badge>
  <Badge
    v-else
    variant="outline"
    class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xxs px-1.5 py-0.5 h-4 font-medium tracking-tight gap-1 select-none"
    title="Scoped metric for the currently selected Database"
  >
    <Icon name="hugeicons:database-sync-01" class="size-2.5" />
    DB /{{ dbIndex ?? 0 }}
  </Badge>
</template>
