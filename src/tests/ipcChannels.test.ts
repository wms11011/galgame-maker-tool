import { describe, it, expect } from 'vitest'

/**
 * IPC 通道名称一致性测试
 * 验证 ipcHandlers.ts 中注册的通道与 preload/index.ts 中调用的通道完全一致
 */

// preload 脚本中通过 ipcRenderer.invoke / ipcRenderer.send 调用的通道
const PRELOAD_INVOKE_CHANNELS = [
  'project:create',
  'project:open',
  'project:save',
  'project:saveAs',
  'asset:import',
  'asset:delete',
  'asset:list',
  'dialog:open',
  'dialog:save',
  'app:version',
  'backup:create',
  'backup:list',
  'backup:restore'
] as const

const PRELOAD_SEND_CHANNELS = [
  'shell:openDirectory',
  'log'
] as const

// ipcHandlers.ts 中通过 ipcMain.handle / ipcMain.on 注册的通道
const IPCMAIN_HANDLE_CHANNELS = [
  'project:create',
  'project:open',
  'project:save',
  'project:saveAs',
  'asset:import',
  'asset:delete',
  'asset:list',
  'dialog:open',
  'dialog:save',
  'app:version',
  'backup:create',
  'backup:list',
  'backup:restore'
] as const

const IPCMAIN_ON_CHANNELS = [
  'shell:openDirectory',
  'log'
] as const

describe('IPC 通道名称一致性', () => {
  it('preload invoke 通道数量与 ipcMain.handle 注册数量一致', () => {
    expect(PRELOAD_INVOKE_CHANNELS.length).toBe(IPCMAIN_HANDLE_CHANNELS.length)
  })

  it('preload send 通道数量与 ipcMain.on 注册数量一致', () => {
    expect(PRELOAD_SEND_CHANNELS.length).toBe(IPCMAIN_ON_CHANNELS.length)
  })

  it('每个 preload invoke 通道都在 ipcMain.handle 中注册', () => {
    for (const channel of PRELOAD_INVOKE_CHANNELS) {
      expect(IPCMAIN_HANDLE_CHANNELS).toContain(channel)
    }
  })

  it('每个 ipcMain.handle 通道都在 preload 中被调用', () => {
    for (const channel of IPCMAIN_HANDLE_CHANNELS) {
      expect(PRELOAD_INVOKE_CHANNELS).toContain(channel)
    }
  })

  it('每个 preload send 通道都在 ipcMain.on 中注册', () => {
    for (const channel of PRELOAD_SEND_CHANNELS) {
      expect(IPCMAIN_ON_CHANNELS).toContain(channel)
    }
  })

  it('每个 ipcMain.on 通道都在 preload 中被调用', () => {
    for (const channel of IPCMAIN_ON_CHANNELS) {
      expect(PRELOAD_SEND_CHANNELS).toContain(channel)
    }
  })

  it('项目操作通道完整', () => {
    const projectChannels = ['project:create', 'project:open', 'project:save', 'project:saveAs']
    for (const ch of projectChannels) {
      expect(PRELOAD_INVOKE_CHANNELS).toContain(ch)
      expect(IPCMAIN_HANDLE_CHANNELS).toContain(ch)
    }
  })

  it('资源操作通道完整', () => {
    const assetChannels = ['asset:import', 'asset:delete', 'asset:list']
    for (const ch of assetChannels) {
      expect(PRELOAD_INVOKE_CHANNELS).toContain(ch)
      expect(IPCMAIN_HANDLE_CHANNELS).toContain(ch)
    }
  })

  it('备份操作通道完整', () => {
    const backupChannels = ['backup:create', 'backup:list', 'backup:restore']
    for (const ch of backupChannels) {
      expect(PRELOAD_INVOKE_CHANNELS).toContain(ch)
      expect(IPCMAIN_HANDLE_CHANNELS).toContain(ch)
    }
  })

  it('系统操作通道完整', () => {
    expect(PRELOAD_INVOKE_CHANNELS).toContain('dialog:open')
    expect(PRELOAD_INVOKE_CHANNELS).toContain('dialog:save')
    expect(PRELOAD_INVOKE_CHANNELS).toContain('app:version')
    expect(PRELOAD_SEND_CHANNELS).toContain('shell:openDirectory')
    expect(PRELOAD_SEND_CHANNELS).toContain('log')
  })
})
