import { ipcMain } from 'electron'
import { QQueryLogsIpcChannels } from '../../constants'
import { initDBQuickQueryLogs } from '../utils'
import { type QuickQueryLog } from '../../../../core/stores/useQuickQueryLogs'

export interface GetQQueryLogsProps {
  connectionId: string
}

export type DeleteQQueryLogsProps =
  | {
      workspaceId: string
    }
  | {
      connectionId: string
    }
  | {
      connectionId: string
      schemaName: string
      tableName: string
    }

export const deleteQuickQueryLogs = async (props: DeleteQQueryLogsProps) => {
  const db = await initDBQuickQueryLogs()
  return await db.removeAsync(props, { multi: true })
}

ipcMain.handle(QQueryLogsIpcChannels.Gets, async () => {
  const db = await initDBQuickQueryLogs()
  return await db.find({}).sort({ createdAt: 1 }).execAsync()
})

ipcMain.handle(
  QQueryLogsIpcChannels.GetByContext,
  async (_event, { connectionId }: GetQQueryLogsProps) => {
    const db = await initDBQuickQueryLogs()
    return await db.find({ connectionId }).sort({ createdAt: 1 }).execAsync()
  }
)

ipcMain.handle(QQueryLogsIpcChannels.Create, async (_event, qqLog: QuickQueryLog) => {
  const db = await initDBQuickQueryLogs()

  return await db.insertAsync(qqLog)
})

ipcMain.handle(QQueryLogsIpcChannels.Update, async (_event, qqLog: QuickQueryLog) => {
  const db = await initDBQuickQueryLogs()
  const currentWorkspace = await db.findOneAsync({ id: qqLog.id })
  if (!currentWorkspace) return
  return await db.updateAsync({ id: currentWorkspace.id }, qqLog)
})

ipcMain.handle(QQueryLogsIpcChannels.Delete, async (_event, props: DeleteQQueryLogsProps) => {
  return await deleteQuickQueryLogs(props)
})
