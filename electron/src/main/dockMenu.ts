import { app, BrowserWindow, Menu } from 'electron'
import { initDBWorkspace } from './utils'
import { createWindow, currentPort, windows } from '.'

const workspaceItemTemplateId = 'workspace'
export const getWorkspaceItems = async () => {
  const DBWorkspace = await initDBWorkspace()

  const workspaces = await DBWorkspace.findAsync({}).limit(5)

  return workspaces.map((workspace) => ({
    label: workspace.name,
    click() {
      createWindow(currentPort)
    },
    id: `${workspaceItemTemplateId} ${workspace.id}`
  }))
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
