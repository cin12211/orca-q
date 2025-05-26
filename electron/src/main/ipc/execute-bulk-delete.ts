/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { getDatabaseSource } from '../utils/dbConnector'
import type { IpcBaseRequest, IpcBaseResponse } from './interface'
import type { QueryFailedError } from 'typeorm'

export interface DBBulkDeleteRequest extends IpcBaseRequest {
  sqlDeleteStatements: string[]
}

export type DBBulkDeleteResponse = IpcBaseResponse<
  {
    query: string
    affectedRows: number
    results: Record<string, unknown>[]
  }[]
>

ipcMain.handle(
  'db:bulk-delete',
  async (
    _,
    { dbConnectionString, sqlDeleteStatements }: DBBulkDeleteRequest
  ): Promise<DBBulkDeleteResponse> => {
    try {
      // Input validation
      if (!sqlDeleteStatements?.length || !Array.isArray(sqlDeleteStatements)) {
        return {
          success: false,
          error: 'No valid DELETE statements provided'
        }
      }

      if (!dbConnectionString || typeof dbConnectionString !== 'string') {
        return {
          success: false,
          error: 'Invalid or missing database connection string'
        }
      }

      // Validate that queries are DELETE statements
      for (const statement of sqlDeleteStatements) {
        if (typeof statement !== 'string' || !statement.trim().toUpperCase().startsWith('DELETE')) {
          return {
            success: false,
            error: 'All statements must be valid DELETE statements'
          }
        }
      }

      console.log('Initiating bulk DELETE operation:', {
        statementCount: sqlDeleteStatements.length,
        connection: dbConnectionString
      })

      const dbConnection = await getDatabaseSource({
        dbConnectionString: dbConnectionString,
        type: 'postgres'
      })

      // Execute transaction
      const queryResults = await dbConnection.transaction(async (txManager) => {
        const results: {
          query: string
          affectedRows: number
          results: Record<string, unknown>[]
        }[] = []

        for (const statement of sqlDeleteStatements) {
          const queryResult = await txManager.query(statement)
          // For PostgreSQL, queryResult[1] contains the row count for DELETE queries
          const affectedRows = Array.isArray(queryResult) ? queryResult[1] || 0 : 0

          results.push({
            query: statement,
            affectedRows,
            results: queryResult
          })

          console.debug('Executed DELETE statement:', {
            statement,
            affectedRows
          })
        }

        return results
      })

      return {
        success: true,
        data: queryResults
      }
    } catch (error) {
      if (error instanceof Error) {
        // Handle TypeORM-specific errors
        if ((error as QueryFailedError).driverError) {
          const queryError = error as QueryFailedError

          return {
            success: false,
            error: `Database DELETE operation failed: ${queryError.message}`
            // data: {
            //   driverError: queryError.driverError,
            //   query: queryError.query
            // }
          }
        }

        return {
          success: false,
          error: 'Internal server error during DELETE operation'
        }
      }

      return {
        success: false,
        error: 'Unknown error during DELETE operation'
      }
    }
  }
)
