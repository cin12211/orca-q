import { ipcMain } from 'electron'
import { initDBWorkspaceState } from '../utils'
import { WorkspaceStateIpcChannels } from '../../constants'
import { type WorkspaceState } from '../../../../shared/stores/useWSStateStore'
import dayjs from 'dayjs'

export const deleteWorkspaceStateById = async (id: string) => {
  const db = await initDBWorkspaceState()
  return await db.removeAsync({ id: id }, { multi: true })
}

ipcMain.handle(WorkspaceStateIpcChannels.Gets, async () => {
  const db = await initDBWorkspaceState()
  return await db.findAsync({})
})

ipcMain.handle(WorkspaceStateIpcChannels.Create, async (_event, wsState: WorkspaceState) => {
  const db = await initDBWorkspaceState()

  const wsStateTmp = {
    ...wsState,
    updatedAt: dayjs().toISOString(),
    createdAt: dayjs().toISOString()
  }

  return await db.insertAsync(wsStateTmp)
})

ipcMain.handle(WorkspaceStateIpcChannels.Update, async (_event, wsState: WorkspaceState) => {
  const db = await initDBWorkspaceState()
  const currentWorkspace = await db.findOneAsync({ id: wsState.id })
  if (!currentWorkspace) return

  const wsStateTmp = {
    ...wsState,
    updatedAt: dayjs().toISOString()
  }

  return await db.updateAsync({ id: currentWorkspace.id }, wsStateTmp)
})

ipcMain.handle(WorkspaceStateIpcChannels.Delete, async (_event, id: string) => {
  return await deleteWorkspaceStateById(id)
})
