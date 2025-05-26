/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { getDatabaseSource } from '../utils/dbConnector'
import type { IpcBaseRequest, IpcBaseResponse } from './interface'

export interface RoutineMetadata {
  name: string
  schema: string
  kind: string
  owner: string
  comment: string | null
}

export type DBGetOverviewTablesResponse = IpcBaseResponse<RoutineMetadata[]>

ipcMain.handle(
  'db:get-overview-tables',
  async (_, { dbConnectionString }: IpcBaseRequest): Promise<DBGetOverviewTablesResponse> => {
    try {
      const db = await getDatabaseSource({
        dbConnectionString,
        type: 'postgres'
      })

      const result = await db.query(`
        SELECT 
            c.relname AS name,
            n.nspname AS schema,
            CASE 
                WHEN c.relkind = 'r' THEN 'TABLE'
                ELSE c.relkind
            END AS kind,
            pg_get_userbyid(c.relowner) AS owner,
            s.n_live_tup AS estimated_row,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
            pg_size_pretty(pg_relation_size(c.oid)) AS data_size,
            pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
            d.description AS comment
        FROM 
            pg_class c
        JOIN 
            pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN 
            pg_stat_all_tables s ON c.oid = s.relid
        LEFT JOIN 
            pg_description d ON c.oid = d.objoid
        WHERE 
            n.nspname = 'public'
            AND c.relkind = 'r'
        ORDER BY 
            c.relname;
    `)

      return { success: true, data: result }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }
)
