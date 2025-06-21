import { ipcMain } from 'electron'
import { initDBWorkspace } from '../utils'
import { type Workspace } from '~/../../../shared/stores'
import { WorkspaceIpcChannels } from '../../constants'
import { updateDockMenus } from '../dockMenu'
import { deleteAllConnectionByWorkspaceId } from './connections'
import { deleteWorkspaceStateById } from './workspaceState'

ipcMain.handle(WorkspaceIpcChannels.Gets, async () => {
  const db = await initDBWorkspace()
  return await db.find({}).sort({ createdAt: 1 }).execAsync()
})

ipcMain.handle(WorkspaceIpcChannels.GetOne, async (_, id: string) => {
  const db = await initDBWorkspace()
  return await db.findOneAsync({ id: id })
})

ipcMain.handle(WorkspaceIpcChannels.Create, async (_event, workspace: Workspace) => {
  const db = await initDBWorkspace()

  return await db.insertAsync(workspace).finally(() => {
    updateDockMenus()
  })
})

ipcMain.handle(WorkspaceIpcChannels.Update, async (_event, workspace: Workspace) => {
  const db = await initDBWorkspace()
  const currentWorkspace = await db.findOneAsync({ id: workspace.id })
  if (!currentWorkspace) return
  return await db.updateAsync({ id: currentWorkspace.id }, workspace).finally(() => {
    updateDockMenus()
  })
})

ipcMain.handle(WorkspaceIpcChannels.Delete, async (_event, id: string) => {
  const db = await initDBWorkspace()
  return await db.removeAsync({ id: id }, { multi: true }).finally(async () => {
    // delete all connections
    await deleteAllConnectionByWorkspaceId(id)

    await deleteWorkspaceStateById(id)

    await updateDockMenus()
  })
})
