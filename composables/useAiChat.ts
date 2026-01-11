import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport } from 'ai';
import {
  useAppLayoutStore,
  type AIProvider,
} from '~/shared/stores/appLayoutStore';
import { AI_PROVIDERS } from '~/utils/constants/agent';

/**
 * Composable for AI chat functionality using Vercel AI SDK
 * Supports multiple providers: OpenAI, Google, Anthropic, xAI
 * Uses global settings from appLayoutStore for API keys and initial provider/model
 * NOTE: Provider/model selection is LOCAL to this instance - not synced back to global config
 */
export function useAiChat(sqlContext?: Ref<string | undefined>) {
  const appLayoutStore = useAppLayoutStore();

  // Provider and model selection (LOCAL state, initialized from global settings)
  // Changes here do NOT sync back to global config
  const selectedProvider = ref<AIProvider>(
    appLayoutStore.agentSelectedProvider
  );
  const selectedModel = ref<string>(appLayoutStore.agentSelectedModel);

  // Get current provider config
  const currentProvider = computed(() => {
    return (
      AI_PROVIDERS.find(p => p.id === selectedProvider.value) || AI_PROVIDERS[0]
    );
  });

  // Get models for current provider
  const models = computed(() => {
    return currentProvider.value.models;
  });

  // Get API key for current provider from store (API keys stay in global config)
  const currentApiKey = computed(() => {
    return appLayoutStore.agentApiKeyConfigs[selectedProvider.value] || '';
  });

  // Check if has API key for current provider
  const hasApiKey = computed(() => {
    return !!currentApiKey.value;
  });

  // Build system prompt with SQL context
  const buildSystemPrompt = () => {
    const sql = sqlContext?.value;
    return `You are a helpful SQL assistant for database developers. You help analyze, explain, debug, and optimize SQL queries.

${
  sql
    ? `The user is currently working with this SQL query:

\`\`\`sql
${sql}
\`\`\`

Please provide helpful insights, explanations, or suggestions based on the user's questions about this query.`
    : 'The user may ask you questions about SQL queries, database concepts, or need help writing queries.'
}

Be concise but thorough. Use markdown formatting for code blocks and lists when appropriate.`;
  };

  // Create Chat instance with dynamic transport configuration
  const chat = new Chat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      body: () => ({
        provider: selectedProvider.value,
        model: selectedModel.value,
        apiKey: currentApiKey.value,
        systemPrompt: buildSystemPrompt(),
      }),
    }),
  });

  // Expose chat state as computed refs for reactivity
  const messages = computed(() => chat.messages);
  const isLoading = computed(
    () => chat.status !== 'ready' && chat.status !== 'error'
  );
  const error = computed(() => chat.error?.message ?? null);

  // Watch provider changes to reset model if needed
  watch(selectedProvider, newProvider => {
    // Check if current model is valid for new provider
    const providerModels = AI_PROVIDERS.find(p => p.id === newProvider)?.models;
    if (
      providerModels &&
      !providerModels.some(m => m.id === selectedModel.value)
    ) {
      // Reset to first model of new provider
      selectedModel.value = providerModels[0]?.id || '';
    }
  });

  // Send message using the Chat instance
  const sendMessage = (text: string) => {
    if (!text.trim() || !hasApiKey.value || isLoading.value) return;
    chat.sendMessage({ text });
  };

  // Clear chat history
  const clearChat = () => {
    chat.messages.splice(0, chat.messages.length);
  };

  return {
    // State
    selectedProvider,
    selectedModel,
    isLoading,
    error,
    messages,

    // Computed
    hasApiKey,
    currentProvider,
    currentApiKey,
    models,

    // Methods
    sendMessage,
    clearChat,

    // Constants
    providers: AI_PROVIDERS,
  };
}
