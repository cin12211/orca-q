<script setup lang="ts">
import type { RawQueryFooterContext } from '~/components/modules/database/sqlfamily/raw-query/registry/rawQueryProfile.types';

defineProps<{
  context: RawQueryFooterContext;
}>();
</script>

<template>
  <div class="font-normal text-xs text-muted-foreground">
    Ln {{ context.cursorInfo.line }}, Col {{ context.cursorInfo.column }}
  </div>
</template>
