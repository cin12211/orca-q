<script setup lang="ts">
import MongoCollectionListView from '~/components/modules/quick-query/mongodb/components/MongoCollectionListView.vue';

const props = defineProps<{
  documents: Record<string, unknown>[];
}>();

const getDocumentLabel = (document: Record<string, unknown>, index: number) =>
  document._id === undefined ? `Document ${index + 1}` : undefined;
</script>

<template>
  <BaseEmpty
    v-if="!documents.length"
    title="No Results"
    desc="The script returned no documents."
    class="h-full"
  />
  <MongoCollectionListView
    v-else
    :documents="documents as any"
    :is-read-only="true"
    :get-document-label="getDocumentLabel as any"
  />
</template>
