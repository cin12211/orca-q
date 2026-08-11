<script setup lang="ts">
import { Button } from '~/components/ui/button';
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
  'update:viewMode': [MongoCollectionViewMode];
}>();
</script>

<template>
  <div class="flex items-center justify-between gap-2 px-1 py-1.5">
    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        :disabled="props.isLoading"
        @click="emit('onRefresh')"
      >
        <Icon name="hugeicons:refresh" />
      </Button>
      <span class="text-sm text-muted-foreground">
        {{ props.skip + 1 }}-{{ props.skip + props.currentTotalRows }} of
        {{ props.totalRows }}
      </span>
      <Button
        variant="ghost"
        size="icon"
        :disabled="props.skip === 0"
        @click="emit('onPreviousPage')"
      >
        <Icon name="hugeicons:arrow-left-01" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        :disabled="props.skip + props.limit >= props.totalRows"
        @click="emit('onNextPage')"
      >
        <Icon name="hugeicons:arrow-right-01" />
      </Button>
    </div>

    <MongoViewModeSwitcher
      :model-value="props.viewMode"
      @update:model-value="mode => emit('update:viewMode', mode)"
    />
  </div>
</template>
