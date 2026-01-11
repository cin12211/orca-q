<script setup lang="ts">
import ModelSelector from '~/components/modules/selectors/ModelSelector.vue';
import { useAiChat } from '~/composables/useAiChat';
import { useSettingsModal } from '~/shared/contexts/useSettingsModal';
import type { ExecutedResultItem } from '../../hooks/useRawQueryEditor';

const props = defineProps<{
  activeTab: ExecutedResultItem;
}>();

// SQL context from the active tab
const sqlContext = computed(() => props.activeTab.metadata.statementQuery);

// AI Chat composable (with multi-provider support)
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
} = useAiChat(sqlContext);

// Settings modal control
const { openSettings } = useSettingsModal();

// Input for new message
const messageInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

// Send message handler
const handleSubmit = async (e: Event) => {
  e.preventDefault();
  if (!messageInput.value.trim() || isLoading.value) return;

  const text = messageInput.value;
  messageInput.value = '';
  await sendMessage(text);

  // Scroll to bottom after sending
  await nextTick();
  scrollToBottom();
};

// Scroll to bottom of messages
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Auto-scroll when messages change
watch(
  () => messages.value.length,
  () => {
    nextTick(() => scrollToBottom());
  }
);

// Also scroll when last message parts changes (streaming)
watch(
  () => {
    const lastMsg = messages.value[messages.value.length - 1];
    if (!lastMsg?.parts) return '';
    return lastMsg.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
  },
  () => {
    nextTick(() => scrollToBottom());
  }
);

// Quick action handlers
const handleQuickAction = async (text: string) => {
  await sendMessage(text);
  await nextTick();
  scrollToBottom();
};
</script>

<template>
  <div class="h-full flex flex-col p-2">
    <!-- Header with Clear Chat only -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon name="hugeicons:chat-bot" class="size-4" />
        <span>SQL Assistant</span>

        <div>
          <ModelSelector
            v-model:provider="selectedProvider"
            v-model:model="selectedModel"
            class="min-w-[160px] h-6!"
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="h-7 px-2"
        @click="clearChat"
        :disabled="messages.length === 0"
      >
        <Icon name="lucide:trash-2" class="size-3.5" />
      </Button>
    </div>

    <!-- SQL Context Preview -->
    <div
      v-if="sqlContext"
      class="mb-3 p-2 bg-muted/50 rounded-md border text-xs"
    >
      <div class="text-muted-foreground mb-1 flex items-center gap-1">
        <Icon name="hugeicons:sql" class="size-3" />
        Current Query Context:
      </div>
      <code class="text-[11px] line-clamp-2">{{ sqlContext }}</code>
    </div>

    <!-- Error Display -->
    <div
      v-if="error"
      class="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600"
    >
      <div class="flex items-center gap-2">
        <Icon name="lucide:alert-circle" class="size-4" />
        {{ error }}
      </div>
    </div>

    <!-- No API Key Warning -->
    <div
      v-if="!hasApiKey"
      class="flex-1 flex items-center justify-center text-muted-foreground"
    >
      <div class="text-center">
        <Icon name="lucide:key" class="size-12 mb-3 opacity-50 mx-auto" />
        <p class="text-sm mb-1">
          No API key configured for {{ currentProvider.name }}
        </p>
        <p class="text-xs text-muted-foreground mb-3">
          Configure your API keys in Settings → Agent
        </p>
        <Button
          variant="outline"
          size="sm"
          class="text-xs"
          @click="openSettings('Agent')"
        >
          <Icon name="lucide:settings" class="size-4 mr-1" />
          Open Settings
        </Button>
      </div>
    </div>

    <!-- Chat Messages -->
    <div
      v-else
      ref="messagesContainer"
      class="flex-1 overflow-y-auto space-y-4 mb-4"
    >
      <div v-if="messages.length === 0" class="text-center py-8">
        <Icon
          name="hugeicons:ai-chat-02"
          class="size-12 mb-2 opacity-50 mx-auto"
        />
        <p class="text-sm text-muted-foreground">
          Ask me anything about your SQL query
        </p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            class="text-xs h-6"
            @click="handleQuickAction('Explain this query')"
          >
            Explain this query
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="text-xs h-6"
            @click="handleQuickAction('How can I optimize this query?')"
          >
            Optimize query
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="text-xs h-6"
            @click="
              handleQuickAction('What are potential issues with this query?')
            "
          >
            Find issues
          </Button>
        </div>
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        :class="[
          'flex gap-3',
          message.role === 'user' ? 'justify-end' : 'justify-start',
        ]"
      >
        <div
          :class="[
            'max-w-[80%] rounded-lg p-3 text-sm',
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted',
          ]"
        >
          <!-- User message: render text parts -->
          <template v-if="message.role === 'user'">
            <template v-for="(part, pIdx) in message.parts" :key="pIdx">
              <span v-if="part.type === 'text'" class="whitespace-pre-wrap">{{
                part.text
              }}</span>
            </template>
          </template>

          <!-- AI message: render text parts -->
          <div
            v-else
            class="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100"
          >
            <template v-for="(part, pIdx) in message.parts" :key="pIdx">
              <span v-if="part.type === 'text'" class="whitespace-pre-wrap">{{
                part.text
              }}</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Loading indicator -->
      <div
        v-if="
          isLoading &&
          (!messages[messages.length - 1]?.parts ||
            messages[messages.length - 1]?.parts?.length === 0)
        "
        class="flex gap-3"
      >
        <div class="bg-muted rounded-lg p-3 text-sm">
          <div class="flex items-center gap-2">
            <Icon name="lucide:loader-2" class="size-4 animate-spin" />
            <span class="text-muted-foreground">Thinking...</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="hasApiKey" class="flex flex-col gap-2">
      <form @submit="handleSubmit" class="flex gap-2 relative">
        <Textarea
          v-model="messageInput"
          placeholder="Ask about your SQL query..."
          :disabled="isLoading"
          class="min-h-4!"
        />
        <Button
          type="submit"
          size="iconSm"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
          :disabled="!messageInput.trim() || isLoading"
        >
          <Icon
            :name="isLoading ? 'lucide:loader-2' : 'lucide:arrow-up'"
            :class="['size-4', isLoading ? 'animate-spin' : '']"
          />
        </Button>
      </form>
    </div>
  </div>
</template>
