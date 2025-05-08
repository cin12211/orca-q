<script setup lang="ts">
import { Icon } from '#components';
import QueryPaginationConfig from './QueryPaginationConfig.vue';

defineProps<{
  isAllowNextPage: boolean;
  isAllowPreviousPage: boolean;
  totalRows: number;
  limit: number;
  offset: number;
  currentTotalRows: number;
}>();

const emit = defineEmits<{
  (e: 'onRefresh'): void;
  (e: 'onPaginate', value: { limit: number; offset: number }): void;
  (e: 'onNextPage'): void;
  (e: 'onPreviousPage'): void;
  (e: 'onShowFilter'): void;
}>();
</script>

<template>
  <div
    class="w-full h-9 border flex items-center justify-between px-2 rounded-b-md"
  >
    <div>
      <Tabs :model-value="'data'">
        <TabsList class="grid w-full grid-cols-3 h-6!">
          <TabsTrigger
            value="data"
            class="h-5! font-normal text-sm cursor-pointer text-primary/80"
          >
            Data
          </TabsTrigger>
          <TabsTrigger
            value="structure"
            class="h-5! font-normal text-sm cursor-pointer text-primary/80"
          >
            Structure
          </TabsTrigger>
          <TabsTrigger
            value="erd"
            class="h-5! font-normal text-sm cursor-pointer text-primary/80"
          >
            ERD
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="iconSm"
        class="h-6"
        :disabled="!isAllowPreviousPage"
        @click="emit('onPreviousPage')"
      >
        <Icon name="lucide:chevron-left"> </Icon>
      </Button>

      <p class="font-normal text-sm text-primary/80">
        {{ offset + 1 }}-{{ offset + currentTotalRows }} of {{ totalRows }} rows
      </p>

      <Button
        variant="outline"
        size="iconSm"
        class="h-6"
        :disabled="!isAllowNextPage"
        @click="emit('onNextPage')"
      >
        <Icon name="lucide:chevron-right"> </Icon>
      </Button>

      <QueryPaginationConfig
        :limit="limit"
        :offset="offset"
        @onPaginate="value => emit('onPaginate', value)"
      />
    </div>

    <div class="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        class="h-6"
        @click="emit('onShowFilter')"
      >
        Filter
      </Button>
      <Button
        variant="outline"
        size="iconSm"
        class="h-6"
        @click="emit('onRefresh')"
      >
        <Icon name="hugeicons:refresh"> </Icon>
      </Button>
      <Button variant="outline" size="iconSm" class="h-6">
        <Icon name="hugeicons:file-download"> </Icon>
      </Button>
    </div>
  </div>
</template>
