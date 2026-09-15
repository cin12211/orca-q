<script setup lang="ts">
import { MongoRawQueryConsole } from '../../../mongo';
import type { RawQueryContext } from '../../../registry';

defineProps<{ context: RawQueryContext }>();
</script>

<template>
  <MongoRawQueryConsole :logs="context.activeTab?.metadata.logs" />
</template>
