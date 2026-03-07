<script setup lang="ts">
import AgentTextBloom from '../AgentTextBloom.vue';

defineProps<{
  label?: string;
}>();
</script>

<template>
  <div class="flex items-center gap-2 text-muted-foreground">
    <Icon name="lucide:loader" class="size-4 animate-spin" />
    <AgentTextBloom
      :label="label"
      class="text-xs"
      bloom-color="#64748b"
      :bloom-intensity="1.1"
    />
  </div>
</template>
