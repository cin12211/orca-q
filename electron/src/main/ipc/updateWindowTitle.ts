import { app, BrowserWindow, ipcMain } from 'electron'
import { windows } from '../index'
import { WindowIpcChannels } from '../../constants'

export interface UpdateWindowTitleProps {
  workspaceName: string
  tabName: string
}

ipcMain.handle(WindowIpcChannels.UpdateTitle, (event, props: UpdateWindowTitleProps) => {
  const win = BrowserWindow.fromWebContents(event.sender)

  const winId = win?.id
  if (!winId) {
    return
  }

  const window = windows.get(winId)

  if (!window) {
    return
  }

  const currentMenu = app.dock?.getMenu()

  console.log('currentMenu', currentMenu)

  //TODO: IPC change title then > check window , in windows -> change title of this match window
  //TODO: update title base on use interface in UI :  `open tab name ◦ workspace name`
  window.setTitle(`${props.workspaceName} • ${props.tabName}`)
})
