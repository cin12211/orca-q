import { defineEventHandler, readBody, createError } from 'h3';
import { type QueryFailedError } from 'typeorm';

interface RenameFunctionRequest {
  dbConnectionString: string;
  schemaName: string;
  oldName: string;
  newName: string;
}

interface RenameFunctionResponse {
  success: boolean;
  queryTime: number;
}

export default defineEventHandler(
  async (event): Promise<RenameFunctionResponse> => {
    try {
      const { dbConnectionString, schemaName, oldName, newName } =
        await readBody<RenameFunctionRequest>(event);

      // Input validation
      if (!schemaName || typeof schemaName !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'Invalid or missing schema name',
        });
      }

      if (!oldName || typeof oldName !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'Invalid or missing old function name',
        });
      }

      if (!newName || typeof newName !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'Invalid or missing new function name',
        });
      }

      if (!dbConnectionString || typeof dbConnectionString !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'Invalid or missing database connection string',
        });
      }

      // Validate new name format (basic validation)
      const validNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      if (!validNamePattern.test(newName)) {
        throw createError({
          statusCode: 400,
          message:
            'New function name must start with a letter or underscore and contain only alphanumeric characters and underscores',
        });
      }

      const startTime = performance.now();
      const dbConnection = await getDatabaseSource({
        dbConnectionString: dbConnectionString,
        type: 'postgres',
      });

      // Build and execute ALTER FUNCTION RENAME statement
      const renameQuery = `ALTER FUNCTION "${schemaName}"."${oldName}" RENAME TO "${newName}";`;

      await dbConnection.query(renameQuery);

      const endTime = performance.now();
      const queryTime = Number((endTime - startTime).toFixed(2));

      return {
        success: true,
        queryTime,
      };
    } catch (error) {
      const queryError: QueryFailedError = error as unknown as QueryFailedError;

      throw createError({
        statusCode: 500,
        statusMessage: queryError.message,
        cause: queryError.cause,
        data: queryError.driverError,
        message: queryError.message,
      });
    }
  }
);
