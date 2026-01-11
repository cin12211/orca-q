import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { streamText, type UIMessage, convertToModelMessages } from 'ai';

// import { google } from '@ai-sdk/google';

export type AIProvider = 'openai' | 'google' | 'anthropic' | 'xai';

interface ChatRequest {
  provider: AIProvider;
  model: string;
  apiKey: string;
  messages: UIMessage[];
  systemPrompt?: string;
}

// Create provider instance dynamically
function createProviderModel(
  provider: AIProvider,
  apiKey: string,
  model: string
) {
  switch (provider) {
    case 'openai': {
      const openai = createOpenAI({ apiKey });
      return openai(model);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({
        apiKey,
      });
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
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export default defineEventHandler(async event => {
  const body = await readBody<ChatRequest>(event);

  const { provider, model, apiKey, messages, systemPrompt } = body;

  if (!apiKey) {
    throw createError({
      statusCode: 400,
      message: 'API key is required',
    });
  }

  if (!provider || !model) {
    throw createError({
      statusCode: 400,
      message: 'Provider and model are required',
    });
  }

  try {
    const providerModel = createProviderModel(provider, apiKey, model);

    const result = streamText({
      model: providerModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('AI Chat API Error:', error);
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to process AI request',
    });
  }
});
