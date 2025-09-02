<script lang="ts" setup>
import WrapperErdDiagram from '~/components/modules/erd-diagram/WrapperErdDiagram.vue';

definePageMeta({
  keepalive: true,
  notAllowBottomPanel: true,
});

const route = useRoute('workspaceId-connectionId-erd-tableId');
</script>

<template>
  <WrapperErdDiagram :tableId="route.params.tableId" />
</template>
