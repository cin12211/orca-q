import { defineEventHandler, readBody, createError } from 'h3';
import {
  generateRoutineUpdateSQL,
  getRoutineDefinitionType,
} from '~/components/modules/management/schemas/utils';
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

  const updateSql = generateRoutineUpdateSQL(body.functionDefinition);
  const routineType = getRoutineDefinitionType(updateSql);

  if (!routineType) {
    throw createError({
      statusCode: 400,
      message:
        'Statement must be a valid CREATE OR REPLACE FUNCTION or PROCEDURE',
    });
  }

  const adapter = await createFunctionAdapter(DatabaseClientType.POSTGRES, {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.updateFunction(updateSql);
});
