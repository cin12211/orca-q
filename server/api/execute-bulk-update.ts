import { defineEventHandler, readBody, createError } from 'h3';
import { type QueryFailedError } from 'typeorm';

interface BulkUpdateRequest {
  sqlUpdateStatements: string[];
  // dbConnectionString: string; TODO: convert to this name for clear
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
      const { sqlUpdateStatements, dbConnectionString } =
        await readBody<BulkUpdateRequest>(event);

      // Input validation
      if (!sqlUpdateStatements?.length || !Array.isArray(sqlUpdateStatements)) {
        throw createError({
          statusCode: 400,
          message: 'No valid UPDATE or INSERT statements provided',
        });
      }

      if (!dbConnectionString || typeof dbConnectionString !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'Invalid or missing database connection string',
        });
      }

      // Validate that queries are UPDATE statements
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

      const startTime = performance.now();
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

          for (const statement of sqlUpdateStatements) {
            const queryResult = await txManager.query(statement);
            // For PostgreSQL, queryResult[1] contains the row count for UPDATE queries
            const affectedRows = Array.isArray(queryResult)
              ? queryResult[1] || 0
              : 0;

            results.push({
              query: statement,
              affectedRows,
              results: queryResult,
            });

            console.debug('Executed UPDATE,INSERT statement:', {
              statement,
              affectedRows,
            });
          }

          return results;
        });

        const endTime = performance.now();
        const queryTime = Number((endTime - startTime).toFixed(2));

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
            message: `Database UPDATE ,INSERT operation failed: ${queryError.message}`,
          });
        }

        // Handle validation or known errors
        if ('statusCode' in error) {
          throw error; // Re-throw validation errors
        }

        // Handle unexpected errors
        console.error('Unexpected error during bulk UPDATE,INSERT:', error);
        throw createError({
          statusCode: 500,
          message: 'Internal server error during UPDATE,INSERT operation',
          data: { error: error.message },
        });
      }

      // Fallback for non-Error objects
      throw createError({
        statusCode: 500,
        message: 'Unknown error during UPDATE,INSERT operation',
      });
    }
  }
);
