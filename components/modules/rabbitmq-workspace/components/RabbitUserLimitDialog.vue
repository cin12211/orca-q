<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RabbitUserLimitName } from '~/core/types/rabbitmq.types';
import { RABBIT_USER_LIMIT_OPTIONS } from '../constants';

const props = defineProps<{
  userName: string;
  limits: Record<string, number>;
  /** Set when editing an existing limit; the name is then fixed. */
  initialName: RabbitUserLimitName | null;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', value: { name: RabbitUserLimitName; value: number }): void;
}>();

const open = defineModel<boolean>('open', { required: true });

const name = ref<RabbitUserLimitName>('max-connections');
const value = ref('0');

const parsedValue = computed(() => Number.parseInt(value.value, 10));
const canSubmit = computed(
  () =>
    Number.isInteger(parsedValue.value) &&
    parsedValue.value >= 0 &&
    !props.isSaving
);
const description = computed(
  () =>
    RABBIT_USER_LIMIT_OPTIONS.find(option => option.name === name.value)
      ?.description
);

const resetForm = () => {
  name.value = props.initialName ?? 'max-connections';
  value.value = String(props.limits[name.value] ?? 0);
};

const submit = () => {
  if (!canSubmit.value) return;
  emit('save', { name: name.value, value: parsedValue.value });
};

watch(open, isOpen => {
  if (isOpen) resetForm();
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Set user limit</DialogTitle>
        <DialogDescription>
          Caps for {{ userName }} across the whole cluster.
        </DialogDescription>
      </DialogHeader>

      <form id="rabbit-limit-form" class="space-y-4" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label for="rabbit-limit-name">Limit</Label>
            <Select v-model="name" :disabled="Boolean(initialName)">
              <SelectTrigger id="rabbit-limit-name" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in RABBIT_USER_LIMIT_OPTIONS"
                  :key="option.name"
                  :value="option.name"
                >
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="rabbit-limit-value">Value</Label>
            <Input
              id="rabbit-limit-value"
              v-model="value"
              type="number"
              min="0"
              class="tabular-nums"
            />
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ description }} 0 blocks new ones; clear the limit to remove the
          cap.
        </p>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" @click="open = false">
          Cancel
        </Button>
        <Button
          type="submit"
          form="rabbit-limit-form"
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
