<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    entries: Record<string, unknown>;
    emptyText?: string;
  }>(),
  { emptyText: 'None' }
);

const rows = computed(() =>
  Object.entries(props.entries).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  }))
);
</script>

<template>
  <p v-if="!rows.length" class="text-xs text-muted-foreground">
    {{ emptyText }}
  </p>
  <dl
    v-else
    class="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs"
  >
    <template v-for="row in rows" :key="row.key">
      <dt class="font-mono text-muted-foreground truncate">{{ row.key }}</dt>
      <dd class="font-mono break-all">{{ row.value }}</dd>
    </template>
  </dl>
</template>
