import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';
import type { AIProvider } from './types';

export function createProviderModel(
  provider: AIProvider,
  apiKey: string,
  model: string
): LanguageModel {
  switch (provider) {
    case 'openai': {
      const openai = createOpenAI({ apiKey });
      return openai(model);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(model);
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(model);
    }
    case 'xai': {
      const xai = createXai({ apiKey });
      return xai(model);
    }
    case 'openrouter': {
      const openrouter = createOpenRouter({
        apiKey,
      });
      return openrouter(model);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
