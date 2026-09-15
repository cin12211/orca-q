<script setup lang="ts">
import { MongoRawQueryResultView } from '../../../mongo';
import type { MongoDialectState, RawQueryContext } from '../../../registry';

defineProps<{ context: RawQueryContext<MongoDialectState> }>();
</script>

<template>
  <MongoRawQueryResultView
    :documents="context.formattedData"
    :context="context"
  />
</template>
