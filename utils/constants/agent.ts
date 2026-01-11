import { type AIProvider } from '~/shared/stores/appLayoutStore';

export interface ModelConfig {
  id: string;
  name: string;
}

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  keyLabel: string;
  keyUrl: string;
  models: ModelConfig[];
}

export const AI_PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    keyLabel: 'OpenAI API Key',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    keyLabel: 'Google AI API Key',
    keyUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    keyLabel: 'Anthropic API Key',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ],
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    keyLabel: 'xAI API Key',
    keyUrl: 'https://console.x.ai',
    models: [
      { id: 'grok-3', name: 'Grok 3' },
      { id: 'grok-3-fast', name: 'Grok 3 Fast' },
      { id: 'grok-2', name: 'Grok 2' },
    ],
  },
];
