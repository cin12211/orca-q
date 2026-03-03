import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createFunctionAdapter } from '~/server/infrastructure/database/adapters/functions';

export default defineEventHandler(async event => {
  const body = await readBody<{
    dbConnectionString: string;
    schemaName: string;
    oldName: string;
    newName: string;
  }>(event);

  if (
    !body.dbConnectionString ||
    !body.schemaName ||
    !body.oldName ||
    !body.newName
  ) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameters',
    });
  }

  const validNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!validNamePattern.test(body.newName)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid new function name format',
    });
  }

  const adapter = await createFunctionAdapter(DatabaseClientType.POSTGRES, {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.renameFunction(
    body.schemaName,
    body.oldName,
    body.newName
  );
});
