import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '../renderer/src/stores/projectStore'
import { useFlowStore } from '../renderer/src/stores/flowStore'
import { useVariableStore } from '../renderer/src/stores/variableStore'
import { useCharacterStore } from '../renderer/src/stores/characterStore'
import { useAchievementStore } from '../renderer/src/stores/achievementStore'
import { useSaveStore } from '../renderer/src/stores/saveStore'
import { useItemStore } from '../renderer/src/stores/itemStore'
import { useGlossaryStore } from '../renderer/src/stores/glossaryStore'

const makeProjectData = (overrides: any = {}) => ({
  meta: { name: 'Test', version: '1.0', projectPath: '/test/proj', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), resolution: '1280x720' as const },
  flow: { nodes: [], edges: [] },
  script: '',
  assets: [],
  variables: [],
  characters: [],
  globalFlags: {},
  flagAliases: {},
  groups: [],
  achievements: [],
  items: [],
  glossary: [],
  ...overrides
})

const mockElectronAPI = {
  createProject: vi.fn(),
  openProject: vi.fn(),
  saveProject: vi.fn(),
  saveProjectAs: vi.fn(),
}

vi.stubGlobal('window', { electronAPI: mockElectronAPI })

afterAll(() => { vi.unstubAllGlobals() })

describe('projectStore mock 全路径', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ══════════════════════════════════════════════
  describe('createProject', () => {
    it('成功创建项目 — 加载全部数据', async () => {
      mockElectronAPI.createProject.mockResolvedValue({
        success: true,
        data: makeProjectData({
          script: '@dialog(id: "n1", character: "A") {\n  content: "hi"\n}',
          assets: [{ name: 'bg.png', relativePath: 'assets/backgrounds/bg.png', type: 'image', size: 1024 }],
          variables: [{ name: 'score', type: 'number', initialValue: 0 }],
          characters: [{ name: 'Alice', displayName: 'Alice', color: '#fff', sprite: '', avatar: '', live2dModel: '' }],
          globalFlags: { intro_seen: true },
          flagAliases: { intro_seen: '看过序章' },
          flow: { nodes: [{ id: 'n1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'n1', character: 'A', content: 'hi' } }], edges: [] },
          achievements: [{ id: 'a1', name: '成就1', description: '', icon: '', unlocked: false }],
          items: [{ id: 'i1', name: '钥匙', icon: '🔑', type: 'key', description: '' }],
          glossary: [{ term: '樱花', category: '世界观', definition: '象征短暂与美丽' }],
          groups: [{ id: 'g1', name: '第一章', color: '#f00', nodeIds: [], bgmLoop: false, defaultBackground: '', transition: 'fade' }]
        })
      })
      const store = useProjectStore()
      await store.createProject('Test', '/test/proj')

      expect(store.isOpen).toBe(true)
      expect(store.meta?.name).toBe('Test')
      expect(store.script).toContain('@dialog')
      expect(store.assets).toHaveLength(1)
      expect(useVariableStore().variables).toHaveLength(1)
      expect(useCharacterStore().characters).toHaveLength(1)
      expect(useAchievementStore().achievements).toHaveLength(1)
      expect(useItemStore().items).toHaveLength(1)
      expect(useGlossaryStore().terms).toHaveLength(1)
    })

    it('createProject — result.data 为 null 时不加载', async () => {
      mockElectronAPI.createProject.mockResolvedValue({ success: true, data: null })
      const store = useProjectStore()
      await store.createProject('Test', '/test')
      expect(store.isOpen).toBe(false)
    })

    it('createProject — result.success 为 false 时不加载', async () => {
      mockElectronAPI.createProject.mockResolvedValue({ success: false })
      const store = useProjectStore()
      await store.createProject('Test', '/test')
      expect(store.isOpen).toBe(false)
    })

    it('createProject — electronAPI 不可用时静默返回 (line 86)', async () => {
      vi.stubGlobal('window', {})
      const store = useProjectStore()
      await store.createProject('Test', '/test')
      expect(store.isOpen).toBe(false)
      vi.stubGlobal('window', { electronAPI: mockElectronAPI })
    })

    it('createProject — 自动检测资源分类', async () => {
      mockElectronAPI.createProject.mockResolvedValue({
        success: true,
        data: makeProjectData({
          assets: [{ name: 'bg.png', relativePath: 'assets/backgrounds/sky.png', type: 'image', size: 1024 }]
        })
      })
      const store = useProjectStore()
      await store.createProject('Test', '/test')
      // backgrounds folder → 自动标记为 background 分类
      expect(store.assets[0].category).toBe('background')
    })
  })

  // ══════════════════════════════════════════════
  describe('openProject', () => {
    it('成功打开项目', async () => {
      mockElectronAPI.openProject.mockResolvedValue({
        success: true,
        data: makeProjectData()
      })
      const store = useProjectStore()
      await store.openProject()
      expect(store.isOpen).toBe(true)
    })

    it('openProject — result 为 null 时不加载', async () => {
      mockElectronAPI.openProject.mockResolvedValue(null)
      const store = useProjectStore()
      await store.openProject()
      expect(store.isOpen).toBe(false)
    })

    it('openProject — electronAPI 不可用时静默返回', async () => {
      vi.stubGlobal('window', {})
      const store = useProjectStore()
      await store.openProject()
      expect(store.isOpen).toBe(false)
      vi.stubGlobal('window', { electronAPI: mockElectronAPI })
    })
  })

  // ══════════════════════════════════════════════
  describe('saveProject', () => {
    it('成功保存项目', async () => {
      mockElectronAPI.createProject.mockResolvedValue({
        success: true,
        data: makeProjectData()
      })
      mockElectronAPI.saveProject.mockResolvedValue({ success: true })
      const store = useProjectStore()
      await store.createProject('Test', '/test/proj')

      const flowStore = useFlowStore()
      flowStore.addNode('dialog')
      const ok = await store.saveProject()
      expect(ok).toBe(true)
    })

    it('meta 为 null 时返回 false', async () => {
      const store = useProjectStore()
      const ok = await store.saveProject()
      expect(ok).toBe(false)
    })

    it('electronAPI 不可用时返回 false', async () => {
      mockElectronAPI.createProject.mockResolvedValue({
        success: true,
        data: makeProjectData()
      })
      const store = useProjectStore()
      await store.createProject('Test', '/test/proj')
      vi.stubGlobal('window', {})
      const ok = await store.saveProject()
      expect(ok).toBe(false)
      vi.stubGlobal('window', { electronAPI: mockElectronAPI })
    })

    it('projectPath 为空时返回 false', async () => {
      const store = useProjectStore()
      // 手动设置 meta 但 projectPath 为空
      ;(store as any).meta = { name: 'Test', projectPath: '' }
      const ok = await store.saveProject()
      expect(ok).toBe(false)
    })

    it('api 返回失败时返回 false (line 293)', async () => {
      mockElectronAPI.createProject.mockResolvedValue({
        success: true,
        data: makeProjectData()
      })
      mockElectronAPI.saveProject.mockResolvedValue({ success: false, error: '磁盘已满' })
      const store = useProjectStore()
      await store.createProject('Test', '/test/proj')
      const ok = await store.saveProject()
      expect(ok).toBe(false)
    })

    it('autoSync + 空脚本 → 自动从流程图生成', async () => {
      mockElectronAPI.createProject.mockResolvedValue({
        success: true,
        data: makeProjectData()
      })
      mockElectronAPI.saveProject.mockResolvedValue({ success: true })
      const store = useProjectStore()
      await store.createProject('Test', '/test/proj')
      store.setAutoSync(true)
      ;(store as any).script = '' // 清空脚本

      const flowStore = useFlowStore()
      flowStore.addNode('dialog')

      const ok = await store.saveProject()
      expect(ok).toBe(true)
      expect(store.script).not.toBe('') // 自动生成
    })
  })

  // ══════════════════════════════════════════════
  describe('saveProjectAs', () => {
    it('成功另存为', async () => {
      mockElectronAPI.createProject.mockResolvedValue({
        success: true,
        data: makeProjectData()
      })
      mockElectronAPI.saveProjectAs.mockResolvedValue({
        success: true,
        data: { path: '/new/path' }
      })
      const store = useProjectStore()
      await store.createProject('Test', '/test/proj')
      const ok = await store.saveProjectAs()
      expect(ok).toBe(true)
      expect(store.meta?.projectPath).toBe('/new/path')
    })

    it('meta 为 null 时返回 false', async () => {
      const store = useProjectStore()
      expect(await store.saveProjectAs()).toBe(false)
    })

    it('electronAPI 不可用时返回 false', async () => {
      mockElectronAPI.createProject.mockResolvedValue({
        success: true,
        data: makeProjectData()
      })
      const store = useProjectStore()
      await store.createProject('Test', '/test/proj')
      vi.stubGlobal('window', {})
      expect(await store.saveProjectAs()).toBe(false)
      vi.stubGlobal('window', { electronAPI: mockElectronAPI })
    })

    it('api 返回失败时返回 false', async () => {
      mockElectronAPI.createProject.mockResolvedValue({
        success: true,
        data: makeProjectData()
      })
      mockElectronAPI.saveProjectAs.mockResolvedValue({ success: false })
      const store = useProjectStore()
      await store.createProject('Test', '/test/proj')
      expect(await store.saveProjectAs()).toBe(false)
    })
  })

  // ══════════════════════════════════════════════
  describe('syncScriptFromFlow', () => {
    it('空流程图 → 生成空脚本', () => {
      const store = useProjectStore()
      store.syncScriptFromFlow()
      expect(store.script).toBe('')
    })

    it('有节点 → 生成脚本', () => {
      const store = useProjectStore()
      const flowStore = useFlowStore()
      flowStore.addNode('dialog')
      store.syncScriptFromFlow()
      expect(store.script.length).toBeGreaterThan(0)
    })
  })

  // ══════════════════════════════════════════════
  describe('closeProject', () => {
    it('关闭项目清空所有状态', async () => {
      mockElectronAPI.createProject.mockResolvedValue({
        success: true,
        data: makeProjectData()
      })
      const store = useProjectStore()
      await store.createProject('Test', '/test/proj')
      expect(store.isOpen).toBe(true)
      store.closeProject()
      expect(store.isOpen).toBe(false)
      expect(store.meta).toBeNull()
      expect(store.script).toBe('')
      expect(store.assets).toEqual([])
    })
  })

  // ══════════════════════════════════════════════
  describe('addToRecent', () => {
    it('新项目添加到最近列表', async () => {
      mockElectronAPI.createProject.mockImplementation((_name: string, path: string) =>
        Promise.resolve({ success: true, data: makeProjectData({ meta: { ...makeProjectData().meta, projectPath: path } }) })
      )
      const store = useProjectStore()
      await store.createProject('A', '/a')
      expect(store.recentProjects).toHaveLength(1)
    })

    it('重复项目移动到列表最前', async () => {
      mockElectronAPI.createProject.mockImplementation((_name: string, path: string) =>
        Promise.resolve({ success: true, data: makeProjectData({ meta: { ...makeProjectData().meta, projectPath: path } }) })
      )
      const store = useProjectStore()
      await store.createProject('A', '/a')
      await store.createProject('B', '/b')
      expect(store.recentProjects).toHaveLength(2)
      // 再次打开 A → 应移到最前
      await store.createProject('A', '/a')
      expect(store.recentProjects).toHaveLength(2)
      expect(store.recentProjects[0].projectPath).toBe('/a')
    })

    it('超过 10 个时裁剪到最新 10 个', async () => {
      mockElectronAPI.createProject.mockImplementation((_name: string, path: string) =>
        Promise.resolve({ success: true, data: makeProjectData({ meta: { ...makeProjectData().meta, projectPath: path } }) })
      )
      const store = useProjectStore()
      for (let i = 0; i < 12; i++) {
        await store.createProject(`P${i}`, `/p${i}`)
      }
      expect(store.recentProjects.length).toBeLessThanOrEqual(10)
    })
  })
})
