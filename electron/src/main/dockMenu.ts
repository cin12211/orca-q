import { app, Menu } from 'electron'
import { createWindow, currentPort } from '.'
import { initDBConnection, initDBWorkspace, initDBWorkspaceState } from './utils'
import type { Connection, WorkspaceState, Workspace } from '../../../shared/stores'

const workspaceItemTemplateId = 'workspace'
export const getWorkspaceItems = async () => {
  const dbWsState = await initDBWorkspaceState()
  const dbWorkspace = await initDBWorkspace()
  const dbConnection = await initDBConnection()

  const wsStates = (await dbWsState
    .find({})
    .sort({ openedAt: -1 })
    .limit(5)) as unknown as WorkspaceState[]

  const workspaces = (await dbWorkspace.findAsync({
    id: {
      $in: wsStates.map((ws) => ws.id)
    }
  })) as Workspace[]

  const connections = (await dbConnection.findAsync({
    id: {
      $in: wsStates.map((ws) => ws.connectionId)
    }
  })) as Connection[]

  return workspaces
    .filter((workspace) => {
      const connectionId = wsStates?.find((ws) => ws.id === workspace.id)?.connectionId
      const connectionName = connections.find((c) => c.id === connectionId)?.name

      return connectionName
    })
    .map((workspace, index) => {
      const connectionId = wsStates?.[index]?.connectionId
      const connectionName = connections.find((c) => c.id === connectionId)?.name

      const label = `${workspace.name} ◦ ${connectionName}`

      return {
        label,
        click() {
          createWindow(currentPort, workspace.id)
        },
        id: `${workspaceItemTemplateId} ${workspace.id}`
      }
    })
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
