import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

const forwardedRendererEvents = [
  'shortcut:save',
  'shortcut:undo',
  'shortcut:redo',
  'shortcut:preview',
  'menu:new-project',
  'menu:open-project',
  'menu:save-project',
  'menu:undo',
  'menu:redo',
  'menu:preview',
  'menu:toggle-panel'
] as const

for (const channel of forwardedRendererEvents) {
  ipcRenderer.on(channel, (_event, ...args) => {
    ;(globalThis as any).dispatchEvent(new CustomEvent(channel, { detail: args }))
  })
}

// 通过 contextBridge 暴露安全的 API 给渲染进程
// 不暴露 fs、path 等原生模块
const electronAPI = {
  // 项目操作
  createProject: (name: string, path: string) =>
    ipcRenderer.invoke('project:create', name, path),
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (data: unknown) => ipcRenderer.invoke('project:save', data),
  saveProjectAs: (data: unknown) => ipcRenderer.invoke('project:saveAs', data),

  // 资源操作
  importAsset: (type: 'image' | 'audio', projectPath?: string, category?: string) => ipcRenderer.invoke('asset:import', type, projectPath, category),
  deleteAsset: (relativePath: string, projectPath?: string) => ipcRenderer.invoke('asset:delete', relativePath, projectPath),
  listAssets: (projectPath: string) => ipcRenderer.invoke('asset:list', projectPath),
  renameAsset: (oldPath: string, newName: string, projectPath?: string) => ipcRenderer.invoke('asset:rename', oldPath, newName, projectPath),
  loadAssetAsDataUrl: (projectPath: string, relativePath: string) => ipcRenderer.invoke('asset:loadAsDataUrl', projectPath, relativePath),

  // 系统操作
  showOpenDialog: (options: unknown) => ipcRenderer.invoke('dialog:open', options),
  showSaveDialog: (options: unknown) => ipcRenderer.invoke('dialog:save', options),
  openDirectory: (path: string) => ipcRenderer.send('shell:openDirectory', path),
  getAppVersion: () => ipcRenderer.invoke('app:version'),

  // 备份
  createBackup: (data: unknown) => ipcRenderer.invoke('backup:create', data),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  restoreBackup: (backupPath: string) => ipcRenderer.invoke('backup:restore', backupPath),

  // 导出 — 渲染进程已 JSON.stringify，这里只需转发字符串
  exportProject: (jsonPayload: string) => {
    return ipcRenderer.invoke('export:project', jsonPayload)
  },
  onExportProgress: (callback: (stage: string, percent: number) => void) => {
    const handler = (_event: IpcRendererEvent, stage: string, percent: number) => callback(stage, percent)
    ipcRenderer.on('export:progress', handler)
    return () => ipcRenderer.removeListener('export:progress', handler)
  },

  // 日志
  log: (level: 'info' | 'warn' | 'error', message: string) =>
    ipcRenderer.send('log', level, message),

  // AI 辅助
  aiGenerate: (request: unknown) =>
    ipcRenderer.invoke('ai:generate', request),
  aiGetConfig: () =>
    ipcRenderer.invoke('ai:getConfig'),
  aiSaveConfig: (config: unknown) =>
    ipcRenderer.invoke('ai:saveConfig', config),
  aiStream: (request: unknown, onChunk: (chunk: { type: 'text' | 'done' | 'error'; content: string }) => void) => {
    ipcRenderer.removeAllListeners('ai:stream-chunk')
    ipcRenderer.send('ai:stream', request)
    const handler = (_event: Electron.IpcRendererEvent, chunk: { type: 'text' | 'done' | 'error'; content: string }) => {
      onChunk(chunk)
      if (chunk.type === 'done' || chunk.type === 'error') {
        ipcRenderer.removeListener('ai:stream-chunk', handler)
      }
    }
    ipcRenderer.on('ai:stream-chunk', handler)
    return () => ipcRenderer.removeListener('ai:stream-chunk', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electronAPI = electronAPI
}
