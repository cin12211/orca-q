<script setup lang="ts">
import RawQuery from '~/components/modules/raw-query/RawQuery.vue';

//TODO: create lint check error for sql
// https://www.npmjs.com/package/node-sql-parser?activeTab=readme
// https://codemirror.net/examples/lint/

definePageMeta({
  keepalive: true,
});
</script>

<template>
  <RawQuery />
</template>
