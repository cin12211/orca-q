<script setup lang="ts">
import QuickQuery from '~/components/modules/quick-query/QuickQuery.vue';

definePageMeta({
  keepalive: {
    max: 6,
  },
});

const route = useRoute('workspaceId-connectionId-quick-query-tabViewId');
</script>

<template>
  <QuickQuery :tab-view-id="route.params.tabViewId" />
</template>
