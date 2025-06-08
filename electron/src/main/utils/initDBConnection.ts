import { is } from '@electron-toolkit/utils'
import type Datastore from '@seald-io/nedb'
import Nedb from '@seald-io/nedb'
import { app } from 'electron'
import { join } from 'path'

let dbConnectionInstance: Datastore

const DEFAULT_CONNECTION_FILE_NAME = 'connection.db'

export const initDBConnection = async (): Promise<Datastore> => {
  let filename = ''

  const isProduct = !is.dev
  if (isProduct) {
    filename = join(app.getPath('userData'), DEFAULT_CONNECTION_FILE_NAME)
  } else {
    filename = join('../.db', DEFAULT_CONNECTION_FILE_NAME)
  }

  if (dbConnectionInstance) return dbConnectionInstance
  dbConnectionInstance = new Nedb({
    filename,
    autoload: true
  })

  return dbConnectionInstance
}
