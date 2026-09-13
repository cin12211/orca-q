<script setup lang="ts">
import MongoCollectionListItem from '~/components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue';

const props = defineProps<{
  documents: Record<string, unknown>[];
}>();

const expandedDocuments = ref(new Set<number>());

const toggleDocumentExpansion = (index: number) => {
  const next = new Set(expandedDocuments.value);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  expandedDocuments.value = next;
};
</script>

<template>
  <div class="h-full overflow-auto p-2 space-y-2">
    <BaseEmpty
      v-if="!documents.length"
      title="No Results"
      desc="The script returned no documents."
      class="h-full"
    />
    <MongoCollectionListItem
      v-for="(document, index) in documents"
      v-else
      :key="index"
      :document="document"
      :document-label="
        document._id === undefined ? `Document ${index + 1}` : undefined
      "
      :is-expanded="expandedDocuments.has(index)"
      :is-editing="false"
      :is-saving="false"
      :is-read-only="true"
      @toggle-expand="toggleDocumentExpansion(index)"
    />
  </div>
</template>
