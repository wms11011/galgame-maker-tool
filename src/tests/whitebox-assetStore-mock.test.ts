import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAssetStore } from '../renderer/src/stores/assetStore'
import { useProjectStore } from '../renderer/src/stores/projectStore'

// Mock window.electronAPI
const mockElectronAPI = {
  importAsset: vi.fn(),
  deleteAsset: vi.fn(),
  listAssets: vi.fn(),
  renameAsset: vi.fn(),
  createProject: vi.fn(),
  saveProject: vi.fn().mockResolvedValue({ success: true }),
  openProject: vi.fn(),
}

vi.stubGlobal('window', {
  electronAPI: mockElectronAPI
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('assetStore mock 测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // 设置 projectStore 的 projectPath
    const ps = useProjectStore()
    ;(ps as any).meta = { name: 'Test', version: '1.0', projectPath: '/test/proj', createdAt: '', updatedAt: '', resolution: '1280x720' }
  })

  describe('importAssets', () => {
    it('成功导入图片资源', async () => {
      mockElectronAPI.importAsset.mockResolvedValue({
        success: true,
        data: [
          { name: 'bg.png', relativePath: 'assets/backgrounds/bg.png', type: 'image', size: 1024, category: 'background' }
        ]
      })
      const store = useAssetStore()
      await store.importAssets('image', 'background')
      expect(store.assets).toHaveLength(1)
      expect(store.assets[0].name).toBe('bg.png')
    })

    it('导入失败时不修改 assets', async () => {
      mockElectronAPI.importAsset.mockResolvedValue({
        success: false,
        error: '文件不存在'
      })
      const store = useAssetStore()
      await store.importAssets('image', 'background')
      expect(store.assets).toHaveLength(0)
    })

    it('导入结果 data 为空时不修改 assets', async () => {
      mockElectronAPI.importAsset.mockResolvedValue({
        success: true,
        data: null
      })
      const store = useAssetStore()
      await store.importAssets('image', 'character')
      expect(store.assets).toHaveLength(0)
    })

    it('electronAPI 不可用时静默返回', async () => {
      vi.stubGlobal('window', { electronAPI: undefined })
      const store = useAssetStore()
      await store.importAssets('image')
      expect(store.assets).toHaveLength(0)
      vi.stubGlobal('window', { electronAPI: mockElectronAPI })
    })
  })

  describe('deleteAsset', () => {
    it('成功删除资源', async () => {
      mockElectronAPI.importAsset.mockResolvedValue({
        success: true,
        data: [{ name: 'bg.png', relativePath: 'assets/bg.png', type: 'image', size: 1024 }]
      })
      mockElectronAPI.deleteAsset.mockResolvedValue({ success: true })
      const store = useAssetStore()
      await store.importAssets('image')
      expect(store.assets).toHaveLength(1)
      await store.deleteAsset('assets/bg.png')
      expect(store.assets).toHaveLength(0)
    })

    it('删除失败时保留资源', async () => {
      mockElectronAPI.importAsset.mockResolvedValue({
        success: true,
        data: [{ name: 'bg.png', relativePath: 'assets/bg.png', type: 'image', size: 1024 }]
      })
      mockElectronAPI.deleteAsset.mockResolvedValue({ success: false, error: '权限不足' })
      const store = useAssetStore()
      await store.importAssets('image')
      await store.deleteAsset('assets/bg.png')
      expect(store.assets).toHaveLength(1)
    })

    it('electronAPI 不可用时静默返回', async () => {
      vi.stubGlobal('window', {})
      const store = useAssetStore()
      await store.deleteAsset('assets/x.png')
      expect(store.assets).toHaveLength(0)
      vi.stubGlobal('window', { electronAPI: mockElectronAPI })
    })
  })

  describe('renameAsset', () => {
    it('成功重命名', async () => {
      mockElectronAPI.importAsset.mockResolvedValue({
        success: true,
        data: [{ name: 'old.png', relativePath: 'assets/old.png', type: 'image', size: 1024 }]
      })
      mockElectronAPI.renameAsset.mockResolvedValue({
        success: true,
        data: { newPath: 'assets/new.png' }
      })
      const store = useAssetStore()
      await store.importAssets('image')
      const ok = await store.renameAsset('assets/old.png', 'new')
      expect(ok).toBe(true)
      expect(store.assets[0].name).toBe('new.png')
      expect(store.assets[0].relativePath).toBe('assets/new.png')
    })

    it('重命名失败返回 false', async () => {
      mockElectronAPI.importAsset.mockResolvedValue({
        success: true,
        data: [{ name: 'old.png', relativePath: 'assets/old.png', type: 'image', size: 1024 }]
      })
      mockElectronAPI.renameAsset.mockResolvedValue({ success: false })
      const store = useAssetStore()
      await store.importAssets('image')
      const ok = await store.renameAsset('assets/old.png', 'new')
      expect(ok).toBe(false)
    })

    it('electronAPI 不可用时返回 false', async () => {
      vi.stubGlobal('window', {})
      const store = useAssetStore()
      const ok = await store.renameAsset('old', 'new')
      expect(ok).toBe(false)
      vi.stubGlobal('window', { electronAPI: mockElectronAPI })
    })
  })

  describe('refreshAssets', () => {
    it('刷新资源列表', async () => {
      mockElectronAPI.listAssets.mockResolvedValue({
        success: true,
        data: [
          { name: 'a.png', relativePath: 'assets/a.png', type: 'image', size: 100 },
          { name: 'b.png', relativePath: 'assets/b.png', type: 'image', size: 200 }
        ]
      })
      const store = useAssetStore()
      await store.refreshAssets()
      expect(store.assets).toHaveLength(2)
    })

    it('projectPath 为空时不刷新', async () => {
      const ps = useProjectStore()
      ;(ps as any).meta = null
      const store = useAssetStore()
      await store.refreshAssets()
      expect(mockElectronAPI.listAssets).not.toHaveBeenCalled()
    })
  })

  describe('setCategory', () => {
    it('设置资源分类', () => {
      const store = useAssetStore()
      store.assets = [{ name: 'bg.png', relativePath: 'assets/bg.png', type: 'image', size: 1024, category: undefined as any }] as any
      store.setCategory('assets/bg.png', 'background')
      expect(store.assets[0].category).toBe('background')
    })

    it('资源不存在时不报错', () => {
      const store = useAssetStore()
      expect(() => store.setCategory('ghost.png', 'background')).not.toThrow()
    })
  })

  describe('selectedAsset', () => {
    it('删除选中的资源时清空 selectedAsset', async () => {
      mockElectronAPI.importAsset.mockResolvedValue({
        success: true,
        data: [{ name: 'bg.png', relativePath: 'assets/bg.png', type: 'image', size: 1024 }]
      })
      mockElectronAPI.deleteAsset.mockResolvedValue({ success: true })
      const store = useAssetStore()
      await store.importAssets('image')
      store.selectedAsset = store.assets[0]
      await store.deleteAsset('assets/bg.png')
      expect(store.selectedAsset).toBeNull()
    })
  })
})
