<script setup lang="ts">
import JsonEditorVue from 'json-editor-vue';
import type { MongoDocument } from '../types';

const props = defineProps<{ documents: MongoDocument[] }>();

const treeMode = 'tree' as unknown as undefined;
</script>

<template>
  <div class="h-full overflow-auto flex flex-col gap-2 p-2">
    <div
      v-for="document in props.documents"
      :key="document._id"
      class="rounded-md border overflow-hidden"
    >
      <JsonEditorVue
        :model-value="document"
        :mode="treeMode"
        :navigation-bar="false"
        :read-only="true"
        class="max-h-64"
      />
    </div>
  </div>
</template>
