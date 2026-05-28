import { defineEventHandler, readBody, createError } from 'h3';
import {
  generateRoutineUpdateSQL,
  getRoutineDefinitionType,
} from '~/components/modules/management/schemas/utils';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createFunctionAdapter } from '~/server/infrastructure/database/adapters/functions';

export default defineEventHandler(async event => {
  const body = await readBody<{
    dbConnectionString?: string;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    type?: DatabaseClientType;
    functionDefinition: string;
  }>(event);

  if ((!body.dbConnectionString && !body.host) || !body.functionDefinition) {
    throw createError({
      statusCode: 400,
      message: 'Missing dbConnectionString or functionDefinition',
    });
  }

  const dbType = body.type || DatabaseClientType.POSTGRES;
  const updateSql = generateRoutineUpdateSQL(body.functionDefinition, dbType);
  const routineType = getRoutineDefinitionType(updateSql);

  if (!routineType) {
    throw createError({
      statusCode: 400,
      message:
        'Statement must be a valid CREATE OR REPLACE / CREATE OR ALTER FUNCTION or PROCEDURE',
    });
  }

  const adapter = await createFunctionAdapter(dbType, {
    dbConnectionString: body.dbConnectionString,
    host: body.host,
    port: body.port,
    username: body.username,
    password: body.password,
    database: body.database,
  });

  return await adapter.updateFunction(updateSql);
});
