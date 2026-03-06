import { nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiChat } from '~/core/composables/useAiChat';
import { AI_PROVIDERS } from '~/core/constants/agent';

const { sendMessageMock, latestChat, chatSeed, storeSeed } = vi.hoisted(() => ({
  sendMessageMock: vi.fn(),
  latestChat: { instance: null as any },
  chatSeed: {
    status: 'ready' as 'ready' | 'streaming' | 'error',
    error: null as null | { message: string },
    messages: [] as Array<{ text: string }>,
  },
  storeSeed: {
    agentSelectedProvider: 'google',
    agentSelectedModel: 'gemini-2.5-flash',
    agentApiKeyConfigs: {
      openai: '',
      google: 'google-key',
      anthropic: '',
      xai: '',
    },
  },
}));

vi.mock('ai', () => ({
  DefaultChatTransport: vi.fn().mockImplementation(function (
    this: any,
    options: any
  ) {
    Object.assign(this, options);
  }),
}));

vi.mock('@ai-sdk/vue', () => ({
  Chat: class ChatMock {
    messages = [...chatSeed.messages];
    status = chatSeed.status;
    error = chatSeed.error;

    constructor() {
      latestChat.instance = this;
    }

    sendMessage(payload: { text: string }) {
      sendMessageMock(payload);
    }
  },
}));

vi.mock('~/core/stores/appLayoutStore', () => ({
  useAppLayoutStore: vi.fn(() => storeSeed),
}));

describe('useAiChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    chatSeed.status = 'ready';
    chatSeed.error = null;
    chatSeed.messages = [];

    storeSeed.agentSelectedProvider = 'google';
    storeSeed.agentSelectedModel = 'gemini-2.5-flash';
    storeSeed.agentApiKeyConfigs = {
      openai: '',
      google: 'google-key',
      anthropic: '',
      xai: '',
    };
  });

  it('initializes selected provider from store', () => {
    const { selectedProvider } = useAiChat();
    expect(selectedProvider.value).toBe('google');
  });

  it('initializes selected model from store', () => {
    const { selectedModel } = useAiChat();
    expect(selectedModel.value).toBe('gemini-2.5-flash');
  });

  it('derives current provider config from selected provider', () => {
    const { currentProvider } = useAiChat();
    expect(currentProvider.value.id).toBe('google');
    expect(currentProvider.value.name).toBe('Google Gemini');
  });

  it('exposes models for selected provider', () => {
    const { models } = useAiChat();
    expect(models.value.length).toBeGreaterThan(0);
    expect(models.value[0]).toHaveProperty('id');
  });

  it('reports hasApiKey true when provider key exists', () => {
    const { hasApiKey } = useAiChat();
    expect(hasApiKey.value).toBe(true);
  });

  it('reports hasApiKey false when switching to provider without key', async () => {
    const { selectedProvider, hasApiKey } = useAiChat();

    selectedProvider.value = 'openai';
    await nextTick();

    expect(hasApiKey.value).toBe(false);
  });

  it('sendMessage sends when text exists, key exists, and status is ready', () => {
    const { sendMessage } = useAiChat();

    sendMessage('Explain this query');

    expect(sendMessageMock).toHaveBeenCalledWith({
      text: 'Explain this query',
    });
  });

  it('sendMessage ignores blank message', () => {
    const { sendMessage } = useAiChat();

    sendMessage('   ');

    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('sendMessage ignores when api key is missing', async () => {
    const { selectedProvider, sendMessage } = useAiChat();
    selectedProvider.value = 'openai';
    await nextTick();

    sendMessage('Run query');

    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('sendMessage ignores when chat is loading', () => {
    chatSeed.status = 'streaming';
    const { sendMessage } = useAiChat();

    sendMessage('Run query');

    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('resets invalid selected model when provider changes', async () => {
    const { selectedProvider, selectedModel } = useAiChat();

    selectedModel.value = 'non-existing-model';
    selectedProvider.value = 'openai';
    await nextTick();

    const firstOpenAiModel = AI_PROVIDERS.find(p => p.id === 'openai')
      ?.models[0]?.id;
    expect(selectedModel.value).toBe(firstOpenAiModel);
  });

  it('clears chat messages', () => {
    chatSeed.messages = [{ text: 'first' }, { text: 'second' }];
    const { messages, clearChat } = useAiChat();

    expect(messages.value.length).toBe(2);

    clearChat();

    expect(messages.value.length).toBe(0);
    expect(latestChat.instance.messages.length).toBe(0);
  });
});
