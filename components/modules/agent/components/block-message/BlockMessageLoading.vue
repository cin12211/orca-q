<script setup lang="ts">
import Shimmer from '~/components/ai-elements/shimmer/Shimmer.vue';

defineProps<{
  label?: string;
}>();
</script>

<template>
  <div class="flex items-center gap-2 text-xs text-muted-foreground">
    <Icon name="hugeicons:loading-03" class="size-4 animate-spin" />
    <Shimmer>
      {{ label || 'Generating summary...' }}
    </Shimmer>
  </div>
</template>
