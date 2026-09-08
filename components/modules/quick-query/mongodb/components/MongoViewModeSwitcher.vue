<script setup lang="ts">
import { MongoCollectionViewMode } from '../types';

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
        :value="MongoCollectionViewMode.List"
        data-testid="mongo-view-mode-list"
        class="font-medium cursor-pointer text-primary/80"
      >
        List
      </TabsTrigger>
      <TabsTrigger
        size="xxs"
        :value="MongoCollectionViewMode.Table"
        data-testid="mongo-view-mode-table"
        class="font-medium cursor-pointer text-primary/80"
      >
        Table
      </TabsTrigger>
      <TabsTrigger
        size="xxs"
        :value="MongoCollectionViewMode.Info"
        data-testid="mongo-view-mode-info"
        class="font-medium cursor-pointer text-primary/80"
      >
        Info
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>
