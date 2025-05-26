/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { getDatabaseSource } from '../utils/dbConnector'
import type { IpcBaseRequest, IpcBaseResponse } from './interface'
import type { RoutineMetadata } from './get-over-view-tables'

export type DbGetOverviewFunctionsResponse = IpcBaseResponse<RoutineMetadata[]>

ipcMain.handle(
  'db:get-overview-functions',
  async (_, { dbConnectionString }: IpcBaseRequest): Promise<DbGetOverviewFunctionsResponse> => {
    try {
      const db = await getDatabaseSource({
        dbConnectionString,
        type: 'postgres'
      })

      const result = await db.query(`
        SELECT 
            r.routine_name AS name,
            r.routine_schema AS schema,
            r.routine_type AS kind,
            pg_get_userbyid(p.proowner) AS owner,
            d.description AS comment
        FROM 
            information_schema.routines r
        JOIN 
            pg_proc p ON r.specific_name = p.proname || '_' || p.oid
        LEFT JOIN 
            pg_description d ON d.objoid = p.oid
        WHERE 
            r.routine_schema = 'public';
      `)

      return { success: true, data: result }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }
)
