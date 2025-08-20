<script setup lang="ts">
import RowQuery from '~/components/modules/row-query/RowQuery.vue';

//TODO: create lint check error for sql
// https://www.npmjs.com/package/node-sql-parser?activeTab=readme
// https://codemirror.net/examples/lint/

definePageMeta({
  keepalive: true,
});
</script>

<template>
  <RowQuery />
</template>
