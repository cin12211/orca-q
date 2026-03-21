<script setup lang="ts">
import { computed, ref } from 'vue';
import { Background } from '@vue-flow/background';
import { VueFlow } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';
import ErdDiagram from '~/components/modules/erd-diagram/ErdDiagram.vue';
import ValueNode from '~/components/modules/erd-diagram/ValueNode.vue';
import CustomEdge from '~/components/modules/erd-diagram/components/CustomEdge.vue';
import {
  DEFAULT_ZOOM,
  HEAD_ROW_HEIGHT,
  MAX_ZOOM,
  MIN_ZOOM,
  ROW_HEIGHT,
} from '~/components/modules/erd-diagram/constants/index';
import '~/components/modules/erd-diagram/style/vue-flow.css';
import type { MatrixTablePosition } from '~/components/modules/erd-diagram/type';
import { buildFullERDDiagram } from '~/components/modules/erd-diagram/utils/buildFullERDDiagram';
import type { AgentRenderErdResult } from '../../types';
import { mapAgentErdToTableMetadata } from '../../utils/mapAgentErdToTableMetadata';

const props = defineProps<{
  data: AgentRenderErdResult;
}>();

const tableMetadataList = computed(() =>
  mapAgentErdToTableMetadata(props.data)
);

const erd = computed(() => buildFullERDDiagram(tableMetadataList.value));

const matrixPosition = computed<MatrixTablePosition>(() => {
  const matrix: MatrixTablePosition = {};
  for (const node of erd.value.nodes) {
    matrix[node.id] = node.position;
  }
  return matrix;
});

const containerHeight = computed(() => {
  const maxColumns = Math.max(
    ...props.data.nodes.map(n => n.columns.length),
    3
  );
  const estimatedHeight = maxColumns * ROW_HEIGHT + HEAD_ROW_HEIGHT + 120;
  return Math.max(300, Math.min(estimatedHeight, 500));
});

const isFullscreen = ref(false);
const isShowFilter = ref(false);

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  if (!isFullscreen.value) {
    isShowFilter.value = false;
  }
};
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Icon
          name="hugeicons:hierarchy-square-01"
          class="size-4 text-primary"
        />
        <span class="text-sm font-medium"> Entity Relationship Diagram </span>
        <Badge variant="outline" class="text-xs">
          {{ data.nodes.length }} tables
        </Badge>
      </div>
      <Button variant="ghost" size="iconSm" @click="toggleFullscreen">
        <Icon
          :name="
            isFullscreen
              ? 'hugeicons:arrow-shrink-02'
              : 'hugeicons:arrow-expand-02'
          "
        />
      </Button>
    </div>

    <!-- Compact preview -->
    <div
      v-if="!isFullscreen"
      class="overflow-hidden rounded-lg border border-border/70"
      :style="{ height: `${containerHeight}px` }"
    >
      <VueFlow
        class="erd-flow w-full h-full"
        :pan-on-scroll="true"
        :pan-on-scroll-speed="1.2"
        :nodes="erd.nodes"
        :edges="erd.edges"
        :default-viewport="{
          zoom: DEFAULT_ZOOM,
          x: 40,
          y: 40,
        }"
        :min-zoom="MIN_ZOOM"
        :max-zoom="MAX_ZOOM"
        fit-view-on-init
      >
        <template #edge-custom="edgeProps">
          <CustomEdge v-bind="edgeProps" />
        </template>
        <template #node-value="nodeProps">
          <ValueNode v-bind="nodeProps" />
        </template>
        <Background :size="2" :gap="30" />
      </VueFlow>
    </div>

    <!-- Fullscreen with full ERD features -->
    <Teleport to="body">
      <div
        v-if="isFullscreen"
        class="fixed inset-0 z-50 bg-background flex flex-col"
      >
        <div
          class="flex items-center justify-between px-4 py-2 border-b border-border"
        >
          <div class="flex items-center gap-2">
            <Icon
              name="hugeicons:hierarchy-square-01"
              class="size-4 text-primary"
            />
            <span class="text-sm font-medium">
              Entity Relationship Diagram
            </span>
            <Badge variant="outline" class="text-xs">
              {{ data.nodes.length }} tables
            </Badge>
          </div>
          <Button variant="ghost" size="iconSm" @click="toggleFullscreen">
            <Icon name="hugeicons:arrow-shrink-02" />
          </Button>
        </div>

        <div class="flex-1 relative">
          <ErdDiagram
            :nodes="erd.nodes"
            :edges="erd.edges"
            :matrixTablePosition="matrixPosition"
            :tables="tableMetadataList"
            :isShowFilter="isShowFilter"
            @update:isShowFilter="isShowFilter = $event"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>
