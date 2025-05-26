import { ipcMain } from 'electron'
import { getDatabaseSource } from '../utils/dbConnector'
import type { IpcBaseRequest, IpcBaseResponse } from './interface'
import type { QueryFailedError } from 'typeorm'

export interface DBBulkUpdateRequest extends IpcBaseRequest {
  sqlUpdateStatements: string[]
}

export type DBBulkUpdateResponse = IpcBaseResponse<
  {
    query: string
    affectedRows: number
    results: Record<string, unknown>[]
  }[]
>

ipcMain.handle(
  'db:bulk-update',
  async (
    _,
    { dbConnectionString, sqlUpdateStatements }: DBBulkUpdateRequest
  ): Promise<DBBulkUpdateResponse> => {
    try {
      // Input validation
      if (!sqlUpdateStatements?.length || !Array.isArray(sqlUpdateStatements)) {
        return {
          success: false,
          error: 'No valid UPDATE or INSERT statements provided'
        }
      }

      if (!dbConnectionString || typeof dbConnectionString !== 'string') {
        return {
          success: false,
          error: 'Invalid or missing database connection string'
        }
      }

      // Validate that queries are UPDATE statements
      for (const statement of sqlUpdateStatements) {
        const isInsertOrUpdate =
          statement.trim().toUpperCase().startsWith('UPDATE') ||
          statement.trim().toUpperCase().startsWith('INSERT')

        if (typeof statement !== 'string' || !isInsertOrUpdate) {
          return {
            success: false,
            error: 'All statements must be valid UPDATE or INSERT statements'
          }
        }
      }

      console.log('Initiating bulk UPDATE or INSERT operation:', {
        statementCount: sqlUpdateStatements.length,
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

        for (const statement of sqlUpdateStatements) {
          const queryResult = await txManager.query(statement)
          // For PostgreSQL, queryResult[1] contains the row count for UPDATE queries
          const affectedRows = Array.isArray(queryResult) ? queryResult[1] || 0 : 0

          results.push({
            query: statement,
            affectedRows,
            results: queryResult
          })

          console.debug('Executed UPDATE,INSERT statement:', {
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
            error: `Database UPDATE ,INSERT operation failed: ${queryError.message}`
            //  data: {
            //       driverError: queryError.driverError,
            //       query: queryError.query
            //     },
          }
        }

        console.error('Unexpected error during bulk UPDATE,INSERT:', error)
        return {
          success: false,
          error: 'Internal server error during UPDATE,INSERT operation'
        }
      }

      return {
        success: false,
        error: 'Unknown error during UPDATE,INSERT operation'
      }
    }
  }
)
