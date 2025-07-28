<script lang="ts" setup>
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import WrapperErdDiagram from '~/components/modules/erd-diagram/WrapperErdDiagram.vue';

const route = useRoute('workspaceId-connectionId-erd-tableId');
</script>

<template>
  <WrapperErdDiagram :tableId="route.params.tableId" />
</template>
