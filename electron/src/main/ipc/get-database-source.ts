/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { getDatabaseSource } from '../utils/dbConnector'
import type { IpcBaseRequest, IpcBaseResponse } from './interface'

export interface TableColumnDetail {
  label: string
  type: 'field'
  info: string
}

export type TableDetails = Record<string, TableColumnDetail[]>

export interface PgSchemaInfo {
  name: string
  tables: string[] | null
  views: string[] | null
  functions: string[] | null
  table_details: TableDetails | null
}

export type DbGetSourceResponse = IpcBaseResponse<PgSchemaInfo[]>

ipcMain.handle(
  'db:get-source',
  async (_, { dbConnectionString }: IpcBaseRequest): Promise<DbGetSourceResponse> => {
    try {
      const db = await getDatabaseSource({
        dbConnectionString: dbConnectionString,
        type: 'postgres'
      })

      const result = await db.query(`
        	SELECT
            nsp.nspname AS name,
            -- tables: danh sách tên bảng
            (
              SELECT json_agg(table_name)
              FROM information_schema.tables t
              WHERE t.table_schema = nsp.nspname
                AND t.table_type = 'BASE TABLE'
            ) AS tables,
            -- views: danh sách tên view
            (
              SELECT json_agg(table_name)
              FROM information_schema.tables t
              WHERE t.table_schema = nsp.nspname
                AND t.table_type = 'VIEW'
            ) AS views,
            -- functions: danh sách tên hàm
            (
              SELECT json_agg(routine_name)
              FROM information_schema.routines r
              WHERE r.routine_schema = nsp.nspname
                AND r.routine_type = 'FUNCTION'
            ) AS functions,
            -- table_details: thông tin chi tiết các cột của bảng
            (
              SELECT json_object_agg(
                t.table_name,
                (
                  SELECT json_agg(
                    json_build_object(
                      'label', c.column_name,
                      'type', 'field',
                      'info', c.data_type
                    )
                  )
                  FROM information_schema.columns c
                  WHERE c.table_schema = nsp.nspname
                    AND c.table_name = t.table_name
                )
              )
              FROM information_schema.tables t
              WHERE t.table_schema = nsp.nspname
                AND t.table_type = 'BASE TABLE'
            ) AS table_details
        FROM pg_namespace nsp
        WHERE
            has_schema_privilege(current_user, nsp.nspname, 'USAGE');
    `)
      // -- loại bỏ schema hệ thống
      // -- AND nsp.nspname NOT LIKE 'pg_%'
      // -- AND nsp.nspname <> 'information_schema'

      return { success: true, data: result }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }
)
