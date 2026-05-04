import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFlowStore } from '../renderer/src/stores/flowStore'
import { useProjectStore } from '../renderer/src/stores/projectStore'
import { useAssetStore } from '../renderer/src/stores/assetStore'
import { flowToScript } from '../renderer/src/utils/mappingEngine'
import type { ElectronAPI, ProjectData, FlowNode, FlowEdge } from '../renderer/src/types'

function createMockProjectData(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    meta: {
      name: '测试项目',
      version: '1.0.0',
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
      projectPath: 'E:/loveStory/爱.galgame',
      resolution: '1280x720'
    },
    flow: {
      nodes: [],
      edges: []
    },
    script: '',
    assets: [],
    ...overrides
  }
}

function createElectronApiMock(initialData?: ProjectData): ElectronAPI {
  let savedData: ProjectData | null = null
  let savedAsData: ProjectData | null = null

  return {
    createProject: vi.fn().mockImplementation(async (name: string, path: string) => {
      const data = createMockProjectData({
        meta: {
          name,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          projectPath: path,
          resolution: '1280x720'
        }
      })
      return { success: true, data }
    }),

    openProject: vi.fn().mockImplementation(async () => {
      if (savedData) {
        return { success: true, data: savedData }
      }
      if (initialData) {
        return { success: true, data: initialData }
      }
      return { success: false, error: '没有已保存的项目' }
    }),

    saveProject: vi.fn().mockImplementation(async (data: ProjectData) => {
      savedData = JSON.parse(JSON.stringify(data))
      return { success: true, data: { path: data.meta.projectPath } }
    }),

    saveProjectAs: vi.fn().mockImplementation(async (data: ProjectData) => {
      savedAsData = JSON.parse(JSON.stringify(data))
      const newPath = 'E:/loveStory/爱-副本.galgame'
      return { success: true, data: { path: newPath } }
    }),

    importAsset: vi.fn().mockResolvedValue({ success: true, data: [
      { name: 'bg.png', relativePath: 'assets/backgrounds/bg.png', type: 'image', size: 102400 },
      { name: 'char.png', relativePath: 'assets/characters/char.png', type: 'image', size: 204800 }
    ]}),

    deleteAsset: vi.fn().mockResolvedValue({ success: true }),
    listAssets: vi.fn().mockResolvedValue({ success: true, data: [] }),

    showOpenDialog: vi.fn().mockResolvedValue({ success: true, data: ['E:/loveStory'] }),
    showSaveDialog: vi.fn().mockResolvedValue({ success: true, data: 'E:/loveStory/new.galgame' }),
    openDirectory: vi.fn(),
    getAppVersion: vi.fn().mockResolvedValue('1.0.0'),

    createBackup: vi.fn().mockResolvedValue('/tmp/backup.json'),
    listBackups: vi.fn().mockResolvedValue([]),
    restoreBackup: vi.fn(),

    exportProject: vi.fn().mockResolvedValue({ success: true, outputPath: 'E:/export' }),

    log: vi.fn()
  } as ElectronAPI
}

