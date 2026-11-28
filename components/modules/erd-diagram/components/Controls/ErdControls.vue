<script setup lang="ts">
import {
  Button,
  Icon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components';
import { useVueFlow } from '@vue-flow/core';
import { Kbd, KbdGroup } from '~/components/ui/kbd';
import { DEFAULT_ZOOM_DURATION, ERD_LAYOUT_OPTIONS } from '../../constants';
import { ErdLayoutAlgorithm, type BackGroundGridStatus } from '../../types';

const props = defineProps<{
  isHand: boolean;
  isUseBgGrid: BackGroundGridStatus;
  isUseMiniMap: boolean;
  isShowFilter: boolean;
  areAllCollapsed?: boolean;
  layoutAlgorithm?: ErdLayoutAlgorithm;
}>();

const { zoomIn, zoomOut, fitView, getViewport } = useVueFlow();

const emit = defineEmits<{
  (e: 'update:isHand', value: boolean): void;
  (e: 'update:isUseBgGrid', value: BackGroundGridStatus): void;
  (e: 'update:isUseMiniMap', value: boolean): void;
  (e: 'update:isShowFilter', value: boolean): void;
  (e: 'arrange'): void;
  (e: 'toggleCollapseAll'): void;
  (e: 'changeLayoutAlgorithm', algorithm: ErdLayoutAlgorithm): void;
}>();

const isLayoutPopoverOpen = ref(false);

const selectedLayout = computed(
  () => props.layoutAlgorithm ?? ErdLayoutAlgorithm.Default
);

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
const onSelectLayout = (algorithm: ErdLayoutAlgorithm) => {
  isLayoutPopoverOpen.value = false;
  emit('changeLayoutAlgorithm', algorithm);
};
const onToggleCollapseAll = () => emit('toggleCollapseAll');
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

    <!-- Auto-arrange algorithm -->
    <Tooltip>
      <Popover v-model:open="isLayoutPopoverOpen">
        <PopoverTrigger as-child>
          <TooltipTrigger as-child>
            <Button
              :variant="isLayoutPopoverOpen ? 'secondary' : 'ghost'"
              size="iconMd"
            >
              <Icon name="hugeicons:hierarchy-square-02" class="size-4!" />
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>
        <TooltipContent>Auto-arrange algorithm</TooltipContent>

        <PopoverContent side="top" :side-offset="8" class="w-80 p-1.5">
          <p class="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
            Choose an auto-arrange algorithm
          </p>
          <div class="flex flex-col gap-0.5">
            <button
              v-for="option in ERD_LAYOUT_OPTIONS"
              :key="option.value"
              type="button"
              class="flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
              :class="{ 'bg-accent': option.value === selectedLayout }"
              @click="onSelectLayout(option.value)"
            >
              <Icon :name="option.icon" class="mt-0.5 size-4! shrink-0" />
              <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="text-sm font-medium">{{ option.label }}</span>
                <span class="text-xs leading-snug text-muted-foreground">
                  {{ option.description }}
                </span>
              </div>
              <Icon
                v-if="option.value === selectedLayout"
                name="hugeicons:tick-02"
                class="mt-0.5 size-4! shrink-0 text-primary"
              />
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="ghost" size="iconMd" @click="onToggleCollapseAll">
          <Icon
            :name="
              areAllCollapsed
                ? 'hugeicons:maximize-01'
                : 'hugeicons:minimize-01'
            "
            class="size-4!"
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{{
        areAllCollapsed ? 'Expand all tables' : 'Collapse all tables'
      }}</TooltipContent>
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
