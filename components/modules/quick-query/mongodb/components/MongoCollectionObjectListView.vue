<script setup lang="ts">
import type { MongoDocument } from '../types';

const props = defineProps<{ documents: MongoDocument[] }>();
</script>

<template>
  <div class="h-full overflow-auto flex flex-col gap-2 p-2">
    <pre
      v-for="document in props.documents"
      :key="document._id"
      class="text-xs rounded-md border bg-muted/40 p-2 overflow-auto"
      >{{ JSON.stringify(document, null, 2) }}</pre
    >
  </div>
</template>
