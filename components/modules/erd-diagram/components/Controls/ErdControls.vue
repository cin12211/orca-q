<script setup lang="ts">
import {
  Button,
  Icon,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components';
import { useVueFlow } from '@vue-flow/core';
import { Kbd, KbdGroup } from '~/components/ui/kbd';
import { DEFAULT_ZOOM_DURATION } from '../../constants';
import type { BackGroundGridStatus } from '../../type';

const props = defineProps<{
  isHand: boolean;
  isUseBgGrid: BackGroundGridStatus;
  isUseMiniMap: boolean;
  isShowFilter: boolean;
}>();

const { zoomIn, zoomOut, fitView, getViewport } = useVueFlow();

const emit = defineEmits<{
  (e: 'update:isHand', value: boolean): void;
  (e: 'update:isUseBgGrid', value: BackGroundGridStatus): void;
  (e: 'update:isUseMiniMap', value: boolean): void;
  (e: 'update:isShowFilter', value: boolean): void;
  (e: 'arrange'): void;
}>();

const zoomPercent = computed(() => Math.round(getViewport().zoom * 100));

const toggleHand = () => emit('update:isHand', !props.isHand);
const onToggleGrid = () => {
  if (!props.isUseBgGrid) {
    emit('update:isUseBgGrid', 'dots');
    return;
  }

  if (props.isUseBgGrid === 'dots') {
    emit('update:isUseBgGrid', 'lines');
    return;
  }

  emit('update:isUseBgGrid', false);
};

const onToggleMiniMap = () => emit('update:isUseMiniMap', !props.isUseMiniMap);
const onToggleFilter = () => emit('update:isShowFilter', !props.isShowFilter);
const onArrangeDiagram = () => emit('arrange');
const onZoomOut = () => zoomOut({ duration: DEFAULT_ZOOM_DURATION });
const onZoomIn = () => zoomIn({ duration: DEFAULT_ZOOM_DURATION });
const onFitToView = () => fitView({ duration: DEFAULT_ZOOM_DURATION });
</script>

<template>
  <div
    class="absolute bottom-1 z-10 left-1/2 -translate-x-1/2 w-fit h-10 bg-background box-border border-2 border-border rounded-lg p-1 flex flex-row gap-0.5"
  >
    <!-- Toggle Grid -->
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          :variant="!isUseBgGrid ? 'ghost' : 'secondary'"
          size="iconMd"
          @click="onToggleGrid()"
        >
          <Icon name="hugeicons:grid" class="size-4!" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{{
        isUseBgGrid ? 'Hide grid' : 'Show grid'
      }}</TooltipContent>
    </Tooltip>

    <!-- Toggle Mini Map -->
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          :variant="!isUseMiniMap ? 'ghost' : 'secondary'"
          size="iconMd"
          @click="onToggleMiniMap()"
        >
          <Icon name="hugeicons:dashboard-circle" class="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{{
        isUseMiniMap ? 'Hide minimap' : 'Show minimap'
      }}</TooltipContent>
    </Tooltip>

    <!-- Hand Mode -->
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          :variant="!isHand ? 'ghost' : 'secondary'"
          size="iconMd"
          @click="toggleHand()"
        >
          <Icon v-if="!isHand" name="hugeicons:hold-03" class="size-4!" />
          <Icon v-else name="hugeicons:hold-04" class="size-4!" />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        >Click to enable pan mode
        <br />
        Or hold Space/Middle mouse + drag to pan</TooltipContent
      >
    </Tooltip>

    <Separator orientation="vertical" class="mx-1.5" />

    <!-- Zoom Out -->
    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="ghost" size="iconMd" @click="onZoomOut">
          <Icon name="hugeicons:minus-sign" class="size-4!" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Zoom out</TooltipContent>
    </Tooltip>

    <div
      class="w-7 h-7 text-center py-0.5 text-sm flex items-center justify-center"
    >
      {{ zoomPercent }}
    </div>

    <!-- Zoom In -->
    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="ghost" size="iconMd" @click="onZoomIn">
          <Icon name="hugeicons:add-01" class="size-4!" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Zoom in</TooltipContent>
    </Tooltip>

    <Separator orientation="vertical" class="mx-1.5" />

    <!-- Fit View -->
    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="ghost" size="iconMd" @click="onFitToView">
          <Icon name="hugeicons:center-focus" class="size-4!" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Fit to view</TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="ghost" size="iconMd" @click="onArrangeDiagram">
          <Icon name="hugeicons:coordinate-01" class="size-4!" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Arrange the diagram</TooltipContent>
    </Tooltip>

    <!-- Toggle Filter -->
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          :variant="!isShowFilter ? 'ghost' : 'secondary'"
          size="iconMd"
          @click="onToggleFilter()"
        >
          <Icon name="hugeicons:filter" class="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        >{{ isShowFilter ? 'Hide filter' : 'Show filter' }}

        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>f</Kbd>
        </KbdGroup>
      </TooltipContent>
    </Tooltip>
  </div>
</template>
