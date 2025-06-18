import { ipcMain } from 'electron'
import { initDBWorkspaceState } from '../utils'
import { WorkspaceStateIpcChannels } from '../../constants'
import { type WorkspaceState } from '../../../../shared/stores/useWSStateStore'

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

  return await db.insertAsync(wsState)
})

ipcMain.handle(WorkspaceStateIpcChannels.Update, async (_event, wsState: WorkspaceState) => {
  const db = await initDBWorkspaceState()
  const currentWorkspace = await db.findOneAsync({ id: wsState.id })
  if (!currentWorkspace) return
  return await db.updateAsync({ id: currentWorkspace.id }, wsState)
})

ipcMain.handle(WorkspaceStateIpcChannels.Delete, async (_event, id: string) => {
  return await deleteWorkspaceStateById(id)
})
