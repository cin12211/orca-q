import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport, type ChatInit, type UIMessage } from 'ai';
import type { AIProvider } from '~/components/modules/settings/types';
import { AI_PROVIDERS } from '~/core/constants/agent';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

type ChatTransportBody = object | (() => object | undefined) | undefined;

interface UseAiChatOptions<UI_MESSAGE extends UIMessage = UIMessage> {
  api?: string;
  body?: ChatTransportBody;
  sendAutomaticallyWhen?: ChatInit<UI_MESSAGE>['sendAutomaticallyWhen'];
}

const resolveTransportBody = (body: ChatTransportBody) => {
  if (!body) {
    return undefined;
  }

  return typeof body === 'function' ? body() : body;
};

/**
 * Composable for AI chat functionality using Vercel AI SDK
 * Supports multiple providers: OpenAI, Google, Anthropic, xAI
 * Uses global settings from appConfigStore for API keys and initial provider/model
 * NOTE: Provider/model selection is LOCAL to this instance - not synced back to global config
 */
export function useAiChat<UI_MESSAGE extends UIMessage = UIMessage>(
  options?: UseAiChatOptions<UI_MESSAGE>
) {
  const appConfigStore = useAppConfigStore();

  const resolvedOptions: UseAiChatOptions<UI_MESSAGE> = options ?? {};

  // Provider and model selection (LOCAL state, initialized from global settings)
  // Changes here do NOT sync back to global config
  const selectedProvider = ref<AIProvider>(
    appConfigStore.agentSelectedProvider
  );
  const selectedModel = ref<string>(appConfigStore.agentSelectedModel);

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
    return appConfigStore.agentApiKeyConfigs[selectedProvider.value] || '';
  });

  // Check if has API key for current provider
  const hasApiKey = computed(() => {
    return !!currentApiKey.value;
  });

  // Create Chat instance with dynamic transport configuration
  const chat = new Chat<UI_MESSAGE>({
    transport: new DefaultChatTransport({
      api: resolvedOptions.api ?? '/api/ai/chat',
      body: () => {
        const extraBody = resolveTransportBody(resolvedOptions.body);

        return {
          ...extraBody,
          provider: selectedProvider.value,
          model: selectedModel.value,
          apiKey: currentApiKey.value,
        };
      },
    }),
    sendAutomaticallyWhen: resolvedOptions.sendAutomaticallyWhen,
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
  const sendMessage = async (text: string) => {
    if (!text.trim() || !hasApiKey.value || isLoading.value) return;
    await chat.sendMessage({ text });
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
    addToolApprovalResponse: chat.addToolApprovalResponse,
    stopStream: chat.stop,
    clearError: chat.clearError,

    // Constants
    providers: AI_PROVIDERS,
  };
}
