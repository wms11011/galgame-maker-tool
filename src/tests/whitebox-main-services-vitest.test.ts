import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

const { mockFs, mockDialog, mockApp } = vi.hoisted(() => ({
  mockFs: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({ size: 1024, mtime: new Date(), isFile: () => true }),
    pathExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(Buffer.from('test')),
    writeJson: vi.fn().mockResolvedValue(undefined),
    readJson: vi.fn().mockResolvedValue({}),
  },
  mockDialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/tmp/test.png'] }),
  },
  mockApp: {
    getPath: vi.fn(() => '/tmp/test-backups'),
    isReady: vi.fn(() => true),
  }
}))

vi.mock('electron', () => ({
  dialog: mockDialog,
  app: mockApp,
}))

vi.mock('fs-extra', () => ({
  default: mockFs, ensureDir: mockFs.ensureDir, copy: mockFs.copy,
  remove: mockFs.remove, rename: mockFs.rename, readdir: mockFs.readdir,
  stat: mockFs.stat, pathExists: mockFs.pathExists, readFile: mockFs.readFile,
  writeJson: mockFs.writeJson, readJson: mockFs.readJson,
}))

afterAll(() => vi.unstubAllGlobals())

describe('main services (vitest mock)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('deleteAsset', () => {
    it('成功删除', async () => {
      const { deleteAsset } = await import('../main/services/assetService')
      await expect(deleteAsset('assets/bg.png', '/project')).resolves.not.toThrow()
    })
    it('空路径抛错', async () => {
      const { deleteAsset } = await import('../main/services/assetService')
      await expect(deleteAsset('', '/project')).rejects.toThrow('路径不能为空')
    })
  })

  describe('loadAssetAsDataUrl', () => {
    it('PNG → data URL', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.from([0x89, 0x50, 0x4E, 0x47]))
      const { loadAssetAsDataUrl } = await import('../main/services/assetService')
      const result = await loadAssetAsDataUrl('/p', 'a.png')
      expect(result).toContain('data:image/png;base64,')
    })
  })

  describe('backupService', () => {
    it('createBackup normal', async () => {
      const { createBackup } = await import('../main/services/backupService')
      const data = { meta: { name: 'Test', version: '1.0', createdAt: '', updatedAt: '', projectPath: '/t', resolution: '1280x720' as const }, flow: { nodes: [], edges: [] }, script: '', assets: [] }
      const path = await createBackup(data)
      expect(path).toContain('Test')
    })
    it('createBackup null data', async () => {
      const { createBackup } = await import('../main/services/backupService')
      await expect(createBackup(null as any)).rejects.toThrow('备份数据无效')
    })
    it('restoreBackup empty path', async () => {
      const { restoreBackup } = await import('../main/services/backupService')
      await expect(restoreBackup('')).rejects.toThrow('路径不能为空')
    })
  })

  describe('validateConfig', () => {
    it('all cases', async () => {
      const { validateConfig } = await import('../main/services/exportService')
      expect(validateConfig({ type: 'web', outputPath: '/out', resolution: '1280x720' } as any).valid).toBe(true)
      expect(validateConfig({ type: 'desktop', outputPath: '/out', resolution: '1920x1080' } as any).valid).toBe(true)
      expect(validateConfig({ type: 'mobile' as any, outputPath: '/out', resolution: '1280x720' }).valid).toBe(false)
      expect(validateConfig({ type: 'web', outputPath: '', resolution: '1280x720' } as any).valid).toBe(false)
    })
  })
})
