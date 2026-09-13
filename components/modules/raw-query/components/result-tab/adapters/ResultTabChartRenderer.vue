<script setup lang="ts">
import { ChartBuilder } from '../../../modules/chart-builder';
import type { RawQueryResultViewContext } from '../../../registry/rawQueryResult.types';

defineProps<{ context: RawQueryResultViewContext }>();
</script>

<template>
  <ChartBuilder
    :active-tab="context.activeTab"
    :active-tab-columns="context.activeTabColumns"
    :formatted-data="context.formattedData"
  />
</template>
