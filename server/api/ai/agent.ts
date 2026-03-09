import {
  ToolLoopAgent,
  createAgentUIStreamResponse,
  smoothStream,
  stepCountIs,
} from 'ai';
import { createError, defineEventHandler, readBody } from 'h3';
import type { DbAgentRequestBody } from '~/components/modules/agent/types';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createProviderModel } from '~/server/infrastructure/agent/core/provider';
import type {
  AIProvider,
  DatabaseAdapter,
} from '~/server/infrastructure/agent/core/types';
import {
  buildAgentSystemPrompt,
  createDbAgentTools,
  resolveActiveTools,
} from '~/server/infrastructure/agent/tools';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';

function resolveDialect(
  body: DbAgentRequestBody
): DbAgentRequestBody['dialect'] {
  if (body.dialect) {
    return body.dialect;
  }

  if (body.dbType === DatabaseClientType.MYSQL) {
    return 'mysql';
  }

  return 'postgresql';
}

function resolveDatabaseClientType(
  body: DbAgentRequestBody
): DatabaseClientType {
  if (body.dbType === DatabaseClientType.MYSQL) {
    return DatabaseClientType.MYSQL;
  }

  return DatabaseClientType.POSTGRES;
}

function resolveSchemaSnapshots(
  body: DbAgentRequestBody
): DbAgentRequestBody['schemaSnapshots'] {
  if (body.schemaSnapshots?.length) {
    return body.schemaSnapshots;
  }

  if (body.schemaSnapshot) {
    return [body.schemaSnapshot];
  }

  return undefined;
}

export default defineEventHandler(async event => {
  const body = await readBody<DbAgentRequestBody>(event);
  const {
    provider,
    model,
    apiKey,
    messages,
    dbConnectionString,
    selectedCommandOptions,
    sendReasoning,
  } = body;

  const dialect = resolveDialect(body);
  const schemaSnapshots = resolveSchemaSnapshots(body);

  if (!apiKey) {
    throw createError({ statusCode: 400, message: 'API key is required' });
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
          type: resolveDatabaseClientType(body),
        })
      : null;

    const tools = createDbAgentTools({
      model: providerModel,
      adapter,
      dialect,
      schemaSnapshots,
    });

    const agent = new ToolLoopAgent({
      model: providerModel,
      instructions: buildAgentSystemPrompt(
        schemaSnapshots,
        selectedCommandOptions
      ),
      tools,
      stopWhen: stepCountIs(5),
      activeTools: resolveActiveTools(adapter, schemaSnapshots),
    });

    return await createAgentUIStreamResponse({
      agent,
      uiMessages: messages || [],
      sendReasoning: sendReasoning ?? true,
      experimental_transform: smoothStream(),
      sendSources: true,
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
