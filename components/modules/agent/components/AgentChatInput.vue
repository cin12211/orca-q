<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import ModelSelector from '~/components/modules/selectors/ModelSelector.vue';
import type { AIProvider } from '~/core/stores/appLayoutStore';
import {
  AGENT_COMMAND_OPTIONS,
  getAgentCommandOptionsByIds,
  type AgentCommandOption,
  type AgentCommandOptionId,
} from '../constants/command-options';

const props = defineProps<{
  modelValue: string;
  isLoading: boolean;
  hasApiKey: boolean;
  provider: AIProvider;
  model: string;
  selectedCommandOptions: AgentCommandOptionId[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:provider', value: AIProvider): void;
  (e: 'update:model', value: string): void;
  (e: 'update:selectedCommandOptions', value: AgentCommandOptionId[]): void;
  (e: 'submit', event?: Event): void;
  (e: 'stop'): void;
  (e: 'keydown', event: KeyboardEvent): void;
}>();

const COMMAND_LIST_ID = 'agent-command-listbox';
const COMMAND_STATUS_ID = 'agent-command-status';

const localInput = ref(props.modelValue);
const activeCommandIndex = ref(0);
const dismissedCommandToken = ref('');

watch(
  () => props.modelValue,
  val => {
    localInput.value = val;
  }
);

const textareaRef = ref<unknown>(null);

const internalSelectedCommandOptions = computed({
  get: () => props.selectedCommandOptions,
  set: value => emit('update:selectedCommandOptions', value),
});

const selectedCommandChips = computed(() =>
  getAgentCommandOptionsByIds(internalSelectedCommandOptions.value)
);

const getTextareaElement = (): HTMLTextAreaElement | null => {
  const currentValue = textareaRef.value;

  if (!currentValue) {
    return null;
  }

  if (currentValue instanceof HTMLTextAreaElement) {
    return currentValue;
  }

  if (
    typeof currentValue === 'object' &&
    '$el' in currentValue &&
    currentValue.$el instanceof HTMLElement
  ) {
    const element = currentValue.$el;
    if (element instanceof HTMLTextAreaElement) {
      return element;
    }

    return element.querySelector('textarea');
  }

  if (currentValue instanceof HTMLElement) {
    return currentValue.querySelector('textarea');
  }

  return null;
};

const focusInput = () => {
  const textareaElement = getTextareaElement();
  textareaElement?.focus();
};

defineExpose({ focusInput });

const commandMatch = computed(() => {
  const textareaElement = getTextareaElement();
  const cursorPosition =
    textareaElement?.selectionStart ?? localInput.value.length;
  const beforeCursor = localInput.value.slice(0, cursorPosition);

  return beforeCursor.match(/(?:^|\s)\/([a-z0-9_-]*)$/i);
});

const commandQuery = computed(
  () => commandMatch.value?.[1]?.toLowerCase() || ''
);

const commandToken = computed(() => {
  if (!commandMatch.value) {
    return '';
  }

  return commandMatch.value[0];
});

const filteredCommandOptions = computed(() => {
  const query = commandQuery.value.trim();
  if (!commandMatch.value) {
    return [];
  }

  if (!query) {
    return AGENT_COMMAND_OPTIONS;
  }

  return AGENT_COMMAND_OPTIONS.filter(option =>
    [option.label, option.toolName, option.description, option.category]
      .join(' ')
      .toLowerCase()
      .includes(query)
  );
});

const showCommandPalette = computed(
  () =>
    Boolean(commandMatch.value) &&
    commandToken.value !== dismissedCommandToken.value
);

const activeCommandOption = computed(
  () => filteredCommandOptions.value[activeCommandIndex.value] || null
);

const commandStatusText = computed(() => {
  if (!showCommandPalette.value) {
    return '';
  }

  if (filteredCommandOptions.value.length === 0) {
    return 'No matching agent tools. Keep typing to filter or press Escape to close.';
  }

  return `${filteredCommandOptions.value.length} agent tools available. Use arrow keys to move, Enter or Tab to insert, and Escape to close.`;
});

watch(filteredCommandOptions, options => {
  if (options.length === 0) {
    activeCommandIndex.value = 0;
    return;
  }

  if (activeCommandIndex.value >= options.length) {
    activeCommandIndex.value = 0;
  }
});

watch(commandToken, token => {
  if (!token) {
    dismissedCommandToken.value = '';
  }
});

const handleInput = (e: Event) => {
  const val = (e.target as HTMLTextAreaElement).value;
  localInput.value = val;
  if (
    dismissedCommandToken.value &&
    dismissedCommandToken.value !== commandToken.value
  ) {
    dismissedCommandToken.value = '';
  }
  emit('update:modelValue', val);
};

const closeCommandPalette = async () => {
  dismissedCommandToken.value = commandToken.value;
  activeCommandIndex.value = 0;
  await nextTick();
  focusInput();
};

const addCommandOption = (option: AgentCommandOption) => {
  if (internalSelectedCommandOptions.value.includes(option.id)) {
    return;
  }

  internalSelectedCommandOptions.value = [
    ...internalSelectedCommandOptions.value,
    option.id,
  ];
};

const removeCommandOption = (optionId: AgentCommandOptionId) => {
  internalSelectedCommandOptions.value =
    internalSelectedCommandOptions.value.filter(id => id !== optionId);
};

const applyCommandOption = async (option: AgentCommandOption) => {
  const textareaElement = getTextareaElement();
  const cursorPosition =
    textareaElement?.selectionStart ?? localInput.value.length;
  const beforeCursor = localInput.value.slice(0, cursorPosition);
  const afterCursor = localInput.value.slice(cursorPosition);
  const match = beforeCursor.match(/(?:^|\s)\/([a-z0-9_-]*)$/i);

  if (!match) {
    return;
  }

  const slashIndex = beforeCursor.lastIndexOf('/');
  const replacementPrefix = localInput.value.slice(0, slashIndex);
  let nextValue = `${replacementPrefix}${afterCursor}`;

  if (!replacementPrefix.trim()) {
    nextValue = nextValue.trimStart();
  }

  const nextCursorPosition = Math.min(
    replacementPrefix.length,
    nextValue.length
  );

  localInput.value = nextValue;
  emit('update:modelValue', nextValue);
  addCommandOption(option);
  activeCommandIndex.value = 0;
  dismissedCommandToken.value = '';

  await nextTick();

  const nextTextareaElement = getTextareaElement();
  nextTextareaElement?.focus();
  nextTextareaElement?.setSelectionRange(
    nextCursorPosition,
    nextCursorPosition
  );
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (showCommandPalette.value) {
    if (event.key === 'Escape') {
      event.preventDefault();
      void closeCommandPalette();
      return;
    }

    if (filteredCommandOptions.value.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeCommandIndex.value =
          (activeCommandIndex.value + 1) % filteredCommandOptions.value.length;
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeCommandIndex.value =
          (activeCommandIndex.value - 1 + filteredCommandOptions.value.length) %
          filteredCommandOptions.value.length;
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        activeCommandIndex.value = 0;
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        activeCommandIndex.value = filteredCommandOptions.value.length - 1;
        return;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const selectedOption = activeCommandOption.value;
        if (selectedOption) {
          void applyCommandOption(selectedOption);
        }
        return;
      }
    }
  }

  emit('keydown', event);
};

