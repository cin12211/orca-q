import { is } from '@electron-toolkit/utils'
import type Datastore from '@seald-io/nedb'
import Nedb from '@seald-io/nedb'
import { app } from 'electron'
import { join } from 'path'

let dbInstance: Datastore

const DEFAULT_FILE_NAME = 'userData.db'

export const initDb = async (): Promise<Datastore> => {
  let filename = ''

  const isProduct = !is.dev
  if (isProduct) {
    filename = join(app.getPath('userData'), DEFAULT_FILE_NAME)
  } else {
    filename = join('../.db', DEFAULT_FILE_NAME)
  }

  console.log('filename', filename)

  if (dbInstance) return dbInstance
  dbInstance = new Nedb({
    filename,
    autoload: true
  })

  return dbInstance
}
