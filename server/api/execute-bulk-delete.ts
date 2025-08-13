import { defineEventHandler, readBody, createError } from 'h3';
import { type QueryFailedError } from 'typeorm';

interface BulkUpdateRequest {
  sqlDeleteStatements: string[];
  dbConnectionString: string;
}

interface BulkUpdateResponse {
  success: boolean;
  data?: {
    query: string;
    affectedRows: number;
    results: Record<string, unknown>[];
  }[];
  error?: string;
  queryTime: number;
}

export default defineEventHandler(
  async (event): Promise<BulkUpdateResponse> => {
    try {
      const { sqlDeleteStatements, dbConnectionString } =
        await readBody<BulkUpdateRequest>(event);

      // Input validation
      if (!sqlDeleteStatements?.length || !Array.isArray(sqlDeleteStatements)) {
        throw createError({
          statusCode: 400,
          message: 'No valid DELETE statements provided',
        });
      }

      if (!dbConnectionString || typeof dbConnectionString !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'Invalid or missing database connection string',
        });
      }

      // Validate that queries are DELETE statements
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

      const startTime = Date.now();

      const dbConnection = await getDatabaseSource({
        dbConnectionString: dbConnectionString,
        type: 'postgres',
      });

      try {
        // Execute transaction
        const queryResults = await dbConnection.transaction(async txManager => {
          const results: {
            query: string;
            affectedRows: number;
            results: Record<string, unknown>[];
          }[] = [];

          for (const statement of sqlDeleteStatements) {
            const queryResult = await txManager.query(statement);
            // For PostgreSQL, queryResult[1] contains the row count for DELETE queries
            const affectedRows = Array.isArray(queryResult)
              ? queryResult[1] || 0
              : 0;

            results.push({
              query: statement,
              affectedRows,
              results: queryResult,
            });
          }

          return results;
        });

        const endTime = Date.now();
        const queryTime = endTime - startTime;

        return {
          success: true,
          data: queryResults,
          queryTime,
        };
      } finally {
      }
    } catch (error) {
      if (error instanceof Error) {
        // Handle TypeORM-specific errors
        if ((error as QueryFailedError).driverError) {
          const queryError = error as QueryFailedError;
          throw createError({
            statusCode: 500,
            statusMessage: queryError.message,
            data: {
              driverError: queryError.driverError,
              query: queryError.query,
            },
            message: `Database DELETE operation failed: ${queryError.message}`,
          });
        }

        // Handle validation or known errors
        if ('statusCode' in error) {
          throw error; // Re-throw validation errors
        }

        // Handle unexpected errors
        console.error('Unexpected error during bulk UPDATE:', error);
        throw createError({
          statusCode: 500,
          message: 'Internal server error during DELETE operation',
          data: { error: error.message },
        });
      }

      // Fallback for non-Error objects
      throw createError({
        statusCode: 500,
        message: 'Unknown error during DELETE operation',
      });
    }
  }
);
