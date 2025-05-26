/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { getDatabaseSource } from '../utils/dbConnector'
import type { IpcBaseRequest, IpcBaseResponse } from './interface'

export interface DBExecuteRequest extends IpcBaseRequest {
  sql: string
}

export type DBExecuteResponse = IpcBaseResponse<Record<string, unknown>[]>

ipcMain.handle(
  'db:execute',
  async (_, { dbConnectionString, sql }: DBExecuteRequest): Promise<DBExecuteResponse> => {
    try {
      const db = await getDatabaseSource({
        dbConnectionString,
        type: 'postgres'
      })

      const result = await db.query(sql)

      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
)
