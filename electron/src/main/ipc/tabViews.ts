import { ipcMain } from 'electron'
import type { TabView } from '../../../../shared/stores'
import { TabViewsIpcChannels } from '../../constants'
import { initDBTabViews } from '../utils'

export interface GetTabViewsByContextProps {
  workspaceId: string
  connectionId: string
}

ipcMain.handle(TabViewsIpcChannels.Gets, async () => {
  const db = await initDBTabViews()
  return await db.findAsync({})
})

ipcMain.handle(
  TabViewsIpcChannels.GetByContext,
  async (_event, { workspaceId, connectionId }: GetTabViewsByContextProps) => {
    const db = await initDBTabViews()
    return await db.findAsync({ workspaceId, connectionId })
  }
)

ipcMain.handle(TabViewsIpcChannels.Create, async (_event, tabView: TabView) => {
  const db = await initDBTabViews()

  return await db.insertAsync(tabView)
})

ipcMain.handle(TabViewsIpcChannels.Update, async (_event, tabView: TabView) => {
  const db = await initDBTabViews()
  const currentWorkspace = await db.findOneAsync({ id: tabView.id })
  if (!currentWorkspace) return
  return await db.updateAsync({ id: currentWorkspace.id }, tabView)
})

ipcMain.handle(TabViewsIpcChannels.Delete, async (_event, id: string) => {
  const db = await initDBTabViews()
  return await db.removeAsync({ id: id }, { multi: true })
})
