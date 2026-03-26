<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '#components';
import type { AIProvider } from '~/components/modules/settings/types';
import type { AgentCommandOptionId } from '../constants/command-options';
import AgentChatInput from './AgentChatInput.vue';
import AgentChatStatusBar from './AgentChatStatusBar.vue';

const props = defineProps<{
  modelValue: string;
  isLoading: boolean;
  hasApiKey: boolean;
  provider: AIProvider;
  model: string;
  selectedCommandOptions: AgentCommandOptionId[];
  showReasoning: boolean;
  showScrollButton?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:provider', value: AIProvider): void;
  (e: 'update:model', value: string): void;
  (e: 'update:selectedCommandOptions', value: AgentCommandOptionId[]): void;
  (e: 'update:showReasoning', value: boolean): void;
  (e: 'submit', event?: Event): void;
  (e: 'stop'): void;
  (e: 'keydown', event: KeyboardEvent): void;
  (e: 'scrollToBottom'): void;
}>();

const internalModelValue = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

const internalProvider = computed({
  get: () => props.provider,
  set: val => emit('update:provider', val),
});

const internalModel = computed({
  get: () => props.model,
  set: val => emit('update:model', val),
});

const internalSelectedCommandOptions = computed({
  get: () => props.selectedCommandOptions,
  set: val => emit('update:selectedCommandOptions', val),
});

const modelLabel = computed(() => `${props.provider} / ${props.model}`);

const inputRef = ref<InstanceType<typeof AgentChatInput> | null>(null);

const focusInput = () => {
  inputRef.value?.focusInput();
};

defineExpose({ focusInput });
</script>

<template>
  <footer class="w-full py-2">
    <div class="relative w-full max-w-3xl mx-auto flex flex-col px-4">
      <!-- Floating Scroll to Bottom Button -->
      <!-- Moved from AgentWorkspace down to here to naturally float above input -->
      <!-- However, since we might need absolute positioning relative to messagesContainer,
           we can just float it absolutely above the input -->
      <transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="showScrollButton"
          class="absolute -top-12 left-1/2 transform -translate-x-1/2 z-20"
        >
          <button
            class="flex items-center justify-center size-8 bg-background border border-border rounded-full shadow-sm text-muted-foreground hover:bg-muted/50 cursor-pointer outline-none transition-colors"
            @click="emit('scrollToBottom')"
          >
            <Icon name="lucide:arrow-down" class="size-4 shrink-0" />
          </button>
        </div>
      </transition>

      <AgentChatInput
        ref="inputRef"
        v-model="internalModelValue"
        v-model:provider="internalProvider"
        v-model:model="internalModel"
        v-model:selected-command-options="internalSelectedCommandOptions"
        :is-loading="isLoading"
        :has-api-key="hasApiKey"
        @submit="emit('submit', $event)"
        @stop="emit('stop')"
        @keydown="emit('keydown', $event)"
      />

      <AgentChatStatusBar
        :model-label="modelLabel"
        :is-loading="isLoading"
        :show-reasoning="showReasoning"
        @update:show-reasoning="emit('update:showReasoning', $event)"
      />
    </div>
  </footer>
</template>
