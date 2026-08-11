<script setup lang="ts">
import type { MongoDocument } from '../types';
import { buildMongoPreviewFields } from '../utils';

const props = defineProps<{ documents: MongoDocument[] }>();
</script>

<template>
  <div class="h-full overflow-auto divide-y">
    <div
      v-for="document in props.documents"
      :key="document._id"
      class="flex items-center gap-4 px-3 py-2 text-sm"
    >
      <span class="font-mono text-muted-foreground shrink-0">{{
        document._id
      }}</span>
      <span
        v-for="field in buildMongoPreviewFields(document)"
        :key="field.key"
        class="truncate"
      >
        <span class="text-muted-foreground">{{ field.key }}:</span>
        {{ field.value }}
      </span>
    </div>
  </div>
</template>
