<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEnvironmentTagStore } from '~/core/stores';
import { TAG_COLOR_OPTIONS } from '../constants/TAG_COLOR_OPTIONS';
import { createEnvTagSchema } from '../schemas/envTag.schema';
import { TagColor } from '../types/environmentTag.enums';
import type { EnvironmentTag } from '../types/environmentTag.types';
import EnvTagColorDot from './EnvTagColorDot.vue';

const props = defineProps<{
  open: boolean;
  /** When provided the dialog operates in edit mode. */
  editingTag?: EnvironmentTag | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  created: [tag: EnvironmentTag];
  updated: [tag: EnvironmentTag];
}>();

const store = useEnvironmentTagStore();

const isEditMode = computed(() => !!props.editingTag);

const name = ref('');
const color = ref<(typeof TagColor)[keyof typeof TagColor]>(TagColor.Blue);
const strictMode = ref(false);
const isSubmitting = ref(false);
const nameError = ref('');

// Populate / reset form whenever the dialog opens
watch(
  () => props.open,
  open => {
    if (open) {
      if (props.editingTag) {
        name.value = props.editingTag.name;
        color.value = props.editingTag.color;
        strictMode.value = props.editingTag.strictMode;
      } else {
        name.value = '';
        color.value = TagColor.Blue;
        strictMode.value = false;
      }
      isSubmitting.value = false;
      nameError.value = '';
    }
  }
);

const isDuplicate = computed(() => {
  const trimmed = name.value.trim().toLowerCase();
  if (!trimmed) return false;
  return store.tags.some(
    t =>
      t.name.trim().toLowerCase() === trimmed && t.id !== props.editingTag?.id
  );
});

const canSubmit = computed(
  () => name.value.trim() && !isDuplicate.value && !isSubmitting.value
);

const handleSubmit = async () => {
  nameError.value = '';

  const result = createEnvTagSchema.safeParse({
    name: name.value.trim(),
    color: color.value,
    strictMode: strictMode.value,
  });

  if (!result.success) {
    nameError.value = result.error.issues[0]?.message ?? 'Invalid input';
    return;
  }

  if (isDuplicate.value) {
    nameError.value = 'A tag with this name already exists';
    return;
  }

  isSubmitting.value = true;
  try {
    if (isEditMode.value && props.editingTag) {
      const updated = await store.updateTag({
        ...props.editingTag,
        name: result.data.name,
        color: result.data.color,
        strictMode: result.data.strictMode,
      });
      emit('updated', updated);
    } else {
      const tag = await store.createTag(result.data);
      emit('created', tag);
    }
    emit('update:open', false);
  } finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => emit('update:open', false);
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)" v-if="open">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>{{
          isEditMode ? 'Edit Tag' : 'Create New Tag'
        }}</DialogTitle>
      </DialogHeader>

      <form class="space-y-4 py-1" @submit.prevent="handleSubmit">
        <!-- Name -->
        <div class="space-y-1.5">
          <Label for="new-tag-name">
            Name <span class="text-destructive">*</span>
          </Label>
          <Input
            id="new-tag-name"
            v-model="name"
            placeholder="e.g. staging"
            maxlength="10"
            autocomplete="off"
            :class="nameError || isDuplicate ? 'border-destructive' : ''"
          />
          <p v-if="isDuplicate && !nameError" class="text-xs text-destructive">
            A tag with this name already exists
          </p>
          <p v-else-if="nameError" class="text-xs text-destructive">
            {{ nameError }}
          </p>
        </div>

        <!-- Color -->
        <div class="space-y-1.5">
          <Label>Color</Label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in TAG_COLOR_OPTIONS"
              :key="option.value"
              type="button"
              :aria-label="option.label"
              :aria-pressed="color === option.value"
              :title="option.label"
              class="flex items-center justify-center rounded-full size-6 ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              :class="
                color === option.value ? 'ring-2 ring-ring ring-offset-2' : ''
              "
              @click="color = option.value"
            >
              <EnvTagColorDot :color="option.value" size="md" />
            </button>
          </div>
        </div>

        <!-- Strict mode -->
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <p class="text-sm flex items-center gap-1">
              <Icon name="hugeicons:shield-user" class="size-3.5!" />
              Strict Mode
            </p>
            <p class="text-xs text-muted-foreground">
              Require confirmation phrase before connecting
            </p>
          </div>
          <Switch v-model:checked="strictMode" />
        </div>
      </form>

      <DialogFooter>
        <Button variant="outline" type="button" @click="handleCancel">
          Cancel
        </Button>
        <Button type="button" :disabled="!canSubmit" @click="handleSubmit">
          {{ isEditMode ? 'Save Changes' : 'Create Tag' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
