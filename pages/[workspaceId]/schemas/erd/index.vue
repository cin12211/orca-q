<script lang="ts" setup>
import { ref } from 'vue';
import { Background } from '@vue-flow/background';
import '@vue-flow/controls/dist/style.css';
import { VueFlow } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import ErdDiagram from '~/components/modules/erd-diagram/ErdDiagram.vue';
import { initialNodes, initialEdges } from '~/utils/erd/erd-utils';
</script>

<template>
  <ErdDiagram :nodes="initialNodes" :edges="initialEdges" />
</template>
