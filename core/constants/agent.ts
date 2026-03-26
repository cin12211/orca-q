import { AIProvider } from '~/components/modules/settings/types';

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
    id: AIProvider.Google,
    name: 'Google Generative AI',
    keyLabel: 'Google AI API Key',
    keyUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ],
  },
  {
    id: AIProvider.OpenRouter,
    name: 'Open Router',
    keyLabel: 'OpenRouter API Key',
    keyUrl: 'https://openrouter.ai/settings/keys',
    models: [
      {
        id: 'stepfun/step-3.5-flash:free',
        name: 'StepFun: Step 3.5 Flash',
      },
    ],
  },
  {
    id: AIProvider.Anthropic,
    name: 'Anthropic Claude',
    keyLabel: 'Anthropic API Key',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-5', name: 'Claude Opus 4.5' },
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
      { id: 'claude-opus-4-1', name: 'Claude Opus 4.1' },
      { id: 'claude-sonnet-4-0', name: 'Claude Sonnet 4.0' },
    ],
  },
  {
    id: AIProvider.OpenAI,
    name: 'OpenAI',
    keyLabel: 'OpenAI API Key',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro' },
      { id: 'gpt-5.2', name: 'GPT-5.2' },
      { id: 'gpt-5.1', name: 'GPT-5.1' },
      { id: 'gpt-5.1-codex', name: 'GPT-5.1 Codex' },
      { id: 'gpt-5', name: 'GPT-5' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
  },
  // {
  //   id: AIProvider.XAI,
  //   name: 'xAI Grok',
  //   keyLabel: 'xAI API Key',
  //   keyUrl: 'https://console.x.ai',
  //   models: [
  //     { id: 'grok-4-fast-reasoning', name: 'Grok 4 Fast Reasoning' },
  //     { id: 'grok-4', name: 'Grok 4' },
  //     { id: 'grok-3', name: 'Grok 3' },
  //     { id: 'grok-3-mini', name: 'Grok 3 Mini' },
  //     { id: 'grok-2-vision-1212', name: 'Grok 2 Vision' },
  //   ],
  // },
];
