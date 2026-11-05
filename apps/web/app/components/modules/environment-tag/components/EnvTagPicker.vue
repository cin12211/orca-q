<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useEnvironmentTagStore } from '~/core/stores';
import type { EnvironmentTag } from '../types/environmentTag.types';
import CreateEnvTagDialog from './CreateEnvTagDialog.vue';
import EnvTagColorDot from './EnvTagColorDot.vue';

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const store = useEnvironmentTagStore();

const MAX_TAGS = 3;
const atLimit = computed(() => props.modelValue.length >= MAX_TAGS);

function isSelected(id: string) {
  return props.modelValue.includes(id);
}

function toggle(id: string) {
  if (isSelected(id)) {
    emit(
      'update:modelValue',
      props.modelValue.filter(v => v !== id)
    );
  } else if (!atLimit.value) {
    emit('update:modelValue', [...props.modelValue, id]);
  }
}

const selectedTags = computed(() =>
  store.tags.filter(t => props.modelValue.includes(t.id))
);

const showCreateDialog = ref(false);

function onTagCreated(tag: EnvironmentTag) {
  if (!atLimit.value) {
    emit('update:modelValue', [...props.modelValue, tag.id]);
  }
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        class="h-auto min-h-9 w-full justify-start gap-1 px-2 py-1 flex-wrap"
      >
        <template v-if="selectedTags.length === 0">
          <span class="text-sm text-muted-foreground">Assign tags&hellip;</span>
        </template>
        <template v-else>
          <span
            v-for="tag in selectedTags"
            :key="tag.id"
            class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
          >
            <EnvTagColorDot :color="tag.color" size="sm" />
            {{ tag.name }}
          </span>
        </template>
      </Button>
    </PopoverTrigger>

    <PopoverContent
      class="w-56 p-1"
      align="start"
      :side-offset="4"
      :restore-focus="false"
    >
      <p
        v-if="atLimit"
        class="px-2 py-1 text-xs text-muted-foreground select-none"
      >
        Max {{ MAX_TAGS }} tags selected
      </p>

      <ul role="listbox" aria-multiselectable="true" class="space-y-0.5">
        <li
          v-for="tag in store.tags"
          :key="tag.id"
          role="option"
          :aria-selected="isSelected(tag.id)"
          :aria-disabled="atLimit && !isSelected(tag.id)"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
            :disabled="atLimit && !isSelected(tag.id)"
            @click="toggle(tag.id)"
          >
            <span
              class="flex size-4 items-center justify-center rounded-sm border"
              :class="
                isSelected(tag.id)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input'
              "
            >
              <svg
                v-if="isSelected(tag.id)"
                viewBox="0 0 12 12"
                class="size-3 fill-current"
              >
                <path
                  d="M10 3L5 8.5 2 5.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  fill="none"
                />
              </svg>
            </span>
            <EnvTagColorDot :color="tag.color" size="md" />
            <span class="flex-1 truncate text-left">{{ tag.name }}</span>
          </button>
        </li>
      </ul>

      <p
        v-if="store.tags.length === 0"
        class="px-2 py-3 text-center text-xs text-muted-foreground"
      >
        No tags configured
      </p>

      <Separator class="my-1" />
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:bg-accent"
        @click="showCreateDialog = true"
      >
        <Icon name="hugeicons:plus-sign" class="size-4" />
        Add new tag
      </button>
    </PopoverContent>
  </Popover>

  <CreateEnvTagDialog v-model:open="showCreateDialog" @created="onTagCreated" />
</template>
