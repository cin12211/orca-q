<script setup lang="ts">
import { ExplainQuery } from '../../../modules/explain-query';
import type { RawQueryContext } from '../../../registry';

defineProps<{ context: RawQueryContext }>();
</script>

<template>
  <ExplainQuery v-if="context.activeTab" :active-tab="context.activeTab" />
</template>
