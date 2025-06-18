import { is } from '@electron-toolkit/utils'
import type Datastore from '@seald-io/nedb'
import Nedb from '@seald-io/nedb'
import { app } from 'electron'
import { join } from 'path'

let dbWorkspaceStateInstance: Datastore

const DEFAULT_WORKSPACE_STATE_FILE_NAME = 'workspace-state.db'

export const initDBWorkspaceState = async (): Promise<Datastore> => {
  let filename = ''

  const isProduct = !is.dev
  if (isProduct) {
    filename = join(app.getPath('userData'), DEFAULT_WORKSPACE_STATE_FILE_NAME)
  } else {
    filename = join('../.db', DEFAULT_WORKSPACE_STATE_FILE_NAME)
  }

  console.log('filename', filename)

  if (dbWorkspaceStateInstance) return dbWorkspaceStateInstance
  dbWorkspaceStateInstance = new Nedb({
    filename,
    autoload: true
  })

  return dbWorkspaceStateInstance
}