const handleSubmit = (event?: Event) => {
  event?.preventDefault();
  emit(
    'submit',
    typeof event === 'object' && event !== null ? event : undefined
  );
};

const handlePrimaryAction = (event?: Event) => {
  if (props.isLoading) {
    event?.preventDefault();
    emit('stop');
    return;
  }

  handleSubmit(event);
};

// Pass-through for provider/model
const internalProvider = computed({
  get: () => props.provider,
  set: val => emit('update:provider', val),
});
const internalModel = computed({
  get: () => props.model,
  set: val => emit('update:model', val),
});
</script>

<template>
  <div class="w-full relative">
    <div
      v-if="showCommandPalette"
      class="absolute bottom-[calc(100%+8px)] left-4 right-4 z-50 overflow-hidden rounded-2xl border border-border/80 bg-background shadow-lg"
    >
      <div class="border-b border-border/50 px-3 py-2">
        <p class="text-xs font-medium">Agent tools</p>
        <p class="mt-1 text-xs text-muted-foreground">
          Type after <span class="font-medium text-foreground">/</span> to
          filter.
        </p>
      </div>

      <div
        :id="COMMAND_LIST_ID"
        role="listbox"
        aria-label="Agent tools"
        class="max-h-[260px] overflow-y-auto px-2 py-2"
      >
        <button
          v-for="(option, index) in filteredCommandOptions"
          :id="`${COMMAND_LIST_ID}-${option.id}`"
          :key="option.id"
          type="button"
          role="option"
          :aria-selected="index === activeCommandIndex"
          class="mt-0.5 flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left transition-colors first:mt-0 cursor-pointer"
          :class="
            index === activeCommandIndex
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
          "
          @mouseenter="activeCommandIndex = index"
          @click="applyCommandOption(option)"
        >
          <Icon :name="option.icon" class="mt-0.5 size-[18px] shrink-0" />

          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-2">
              <span class="text-xs font-medium text-foreground">{{
                option.label
              }}</span>
            </span>
            <span class="mt-1 block text-xs text-muted-foreground">
              {{ option.description }}
            </span>
          </span>

          <div>
            <Icon
              v-if="
                selectedCommandChips.find(selected => selected.id === option.id)
              "
              name="hugeicons:checkmark-circle-01"
              class="size-4 mt-0.5 text-muted-foreground cursor-pointer"
            />
          </div>
        </button>

        <div
          v-if="filteredCommandOptions.length === 0"
          class="rounded-xl px-3 py-5 text-center text-[11px] text-muted-foreground"
        >
          No matching tools. Try
          <span class="font-medium text-foreground">/render</span> or
          <span class="font-medium text-foreground">/describe</span>.
        </div>
      </div>
    </div>

    <div
      class="bg-background rounded-3xl border shadow-xs p-3 px-2 pb-2 flex flex-col gap-1 relative z-40"
    >
      <div
        v-if="selectedCommandChips.length > 0"
        class="flex flex-wrap gap-2 pb-1"
      >
        <div
          v-for="option in selectedCommandChips"
          :key="option.id"
          class="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-1.5 py-0.5 text-xs text-foreground"
        >
          <Icon :name="option.icon" class="size-3.5 text-muted-foreground" />
          <span>{{ option.label }}</span>
          <button
            type="button"
            class="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            :aria-label="`Remove ${option.label}`"
            @click="removeCommandOption(option.id)"
          >
            <Icon name="lucide:x" class="size-3" />
          </button>
        </div>
      </div>

      <Textarea
        ref="textareaRef"
        v-model="localInput"
        :disabled="!hasApiKey || isLoading"
        :placeholder="`Ask Orca anythink, / for agent tools`"
        class="w-full bg-transparent outline-none border-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground resize-none px-2 pt-0 min-h-12 max-h-36 text-sm"
        aria-autocomplete="list"
        :aria-controls="showCommandPalette ? COMMAND_LIST_ID : undefined"
        :aria-describedby="COMMAND_STATUS_ID"
        :aria-activedescendant="
          activeCommandOption
            ? `${COMMAND_LIST_ID}-${activeCommandOption.id}`
            : undefined
        "
        :aria-expanded="showCommandPalette"
        @input="handleInput"
        @keydown="handleKeyDown"
      />

      <p :id="COMMAND_STATUS_ID" class="sr-only" aria-live="polite">
        {{ commandStatusText }}
      </p>

      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-1">
          <!-- TODO: open after -->
          <!-- <Tooltip>
            <TooltipTrigger as-child>
              <button
                type="button"
                class="size-8 flex items-center justify-center text-muted-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
              >
                <Icon name="lucide:plus" class="size-[20px] stroke-[2]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Add attachment</TooltipContent>
          </Tooltip> -->

          <!-- Model Dropdown inside the input -->
          <div class="relative w-fit">
            <ModelSelector
              v-model:provider="internalProvider"
              v-model:model="internalModel"
              class="h-8! border-0 bg-transparent hover:bg-muted rounded-lg shadow-none px-2! text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <Button
            type="button"
            class="rounded-full shadow size-7 p-0 bg-foreground text-background hover:bg-foreground disabled disabled:bg-muted disabled:text-muted-foreground"
            :disabled="(!localInput.trim() && !isLoading) || !hasApiKey"
            @click="handlePrimaryAction"
          >
            <Icon
              :name="isLoading ? 'lucide:square' : 'lucide:arrow-up'"
              :class="['size-4 stroke-[2]', isLoading ? 'fill-current' : '']"
            />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
