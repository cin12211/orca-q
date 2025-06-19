import { ipcMain } from 'electron'
import type { TabView } from '../../../../shared/stores'
import { TabViewsIpcChannels } from '../../constants'
import { initDBTabViews } from '../utils'

export interface GetTabViewsByContextProps {
  workspaceId: string
  connectionId: string
}

export interface DeleteTabViewProps {
  id: string
  connectionId: string
  schemaId: string
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

ipcMain.handle(TabViewsIpcChannels.Delete, async (_event, props: DeleteTabViewProps) => {
  const db = await initDBTabViews()
  return await db.removeAsync(props, { multi: true })
})

ipcMain.handle(TabViewsIpcChannels.BulkDelete, async (_event, inputs: DeleteTabViewProps[]) => {
  const db = await initDBTabViews()

  const bulkDelete = inputs.map((input) => db.removeAsync(input, { multi: true }))
  await Promise.all(bulkDelete)

  return await Promise.all(bulkDelete)
})