describe('全流程集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ============================================================
  // 流程 1: 新建项目 → 添加节点 → 连线 → 保存 → 打开 → 验证
  // ============================================================
  describe('流程 1: 新建项目 → 编辑流程图 → 保存 → 重新打开 → 验证数据完整', () => {
    it('完整保存与重新加载流程', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()
      const flowStore = useFlowStore()

      // 1. 新建项目
      await projectStore.createProject('爱の物語', 'E:/loveStory')

      expect(projectStore.meta?.name).toBe('爱の物語')
      expect(projectStore.isOpen).toBe(true)
      expect(flowStore.nodes).toEqual([])
      expect(flowStore.edges).toEqual([])

      // 2. 添加三种类型的节点
      flowStore.addNode('dialog', { x: 100, y: 100 })
      flowStore.addNode('choice', { x: 400, y: 100 })
      flowStore.addNode('condition', { x: 700, y: 100 })

      expect(flowStore.nodes.length).toBe(3)
      expect(flowStore.isDirty).toBe(true)

      // 3. 编辑节点内容
      const dialogNode = flowStore.nodes[0]
      flowStore.updateNode(dialogNode.id, {
        character: '主人公',
        content: 'こんにちは、世界！'
      })

      const choiceNode = flowStore.nodes[1] as FlowNode
      flowStore.updateNode(choiceNode.id, {
        title: '选择去向',
        options: [
          { id: 'opt1', text: '去森林', nextNodeId: '' },
          { id: 'opt2', text: '去海边', nextNodeId: '' }
        ]
      })

      const condNode = flowStore.nodes[2] as FlowNode
      expect(condNode.type).toBe('condition')
      flowStore.updateNode(condNode.id, {
        expression: '好感度 > 50',
        trueNextId: '',
        falseNextId: ''
      })
      expect(flowStore.nodes[2].data).toHaveProperty('expression', '好感度 > 50')

      // 4. 创建连线（edge 的 label 作为选择节点的选项文本）
      flowStore.addEdge(dialogNode.id, choiceNode.id, '去森林')
      flowStore.addEdge(choiceNode.id, condNode.id, '去海边')

      expect(flowStore.edges.length).toBe(2)

      // 手动触发脚本同步（由于测试环境下 Vue watcher 异步行为不可控）
      projectStore.syncScriptFromFlow()

      // 5. 验证脚本生成正确
      const script = projectStore.script
      expect(script).toContain('@dialog')
      expect(script).toContain('主人公')
      expect(script).toContain('こんにちは、世界！')
      expect(script).toContain('@choice')
      expect(script).toContain('去海边')
      expect(script).toContain('@condition')
      expect(script).toContain('好感度 > 50')

      // 6. 保存项目
      const saveResult = await projectStore.saveProject()
      expect(saveResult).toBe(true)
      expect(flowStore.isDirty).toBe(false)
      expect(electronAPI.saveProject).toHaveBeenCalledTimes(1)

      // 验证保存的数据包含所有内容
      const savedArg = vi.mocked(electronAPI.saveProject).mock.calls[0][0] as ProjectData
      expect(savedArg.flow.nodes.length).toBe(3)
      expect(savedArg.flow.edges.length).toBe(2)
      expect(savedArg.script).toContain('主人公')
      expect(savedArg.script).toContain('こんにちは、世界！')

      // 7. 模拟重新打开项目（重置 store）
      flowStore.loadFlow([], [])
      expect(flowStore.nodes.length).toBe(0)

      // 模拟从磁盘读取已保存的数据
      const savedData = vi.mocked(electronAPI.saveProject).mock.calls[0][0] as ProjectData
      vi.mocked(electronAPI.openProject).mockResolvedValue({ success: true, data: savedData })

      await projectStore.openProject()

      // 8. 验证加载后的数据完整
      expect(projectStore.meta?.name).toBe('爱の物語')
      expect(flowStore.nodes.length).toBe(3)
      expect(flowStore.edges.length).toBe(2)
      expect(flowStore.isDirty).toBe(false)

      const loadedDialog = flowStore.nodes.find(n => n.type === 'dialog')
      expect(loadedDialog).toBeDefined()
      expect((loadedDialog!.data as any).content).toBe('こんにちは、世界！')

      const loadedChoice = flowStore.nodes.find(n => n.type === 'choice')
      expect(loadedChoice).toBeDefined()
      expect((loadedChoice!.data as any).title).toBe('选择去向')
    })

    it('保存后再打开 retains assets', async () => {
      const initialData = createMockProjectData({
        meta: {
          name: '带资源的项目',
          version: '1.0.0',
          createdAt: '2026-04-12T00:00:00.000Z',
          updatedAt: '2026-04-12T00:00:00.000Z',
          projectPath: 'E:/assets-test.galgame',
          resolution: '1280x720'
        },
        assets: [
          { name: 'bg.png', relativePath: 'assets/backgrounds/bg.png', type: 'image', size: 1234 }
        ]
      })

      const electronAPI = createElectronApiMock(initialData)
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()

      await projectStore.openProject()

      // assets 被正确加载到 projectStore
      expect(projectStore.assets.length).toBe(1)
      expect(projectStore.assets[0].name).toBe('bg.png')

      // assets 也被同步到 assetStore
      const assetStore = useAssetStore()
      expect(assetStore.assets.length).toBe(1)

      // 保存时 assets 应该保留
      await projectStore.saveProject()
      const savedData = vi.mocked(electronAPI.saveProject).mock.calls[0][0] as ProjectData
      expect(savedData.assets.length).toBe(1)
      expect(savedData.assets[0].name).toBe('bg.png')
    })
  })

  // ============================================================
  // 流程 2: 另存为流程
  // ============================================================
  describe('流程 2: 另存为功能', () => {
    it('另存为后更新项目路径', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()
      const flowStore = useFlowStore()

      await projectStore.createProject('原始项目', 'E:/original.galgame')
      flowStore.addNode('dialog')

      const result = await projectStore.saveProjectAs()
      expect(result).toBe(true)
      expect(projectStore.meta?.projectPath).toBe('E:/loveStory/爱-副本.galgame')
    })

    it('未打开项目时 saveProjectAs 返回 false', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()

      const result = await projectStore.saveProjectAs()
      expect(result).toBe(false)
    })
  })

  // ============================================================
  // 流程 3: 关闭项目 → 状态重置
  // ============================================================
  describe('流程 3: 关闭项目状态重置', () => {
    it('closeProject 重置所有状态', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()
      const flowStore = useFlowStore()

      await projectStore.createProject('测试', 'E:/test.galgame')
      flowStore.addNode('dialog')
      flowStore.addNode('choice')

      projectStore.closeProject()

      expect(projectStore.meta).toBeNull()
      expect(projectStore.isOpen).toBe(false)
      expect(projectStore.script).toBe('')
      expect(projectStore.assets).toEqual([])
    })
  })

  // ============================================================
  // 流程 4: 最近项目列表
  // ============================================================
  describe('流程 4: 最近项目列表', () => {
    it('最近项目列表不超过 10 个', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()

      for (let i = 0; i < 15; i++) {
        const data = createMockProjectData({
          meta: {
            name: `项目${i}`,
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectPath: `E:/项目${i}.galgame`,
            resolution: '1280x720'
          }
        })
        vi.mocked(electronAPI.createProject).mockResolvedValueOnce({ success: true, data })
        await projectStore.createProject(`项目${i}`, `E:/项目${i}.galgame`)
      }

      expect(projectStore.recentProjects.length).toBeLessThanOrEqual(10)
      // 最近的项目在最前面
      expect(projectStore.recentProjects[0].name).toBe('项目14')
    })
  })

  // ============================================================
  // 流程 5: 流程图编辑与撤销/重做
  // ============================================================
  describe('流程 5: 撤销/重做', () => {
    it('撤销/重做保存历史，保存后仍保留历史', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()
      const flowStore = useFlowStore()

      await projectStore.createProject('撤销测试', 'E:/undo.galgame')

      flowStore.addNode('dialog', { x: 0, y: 0 })
      expect(flowStore.nodes.length).toBe(1)

      flowStore.addNode('choice', { x: 200, y: 0 })
      expect(flowStore.nodes.length).toBe(2)

      flowStore.undo()
      expect(flowStore.nodes.length).toBe(1)

      flowStore.redo()
      expect(flowStore.nodes.length).toBe(2)

      // 保存后撤销历史保留
      await projectStore.saveProject()
      flowStore.undo()
      expect(flowStore.nodes.length).toBe(1)
    })
  })

  // ============================================================
  // 流程 6: 映射引擎双向转换
  // ============================================================
  describe('流程 6: 映射引擎', () => {
    it('flowToScript 处理中文和特殊字符', () => {
      const nodes: FlowNode[] = [
        {
          id: 'n1',
          type: 'dialog',
          position: { x: 0, y: 0 },
          data: {
            id: 'n1',
            label: '你好',
            character: '角色A',
            content: '你好世界！Hello World! こんにちは 🌸'
          }
        }
      ]
      const edges: FlowEdge[] = []

      const script = flowToScript(nodes, edges)
      expect(script).toContain('角色A')
      expect(script).toContain('你好世界！Hello World! こんにちは 🌸')
    })

    it('flowToScript 对空节点数组返回空字符串', () => {
      expect(flowToScript([], [])).toBe('')
    })

    it('flowToScript 处理转义字符', () => {
      const nodes: FlowNode[] = [
        {
          id: 'n1',
          type: 'dialog',
          position: { x: 0, y: 0 },
          data: {
            id: 'n1',
            label: '转义',
            character: '角色"带引号"',
            content: '路径: C:\\Users\\test'
          }
        }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('角色\\"带引号\\"')
      expect(script).toContain('C:\\\\Users\\\\test')
    })
  })

  // ============================================================
  // 流程 7: 同步状态管理
  // ============================================================
  describe('流程 7: 同步状态', () => {
    it('流程图变更后同步状态变化', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()
      const flowStore = useFlowStore()

      await projectStore.createProject('同步测试', 'E:/sync.galgame')
      expect(flowStore.syncState).toBe('synced')

      flowStore.addNode('dialog')

      projectStore.syncScriptFromFlow()

      expect(projectStore.script).not.toBe('')
    })

    it('关闭自动同步后变更流程图不生成代码', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()
      const flowStore = useFlowStore()

      await projectStore.createProject('关闭同步', 'E:/nosync.galgame')
      projectStore.setAutoSync(false)

      const prevScript = projectStore.script

      flowStore.addNode('dialog')
      // 期望 script 没有变化（因为 autoSync 关闭）
      expect(projectStore.script).toBe(prevScript)
    })
  })

  // ============================================================
  // 流程 8: electronAPI 不可用时的降级行为
  // ============================================================
  describe('流程 8: 降级行为', () => {
    it('无 electronAPI 时 createProject 不报错', async () => {
      window.electronAPI = undefined as unknown as ElectronAPI
      const projectStore = useProjectStore()

      await expect(projectStore.createProject('测试', 'E:/test.galgame')).resolves.toBeUndefined()
      expect(projectStore.isOpen).toBe(false)
    })

    it('无 electronAPI 时 saveProject 返回 false', async () => {
      window.electronAPI = undefined as unknown as ElectronAPI
      const projectStore = useProjectStore()

      const result = await projectStore.saveProject()
      expect(result).toBe(false)
    })
  })

  // ============================================================
  // 流程 9: 资源管理
  // ============================================================
  describe('流程 9: 资源管理', () => {
    it('导入资源后 assetStore 同步更新', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()
      const assetStore = useAssetStore()

      await projectStore.createProject('资源测试', 'E:/asset-test.galgame')
      expect(assetStore.assets.length).toBe(0)

      await assetStore.importAssets('image')
      expect(assetStore.assets.length).toBe(2)
      expect(assetStore.assets[0].name).toBe('bg.png')
      expect(assetStore.assets[1].name).toBe('char.png')

      // 保存时应包含资源数据
      await projectStore.saveProject()
      const savedData = vi.mocked(electronAPI.saveProject).mock.calls[0][0] as ProjectData
      expect(savedData.assets.length).toBe(2)
    })

    it('删除资源', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()
      const assetStore = useAssetStore()

      await projectStore.createProject('删除测试', 'E:/delete-test.galgame')
      await assetStore.importAssets('image')
      expect(assetStore.assets.length).toBe(2)

      await assetStore.deleteAsset('assets/backgrounds/bg.png')
      expect(assetStore.assets.length).toBe(1)
    })

    it('无 electronAPI 时 importAssets 不报错', async () => {
      window.electronAPI = undefined as unknown as ElectronAPI
      const assetStore = useAssetStore()

      await expect(assetStore.importAssets('image')).resolves.toBeUndefined()
    })
  })

  // ============================================================
  // 流程 10: 场景分组保存/加载
  // ============================================================
  describe('流程 10: 场景分组保存与加载', () => {
    it('场景分组随项目保存并重新加载', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()
      const flowStore = useFlowStore()

      await projectStore.createProject('分组测试', 'E:/groupTest.galgame')

      // 创建节点和分组
      flowStore.addNode('dialog', { x: 100, y: 100 })
      flowStore.addNode('choice', { x: 300, y: 100 })
      flowStore.addNode('condition', { x: 500, y: 100 })
      const nids = flowStore.nodes.map(n => n.id)

      const gid1 = flowStore.addGroup('序章', '#3b82f6')
      flowStore.addNodesToGroup(gid1, [nids[0], nids[1]])

      const gid2 = flowStore.addGroup('分支', '#f97316')
      flowStore.addNodeToGroup(gid2, nids[2])

      // 保存
      await projectStore.saveProject()

      // 验证保存的数据包含 groups
      const savedArg = vi.mocked(electronAPI.saveProject).mock.calls[0][0] as ProjectData
      expect(savedArg.groups).toBeDefined()
      expect(savedArg.groups!.length).toBe(2)
      expect(savedArg.groups![0].name).toBe('序章')
      expect(savedArg.groups![0].color).toBe('#3b82f6')
      expect(savedArg.groups![0].nodeIds).toContain(nids[0])
      expect(savedArg.groups![0].nodeIds).toContain(nids[1])
      expect(savedArg.groups![1].name).toBe('分支')
      expect(savedArg.groups![1].nodeIds).toContain(nids[2])

      // 重新打开
      flowStore.loadFlow([], [])
      flowStore.loadGroups([])
      await projectStore.openProject()

      expect(flowStore.groups).toHaveLength(2)
      expect(flowStore.groups[0].name).toBe('序章')
      expect(flowStore.groups[1].name).toBe('分支')
      expect(flowStore.groups[0].nodeIds).toContain(nids[0])
      expect(flowStore.groups[1].nodeIds).toContain(nids[2])
    })

    it('空分组项目加载不报错', async () => {
      const electronAPI = createElectronApiMock()
      window.electronAPI = electronAPI
      const projectStore = useProjectStore()
      const flowStore = useFlowStore()

      await projectStore.createProject('无分组', 'E:/noGroup.galgame')
      flowStore.addNode('dialog')

      await projectStore.saveProject()

      flowStore.loadFlow([], [])
      flowStore.loadGroups([])
      await projectStore.openProject()

      expect(flowStore.groups).toEqual([])
    })

    it('删除节点后分组中的引用也被清理', () => {
      const flowStore = useFlowStore()

      flowStore.addNode('dialog')
      flowStore.addNode('choice')
      const nid1 = flowStore.nodes[0].id
      const nid2 = flowStore.nodes[1].id

      const gid = flowStore.addGroup('测试')
      flowStore.addNodesToGroup(gid, [nid1, nid2])
      expect(flowStore.groups[0].nodeIds).toEqual([nid1, nid2])

      flowStore.removeNode(nid1)
      expect(flowStore.groups[0].nodeIds).toEqual([nid2])
    })

    it('分组颜色修改正确', () => {
      const flowStore = useFlowStore()
      const gid = flowStore.addGroup('彩色分组', '#6366f1')

      const presetColors = ['#ef4444', '#22c55e', '#eab308', '#3b82f6']
      for (const c of presetColors) {
        flowStore.setGroupColor(gid, c)
        expect(flowStore.groups[0].color).toBe(c)
      }
    })

    it('重命名空分组', () => {
      const flowStore = useFlowStore()
      const gid = flowStore.addGroup('空分组')
      flowStore.renameGroup(gid, '改为有内容')
      expect(flowStore.groups[0].name).toBe('改为有内容')
    })

    it('分组节点列表与 flow store 节点保持同步', () => {
      const flowStore = useFlowStore()

      flowStore.addNode('dialog')
      flowStore.addNode('choice')
      flowStore.addNode('end')
      const nids = flowStore.nodes.map(n => n.id)

      const gid = flowStore.addGroup('全部')
      flowStore.addNodesToGroup(gid, nids)

      // 删除一个节点后，分组引用应该同步
      flowStore.removeNode(nids[1])
      expect(flowStore.groups[0].nodeIds).not.toContain(nids[1])
      expect(flowStore.groups[0].nodeIds).toContain(nids[0])
      expect(flowStore.groups[0].nodeIds).toContain(nids[2])
    })
  })

  // ============================================================
  // 流程 11: assetUrl 工具函数
  // ============================================================
  describe('流程 11: assetUrl 工具', () => {
    it('getAssetUrl 生成正确的 file:// URL', async () => {
      const { getAssetUrl } = await import('../renderer/src/utils/assetUrl')

      const url = getAssetUrl('E:/project.galgame', 'assets/backgrounds/bg.png')
      expect(url).toBe('file:///E:/project.galgame/assets/backgrounds/bg.png')

      const urlWin = getAssetUrl('E:\\project.galgame', 'assets\\backgrounds\\bg.png')
      expect(urlWin).toBe('file:///E:/project.galgame/assets/backgrounds/bg.png')
    })

    it('getAssetUrl 空参数返回空字符串', async () => {
      const { getAssetUrl } = await import('../renderer/src/utils/assetUrl')

      expect(getAssetUrl('', 'path')).toBe('')
      expect(getAssetUrl('path', '')).toBe('')
    })
  })
})
