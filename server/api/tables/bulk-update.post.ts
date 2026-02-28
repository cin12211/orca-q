import { defineEventHandler, readBody, createError } from 'h3';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

export default defineEventHandler(async event => {
  const body = await readBody(event);
  const { sqlUpdateStatements, dbConnectionString } = body;

  if (!sqlUpdateStatements?.length || !Array.isArray(sqlUpdateStatements)) {
    throw createError({
      statusCode: 400,
      message: 'No valid UPDATE or INSERT statements provided',
    });
  }

  for (const statement of sqlUpdateStatements) {
    const isInsertOrUpdate =
      statement.trim().toUpperCase().startsWith('UPDATE') ||
      statement.trim().toUpperCase().startsWith('INSERT');
    if (typeof statement !== 'string' || !isInsertOrUpdate) {
      throw createError({
        statusCode: 400,
        message: 'All statements must be valid UPDATE or INSERT statements',
      });
    }
  }

  const adapter = await createTableAdapter('postgres', { dbConnectionString });
  return await adapter.executeBulkUpdate(sqlUpdateStatements);
});
