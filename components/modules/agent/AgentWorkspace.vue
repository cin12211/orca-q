<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { nextTick, ref, computed, watch, onMounted } from 'vue';
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import ModelSelector from '~/components/modules/selectors/ModelSelector.vue';
import Badge from '~/components/ui/badge/Badge.vue';
import {
  useAppLayoutStore,
  type AIProvider,
} from '~/core/stores/appLayoutStore';
import AgentChatFooter from './components/AgentChatFooter.vue';
import AgentMessageBubble from './components/AgentMessageBubble.vue';
import AgentSetupCard from './components/AgentSetupCard.vue';
import { useAgentChat } from './hooks/useDbAgentChat';
import { useAgentRenderer } from './hooks/useDbAgentRenderer';
import { useAgentWorkspace } from './hooks/useDbAgentWorkspace';
import type { DbAgentMessage } from './types';

const {
  selectedContext,
  sectionCounts,
  activeHistory,
  activeHistoryId,
  showReasoning,
  saveConversation,
  startNewChat,
} = useAgentWorkspace();

const {
  selectedProvider,
  selectedModel,
  isLoading,
  error,
  messages,
  hasApiKey,
  currentProvider,
  sendMessage,
  addToolApprovalResponse,
  schemaStats,
} = useAgentChat(showReasoning);

const { renderedMessages, getComponent } = useAgentRenderer(messages);

const messageInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const footerRef = ref<InstanceType<typeof AgentChatFooter> | null>(null);
const isHydratingHistory = ref(false);
const lastLoadedHistoryId = ref<string | null>(null);

const cloneMessages = (value: DbAgentMessage[]) =>
  JSON.parse(JSON.stringify(value)) as DbAgentMessage[];

const showScrollButton = ref(false);

const handleScroll = () => {
  if (!messagesContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  showScrollButton.value = scrollHeight - scrollTop - clientHeight > 150;
};

const scrollToBottom = (smooth = false) => {
  if (!messagesContainer.value) {
    return;
  }

  messagesContainer.value.scrollTo({
    top: messagesContainer.value.scrollHeight,
    behavior: smooth === true ? 'smooth' : 'auto',
  });
  showScrollButton.value = false;
};

onMounted(() => {
  setTimeout(() => {
    scrollToBottom();
  }, 100);
});

const replaceMessages = (nextMessages: DbAgentMessage[]) => {
  messages.value.splice(0, messages.value.length, ...nextMessages);
};

const handleSubmit = async (event?: Event) => {
  event?.preventDefault();

  if (!messageInput.value.trim() || isLoading.value) {
    return;
  }

  const nextMessage = messageInput.value.trim();
  messageInput.value = '';
  sendMessage(nextMessage);

  await nextTick();
  scrollToBottom();
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSubmit(event);
  }
};

const handleQuickAction = async (prompt: string) => {
  messageInput.value = prompt;
  await nextTick();
  await handleSubmit();
};

const handleUseContextPrompt = () => {
  if (!selectedContext.value.promptSuggestion) {
    return;
  }

  messageInput.value = selectedContext.value.promptSuggestion;
};

const handleNewThread = () => {
  startNewChat();
  replaceMessages([]);
};

const handleApproval = async (approvalId: string, approved: boolean) => {
  await addToolApprovalResponse({
    id: approvalId,
    approved,
  });
};

const handleEditMessage = async (text: string) => {
  messageInput.value = text;
  await nextTick();
  footerRef.value?.focusInput();
};

const persistConversation = useDebounceFn(() => {
  if (isHydratingHistory.value || messages.value.length === 0) {
    return;
  }

  saveConversation({
    messages: cloneMessages(messages.value),
    provider: selectedProvider.value,
    model: selectedModel.value,
    showReasoning: showReasoning.value,
  });
}, 250);

watch(
  () => activeHistory.value?.id ?? null,
  async historyId => {
    if (historyId === lastLoadedHistoryId.value) {
      return;
    }

    isHydratingHistory.value = true;
    lastLoadedHistoryId.value = historyId;

    if (historyId && activeHistory.value) {
      replaceMessages(cloneMessages(activeHistory.value.messages));
      if (activeHistory.value.provider)
        selectedProvider.value = activeHistory.value.provider as AIProvider;
      if (activeHistory.value.model)
        selectedModel.value = activeHistory.value.model;
      if (typeof activeHistory.value.showReasoning === 'boolean') {
        showReasoning.value = activeHistory.value.showReasoning;
      }
    } else if (messages.value.length > 0) {
      replaceMessages([]);
    }

    await nextTick();
    scrollToBottom();
    isHydratingHistory.value = false;
  },
  { immediate: true }
);

watch(
  () => messages.value.length,
  async () => {
    await nextTick();
    scrollToBottom();
  }
);

watch(
  () => {
    const lastMessage = messages.value.at(-1);
    if (!lastMessage?.parts) {
      return '';
    }

    return lastMessage.parts
      .filter(
        (part): part is { type: 'text'; text: string } => part.type === 'text'
      )
      .map(part => part.text)
      .join('');
  },
  async () => {
    await nextTick();
    scrollToBottom();
  }
);

watch(
  () => [
    messages.value,
    selectedModel.value,
    selectedProvider.value,
    showReasoning.value,
  ],
  () => {
    if (!messages.value.length || isHydratingHistory.value) {
      return;
    }

    persistConversation();
  },
  { deep: true }
);

