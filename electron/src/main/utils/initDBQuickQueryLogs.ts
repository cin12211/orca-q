import { is } from '@electron-toolkit/utils'
import type Datastore from '@seald-io/nedb'
import Nedb from '@seald-io/nedb'
import { app } from 'electron'
import { join } from 'path'

let dbQuickQueryLogsInstance: Datastore

const DEFAULT_QUICK_QUERY_LOGS_FILE_NAME = 'quick-query-logs.db'

export const initDBQuickQueryLogs = async (): Promise<Datastore> => {
  let filename = ''

  const isProduct = !is.dev
  if (isProduct) {
    filename = join(app.getPath('userData'), DEFAULT_QUICK_QUERY_LOGS_FILE_NAME)
  } else {
    filename = join('../.db', DEFAULT_QUICK_QUERY_LOGS_FILE_NAME)
  }

  console.log('filename', filename)

  if (dbQuickQueryLogsInstance) return dbQuickQueryLogsInstance
  dbQuickQueryLogsInstance = new Nedb({
    filename,
    autoload: true
  })

  return dbQuickQueryLogsInstance
}
