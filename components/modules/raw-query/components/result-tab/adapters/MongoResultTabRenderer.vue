<script setup lang="ts">
import { MongoRawQueryResultView } from '../../../mongo';
import type { RawQueryResultViewContext } from '../../../registry';

defineProps<{ context: RawQueryResultViewContext }>();
</script>

<template>
  <MongoRawQueryResultView :documents="context.formattedData" />
</template>
