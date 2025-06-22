import { ipcMain } from 'electron'
import { initDBConnection } from '../utils'
import { ConnectionIpcChannels } from '../../constants'
import { updateDockMenus } from '../dockMenu'
import type { Connection } from '../../../../shared/stores'
import dayjs from 'dayjs'
import { deleteQuickQueryLogs } from './quickQueryLogs'

ipcMain.handle(ConnectionIpcChannels.GetByWorkspaceId, async (_, workspaceId: string) => {
  const db = await initDBConnection()
  return await db.findAsync({
    workspaceId
  })
})

ipcMain.handle(ConnectionIpcChannels.Gets, async () => {
  const db = await initDBConnection()

  return await db.find({}).sort({ createdAt: 1 }).execAsync()
})

ipcMain.handle(ConnectionIpcChannels.GetOne, async (_, id: string) => {
  const db = await initDBConnection()
  return await db.findOneAsync({ id: id })
})

ipcMain.handle(ConnectionIpcChannels.Create, async (_event, connection: Connection) => {
  const db = await initDBConnection()

  const connectionTmp = {
    ...connection,
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString()
  }

  return await db.insertAsync(connectionTmp).finally(() => {
    updateDockMenus()
  })
})

ipcMain.handle(ConnectionIpcChannels.Update, async (_event, connection: Connection) => {
  const db = await initDBConnection()
  const currentWorkspace = await db.findOneAsync({ id: connection.id })
  if (!currentWorkspace) return

  const connectionTmp = {
    ...connection,
    updatedAt: dayjs().toISOString()
  }

  return await db.updateAsync({ id: currentWorkspace.id }, connectionTmp).finally(() => {
    updateDockMenus()
  })
})

ipcMain.handle(ConnectionIpcChannels.Delete, async (_event, id: string) => {
  await updateDockMenus()

  const db = await initDBConnection()
  return await db.removeAsync({ id: id }, { multi: true }).finally(async () => {
    await deleteQuickQueryLogs({ connectionId: id })
    updateDockMenus()
  })
})

export const deleteAllConnectionByWorkspaceId = async (workspaceId: string) => {
  const db = await initDBConnection()
  return await db.removeAsync({ workspaceId: workspaceId }, { multi: true })
}
