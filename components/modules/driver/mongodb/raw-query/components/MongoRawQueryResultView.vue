<script setup lang="ts">
import MongoCollectionListView from '~/components/modules/driver/mongodb/quick-query/components/MongoCollectionListView.vue';
import type { MongoDocument } from '~/components/modules/driver/mongodb/quick-query/types';

defineProps<{
  documents: MongoDocument[];
}>();
</script>

<template>
  <BaseEmpty
    v-if="!documents.length"
    title="No Results"
    desc="The script returned no documents."
    class="h-full"
  />

  <MongoCollectionListView v-else :documents="documents" class="h-full" />
</template>
