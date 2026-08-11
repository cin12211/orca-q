<script setup lang="ts">
import type { MongoCollectionViewMode } from '../types';

defineProps<{ modelValue: MongoCollectionViewMode }>();
const emit = defineEmits<{ 'update:modelValue': [MongoCollectionViewMode] }>();
</script>

<template>
  <Tabs
    :model-value="modelValue"
    @update:model-value="
      emit('update:modelValue', $event as MongoCollectionViewMode)
    "
  >
    <TabsList size="xxs" class="grid w-full grid-cols-3">
      <TabsTrigger
        size="xxs"
        value="table"
        data-testid="mongo-view-mode-table"
        class="font-medium cursor-pointer text-primary/80"
      >
        Table
      </TabsTrigger>
      <TabsTrigger
        size="xxs"
        value="list"
        data-testid="mongo-view-mode-list"
        class="font-medium cursor-pointer text-primary/80"
      >
        List
      </TabsTrigger>
      <TabsTrigger
        size="xxs"
        value="object-list"
        data-testid="mongo-view-mode-object-list"
        class="font-medium cursor-pointer text-primary/80"
      >
        Object List
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>
