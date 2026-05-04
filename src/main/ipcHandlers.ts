import { ipcMain, dialog, shell, app } from 'electron'
import * as fileSystemService from './services/fileSystemService'
import * as assetService from './services/assetService'
import * as backupService from './services/backupService'
import * as exportService from './services/exportService'
import * as aiService from './services/aiService'

type IpcResult<T = unknown> = { success: true; data?: T } | { success: false; error: string }

function ok<T>(data?: T): { success: true; data?: T } {
  return { success: true, data }
}

function fail(err: unknown): { success: false; error: string } {
  const message = err instanceof Error ? err.message : String(err)
  return { success: false, error: message }
}

export function registerIpcHandlers(): void {
  // ── 项目操作 ──────────────────────────────────────────────

  ipcMain.handle('project:create', async (_event, name: string, dirPath: string) => {
    try {
      const data = await fileSystemService.createProject(name, dirPath)
      return ok(data)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('project:open', async () => {
    try {
      const data = await fileSystemService.openProject()
      return ok(data)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('project:save', async (_event, data: unknown) => {
    try {
      if (!data || typeof data !== 'object') {
        return fail('项目数据无效')
      }
      const projectData = data as Record<string, unknown>
      const meta = projectData.meta as Record<string, unknown> | undefined
      if (!meta?.projectPath || typeof meta.projectPath !== 'string') {
        return fail('项目路径未设置，请先保存项目')
      }
      const savedPath = await fileSystemService.saveProject(data, meta.projectPath as string)
      return ok({ path: savedPath })
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('project:saveAs', async (_event, data: unknown) => {
    try {
      const savedPath = await fileSystemService.saveProjectAs(data)
      if (savedPath === null) {
        return ok(null) // 用户取消
      }
      return ok({ path: savedPath })
    } catch (err) {
      return fail(err)
    }
  })

  // ── 资源操作 ──────────────────────────────────────────────

  ipcMain.handle('asset:import', async (_event, type: 'image' | 'audio', projectPath?: string, category?: string) => {
    try {
      if (!projectPath) return fail('请先打开或创建项目')
      const assets = await assetService.importAsset(type, projectPath, category)
      return ok(assets)
    } catch (err) { return fail(err) }
  })

  ipcMain.handle('asset:delete', async (_event, relativePath: string, projectPath?: string) => {
    try {
      if (!projectPath) {
        return fail('请先打开或创建项目')
      }
      await assetService.deleteAsset(relativePath, projectPath)
      return ok()
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('asset:list', async (_event, projectPath: string) => {
    try {
      const assets = await assetService.listAssets(projectPath)
      return ok(assets)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('asset:rename', async (_event, oldPath: string, newName: string, projectPath?: string) => {
    try {
      if (!projectPath) return fail('请先打开项目')
      const result = await assetService.renameAsset(oldPath, newName, projectPath)
      return ok(result)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('asset:loadAsDataUrl', async (_event, projectPath: string, relativePath: string) => {
    try {
      const dataUrl = await assetService.loadAssetAsDataUrl(projectPath, relativePath)
      return ok(dataUrl)
    } catch (err) {
      return fail(err)
    }
  })

  // ── 系统对话框 ────────────────────────────────────────────

  ipcMain.handle('dialog:open', async (_event, options: Electron.OpenDialogOptions) => {
    try {
      const result = await dialog.showOpenDialog(options ?? {})
      if (result.canceled) return ok(null)
      return ok(result.filePaths)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('dialog:save', async (_event, options: Electron.SaveDialogOptions) => {
    try {
      const result = await dialog.showSaveDialog(options ?? {})
      if (result.canceled) return ok(null)
      return ok(result.filePath)
    } catch (err) {
      return fail(err)
    }
  })

  // ── Shell 操作 ────────────────────────────────────────────

  ipcMain.on('shell:openDirectory', (_event, dirPath: string) => {
    if (dirPath && typeof dirPath === 'string' && !dirPath.includes('..')) {
      shell.openPath(dirPath).catch((err) => {
        console.error('[IPC] shell:openDirectory 失败:', err)
      })
    }
  })

  // ── 应用信息 ──────────────────────────────────────────────

  ipcMain.handle('app:version', async () => {
    try {
      return ok(app.getVersion())
    } catch (err) {
      return fail(err)
    }
  })

  // ── 备份操作 ──────────────────────────────────────────────

  ipcMain.handle('backup:create', async (_event, data: unknown) => {
    try {
      const backupPath = await backupService.createBackup(data)
      return ok(backupPath)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('backup:list', async () => {
    try {
      const backups = await backupService.listBackups()
      return ok(backups)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('backup:restore', async (_event, backupPath: string) => {
    try {
      const data = await backupService.restoreBackup(backupPath)
      return ok(data)
    } catch (err) {
      return fail(err)
    }
  })

  // ── 导出 ──────────────────────────────────────────────────

  ipcMain.handle('export:project', async (_event, jsonPayload: string) => {
    try {
      if (!jsonPayload || typeof jsonPayload !== 'string') return fail('导出数据无效')
      const parsed = JSON.parse(jsonPayload)
      if (!parsed.projectData || typeof parsed.projectData !== 'object') return fail('项目数据无效')
      const { projectData, config } = parsed
      const result = await exportService.exportProject(
        projectData,
        config as Parameters<typeof exportService.exportProject>[1],
        (stage, percent) => {
          _event.sender.send('export:progress', stage, percent)
        }
      )
      return result
    } catch (err) {
      return fail(err)
    }
  })

  // ── 日志 ──────────────────────────────────────────────────

  ipcMain.on('log', (_event, level: 'info' | 'warn' | 'error', message: string) => {
    const prefix = '[Renderer]'
    switch (level) {
      case 'info':
        console.info(prefix, message)
        break
      case 'warn':
        console.warn(prefix, message)
        break
      case 'error':
        console.error(prefix, message)
        break
      default:
        console.log(prefix, message)
    }
  })

  // ── AI 辅助 ──────────────────────────────────────────────

  ipcMain.handle('ai:generate', async (_event, request: unknown) => {
    try {
      const result = await aiService.generate(request as aiService.AIGenerateRequest)
      return result
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('ai:getConfig', async () => {
    try {
      const config = await aiService.loadConfig()
      return ok(config)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle('ai:saveConfig', async (_event, config: unknown) => {
    try {
      if (!config || typeof config !== 'object') return fail('配置数据无效')
      const ALLOWED_KEYS = ['provider', 'apiKey', 'endpoint', 'model', 'temperature', 'maxTokens', 'enabled']
      const sanitized: Record<string, unknown> = {}
      for (const key of ALLOWED_KEYS) {
        if (key in (config as Record<string, unknown>)) {
          sanitized[key] = (config as Record<string, unknown>)[key]
        }
      }
      const result = await aiService.saveConfig(sanitized as aiService.AIConfig)
      return result
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.on('ai:stream', async (event, request: unknown) => {
    try {
      const gen = aiService.streamGenerate(request as aiService.AIGenerateRequest)
      for await (const chunk of gen) {
        event.sender.send('ai:stream-chunk', { type: 'text', content: chunk })
      }
      event.sender.send('ai:stream-chunk', { type: 'done', content: '' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      event.sender.send('ai:stream-chunk', { type: 'error', content: message })
    }
  })
}
