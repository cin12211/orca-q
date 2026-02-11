import { ipcMain } from 'electron'
import { initDBWorkspace } from '../utils'
import { type Workspace } from '~/../../../core/stores'
import { WorkspaceIpcChannels } from '../../constants'
import { updateDockMenus } from '../dockMenu'
import { deleteAllConnectionByWorkspaceId } from './connections'
import { deleteWorkspaceStateById } from './workspaceState'
import dayjs from 'dayjs'
import { deleteQuickQueryLogs } from './quickQueryLogs'

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

  const workspaceTmp = {
    ...workspace,
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString()
  }

  return await db.insertAsync(workspaceTmp).finally(() => {
    updateDockMenus()
  })
})

ipcMain.handle(WorkspaceIpcChannels.Update, async (_event, workspace: Workspace) => {
  const db = await initDBWorkspace()
  const currentWorkspace = await db.findOneAsync({ id: workspace.id })
  if (!currentWorkspace) return

  const workspaceTmp = {
    ...workspace,
    updatedAt: dayjs().toISOString()
  }

  console.log('hello', workspaceTmp)

  return await db.updateAsync({ id: currentWorkspace.id }, workspaceTmp).finally(() => {
    updateDockMenus()
  })
})

ipcMain.handle(WorkspaceIpcChannels.Delete, async (_event, id: string) => {
  const db = await initDBWorkspace()
  return await db.removeAsync({ id: id }, { multi: true }).finally(async () => {
    // delete all connections
    await deleteAllConnectionByWorkspaceId(id)

    await deleteWorkspaceStateById(id)

    await deleteQuickQueryLogs({ workspaceId: id })

    await updateDockMenus()
  })
})
