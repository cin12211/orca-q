import { defineEventHandler, readBody, createError } from 'h3';
import { type QueryFailedError } from 'typeorm';

interface DeleteFunctionRequest {
  dbConnectionString: string;
  schemaName: string;
  functionName: string;
  cascade?: boolean;
}

interface DeleteFunctionResponse {
  success: boolean;
  queryTime: number;
}

export default defineEventHandler(
  async (event): Promise<DeleteFunctionResponse> => {
    try {
      const { dbConnectionString, schemaName, functionName, cascade } =
        await readBody<DeleteFunctionRequest>(event);

      // Input validation
      if (!schemaName || typeof schemaName !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'Invalid or missing schema name',
        });
      }

      if (!functionName || typeof functionName !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'Invalid or missing function name',
        });
      }

      if (!dbConnectionString || typeof dbConnectionString !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'Invalid or missing database connection string',
        });
      }

      const startTime = performance.now();
      const dbConnection = await getDatabaseSource({
        dbConnectionString: dbConnectionString,
        type: 'postgres',
      });

      // Build and execute DROP FUNCTION statement
      const cascadeClause = cascade ? ' CASCADE' : '';
      const dropQuery = `DROP FUNCTION IF EXISTS "${schemaName}"."${functionName}"${cascadeClause};`;

      await dbConnection.query(dropQuery);

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
