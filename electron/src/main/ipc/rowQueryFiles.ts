import { ipcMain } from 'electron'
import dayjs from 'dayjs'
import type {
  RowQueryFile,
  RowQueryFileContent
} from '../../../../shared/stores/useExplorerFileStoreStore'
import { RowQueryFilesIpcChannels } from '../../constants'
import { initDBRowQueryFiles, initDBRowQueryFileContents } from '../utils'

export interface GetFilesByContextProps {
  workspaceId: string
}

export interface DeleteFileProps {
  id: string
}

export interface DeleteByWorkspaceIdProps {
  wsId: string
}

// Get all files
ipcMain.handle(RowQueryFilesIpcChannels.Gets, async () => {
  const db = await initDBRowQueryFiles()
  const files = await db.findAsync({})
  return files.sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf())
})

// Get files by workspaceId
ipcMain.handle(
  RowQueryFilesIpcChannels.GetByContext,
  async (_event, { workspaceId }: GetFilesByContextProps) => {
    const db = await initDBRowQueryFiles()
    const files = await db.findAsync({ workspaceId })
    return files.sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf())
  }
)

// Create file and its empty content
ipcMain.handle(RowQueryFilesIpcChannels.Create, async (_event, file: RowQueryFile) => {
  const dbFiles = await initDBRowQueryFiles()
  const dbContents = await initDBRowQueryFileContents()

  const createdAt = file.createdAt || dayjs().toISOString()

  const newFile = { ...file, createdAt }
  const fileContent: RowQueryFileContent = { id: file.id, contents: '', variables: '' }

  await Promise.all([dbFiles.insertAsync(newFile), dbContents.insertAsync(fileContent)])

  return newFile
})

// Update file metadata
ipcMain.handle(RowQueryFilesIpcChannels.Update, async (_event, file: RowQueryFile) => {
  const db = await initDBRowQueryFiles()
  const existing = await db.findOneAsync({ id: file.id })
  if (!existing) return null

  const updated = { ...existing, ...file }
  await db.updateAsync({ id: file.id }, updated)
  return updated
})

// Update file content
ipcMain.handle(
  RowQueryFilesIpcChannels.UpdateContent,
  async (_event, content: RowQueryFileContent) => {
    const db = await initDBRowQueryFileContents()
    const existing = await db.findOneAsync({ id: content.id })
    if (!existing) return null

    await db.updateAsync({ id: content.id }, content)
    return content
  }
)

// Delete single file
ipcMain.handle(RowQueryFilesIpcChannels.Delete, async (_event, { id }: DeleteFileProps) => {
  const dbFiles = await initDBRowQueryFiles()
  const dbContents = await initDBRowQueryFileContents()

  await Promise.all([
    dbFiles.removeAsync({ id }, { multi: true }),
    dbContents.removeAsync({ id }, { multi: true })
  ])
})
