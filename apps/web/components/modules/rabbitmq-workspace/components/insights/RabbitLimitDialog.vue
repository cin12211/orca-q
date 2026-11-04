<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface RabbitLimitValue {
  target: string;
  name: string;
  value: number;
}

const props = defineProps<{
  /** "Virtual host" or "User". */
  targetLabel: string;
  targets: string[];
  options: { name: string; description: string }[];
  /** Set when editing; target and limit are then fixed. */
  initial: RabbitLimitValue | null;
  isSaving: boolean;
}>();

const emit = defineEmits<{ (e: 'save', value: RabbitLimitValue): void }>();

const open = defineModel<boolean>('open', { required: true });

const target = ref('');
const name = ref('');
const value = ref('0');

const parsedValue = computed(() => Number.parseInt(value.value, 10));
const canSubmit = computed(
  () =>
    Boolean(target.value && name.value) &&
    Number.isInteger(parsedValue.value) &&
    parsedValue.value >= 0 &&
    !props.isSaving
);
const description = computed(
  () => props.options.find(option => option.name === name.value)?.description
);

const resetForm = () => {
  target.value = props.initial?.target ?? props.targets[0] ?? '';
  name.value = props.initial?.name ?? props.options[0]?.name ?? '';
  value.value = String(props.initial?.value ?? 0);
};

const submit = () => {
  if (!canSubmit.value) return;
  emit('save', {
    target: target.value,
    name: name.value,
    value: parsedValue.value,
  });
};

watch(open, isOpen => {
  if (isOpen) resetForm();
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{
            initial ? 'Edit limit' : `Set ${targetLabel.toLowerCase()} limit`
          }}
        </DialogTitle>
        <DialogDescription>
          {{ description }} 0 blocks new ones; clear the limit to remove the
          cap.
        </DialogDescription>
      </DialogHeader>

      <form
        id="rabbit-insights-limit-form"
        class="space-y-3"
        @submit.prevent="submit"
      >
        <div class="space-y-1.5">
          <Label for="rabbit-limit-target">{{ targetLabel }}</Label>
          <Select v-model="target" :disabled="Boolean(initial)">
            <SelectTrigger id="rabbit-limit-target" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="item in targets" :key="item" :value="item">
                {{ item }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label for="rabbit-limit-kind">Limit</Label>
            <Select v-model="name" :disabled="Boolean(initial)">
              <SelectTrigger id="rabbit-limit-kind" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in options"
                  :key="option.name"
                  :value="option.name"
                >
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="rabbit-limit-amount">Value</Label>
            <Input
              id="rabbit-limit-amount"
              v-model="value"
              type="number"
              min="0"
              class="tabular-nums"
            />
          </div>
        </div>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" @click="open = false">
          Cancel
        </Button>
        <Button
          type="submit"
          form="rabbit-insights-limit-form"
          size="sm"
          :disabled="!canSubmit"
        >
          <Icon
            v-if="isSaving"
            name="hugeicons:loading-03"
            class="size-4 animate-spin"
          />
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
