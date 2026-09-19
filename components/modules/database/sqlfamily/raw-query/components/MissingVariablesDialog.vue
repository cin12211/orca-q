<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const props = defineProps<{
  open: boolean;
  missingVariables: string[];
}>();

const emit = defineEmits<{
  (e: 'confirm', values: Record<string, any>, insertBack: boolean): void;
  (e: 'cancel'): void;
}>();

const variableValues = ref<Record<string, string>>({});
const insertBack = ref(true);
const inputRefs = ref<Array<InstanceType<typeof Input> | null>>([]);
const executeButtonRef = ref<InstanceType<typeof Button> | null>(null);

// Reset state when dialog is opened
watch(
  () => props.open,
  isOpen => {
    if (isOpen) {
      inputRefs.value = [];
      const initial: Record<string, string> = {};
      props.missingVariables.forEach(v => {
        initial[v] = '';
      });
      variableValues.value = initial;
      insertBack.value = true;
    }
  }
);

const handleInputEnter = (index: number) => {
  if (index < props.missingVariables.length - 1) {
    const nextInput = inputRefs.value[index + 1];
    if (nextInput && typeof nextInput.focus === 'function') {
      nextInput.focus();
    }
  } else {
    const btn = executeButtonRef.value?.$el as HTMLElement | undefined;
    if (btn && typeof btn.focus === 'function') {
      btn.focus();
    }
  }
};

const handleConfirm = () => {
  // Parse inputs (convert number strings, JSON, booleans, etc. if appropriate, or keep as string)
  const parsedValues: Record<string, any> = {};
  for (const [key, val] of Object.entries(variableValues.value)) {
    const trimmed = val.trim();
    // Try parsing as JSON first (numbers, booleans, arrays, objects)
    try {
      if (trimmed === '') {
        parsedValues[key] = '';
      } else if (trimmed === 'null') {
        parsedValues[key] = null;
      } else {
        parsedValues[key] = JSON.parse(trimmed);
      }
    } catch {
      // Fallback to raw string
      parsedValues[key] = trimmed;
    }
  }
  emit('confirm', parsedValues, insertBack.value);
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <Dialog :open="open" @update:open="!$event && handleCancel()" v-if="open">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Icon name="hugeicons:alert-02" class="size-5 text-amber-500" />
          Missing Query Variables
        </DialogTitle>
        <DialogDescription>
          This query contains parameters that are not defined. Please enter
          their values to run.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <div
          v-for="(variable, index) in missingVariables"
          :key="variable"
          class="grid grid-cols-4 items-center gap-4"
        >
          <Label :for="variable" class="text-right"> :{{ variable }} </Label>
          <Input
            :ref="
              el => {
                if (el) inputRefs[index] = el as InstanceType<typeof Input>;
              }
            "
            :id="variable"
            v-model="variableValues[variable]"
            placeholder="Enter value"
            class="col-span-3"
            :autofocus="index === 0"
            @keyup.enter="handleInputEnter(index)"
            size="sm"
          />
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <Checkbox id="insertBack" v-model:model-value="insertBack" />
        <Label
          for="insertBack"
          class="text-sm leading-none cursor-pointer font-normal"
        >
          Add these to active variables list
        </Label>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" size="sm" @click="handleCancel"
          >Cancel</Button
        >
        <Button
          size="sm"
          ref="executeButtonRef"
          class="gap-1"
          @click="handleConfirm"
          @keydown.enter.prevent="handleConfirm"
        >
          <Icon name="lucide:play" class="size-4" />
          Execute
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
