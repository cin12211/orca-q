import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createFunctionAdapter } from '~/server/infrastructure/database/adapters/functions';

export default defineEventHandler(async event => {
  const body = await readBody<{
    dbConnectionString: string;
    functionDefinition: string;
  }>(event);

  if (!body.dbConnectionString || !body.functionDefinition) {
    throw createError({
      statusCode: 400,
      message: 'Missing dbConnectionString or functionDefinition',
    });
  }

  const trimmedDefinition = body.functionDefinition.trim().toUpperCase();
  const isValidFunctionDefinition =
    trimmedDefinition.startsWith('CREATE') &&
    trimmedDefinition.includes('FUNCTION');

  if (!isValidFunctionDefinition) {
    throw createError({
      statusCode: 400,
      message: 'Statement must be a valid CREATE FUNCTION',
    });
  }

  const adapter = await createFunctionAdapter(DatabaseClientType.POSTGRES, {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.updateFunction(body.functionDefinition);
});
