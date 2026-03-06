<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import ModelSelector from '~/components/modules/selectors/ModelSelector.vue';
import AgentChatFooter from './components/AgentChatFooter.vue';
import AgentMessageBubble from './components/AgentMessageBubble.vue';
import AgentSetupCard from './components/AgentSetupCard.vue';
import type { DbAgentMessage } from './db-agent.types';
import { useAgentChat } from './hooks/useDbAgentChat';
import { useAgentRenderer } from './hooks/useDbAgentRenderer';
import { useAgentWorkspace } from './hooks/useDbAgentWorkspace';

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
} = useAgentChat();

const {
  selectedContext,
  sectionCounts,
  activeHistory,
  activeHistoryId,
  saveConversation,
  startNewChat,
} = useAgentWorkspace();

const { renderedMessages, getComponent } = useAgentRenderer(messages);

const messageInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const isHydratingHistory = ref(false);
const lastLoadedHistoryId = ref<string | null>(null);

const cloneMessages = (value: DbAgentMessage[]) =>
  JSON.parse(JSON.stringify(value)) as DbAgentMessage[];

const scrollToBottom = () => {
  if (!messagesContainer.value) {
    return;
  }

  messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
};

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

const persistConversation = useDebounceFn(() => {
  if (isHydratingHistory.value || messages.value.length === 0) {
    return;
  }

  saveConversation({
    messages: cloneMessages(messages.value),
    provider: selectedProvider.value,
    model: selectedModel.value,
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
  () => messages.value,
  currentMessages => {
    if (!currentMessages.length || isHydratingHistory.value) {
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
    class="h-full w-full bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),transparent_40%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]"
  >
    <div class="flex h-full flex-col overflow-hidden">
      <header
        class="border-b border-border/70 bg-background/85 backdrop-blur-sm"
      >
        <div
          class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between"
        >
          <div class="space-y-3">
            <div
              class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
            >
              <span class="rounded-full border bg-background px-2.5 py-1">
                {{ schemaBadge }}
              </span>
              <span class="rounded-full border bg-background px-2.5 py-1">
                {{ historyBadge }}
              </span>
              <span class="rounded-full border bg-background px-2.5 py-1">
                {{ sectionCounts.rules }} rules
              </span>
              <span class="rounded-full border bg-background px-2.5 py-1">
                {{ sectionCounts.skills }} skills
              </span>
            </div>

            <div>
              <h1 class="text-2xl font-semibold tracking-tight">
                DB Editor Agent
              </h1>
              <p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Schema-aware chat workspace for database exploration, query
                design, and guided analysis.
              </p>
            </div>

            <div
              class="rounded-[1.5rem] border border-border/70 bg-background/80 px-4 py-3 shadow-sm"
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div
                    v-if="selectedContext.badge"
                    class="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                  >
                    {{ selectedContext.badge }}
                  </div>
                  <div class="mt-1 text-sm font-medium">
                    {{ selectedContext.title }}
                  </div>
                  <p class="mt-1 text-sm leading-6 text-muted-foreground">
                    {{ selectedContext.description }}
                  </p>
                </div>

                <Button
                  v-if="selectedContext.promptSuggestion"
                  variant="outline"
                  size="sm"
                  class="rounded-xl"
                  @click="handleUseContextPrompt"
                >
                  Use Prompt
                </Button>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <Tooltip>
              <TooltipTrigger as-child>
                <div>
                  <ModelSelector
                    v-model:provider="selectedProvider"
                    v-model:model="selectedModel"
                    class="min-w-[180px] h-9!"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Select model</p>
              </TooltipContent>
            </Tooltip>

            <Button
              variant="outline"
              class="rounded-xl"
              @click="handleNewThread"
            >
              <Icon name="lucide:square-pen" class="mr-2 size-4" />
              New Thread
            </Button>
          </div>
        </div>
      </header>

      <div ref="messagesContainer" class="flex-1 overflow-y-auto">
        <div
          class="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-8"
        >
          <div
            v-if="error"
            class="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <div class="flex items-center gap-2">
              <Icon name="lucide:alert-circle" class="size-4" />
              {{ error }}
            </div>
          </div>

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

          <div v-else class="space-y-6 pb-10">
            <AgentMessageBubble
              v-for="message in renderedMessages"
              :key="message.id"
              :message="message"
              :get-tool-component="getComponent"
              @approval="handleApproval"
            />

            <div
              v-if="
                isLoading &&
                (!messages.at(-1)?.parts ||
                  messages.at(-1)?.parts?.length === 0)
              "
              class="flex justify-start"
            >
              <div class="flex max-w-3xl gap-3">
                <div
                  class="mt-1 flex size-8 shrink-0 items-center justify-center rounded-2xl border bg-background/80 text-primary shadow-sm"
                >
                  <Icon name="hugeicons:ai-chat-02" class="size-4" />
                </div>

                <div
                  class="rounded-3xl border bg-background/85 px-4 py-3 text-sm text-muted-foreground shadow-sm"
                >
                  <div class="flex items-center gap-2">
                    <Icon name="lucide:loader" class="size-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AgentChatFooter
        v-model="messageInput"
        v-model:provider="selectedProvider"
        v-model:model="selectedModel"
        :is-loading="isLoading"
        :has-api-key="hasApiKey"
        @submit="handleSubmit"
        @keydown="handleKeyDown"
        @scroll-to-bottom="scrollToBottom"
      />
    </div>
  </section>
</template>
