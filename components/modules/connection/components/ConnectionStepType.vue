<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DatabaseTypeCard from './DatabaseTypeCard.vue';

const props = defineProps<{
  databaseOptions: any[];
  dbType: string | null;
}>();

const emit = defineEmits<{
  (e: 'next'): void;
  (e: 'close'): void;
}>();
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <DialogHeader class="p-6">
      <DialogTitle>Select Database Type</DialogTitle>
      <DialogDescription
        >Choose the type of database you want to connect to</DialogDescription
      >
    </DialogHeader>

    <div class="flex-1 overflow-y-auto p-6">
      <div class="grid grid-cols-3 gap-4 py-4">
        <DatabaseTypeCard
          v-for="option in databaseOptions"
          :key="option.type"
          :name="option.name"
          :icon="option.icon"
          :selected="option.isActive"
          @click="option.onClick"
          iconClass="size-14!"
        />
      </div>
    </div>

    <DialogFooter class="p-6 flex items-center justify-end gap-2">
      <Button variant="outline" @click="$emit('close')" size="sm">
        Cancel
      </Button>
      <Button @click="$emit('next')" :disabled="!dbType" size="sm">
        Next
      </Button>
    </DialogFooter>
  </div>
</template>
