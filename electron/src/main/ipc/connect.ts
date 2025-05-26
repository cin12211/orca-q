/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { getDatabaseSource } from '../utils/dbConnector'
import type { IpcBaseRequest, IpcBaseResponse } from './interface'

ipcMain.handle(
  'db:connect',
  async (_, { dbConnectionString }: IpcBaseRequest): Promise<IpcBaseResponse> => {
    try {
      await getDatabaseSource({
        dbConnectionString,
        type: 'postgres'
      })

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }
)
