import { ipcMain } from 'electron'
import { initDBWorkspace } from '../utils'
import { type Workspace } from '~/../../../shared/stores'
import { WorkspaceIpcChannels } from '../../constants'

ipcMain.handle(WorkspaceIpcChannels.Gets, async () => {
  const db = await initDBWorkspace()
  return await db.findAsync({})
})

ipcMain.handle(WorkspaceIpcChannels.GetOne, async (_, id: string) => {
  const db = await initDBWorkspace()
  return await db.findOneAsync({ id: id })
})

ipcMain.handle(WorkspaceIpcChannels.Create, async (_, workspace: Workspace) => {
  const db = await initDBWorkspace()

  return await db.insertAsync(workspace)
})

ipcMain.handle(WorkspaceIpcChannels.Update, async (_, workspace: Workspace) => {
  const db = await initDBWorkspace()
  const currentWorkspace = await db.findOneAsync({ id: workspace.id })
  if (!currentWorkspace) return
  return await db.updateAsync({ id: currentWorkspace.id }, workspace)
})

ipcMain.handle(WorkspaceIpcChannels.Delete, async (_, id: string) => {
  const db = await initDBWorkspace()
  return await db.removeAsync({ id: id }, { multi: true })
})
