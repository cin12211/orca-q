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
import { buildAgentSystemPrompt } from '~/server/infrastructure/agent/systemPromt';
import {
  createDbAgentTools,
  resolveActiveTools,
} from '~/server/infrastructure/agent/tools';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';

/** Tool names whose output contains large data that should be stripped from context */
const LARGE_OUTPUT_TOOL_NAMES = new Set([
  'export_query_result',
  'export_content',
  'render_table',
]);

/**
 * Strip large tool outputs from messages to reduce context window size.
 * Keeps metadata (filename, format, rowCount) but removes bulk content/rows.
 */
function filterLargeToolOutputs(
  messages: DbAgentRequestBody['messages']
): DbAgentRequestBody['messages'] {
  return messages.map(message => {
    if (message.role !== 'assistant' || !Array.isArray(message.parts)) {
      return message;
    }

    const filteredParts = message.parts.map((part: any) => {
      const toolName = String(part.type || '').replace(/^tool-/, '');

      if (
        !LARGE_OUTPUT_TOOL_NAMES.has(toolName) ||
        part.state !== 'output-available' ||
        !part.output
      ) {
        return part;
      }

      // Export tools: strip content but keep metadata
      if (toolName === 'export_query_result' || toolName === 'export_content') {
        return {
          ...part,
          output: {
            filename: part.output.filename,
            format: part.output.format,
            fileSize: part.output.fileSize,
            mimeType: part.output.mimeType,
            content: '[exported — content omitted from context]',
            encoding: part.output.encoding,
            preview: { columns: [], rows: [], truncated: true },
          },
        };
      }

      // render_table: strip rows but keep columns and rowCount
      if (toolName === 'render_table') {
        return {
          ...part,
          output: {
            sql: part.output.sql,
            columns: part.output.columns,
            rows: [],
            rowCount: part.output.rowCount,
            truncated: true,
          },
        };
      }

      return part;
    });

    return { ...message, parts: filteredParts };
  });
}

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
      instructions: buildAgentSystemPrompt(schemaSnapshots),
      tools,
      stopWhen: ({ steps }) =>
        steps.some(s =>
          s.toolCalls?.some(
            (tc: { toolName: string }) => tc.toolName === 'askClarification'
          )
        ) || stepCountIs(5)({ steps }),
      activeTools: resolveActiveTools(adapter, schemaSnapshots),
    });

    return await createAgentUIStreamResponse({
      agent,
      uiMessages: filterLargeToolOutputs(messages || []),
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