const promptCards = computed(() => {
  const contextualPrompt = selectedContext.value.promptSuggestion;

  return [
    contextualPrompt,
    'Summarize the current schema and highlight the tables that matter most.',
    'Suggest safe next steps for debugging a slow database query.',
    'Write a query plan for the report I need before generating SQL.',
  ].filter((item): item is string => !!item);
});

const schemaBadge = computed(() => {
  if (!schemaStats.value.tableCount) {
    return 'No schema context';
  }

  return `${schemaStats.value.name} · ${schemaStats.value.tableCount} tables`;
});

const historyBadge = computed(() => {
  if (!activeHistoryId.value || !activeHistory.value) {
    return 'New thread';
  }

  return `Resuming ${activeHistory.value.title}`;
});
</script>

<template>
  <section
    class="relative h-full w-full bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),transparent_40%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]"
  >
    <div class="absolute inset-0 flex flex-col overflow-hidden">
      <header
        class="border-b border-border/70 bg-background/85 backdrop-blur-sm"
      >
        <div
          class="mx-auto flex w-full flex-col gap-4 px-3 py-2 lg:flex-row lg:items-start lg:justify-between"
        >
          <div
            class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          >
            <Badge variant="outline">
              {{ schemaBadge }}
            </Badge>
            <Badge variant="outline">
              {{ historyBadge }}
            </Badge>
            <Badge variant="outline"> {{ sectionCounts.rules }} rules </Badge>
            <Badge variant="outline"> {{ sectionCounts.skills }} skills </Badge>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="xs" @click="handleNewThread">
              <Icon name="hugeicons:plus-sign" class="mr-2 size-4" />
              New Thread
            </Button>
          </div>
        </div>
      </header>

      <div
        ref="messagesContainer"
        class="flex-1 overflow-y-auto min-h-0"
        @scroll="handleScroll"
      >
        <div
          class="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-8"
        >
          <AgentSetupCard
            v-if="!hasApiKey"
            class="my-auto"
            :current-provider="currentProvider"
          />

          <template v-else-if="renderedMessages.length === 0">
            <div class="mx-auto my-auto w-full max-w-3xl py-8 text-center">
              <div
                class="mx-auto mb-5 flex size-16 items-center justify-center rounded-[1.75rem] border border-border/70 bg-background/85 shadow-sm"
              >
                <Icon name="hugeicons:ai-chat-02" class="size-7 text-primary" />
              </div>

              <h2 class="text-3xl font-semibold tracking-tight">
                Ask the agent anything about this database
              </h2>
              <p
                class="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground"
              >
                Start from a question, a report idea, or a workflow from the
                workspace tree. The agent keeps schema context in view and can
                continue old conversations from chat history.
              </p>

              <div class="mt-8 grid gap-3 sm:grid-cols-2">
                <Button
                  v-for="prompt in promptCards"
                  :key="prompt"
                  variant="outline"
                  class="h-auto min-h-16 justify-start rounded-2xl px-4 py-3 text-left whitespace-normal"
                  @click="handleQuickAction(prompt)"
                >
                  {{ prompt }}
                </Button>
              </div>
            </div>
          </template>

          <div v-else class="w-full space-y-4 pb-6">
            <AgentMessageBubble
              v-for="message in renderedMessages"
              :key="message.id"
              :message="message"
              :get-tool-component="getComponent"
              :show-reasoning="showReasoning"
              :is-streaming="
                isLoading &&
                message.role === 'assistant' &&
                message.id === renderedMessages.at(-1)?.id
              "
              @approval="handleApproval"
              @edit="handleEditMessage"
            />

            <!-- Thinking indicator -->
            <div
              class="flex items-center gap-1 py-2"
              v-if="
                isLoading &&
                (!renderedMessages.at(-1)?.blocks ||
                  renderedMessages.at(-1)?.blocks?.length === 0 ||
                  renderedMessages.at(-1)?.role === 'user')
              "
            >
              <div
                class="flex size-7 shrink-0 items-center justify-center rounded-2xl border bg-background/80 text-primary shadow-sm"
              >
                <img src="public/logo.png" class="w-7 rounded-full" />
              </div>

              <div
                class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <span>Thinking</span>
                <span class="inline-flex gap-0.5">
                  <span class="animate-bounce [animation-delay:0ms]">.</span>
                  <span class="animate-bounce [animation-delay:150ms]">.</span>
                  <span class="animate-bounce [animation-delay:300ms]">.</span>
                </span>
              </div>
            </div>

            <!-- Error block -->
            <div
              v-if="error"
              class="mt-4 overflow-hidden rounded-2xl border border-destructive/15 bg-destructive/5 backdrop-blur-sm"
            >
              <div class="flex items-start gap-3 px-4 py-3">
                <div
                  class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive/10"
                >
                  <Icon
                    name="lucide:alert-triangle"
                    class="size-3.5 text-destructive/90"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-destructive/70"
                  >
                    Error
                  </p>
                  <p class="mt-0.5 text-sm leading-relaxed text-destructive">
                    {{ error }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AgentChatFooter
        ref="footerRef"
        v-model="messageInput"
        v-model:provider="selectedProvider"
        v-model:model="selectedModel"
        :is-loading="isLoading"
        :has-api-key="hasApiKey"
        :show-reasoning="showReasoning"
        :show-scroll-button="showScrollButton"
        @submit="handleSubmit"
        @keydown="handleKeyDown"
        @update:show-reasoning="showReasoning = $event"
        @scroll-to-bottom="scrollToBottom(true)"
      />
    </div>
  </section>
</template>
