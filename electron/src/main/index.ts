import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png'
import { startServer } from './createServer'
import { setDockMenu } from './dockMenu'
import './ipc'
import MenuBuilder from './menu'
import { findAvailablePort } from './utils'
import { DEFAULT_PORT } from '../constants'

export let windows: Map<number, BrowserWindow> = new Map()

export let currentPort = DEFAULT_PORT

export function createWindow(port: number): void {
  const currentWindow = BrowserWindow.getFocusedWindow()

  let x, y

  if (currentWindow) {
    const [currentWindowX, currentWindowY] = currentWindow.getPosition()
    x = currentWindowX + 24
    y = currentWindowY + 24
  }

  const { width: displayWidth, height: displayHeight } = screen.getPrimaryDisplay().workAreaSize
  const width = Math.floor(displayWidth * 0.8)
  const height = Math.floor(displayHeight * 0.8)

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: 'HeraQ',
    width,
    height,
    show: false,
    x,
    y,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 10, y: 10 },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const menuBuilder = new MenuBuilder(mainWindow)
  menuBuilder.buildMenu()

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(`http://localhost:3000`)
  } else {
    // mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    mainWindow.loadURL(`http://localhost:${port}`)
  }

  mainWindow.on('closed', () => {
    windows.delete(mainWindow.id)
  })

  windows.set(mainWindow.id, mainWindow)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  const port = await findAvailablePort(DEFAULT_PORT)
  currentPort = port
  if (!is.dev) {
    await startServer(port)
  }

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await setDockMenu()

  createWindow(port)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port)
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
