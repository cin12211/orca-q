<script lang="ts" setup>
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import ErdDiagram from '~/components/modules/erd-diagram/ErdDiagram.vue';
import WrapperErdDiagram from '~/components/modules/erd-diagram/WrapperErdDiagram.vue';
import { useErdQueryTables } from '~/components/modules/erd-diagram/hooks/useErdGetAllTablesData';
import { createEdges, createNodes } from '~/utils/erd/erd-utils';

const { tableSchema } = await useErdQueryTables();

const initialEdges = createEdges(tableSchema || []);
const initialNodes = createNodes(tableSchema || []);
</script>

<template>
  <WrapperErdDiagram :table-id="undefined" />
</template>
