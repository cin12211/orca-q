<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  provide,
  watch,
} from 'vue';
import { ScrambleText } from '#components';
import { type AIProvider } from '~/core/stores/appLayoutStore';
import AgentAttachmentPanel from './components/AgentAttachmentPanel.vue';
import AgentChatFooter from './components/AgentChatFooter.vue';
import AgentMessageBubble from './components/AgentMessageBubble.vue';
import AgentSetupCard from './components/AgentSetupCard.vue';
import AgentWelcomePanel from './components/AgentWelcomePanel.vue';
import ResponseNavigator from './components/response-navigator/ResponseNavigator.vue';
import type { ResponseNavigatorItem } from './components/response-navigator/types';
import ExportPreviewPanel from './components/tool-message/ExportPreviewPanel.vue';
import type { AgentCommandOptionId } from './constants/command-options';
import { useAgentChat } from './hooks/useDbAgentChat';
import { useAgentRenderer } from './hooks/useDbAgentRenderer';
import { useAgentWorkspace } from './hooks/useDbAgentWorkspace';
import type { DbAgentMessage } from './types';
import type { AgentExportFileResult } from './types';

const activeExportPreview = ref<AgentExportFileResult | null>(null);
provide('activeExportPreview', activeExportPreview);

const {
  activeHistory,
  histories,
  showAttachmentPanel,
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
  stopStream,
} = useAgentChat(showReasoning);

const { renderedMessages, getComponent } = useAgentRenderer(messages);

const messageInput = ref('');
const selectedCommandOptions = ref<AgentCommandOptionId[]>([]);
const messagesContainer = ref<HTMLElement | null>(null);
const footerRef = ref<InstanceType<typeof AgentChatFooter> | null>(null);
const isHydratingHistory = ref(false);
const lastLoadedHistoryId = ref<string | null>(null);

const cloneMessages = (value: DbAgentMessage[]) =>
  JSON.parse(JSON.stringify(value)) as DbAgentMessage[];

const showScrollButton = ref(false);
const highlightedResponseId = ref<string | null>(null);
const currentResponseIndex = ref(0);
const responseElements = ref<Record<string, HTMLElement | null>>({});
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  showAttachmentPanel,
  nextValue => {
    if (nextValue) {
      activeExportPreview.value = null;
    }
  },
  { immediate: true }
);

watch(activeExportPreview, nextValue => {
  if (nextValue) {
    showAttachmentPanel.value = false;
  }
});

const navigableResponses = computed<ResponseNavigatorItem[]>(() =>
  renderedMessages.value.flatMap(message => {
    if (message.role !== 'assistant') return [];

    const previewText = (message.blocks ?? [])
      .map(b => {
        if (
          b.kind === 'text' ||
          b.kind === 'markdown' ||
          b.kind === 'reasoning'
        )
          return (b as any).content;
        return '';
      })
      .filter(Boolean)
      .join(' ')
      .trim()
      .replace(/\s+/g, ' ');

    return [
      {
        id: message.id,
        type: 'message',
        element: responseElements.value[message.id] ?? null,
        preview:
          previewText.length > 80
            ? previewText.slice(0, 80) + '...'
            : previewText || 'Thinking...',
      } satisfies ResponseNavigatorItem,
    ];
  })
);

const setResponseElement = (responseId: string, element: Element | null) => {
  if (element instanceof HTMLElement) {
    responseElements.value[responseId] = element;
    return;
  }

  delete responseElements.value[responseId];
};

const updateActiveResponseIndex = () => {
  if (!messagesContainer.value || navigableResponses.value.length === 0) {
    currentResponseIndex.value = 0;
    return;
  }

  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  if (scrollHeight - scrollTop - clientHeight < 50) {
    currentResponseIndex.value = navigableResponses.value.length - 1;
    return;
  }

  const containerTop = messagesContainer.value.getBoundingClientRect().top;
  let nextIndex = 0;

  navigableResponses.value.forEach((response, index) => {
    const top =
      (response.element?.getBoundingClientRect().top ?? Infinity) -
      containerTop;

    if (top <= 150) {
      nextIndex = index;
    }
  });

  currentResponseIndex.value = nextIndex;
};

