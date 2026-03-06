import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

export default defineEventHandler(async event => {
  const body = await readBody(event);
  const { sqlDeleteStatements, dbConnectionString } = body;

  if (!sqlDeleteStatements?.length || !Array.isArray(sqlDeleteStatements)) {
    throw createError({
      statusCode: 400,
      message: 'No valid DELETE statements provided',
    });
  }

  for (const statement of sqlDeleteStatements) {
    if (
      typeof statement !== 'string' ||
      !statement.trim().toUpperCase().startsWith('DELETE')
    ) {
      throw createError({
        statusCode: 400,
        message: 'All statements must be valid DELETE statements',
      });
    }
  }

  const adapter = await createTableAdapter(DatabaseClientType.POSTGRES, {
    dbConnectionString,
  });
  return await adapter.executeBulkDelete(sqlDeleteStatements);
});
