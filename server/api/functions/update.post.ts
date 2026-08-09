import { defineEventHandler, readBody, createError } from 'h3';
import {
  generateRoutineUpdateSQL,
  getRoutineDefinitionType,
} from '~/components/modules/management/schemas/utils';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '~/core/types';
import { createFunctionAdapter } from '~/server/infrastructure/database/adapters/functions';

export default defineEventHandler(async event => {
  const body = await readBody<
    DatabaseMetadataRequestParams & {
      functionDefinition: string;
    }
  >(event);

  if ((!body.dbConnectionString && !body.host) || !body.functionDefinition) {
    throw createError({
      statusCode: 400,
      message: 'Missing connection details or functionDefinition',
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

  const adapter = await createFunctionAdapter(
    body.type,
    body
  );

  return await adapter.updateFunction(updateSql);
});
