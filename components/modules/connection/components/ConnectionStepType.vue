<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { IDBSupport } from '../constants';
import DatabaseTypeCard from './DatabaseTypeCard.vue';

interface IDatabaseOption extends IDBSupport {
  isActive: boolean;
  onClick: () => void;
}

const props = defineProps<{
  databaseOptions: IDatabaseOption[];
  dbType: DatabaseClientType | null;
}>();

const emit = defineEmits<{
  (e: 'next'): void;
  (e: 'close'): void;
}>();

const handleSelect = (option: IDatabaseOption) => {
  if (option.isSupport) {
    option.onClick();
  }
};
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
      <div id="tour-database-type-cards" class="grid grid-cols-3 gap-4 py-4">
        <DatabaseTypeCard
          v-for="option in databaseOptions"
          :key="option.type"
          :name="option.name"
          :icon="option.icon"
          :selected="option.isActive"
          @click="() => handleSelect(option)"
          :isSupport="option.isSupport"
          :isBeta="option.isBeta"
          :unsupported-label="option.unsupportedLabel"
          iconClass="size-14!"
        />
      </div>
    </div>

    <DialogFooter class="p-6 flex items-center justify-end gap-2">
      <Button variant="outline" @click="$emit('close')" size="sm">
        Cancel
      </Button>
      <Button
        id="tour-database-type-next"
        @click="$emit('next')"
        :disabled="!dbType"
        size="sm"
      >
        Next <Icon name="hugeicons:arrow-right-02" />
      </Button>
    </DialogFooter>
  </div>
</template>
