<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import ModelSelector from '~/components/modules/selectors/ModelSelector.vue';
import { useAgentChat } from '../hooks/useAgentChat';
import AgentEmptyState from './AgentEmptyState.vue';
import AgentMessageItem from './AgentMessageItem.vue';

const {
  selectedProvider,
  selectedModel,
  isLoading,
  error,
  messages,
  hasApiKey,
  currentProvider,
  sendMessage,
  clearChat,
  schemaContext,
} = useAgentChat();

const messageInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

const handleSubmit = async (e: Event) => {
  e.preventDefault();
  if (!messageInput.value.trim() || isLoading.value) return;

  const text = messageInput.value;
  messageInput.value = '';
  await sendMessage(text);

  await nextTick();
  scrollToBottom();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit(e);
  }
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Auto-scroll on new messages
watch(
  () => messages.value.length,
  () => nextTick(() => scrollToBottom())
);

// Auto-scroll during streaming
watch(
  () => {
    const lastMsg = messages.value[messages.value.length - 1];
    if (!lastMsg?.parts) return '';
    return lastMsg.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
  },
  () => nextTick(() => scrollToBottom())
);

const quickActions = [
  { label: 'Describe tables', text: 'Describe all tables in this database' },
  { label: 'Find slow queries', text: 'Help me find potential slow queries' },
  {
    label: 'Generate report',
    text: 'Generate a summary report of the database structure',
  },
];

const handleQuickAction = async (text: string) => {
  await sendMessage(text);
  await nextTick();
  scrollToBottom();
};
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-2 py-1.5 border-b">
      <div class="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger as-child>
            <div>
              <ModelSelector
                v-model:provider="selectedProvider"
                v-model:model="selectedModel"
                class="min-w-[140px] h-6!"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Select AI Model</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="xs"
            @click="clearChat"
            :disabled="messages.length === 0"
          >
            <Icon name="lucide:trash-2" class="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Clear chat</p>
        </TooltipContent>
      </Tooltip>
    </div>

    <!-- Schema context indicator -->
    <div
      v-if="schemaContext"
      class="px-2 py-1 border-b bg-muted/30 text-[11px] text-muted-foreground flex items-center gap-1 truncate"
    >
      <Icon name="hugeicons:database" class="size-3 shrink-0" />
      <span class="truncate">{{ schemaContext }}</span>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="mx-2 mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-center gap-1.5"
    >
      <Icon name="lucide:alert-circle" class="size-3.5 shrink-0" />
      {{ error }}
    </div>

    <!-- No API key -->
    <AgentEmptyState v-if="!hasApiKey" :current-provider="currentProvider" />

    <!-- Chat area -->
    <template v-else>
      <div ref="messagesContainer" class="flex-1 overflow-y-auto px-2 py-3">
        <!-- Empty state -->
        <div v-if="messages.length === 0" class="text-center py-8">
          <Icon
            name="hugeicons:ai-chat-02"
            class="size-10 mb-2 opacity-40 mx-auto"
          />
          <p class="text-sm text-muted-foreground mb-1">DB Agent</p>
          <p class="text-xs text-muted-foreground mb-4">
            Ask questions about your database
          </p>
          <div class="flex flex-col gap-1.5 px-4">
            <Button
              v-for="action in quickActions"
              :key="action.text"
              variant="outline"
              size="sm"
              class="text-xs w-full justify-start"
              @click="handleQuickAction(action.text)"
            >
              {{ action.label }}
            </Button>
          </div>
        </div>

        <!-- Messages -->
        <div v-else class="space-y-3">
          <AgentMessageItem
            v-for="message in messages"
            :key="message.id"
            :message="message"
          />

          <!-- Loading indicator -->
          <div
            v-if="
              isLoading &&
              (!messages[messages.length - 1]?.parts ||
                messages[messages.length - 1]?.parts?.length === 0)
            "
            class="flex gap-2"
          >
            <div
              class="shrink-0 size-6 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Icon
                name="lucide:loader"
                class="size-3.5 text-primary animate-spin"
              />
            </div>
            <div class="bg-muted rounded-lg px-3 py-2 text-sm">
              <span class="text-muted-foreground">Thinking...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="px-2 pb-2">
        <form @submit.prevent="handleSubmit" class="relative">
          <Textarea
            v-model="messageInput"
            placeholder="Ask about your database..."
            :disabled="isLoading"
            class="min-h-[40px]! max-h-[120px] pr-10 resize-none text-sm"
            @keydown="handleKeyDown"
          />
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                type="submit"
                size="iconSm"
                class="absolute right-2 bottom-2 rounded-full"
                :disabled="!messageInput.trim() || isLoading"
              >
                <Icon
                  :name="isLoading ? 'lucide:loader' : 'lucide:arrow-up'"
                  :class="['size-4', isLoading ? 'animate-spin' : '']"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Send message</p>
            </TooltipContent>
          </Tooltip>
        </form>
      </div>
    </template>
  </div>
</template>
