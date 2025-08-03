import { is } from '@electron-toolkit/utils'
import type Datastore from '@seald-io/nedb'
import Nedb from '@seald-io/nedb'
import { app } from 'electron'
import { join } from 'path'

let dbRowQueryFilesInstance: Datastore
let dbRowQueryFileContentsInstance: Datastore

const DEFAULT_ROW_QUERY_FILES_FILE_NAME = 'row-query-files.db'

const DEFAULT_ROW_QUERY_FILE_CONTENTS_FILE_NAME = 'row-query-file-contents.db'

export const initDBRowQueryFiles = async (): Promise<Datastore> => {
  let filename = ''

  const isProduct = !is.dev
  if (isProduct) {
    filename = join(app.getPath('userData'), DEFAULT_ROW_QUERY_FILES_FILE_NAME)
  } else {
    filename = join('../.db', DEFAULT_ROW_QUERY_FILES_FILE_NAME)
  }

  if (dbRowQueryFilesInstance) return dbRowQueryFilesInstance

  dbRowQueryFilesInstance = new Nedb({
    filename,
    autoload: true
  })

  return dbRowQueryFilesInstance
}

export const initDBRowQueryFileContents = async (): Promise<Datastore> => {
  let filename = ''

  const isProduct = !is.dev
  if (isProduct) {
    filename = join(app.getPath('userData'), DEFAULT_ROW_QUERY_FILE_CONTENTS_FILE_NAME)
  } else {
    filename = join('../.db', DEFAULT_ROW_QUERY_FILE_CONTENTS_FILE_NAME)
  }

  if (dbRowQueryFileContentsInstance) return dbRowQueryFileContentsInstance

  dbRowQueryFileContentsInstance = new Nedb({
    filename,
    autoload: true
  })

  return dbRowQueryFileContentsInstance
}
