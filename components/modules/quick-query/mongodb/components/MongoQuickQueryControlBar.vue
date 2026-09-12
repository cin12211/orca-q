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
import { MongoCollectionViewMode, MongoExportScope } from '../types';
import MongoViewModeSwitcher from './MongoViewModeSwitcher.vue';

const props = defineProps<{
  totalRows: number;
  currentTotalRows: number;
  limit: number;
  skip: number;
  isLoading: boolean;
  viewMode: MongoCollectionViewMode;
  isShowFilters?: boolean;
  isShowMoreOptions?: boolean;
}>();

const emit = defineEmits<{
  onNextPage: [];
  onPreviousPage: [];
  onRefresh: [];
  onToggleFilter: [];
  onToggleMoreOptions: [];
  onPaginate: [value: { limit: number; offset: number }];
  onInsertClick: [];
  openExport: [scope: MongoExportScope];
  'update:viewMode': [MongoCollectionViewMode];
}>();
</script>

<template>
  <div class="w-full select-none h-9 flex items-center justify-between">
    <div class="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="xxs"
            :class="
              props.isShowFilters ? 'bg-accent text-accent-foreground' : ''
            "
            @click="emit('onToggleFilter')"
          >
            <Icon name="lucide:filter" />
            <ContextMenuShortcut>⌘F</ContextMenuShortcut>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Filter data</p>
        </TooltipContent>
      </Tooltip>

      <RefreshButton @on-refresh="emit('onRefresh')" />

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="xxs"
            class="font-normal"
            @click="emit('onInsertClick')"
          >
            <Icon name="hugeicons:plus-sign" />
            <span>Insert</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Insert document or import file</p>
        </TooltipContent>
      </Tooltip>
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
        <template v-if="props.totalRows > 0 && props.currentTotalRows > 0">
          {{ props.skip + 1 }}-{{ props.skip + props.currentTotalRows }}
          <p class="font-normal text-xs text-primary/60 inline">of</p>
          {{ props.totalRows }}
        </template>
        <template v-else> 0-0 of 0 </template>
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

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="xxs"
            :class="
              props.isShowMoreOptions ? 'bg-accent text-accent-foreground' : ''
            "
            class="font-normal"
            @click="emit('onToggleMoreOptions')"
          >
            <span>Options</span>
            <Icon name="hugeicons:arrow-down-01" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Toggle query options (Project, Sort, Collation, Hint, MaxTimeMS)
          </p>
        </TooltipContent>
      </Tooltip>
    </div>

    <div class="flex items-center gap-1">
      <MongoViewModeSwitcher
        :model-value="props.viewMode"
        @update:model-value="mode => emit('update:viewMode', mode)"
      />

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="xxs" class="font-normal">
            <Icon name="hugeicons:file-download" />
            <span>Export</span>
            <Icon
              name="lucide:chevron-down"
              class="size-3 text-muted-foreground"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            @click="emit('openExport', MongoExportScope.Current)"
          >
            Current results
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('openExport', MongoExportScope.All)">
            Full collections
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>
