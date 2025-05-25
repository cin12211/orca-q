import { ipcMain } from 'electron';
import { getDatabaseSource } from '../utils/dbConnector';

interface BulkDeleteArgs {
  sqlDeleteStatements: string[];
  dbConnectionString: string;
}

interface BulkDeleteResult {
  success: boolean;
  data?: {
    query: string;
    affectedRows: number;
    results: Record<string, unknown>[];
  }[];
  error?: string;
}

ipcMain.handle(
  'db:bulk-delete',
  async (_, args: BulkDeleteArgs): Promise<BulkDeleteResult> => {
    try {
      const { sqlDeleteStatements, dbConnectionString } = args;

      // Validate inputs
      if (
        !Array.isArray(sqlDeleteStatements) ||
        sqlDeleteStatements.length === 0
      ) {
        throw new Error('No valid DELETE statements provided');
      }

      if (!dbConnectionString || typeof dbConnectionString !== 'string') {
        throw new Error('Invalid or missing database connection string');
      }

      for (const statement of sqlDeleteStatements) {
        if (
          typeof statement !== 'string' ||
          !statement.trim().toUpperCase().startsWith('DELETE')
        ) {
          throw new Error('All statements must be valid DELETE statements');
        }
      }

      const db = await getDatabaseSource({
        dbConnectionString,
        type: 'postgres',
      });

      const result = await db.transaction(async tx => {
        const operations: BulkDeleteResult['data'] = [];

        for (const statement of sqlDeleteStatements) {
          const queryResult = await tx.query(statement);
          const affectedRows = Array.isArray(queryResult)
            ? queryResult[1] || 0
            : 0;

          operations.push({
            query: statement,
            affectedRows,
            results: queryResult,
          });
        }

        return operations;
      });

      return { success: true, data: result };
    } catch (e: any) {
      const isTypeORMError = typeof e === 'object' && e?.driverError;
      console.error('[bulk-delete]', e);

      return {
        success: false,
        error: isTypeORMError
          ? `DB error: ${e.message}`
          : e.message || 'Unknown error',
      };
    }
  }
);
