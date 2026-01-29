import { defineEventHandler, readBody, createError } from 'h3';
import { type QueryFailedError } from 'typeorm';

interface UpdateFunctionRequest {
  dbConnectionString: string;
  functionDefinition: string;
}

interface UpdateFunctionResponse {
  success: boolean;
  error?: string;
  queryTime: number;
}

export default defineEventHandler(
  async (event): Promise<UpdateFunctionResponse> => {
    try {
      const { dbConnectionString, functionDefinition } =
        await readBody<UpdateFunctionRequest>(event);

      // Input validation
      if (!functionDefinition || typeof functionDefinition !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'No valid function definition provided',
        });
      }

      if (!dbConnectionString || typeof dbConnectionString !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'Invalid or missing database connection string',
        });
      }

      // Validate that the statement is a function definition
      const trimmedDefinition = functionDefinition.trim().toUpperCase();
      const isValidFunctionDefinition =
        trimmedDefinition.startsWith('CREATE') &&
        trimmedDefinition.includes('FUNCTION');

      if (!isValidFunctionDefinition) {
        throw createError({
          statusCode: 400,
          message:
            'Statement must be a valid CREATE FUNCTION or CREATE OR REPLACE FUNCTION statement',
        });
      }

      const startTime = performance.now();
      const dbConnection = await getDatabaseSource({
        dbConnectionString: dbConnectionString,
        type: 'postgres',
      });

      await dbConnection.query(functionDefinition);

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
