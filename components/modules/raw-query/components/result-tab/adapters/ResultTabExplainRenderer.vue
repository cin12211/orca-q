<script setup lang="ts">
import { ExplainQuery } from '../../../modules/explain-query';
import type { RawQueryResultViewContext } from '../../../registry';

defineProps<{ context: RawQueryResultViewContext }>();
</script>

<template>
  <ExplainQuery :active-tab="context.activeTab" />
</template>
