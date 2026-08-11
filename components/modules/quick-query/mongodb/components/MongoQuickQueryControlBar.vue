<script setup lang="ts">
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
}>();

const emit = defineEmits<{
  onNextPage: [];
  onPreviousPage: [];
  onRefresh: [];
  onPaginate: [value: { limit: number; offset: number }];
  'update:viewMode': [MongoCollectionViewMode];
}>();
</script>

<template>
  <div class="w-full select-none h-9 flex items-center justify-between">
    <div class="flex items-center gap-1">
      <RefreshButton @on-refresh="emit('onRefresh')" />
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
    </div>
  </div>
</template>
