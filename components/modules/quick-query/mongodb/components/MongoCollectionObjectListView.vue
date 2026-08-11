<script setup lang="ts">
import { CodeHighlightPreview } from '~/components/base/code-highlight-preview';
import type { MongoDocument } from '../types';

const props = defineProps<{ documents: MongoDocument[] }>();
</script>

<template>
  <div class="h-full overflow-auto flex flex-col gap-2 p-2">
    <CodeHighlightPreview
      v-for="document in props.documents"
      :key="document._id"
      :code="JSON.stringify(document, null, 2)"
      language="json"
      max-height="320px"
    />
  </div>
</template>
