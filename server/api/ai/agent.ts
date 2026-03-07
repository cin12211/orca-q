import { ToolLoopAgent, createAgentUIStreamResponse, stepCountIs } from 'ai';
import { createError, defineEventHandler, readBody } from 'h3';
import type { DbAgentRequestBody } from '~/components/modules/agent/types';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createProviderModel } from '~/server/infrastructure/agent/provider';
import { createDbAgentTools } from '~/server/infrastructure/agent/tools';
import type {
  AIProvider,
  DatabaseAdapter,
} from '~/server/infrastructure/agent/types';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';

export default defineEventHandler(async event => {
  const body = await readBody<DbAgentRequestBody>(event);
  const {
    provider,
    model,
    apiKey,
    messages,
    systemPrompt,
    dbConnectionString,
    dialect,
    schemaContext,
    schemaSnapshot,
    sendReasoning,
  } = body;

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
    const providerModel = createProviderModel(
      provider as AIProvider,
      apiKey,
      model
    );

    const adapter: DatabaseAdapter | null = dbConnectionString
      ? await getDatabaseSource({
          dbConnectionString,
          type: DatabaseClientType.POSTGRES,
        })
      : null;

    console.log('::::', adapter, dialect);

    const agent = new ToolLoopAgent({
      model: providerModel,
      instructions: systemPrompt,
      tools: createDbAgentTools({
        model: providerModel,
        adapter,
        dialect,
        schemaContext,
        schemaSnapshot,
      }),
      stopWhen: stepCountIs(5),
    });

    return await createAgentUIStreamResponse({
      agent,
      uiMessages: messages || [],
      sendReasoning: sendReasoning ?? true,
    });
  } catch (error: unknown) {
    console.error('DB Agent API Error:', error);
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to process DB agent request',
    });
  }
});
