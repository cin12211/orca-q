<script lang="ts" setup>
import WrapperErdDiagram from '~/components/modules/erd-diagram/WrapperErdDiagram.vue';

definePageMeta({
  keepalive: true,
  notAllowBottomPanel: true,
});

const route = useRoute('workspaceId-connectionId-erd-tableId');
const tableId = computed(() => {
  const value = route.params.tableId as string;
  return value;
});
</script>

<template>
  <WrapperErdDiagram :tableId="tableId" />
</template>
