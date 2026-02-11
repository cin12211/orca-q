import { app, Menu } from 'electron'
import { createWindow, currentPort } from '.'
import { initDBConnection, initDBWorkspace, initDBWorkspaceState } from './utils'
import type { Connection, WorkspaceState, Workspace } from '../../../core/stores'

const workspaceItemTemplateId = 'workspace'
const MAX_RECENT_WORKSPACES = 5

interface DockWorkspaceItem {
  label: string
  click: () => void
  id: string
}

export const getWorkspaceItems = async (): Promise<DockWorkspaceItem[]> => {
  try {
    // Initialize databases
    const [dbWsState, dbWorkspace, dbConnection] = await Promise.all([
      initDBWorkspaceState(),
      initDBWorkspace(),
      initDBConnection()
    ])

    // Fetch recent workspace states
    const wsStates = (await dbWsState
      .find({})
      .sort({ openedAt: -1 })
      .limit(MAX_RECENT_WORKSPACES)
      .execAsync()) as unknown as WorkspaceState[]

    if (!wsStates.length) return []

    // Fetch related workspaces and connections in parallel
    const [workspaces, connections] = await Promise.all([
      dbWorkspace.findAsync({
        id: { $in: wsStates.map((ws) => ws.id) }
      }) as Promise<Workspace[]>,
      dbConnection.findAsync({
        id: { $in: wsStates.map((ws) => ws.connectionId) }
      }) as Promise<Connection[]>
    ])

    // Create lookup maps for efficient access
    const workspaceMap = new Map(workspaces.map((ws) => [ws.id, ws]))
    const connectionMap = new Map(connections.map((conn) => [conn.id, conn]))

    // Build workspace items
    return wsStates
      .filter((ws) => {
        const connection = connectionMap.get(ws.connectionId || '')
        return !!connection?.name
      })
      .map((ws) => {
        const workspace = workspaceMap.get(ws.id)
        const connection = connectionMap.get(ws.connectionId || '')

        const label = `${workspace?.name ?? 'Unnamed'} ◦ ${connection?.name ?? 'Unknown'}`

        return {
          label,
          click: () =>
            createWindow(currentPort, {
              connectionId: ws.connectionId || '',
              wsId: ws.id,
              windowName: label
            }),
          id: `${workspaceItemTemplateId}-${ws.id}`
        }
      })
  } catch (error) {
    console.error('Error fetching workspace items:', error)
    return []
  }
}

export const getDockMenu = async () => {
  const workspaceItems = await getWorkspaceItems()

  const dockMenu = Menu.buildFromTemplate([
    ...workspaceItems,
    {
      type: 'separator'
    },
    {
      label: 'New Window',
      click() {
        createWindow(currentPort)
      }
    }
  ])

  return dockMenu
}

export const setDockMenu = async () => {
  const dockMenu = await getDockMenu()
  app.dock?.setMenu(dockMenu)
}

export const updateDockMenus = async () => {
  await setDockMenu()

  // const currentMenu = app.dock?.getMenu()
  // if (!currentMenu) {
  //   return
  // }
  // const currentItems = [...currentMenu?.items]
  // const newMenu = currentItems.filter((item) => {
  //   if (!item.id) {
  //     return true
  //   }
  //   return !item.id?.startsWith(workspaceItemTemplateId)
  // })
  // const workspaceItems = await getWorkspaceItems()
}
