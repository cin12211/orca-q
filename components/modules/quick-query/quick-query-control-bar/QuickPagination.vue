<script setup lang="ts">
import { ref } from 'vue';
import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#components';

const props = defineProps<{
  limit: number;
  offset: number;
  totalRows: number;
}>();

const emit = defineEmits<{
  (e: 'onPaginate', value: { limit: number; offset: number }): void;
}>();

const localLimit = ref(0);
const localOffset = ref(0);
const popoverOpen = ref(false);

const onInitData = () => {
  localLimit.value = props.limit;
  localOffset.value = props.offset;
};

// Handle offset validation on blur
const handleOffsetBlur = () => {
  if (localOffset.value > props.totalRows) {
    localOffset.value = props.totalRows - 1;
    return;
  }

  if (localOffset.value < 0) {
    localOffset.value = props.offset;
  }
};

const handleLimitBlur = () => {
  if (localLimit.value > props.totalRows) {
    localLimit.value = props.totalRows;
    return;
  }

  if (localLimit.value < 0) {
    localLimit.value = props.limit;
  }
};

// Emit pagination event and close popover when Go button is clicked
const handleGo = () => {
  handleOffsetBlur();
  handleLimitBlur();

  emit('onPaginate', {
    limit: localLimit.value,
    offset: localOffset.value,
  });
  popoverOpen.value = false; // Close the popover
};
</script>

<template>
  <Popover v-model:open="popoverOpen">
    <PopoverTrigger as-child>
      <Button
        @click="onInitData"
        variant="outline"
        size="sm"
        class="h-6 font-normal"
        >{{ limit }}</Button
      >
    </PopoverTrigger>
    <PopoverContent class="w-64">
      <div class="grid gap-3">
        <div class="space-y-2">
          <h4 class="font-medium leading-none">Pagination</h4>
          <p class="text-sm text-muted-foreground">Set limit and offset</p>
        </div>
        <div class="grid gap-2">
          <div class="grid grid-cols-3 items-center gap-4">
            <Label for="limit">Limit</Label>
            <Input
              id="limit"
              type="number"
              v-model.number="localLimit"
              class="col-span-2 h-6"
              min="1"
              @blur="handleLimitBlur"
              @keyup.enter="handleGo"
            />
          </div>
          <div class="grid grid-cols-3 items-center gap-4">
            <Label for="offset">Offset</Label>
            <Input
              id="offset"
              type="number"
              v-model.number="localOffset"
              class="col-span-2 h-6"
              min="0"
              @blur="handleOffsetBlur"
              @keyup.enter="handleGo"
            />
          </div>
        </div>
        <div class="flex justify-center">
          <Button size="sm" class="h-6 px-6" @click="handleGo">Go</Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
