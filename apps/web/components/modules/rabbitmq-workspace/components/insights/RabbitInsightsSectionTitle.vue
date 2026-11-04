<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <h3
      class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
    >
      {{ title }}
    </h3>
    <div class="flex items-center gap-1">
      <slot />
    </div>
  </div>
</template>
