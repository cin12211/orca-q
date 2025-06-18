import { is } from '@electron-toolkit/utils'
import type Datastore from '@seald-io/nedb'
import Nedb from '@seald-io/nedb'
import { app } from 'electron'
import { join } from 'path'

let dbTabViewsInstance: Datastore

const DEFAULT_TAB_VIEWS_FILE_NAME = 'tab-views.db'

export const initDBTabViews = async (): Promise<Datastore> => {
  let filename = ''

  const isProduct = !is.dev
  if (isProduct) {
    filename = join(app.getPath('userData'), DEFAULT_TAB_VIEWS_FILE_NAME)
  } else {
    filename = join('../.db', DEFAULT_TAB_VIEWS_FILE_NAME)
  }

  console.log('filename', filename)

  if (dbTabViewsInstance) return dbTabViewsInstance
  dbTabViewsInstance = new Nedb({
    filename,
    autoload: true
  })

  return dbTabViewsInstance
}
