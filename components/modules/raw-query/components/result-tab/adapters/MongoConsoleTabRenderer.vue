<script setup lang="ts">
import { MongoRawQueryConsole } from '../../../mongo';
import type { RawQueryResultViewContext } from '../../../registry/rawQueryResult.types';

defineProps<{ context: RawQueryResultViewContext }>();
</script>

<template>
  <MongoRawQueryConsole :logs="context.activeTab.metadata.logs" />
</template>
