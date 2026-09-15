<script setup lang="ts">
import type { RawQueryContext } from '../../registry/rawQueryPlugin.types';

defineProps<{
  context: RawQueryContext;
}>();
</script>

<template>
  <div class="font-normal text-xs text-muted-foreground">
    Ln {{ context.cursorInfo.line }}, Col {{ context.cursorInfo.column }}
  </div>
</template>
