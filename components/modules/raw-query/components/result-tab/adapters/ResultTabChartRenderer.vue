<script setup lang="ts">
import { ChartBuilder } from '../../../modules/chart-builder';
import type { RawQueryContext } from '../../../registry';

defineProps<{ context: RawQueryContext }>();
</script>

<template>
  <ChartBuilder
    v-if="context.activeTab"
    :active-tab="context.activeTab"
    :active-tab-columns="context.activeTabColumns || []"
    :formatted-data="context.formattedData || []"
  />
</template>
