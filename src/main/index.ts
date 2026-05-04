import { app } from 'electron'
import { createMainWindow } from './windowManager'
import { registerIpcHandlers } from './ipcHandlers'
import {
  createTray,
  registerShortcuts,
  unregisterShortcuts,
  destroyTray,
  checkPendingBackup
} from './systemIntegration'

app.whenReady().then(async () => {
  registerIpcHandlers()
  const mainWindow = createMainWindow()

  // 12.1 托盘图标
  createTray(mainWindow)

  // 12.2 全局快捷键
  registerShortcuts(mainWindow)

  // 12.3 崩溃恢复检查（延迟到窗口加载完成后）
  mainWindow.webContents.once('did-finish-load', () => {
    checkPendingBackup(mainWindow)
  })

  app.on('activate', function () {
    const { BrowserWindow } = require('electron')
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('will-quit', () => {
  unregisterShortcuts()
  destroyTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
