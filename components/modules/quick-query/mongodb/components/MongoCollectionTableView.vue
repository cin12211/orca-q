<script setup lang="ts">
import { computed } from 'vue';
import BaseDataGrid from '~/components/base/data-grid/BaseDataGrid.vue';
import type { MongoDocument } from '../types';
import { buildMongoColumnDefs } from '../utils';

const props = defineProps<{ documents: MongoDocument[] }>();

const columnDefs = computed(() => buildMongoColumnDefs(props.documents));
</script>

<template>
  <BaseDataGrid
    class="h-full border rounded-md"
    :column-defs="columnDefs"
    :row-data="props.documents"
    :grid-options="{ getRowId: params => params.data._id }"
  />
</template>
