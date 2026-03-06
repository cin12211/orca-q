<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '#components';
import type { AIProvider } from '~/core/stores/appLayoutStore';
import AgentChatInput from './AgentChatInput.vue';
import AgentChatStatusBar from './AgentChatStatusBar.vue';

const props = defineProps<{
  modelValue: string;
  isLoading: boolean;
  hasApiKey: boolean;
  provider: AIProvider;
  model: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:provider', value: AIProvider): void;
  (e: 'update:model', value: string): void;
  (e: 'submit', event?: Event): void;
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
</script>

<template>
  <footer class="w-full pb-4 pt-2">
    <div class="relative w-full max-w-3xl mx-auto flex flex-col gap-2 px-4">
      <!-- Floating Scroll to Bottom Button -->
      <!-- Moved from AgentWorkspace down to here to naturally float above input -->
      <!-- However, since we might need absolute positioning relative to messagesContainer,
           we can just float it absolutely above the input -->
      <div class="absolute -top-12 left-1/2 transform -translate-x-1/2 z-20">
        <button
          class="p-2 bg-background border border-border rounded-full shadow-sm text-muted-foreground hover:bg-muted/50 cursor-pointer outline-none transition-colors"
          @click="emit('scrollToBottom')"
        >
          <Icon name="lucide:arrow-down" class="size-4 shrink-0" />
        </button>
      </div>

      <AgentChatInput
        v-model="internalModelValue"
        v-model:provider="internalProvider"
        v-model:model="internalModel"
        :is-loading="isLoading"
        :has-api-key="hasApiKey"
        @submit="emit('submit', $event)"
        @keydown="emit('keydown', $event)"
      />

      <AgentChatStatusBar />
    </div>
  </footer>
</template>