const handleScroll = () => {
  if (!messagesContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  showScrollButton.value = scrollHeight - scrollTop - clientHeight > 150;
  updateActiveResponseIndex();
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
  const nextSelectedCommandOptions = [...selectedCommandOptions.value];
  messageInput.value = '';
  selectedCommandOptions.value = [];
  sendMessage(nextMessage, nextSelectedCommandOptions);

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

const handleStop = () => {
  stopStream();
};

const handleNewThread = () => {
  startNewChat();
  selectedCommandOptions.value = [];
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

const handleNavigateResponse = (index: number) => {
  const target = navigableResponses.value[index];
  if (!target?.element) {
    return;
  }

  currentResponseIndex.value = index;
  highlightedResponseId.value = target.id;

  if (highlightTimer) {
    clearTimeout(highlightTimer);
  }

  highlightTimer = setTimeout(() => {
    highlightedResponseId.value = null;
  }, 250);

  if (!messagesContainer.value) return;

  const container = messagesContainer.value;
  const targetTop = target.element.getBoundingClientRect().top;
  const containerTop = container.getBoundingClientRect().top;
  const currentScrollTop = container.scrollTop;

  container.scrollTo({
    top: currentScrollTop + (targetTop - containerTop) - 24, // Add a bit of padding to the top
    behavior: 'smooth',
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
    updateActiveResponseIndex();
  }
);

watch(
  () => {
    const lastMessage = messages.value.at(-1);
    if (!lastMessage?.parts) {
      return '';
    }

    return lastMessage.parts
      .map(part => {
        if (part.type === 'text' || part.type === 'reasoning') {
          return (part as any).text || '';
        }
        return JSON.stringify(part);
      })
      .join('');
  },
  async () => {
    await nextTick();
    scrollToBottom();
    updateActiveResponseIndex();
  }
);

watch(
  () =>
    renderedMessages.value.flatMap(message =>
      message.role !== 'assistant' ? [] : [message.id]
    ),
  ids => {
    const nextElements: Record<string, HTMLElement | null> = {};

    for (const id of ids) {
      if (responseElements.value[id]) {
        nextElements[id] = responseElements.value[id];
      }
    }

    responseElements.value = nextElements;
  }
);

onBeforeUnmount(() => {
  if (highlightTimer) {
    clearTimeout(highlightTimer);
  }
});

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

const firstMessage = computed(
  () => (messages.value[0].parts[0] as { text: string }).text
);

const handleQuizSubmit = async (text: string) => {
  await sendMessage(text);
  await nextTick();
  scrollToBottom();
};

const promptCards = computed(() => {
  return [
    'Summarize the current schema and highlight the tables that matter most.',
    'Suggest safe next steps for debugging a slow database query.',
    'Write a query plan for the report I need before generating SQL.',
  ].filter((item): item is string => !!item);
});
</script>

<template>
  <section
    class="relative h-full w-full bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),transparent_40%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]"
  >
    <ResizablePanelGroup direction="horizontal" class="h-full w-full">
      <ResizablePanel
        :default-size="activeExportPreview || showAttachmentPanel ? 60 : 100"
        class="h-full relative"
      >
        <div class="absolute inset-0 flex flex-col overflow-hidden">
          <div
            class="mx-auto shadow-xs flex w-full flex-col gap-4 px-3 py-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div
              class="flex flex-wrap items-center gap-2 truncate text-sm leading-4 font-medium text-foreground"
            >
              <Icon name="hugeicons:chatting-01" class="size-4! shrink-0" />
              {{ firstMessage }}
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                class="h-6.5 text-xs px-2"
                @click="showAttachmentPanel = !showAttachmentPanel"
              >
                Attachment <Icon name="hugeicons:attachment" class="size-3" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                class="h-6.5 text-xs px-2"
                @click="handleNewThread"
              >
                New Thread <Icon name="hugeicons:plus-sign" class="size-3" />
              </Button>
            </div>
          </div>

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
                <AgentWelcomePanel
                  :prompt-cards="promptCards"
                  :thread-count="histories.length"
                  @prompt="handleQuickAction"
                />
              </template>

              <div v-else class="w-full pb-6">
                <div class="space-y-4">
                  <div v-for="message in renderedMessages" :key="message.id">
                    <AgentMessageBubble
                      :message="message"
                      :get-tool-component="getComponent"
                      :show-reasoning="showReasoning"
                      :highlighted-response-id="highlightedResponseId"
                      :register-message-element="setResponseElement"
                      :is-streaming="
                        isLoading &&
                        message.role === 'assistant' &&
                        message.id === renderedMessages.at(-1)?.id
                      "
                      @approval="handleApproval"
                      @edit="handleEditMessage"
                      @quiz-submit="handleQuizSubmit"
                    />
                  </div>
                </div>

                <!-- <div
                  v-if="
                    isLoading &&
                    (!renderedMessages.at(-1)?.blocks ||
                      renderedMessages.at(-1)?.blocks?.length === 0 ||
                      renderedMessages.at(-1)?.role === 'user')
                  "
                  class="flex items-center gap-1 py-2"
                >
                  <div
                    class="flex size-7 shrink-0 items-center justify-center rounded-2xl border shadow-sm agent-thinking-animation"
                  >
                    <img src="public/logo.png" class="w-7 rounded-full" />
                  </div>

                  <div class="text-xs font-medium text-muted-foreground">
                    <Shimmer>Thinking</Shimmer>
                  </div>
                </div> -->

                <div v-if="isLoading" class="flex gap-1 items-center mt-2">
                  <img
                    class="size-7"
                    src="@/assets/logo-8-bits.svg"
                    alt="Logo"
                  />

                  <div class="text-sm font-medium text-muted-foreground">
                    <Shimmer> Thinking...</Shimmer>
                  </div>
                </div>

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
                      <p
                        class="mt-0.5 text-sm leading-relaxed text-destructive"
                      >
                        {{ error }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ResponseNavigator
            v-if="navigableResponses.length > 0"
            :responses="navigableResponses"
            :current-index="currentResponseIndex"
            @navigate="handleNavigateResponse"
          />

          <AgentChatFooter
            ref="footerRef"
            v-model="messageInput"
            v-model:provider="selectedProvider"
            v-model:model="selectedModel"
            v-model:selected-command-options="selectedCommandOptions"
            :is-loading="isLoading"
            :has-api-key="hasApiKey"
            :show-reasoning="showReasoning"
            :show-scroll-button="showScrollButton"
            @submit="handleSubmit"
            @stop="handleStop"
            @keydown="handleKeyDown"
            @update:show-reasoning="showReasoning = $event"
            @scroll-to-bottom="scrollToBottom(true)"
          />
        </div>
      </ResizablePanel>

      <template v-if="activeExportPreview || showAttachmentPanel">
        <ResizableHandle
          with-handle
          class="[&[data-state=hover]]:bg-primary/30! [&[data-state=drag]]:bg-primary/20!"
        />
        <ResizablePanel
          :min-size="20"
          :max-size="60"
          :default-size="30"
          class="h-full relative"
        >
          <ExportPreviewPanel
            v-if="activeExportPreview"
            :result="activeExportPreview"
            @close="activeExportPreview = null"
          />
          <AgentAttachmentPanel
            v-else-if="showAttachmentPanel"
            :messages="renderedMessages"
            @close="showAttachmentPanel = false"
          />
        </ResizablePanel>
      </template>
    </ResizablePanelGroup>
  </section>
</template>
