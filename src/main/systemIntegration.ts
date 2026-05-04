// ============================================================
// 系统集成 - 托盘图标、全局快捷键、崩溃恢复
// ============================================================

import { app, Tray, Menu, globalShortcut, Notification, BrowserWindow, dialog } from 'electron'
import * as path from 'path'
import * as backupService from './services/backupService'

let tray: Tray | null = null

// ============================================================
// 12.1 托盘图标与通知
// ============================================================

/**
 * 创建系统托盘图标
 */
export function createTray(mainWindow: BrowserWindow): void {
  // 使用默认图标路径（打包后从 resources 目录读取）
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../../resources/icon.png')

  try {
    tray = new Tray(iconPath)
  } catch {
    // 图标文件不存在时跳过托盘创建
    return
  }

  tray.setToolTip('GALGAME 制作工具')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    {
      label: '隐藏窗口',
      click: () => mainWindow.hide()
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })
}

/**
 * 显示系统通知
 */
export function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
}

/**
 * 销毁托盘图标
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

// ============================================================
// 12.2 全局快捷键
// ============================================================

/**
 * 注册全局快捷键
 */
export function registerShortcuts(mainWindow: BrowserWindow): void {
  // Ctrl/Cmd+S：保存项目
  globalShortcut.register('CommandOrControl+S', () => {
    mainWindow.webContents.send('shortcut:save')
  })

  // Ctrl/Cmd+Z：撤销
  globalShortcut.register('CommandOrControl+Z', () => {
    mainWindow.webContents.send('shortcut:undo')
  })

  // Ctrl/Cmd+Shift+Z：重做
  globalShortcut.register('CommandOrControl+Shift+Z', () => {
    mainWindow.webContents.send('shortcut:redo')
  })

  // Ctrl/Cmd+P：打开预览
  globalShortcut.register('CommandOrControl+P', () => {
    mainWindow.webContents.send('shortcut:preview')
  })
}

/**
 * 注销所有全局快捷键
 */
export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}

// ============================================================
// 12.3 崩溃恢复
// ============================================================

/**
 * 检查是否存在未恢复的备份（应用启动时调用）
 */
export async function checkPendingBackup(mainWindow: BrowserWindow): Promise<void> {
  try {
    const backups = await backupService.listBackups()
    if (backups.length === 0) return

    // 取最新备份
    const latest = backups[0]
    const createdAt = new Date(latest.createdAt).toLocaleString()

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: '发现未保存的备份',
      message: `检测到上次会话的备份文件（${createdAt}）`,
      detail: `项目：${latest.projectName}\n是否恢复此备份？`,
      buttons: ['恢复备份', '忽略'],
      defaultId: 0,
      cancelId: 1
    })

    if (response === 0) {
      // 通知渲染进程恢复备份
      mainWindow.webContents.send('backup:restore-pending', latest.path)
    }
  } catch {
    // 检查失败时静默忽略
  }
}
