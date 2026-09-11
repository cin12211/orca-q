<script setup lang="ts">
import {
  Button,
  ContextMenuShortcut,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components';
import QuickPagination from '~/components/modules/quick-query/quick-query-control-bar/QuickPagination.vue';
import RefreshButton from '~/components/modules/quick-query/quick-query-control-bar/RefreshButton.vue';
import type { MongoCollectionViewMode } from '../types';
import MongoViewModeSwitcher from './MongoViewModeSwitcher.vue';

const props = defineProps<{
  totalRows: number;
  currentTotalRows: number;
  limit: number;
  skip: number;
  isLoading: boolean;
  viewMode: MongoCollectionViewMode;
  isShowFilters?: boolean;
  activeFilterCount?: number;
}>();

const emit = defineEmits<{
  onNextPage: [];
  onPreviousPage: [];
  onRefresh: [];
  onToggleFilter: [];
  onPaginate: [value: { limit: number; offset: number }];
  onInsertClick: [];
  openExport: [scope: 'current' | 'full'];
  'update:viewMode': [MongoCollectionViewMode];
}>();
</script>

<template>
  <div class="w-full select-none h-9 flex items-center justify-between">
    <div class="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="outline" size="xxs" @click="emit('onToggleFilter')">
            <Icon name="lucide:filter" />
            <ContextMenuShortcut>⌘F</ContextMenuShortcut>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Filter data</p>
        </TooltipContent>
      </Tooltip>

      <RefreshButton @on-refresh="emit('onRefresh')" />

      <Button
        variant="outline"
        size="xxs"
        class="gap-1 h-7"
        @click="emit('onInsertClick')"
      >
        <Icon name="hugeicons:plus-sign" class="size-3.5" />
        <span>Insert</span>
      </Button>
    </div>

    <div class="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="iconSm"
            :disabled="props.skip === 0"
            @click="emit('onPreviousPage')"
          >
            <Icon name="lucide:chevron-left" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Previous page</p>
        </TooltipContent>
      </Tooltip>

      <div class="font-normal text-sm text-primary/80">
        {{ props.skip + 1 }}-{{ props.skip + props.currentTotalRows }}
        <p class="font-normal text-xs text-primary/60 inline">of</p>
        {{ props.totalRows }}
        <p class="font-normal text-xs text-primary/60 inline">rows</p>
      </div>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="iconSm"
            :disabled="props.skip + props.limit >= props.totalRows"
            @click="emit('onNextPage')"
          >
            <Icon name="lucide:chevron-right" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Next page</p>
        </TooltipContent>
      </Tooltip>

      <QuickPagination
        :limit="props.limit"
        :offset="props.skip"
        :total-rows="props.totalRows"
        @on-paginate="value => emit('onPaginate', value)"
      />
    </div>

    <div class="flex items-center gap-1">
      <MongoViewModeSwitcher
        :model-value="props.viewMode"
        @update:model-value="mode => emit('update:viewMode', mode)"
      />

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="xxs" class="gap-1 h-7">
            <Icon name="hugeicons:file-download" class="size-3.5" />
            <span>Export</span>
            <Icon name="lucide:chevron-down" class="size-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @click="emit('openExport', 'current')">
            Current results
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('openExport', 'full')">
            Full collections
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>
