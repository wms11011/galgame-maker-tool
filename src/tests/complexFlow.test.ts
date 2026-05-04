import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFlowStore } from '../renderer/src/stores/flowStore'
import { useProjectStore } from '../renderer/src/stores/projectStore'
import { useAssetStore } from '../renderer/src/stores/assetStore'
import { flowToScript, scriptToFlow } from '../renderer/src/utils/mappingEngine'
import type { ElectronAPI, ProjectData, FlowNode, FlowEdge } from '../renderer/src/types'

function createMockProjectData(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    meta: {
      name: 'test', version: '1.0.0',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      projectPath: 'E:/test.galgame', resolution: '1280x720'
    },
    flow: { nodes: [], edges: [] },
    script: '', assets: [], variables: [],
    ...overrides
  }
}

function createElectronApiMock(): ElectronAPI {
  let saved: ProjectData | null = null
  return {
    createProject: vi.fn().mockImplementation(async (name, path) => ({
      success: true,
      data: createMockProjectData({
        meta: { ...createMockProjectData().meta, name, projectPath: path,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      })
    })),
    openProject: vi.fn().mockImplementation(async () =>
      saved ? { success: true, data: JSON.parse(JSON.stringify(saved)) }
        : { success: false, error: 'no data' }),
    saveProject: vi.fn().mockImplementation(async (data: ProjectData) => {
      saved = JSON.parse(JSON.stringify(data))
      return { success: true, data: { path: data.meta.projectPath } }
    }),
    saveProjectAs: vi.fn().mockResolvedValue({ success: true, data: { path: 'E:/copy.galgame' } }),
    importAsset: vi.fn().mockResolvedValue({ success: true, data: [] }),
    deleteAsset: vi.fn().mockResolvedValue({ success: true }),
    listAssets: vi.fn().mockResolvedValue({ success: true, data: [] }),
    showOpenDialog: vi.fn().mockResolvedValue({ success: true, data: ['E:/'] }),
    showSaveDialog: vi.fn().mockResolvedValue({ success: true, data: 'E:/' }),
    openDirectory: vi.fn(),
    getAppVersion: vi.fn().mockResolvedValue('1.0.0'),
    createBackup: vi.fn().mockResolvedValue('/tmp/backup.json'),
    listBackups: vi.fn().mockResolvedValue([]),
    restoreBackup: vi.fn(),
    exportProject: vi.fn().mockResolvedValue({ success: true, outputPath: 'E:/export' }),
    log: vi.fn()
  } as unknown as ElectronAPI
}

beforeEach(() => {
  setActivePinia(createPinia())
})

// ============================================================
// 场景 1：复杂多分支剧情 — 完整的视觉小说流程
// ============================================================
describe('场景 1: 复杂多分支剧情（完整视觉小说场景）', () => {
  it('构建包含 4 个分支、3 段结局的完整剧情流程', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    const ps = useProjectStore()
    const fs = useFlowStore()

    await ps.createProject('夏日的选择', 'E:/summer.galgame')

    // ===== 序章 =====
    fs.addNode('dialog', { x: 400, y: 0 })
    fs.updateNode(fs.nodes[0].id, { character: '旁白', content: '暑假的最后一天，你站在岔路口。' })

    // ===== 第一个选择：去哪里 =====
    fs.addNode('choice', { x: 400, y: 150 })
    fs.updateNode(fs.nodes[1].id, { title: '去哪里？' })
    const choice1Id = fs.nodes[1].id
    fs.addEdge(fs.nodes[0].id, choice1Id)

    // ===== 分支 A：去海边 =====
    fs.addNode('dialog', { x: 0, y: 300 })
    fs.updateNode(fs.nodes[2].id, { character: '友人', content: '嘿！终于等到你了！' })
    const beachGreetId = fs.nodes[2].id
    fs.addEdge(choice1Id, beachGreetId, '去海边')

    fs.addNode('dialog', { x: 0, y: 450 })
    fs.updateNode(fs.nodes[3].id, { character: '友人', content: '今天浪很大，适合冲浪！' })
    fs.addEdge(beachGreetId, fs.nodes[3].id)

    fs.addNode('choice', { x: 0, y: 600 })
    fs.updateNode(fs.nodes[4].id, { title: '怎么回应？' })
    const beachChoiceId = fs.nodes[4].id
    fs.addEdge(fs.nodes[3].id, beachChoiceId)

    // 分支 A1：一起冲浪 → 好感度 +1
    fs.addNode('dialog', { x: -200, y: 750 })
    fs.updateNode(fs.nodes[5].id, { character: '你', content: '太棒了！我这就来！', background: 'assets/beach.png' })
    fs.addEdge(beachChoiceId, fs.nodes[5].id, '一起冲浪！')

    // 分支 A2：在岸边看 → 普通结局
    fs.addNode('dialog', { x: 200, y: 750 })
    fs.updateNode(fs.nodes[6].id, { character: '你', content: '我在这看着你就好。', background: 'assets/beach.png' })
    fs.addEdge(beachChoiceId, fs.nodes[6].id, '我看看就好')

    // 分支 A1 后续：条件判断好感度
    fs.addNode('condition', { x: -200, y: 900 })
    fs.updateNode(fs.nodes[7].id, { expression: '好感度 >= 3' })
    const cond1Id = fs.nodes[7].id
    fs.addEdge(fs.nodes[5].id, cond1Id)

    // 结局 A1a：好感度足够 → 真结局
    fs.addNode('dialog', { x: -400, y: 1050 })
    fs.updateNode(fs.nodes[8].id, { character: '友人', content: '你冲浪的样子真帅…（脸红了）', characterSprite: 'assets/char-happy.png' })
    const trueEndId = fs.nodes[8].id
    fs.addEdge(cond1Id, trueEndId, 'true')

    // 结局 A1b：好感度不足 → 普通朋友结局
    fs.addNode('dialog', { x: 0, y: 1050 })
    fs.updateNode(fs.nodes[9].id, { character: '友人', content: '今天玩得很开心，下次再来吧！' })
    fs.addEdge(cond1Id, fs.nodes[9].id, 'false')

    // 分支 A2 自然延续 → 普通结局（合并）
    fs.addEdge(fs.nodes[6].id, fs.nodes[9].id)

    // ===== 分支 B：去图书馆 =====
    fs.addNode('dialog', { x: 800, y: 300 })
    fs.updateNode(fs.nodes[10].id, { character: '你', content: '还是去图书馆安静地看书吧。', background: 'assets/library.png' })
    fs.addEdge(choice1Id, fs.nodes[10].id, '去图书馆')

    fs.addNode('choice', { x: 800, y: 450 })
    fs.updateNode(fs.nodes[11].id, { title: '看什么书？' })
    fs.addEdge(fs.nodes[10].id, fs.nodes[11].id)

    // 分支 B1：看小说
    fs.addNode('dialog', { x: 700, y: 600 })
    fs.updateNode(fs.nodes[12].id, { character: '你', content: '这本小说真有趣…', background: 'assets/library.png' })
    fs.addEdge(fs.nodes[11].id, fs.nodes[12].id, '看小说')

    // 分支 B2：学习 → 好感度 +1（遇到了友人也在学习）
    fs.addNode('dialog', { x: 900, y: 600 })
    fs.updateNode(fs.nodes[13].id, { character: '友人', content: '咦？你也在这里学习？', background: 'assets/library.png' })
    fs.addEdge(fs.nodes[11].id, fs.nodes[13].id, '学习')

    fs.addNode('dialog', { x: 900, y: 750 })
    fs.updateNode(fs.nodes[14].id, { character: '你', content: '好巧！我们一起吧。' })
    fs.addEdge(fs.nodes[13].id, fs.nodes[14].id)

    // 分支 B1 结局：独自看书
    fs.addNode('dialog', { x: 700, y: 750 })
    fs.updateNode(fs.nodes[15].id, { character: '旁白', content: '你度过了一个宁静的下午。' })
    fs.addEdge(fs.nodes[12].id, fs.nodes[15].id)

    // ===== 分支 C：直接回家 =====
    fs.addNode('dialog', { x: 400, y: 300 })
    fs.updateNode(fs.nodes[16].id, { character: '你', content: '今天哪儿也不去，回家打游戏。', background: 'assets/home.png' })
    fs.addEdge(choice1Id, fs.nodes[16].id, '回家')

    fs.addNode('dialog', { x: 400, y: 450 })
    fs.updateNode(fs.nodes[17].id, { character: '旁白', content: '你窝在沙发上打了一天的游戏……' })
    fs.addEdge(fs.nodes[16].id, fs.nodes[17].id)

    // ===== 最终统计与验证 =====
    expect(fs.nodes.length).toBe(18)
    expect(fs.edges.length).toBe(18)

    // 验证节点类型
    expect(fs.nodes.filter(n => n.type === 'dialog').length).toBe(14)
    expect(fs.nodes.filter(n => n.type === 'choice').length).toBe(3)
    expect(fs.nodes.filter(n => n.type === 'condition').length).toBe(1)

    // 验证连线完整性：所有节点都被连线
    const allConnectedIds = new Set<string>()
    for (const e of fs.edges) {
      allConnectedIds.add(e.source)
      allConnectedIds.add(e.target)
    }
    for (const n of fs.nodes) {
      expect(allConnectedIds.has(n.id)).toBe(true)
    }

    // 验证连线不重复
    const edgeKeys = fs.edges.map(e => `${e.source}->${e.target}`)
    expect(new Set(edgeKeys).size).toBe(edgeKeys.length)

    // 验证编辑内容保留
    const dialogNodes = fs.nodes.filter(n => n.type === 'dialog')
    const beachBg = dialogNodes.find(n => (n.data as any).background === 'assets/beach.png')
    expect(beachBg).toBeDefined()
    expect((beachBg!.data as any).character).toBe('你')

    const friendHappy = dialogNodes.find(n => (n.data as any).characterSprite === 'assets/char-happy.png')
    expect(friendHappy).toBeDefined()
    expect((friendHappy!.data as any).character).toBe('友人')

    // 验证选择节点选项
    const beachChoice = dialogNodes.find(n => (n.data as any).character === '友人' && (n.data as any).content?.includes('冲浪'))
    expect(beachChoice).toBeDefined()

    // 验证条件节点
    const conditionNodes = fs.nodes.filter(n => n.type === 'condition')
    expect(conditionNodes.length).toBe(1)
    expect((conditionNodes[0].data as any).expression).toBe('好感度 >= 3')

    // 验证节点 ID 唯一性
    expect(new Set(fs.nodes.map(n => n.id)).size).toBe(fs.nodes.length)

    // 保存并验证数据完整性
    ps.syncScriptFromFlow()
    const saveOk = await ps.saveProject()
    expect(saveOk).toBe(true)

    const savedData = vi.mocked(api.saveProject).mock.calls[0][0] as ProjectData
    expect(savedData.flow.nodes.length).toBe(18)
    expect(savedData.flow.edges.length).toBe(18)
    expect(savedData.script).toContain('@dialog')
    expect(savedData.script).toContain('@choice')
    expect(savedData.script).toContain('@condition')
    expect(savedData.script).toContain('好感度 >= 3')
    expect(savedData.script).toContain('assets/beach.png')

    // 重新打开验证
    fs.loadFlow([], [])
    vi.mocked(api.openProject).mockResolvedValue({ success: true, data: savedData })
    await ps.openProject()

    expect(fs.nodes.length).toBe(18)
    expect(fs.edges.length).toBe(18)
  })

  it('编辑项目 → 保存 → 再次编辑 → 再次保存（多次保存循环）', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    const ps = useProjectStore()
    const fs = useFlowStore()

    await ps.createProject('迭代保存', 'E:/iter.galgame')

    // 第 1 次迭代：1 个节点
    fs.addNode('dialog')
    fs.updateNode(fs.nodes[0].id, { character: 'A', content: '第一版' })
    ps.syncScriptFromFlow()
    await ps.saveProject()

    let savedData = vi.mocked(api.saveProject).mock.calls[0][0] as ProjectData
    expect(savedData.flow.nodes.length).toBe(1)

    // 第 2 次迭代：+1 节点 + 连线
    fs.addNode('dialog')
    fs.updateNode(fs.nodes[1].id, { character: 'B', content: '第二版' })
    fs.addEdge(fs.nodes[0].id, fs.nodes[1].id)
    ps.syncScriptFromFlow()
    await ps.saveProject()

    savedData = vi.mocked(api.saveProject).mock.calls[1][0] as ProjectData
    expect(savedData.flow.nodes.length).toBe(2)
    expect(savedData.flow.edges.length).toBe(1)
    expect(savedData.script).toContain('第一版')
    expect(savedData.script).toContain('第二版')

    // 第 3 次迭代：添加选择分支
    fs.addNode('choice')
    fs.updateNode(fs.nodes[2].id, { title: '选择？', options: [{ id: 'o1', text: '是', nextNodeId: '' }] })
    fs.addEdge(fs.nodes[1].id, fs.nodes[2].id)
    fs.addNode('dialog')
    fs.updateNode(fs.nodes[3].id, { character: 'C', content: '第三版' })
    fs.addEdge(fs.nodes[2].id, fs.nodes[3].id, '是')
    ps.syncScriptFromFlow()
    await ps.saveProject()

    savedData = vi.mocked(api.saveProject).mock.calls[2][0] as ProjectData
    expect(savedData.flow.nodes.length).toBe(4)
    expect(savedData.flow.edges.length).toBe(3)

    // 重新打开验证所有迭代数据都保留
    fs.loadFlow([], [])
    vi.mocked(api.openProject).mockResolvedValue({ success: true, data: savedData })
    await ps.openProject()
    expect(fs.nodes.length).toBe(4)
    expect(fs.edges.length).toBe(3)
    const loadedC = fs.nodes.find(n => (n.data as any).character === 'C')
    expect(loadedC).toBeDefined()
    expect((loadedC!.data as any).content).toBe('第三版')
  })
})

// ============================================================
// 场景 2：极端节点数量 — 100 节点性能与可靠性
// ============================================================
describe('场景 2: 极端节点数量', () => {
  it('创建 100 个节点并全部连线为链，保存后重新打开完整', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    const ps = useProjectStore()
    const fs = useFlowStore()

    await ps.createProject('大海', 'E:/ocean.galgame')

    const N = 100
    const nodeIds: string[] = []

    for (let i = 0; i < N; i++) {
      fs.addNode(i % 3 === 2 ? 'choice' : 'dialog', { x: (i % 10) * 150, y: Math.floor(i / 10) * 120 })
      const node = fs.nodes[fs.nodes.length - 1]
      nodeIds.push(node.id)

      if (node.type === 'dialog') {
        fs.updateNode(node.id, { character: `角色${i}`, content: `这是第 ${i} 句对话，包含中文、English、数字 12345。` })
      } else {
        fs.updateNode(node.id, {
          title: `选择${i}`,
          options: [
            { id: `${node.id}_o1`, text: `选项${i}A`, nextNodeId: '' },
            { id: `${node.id}_o2`, text: `选项${i}B`, nextNodeId: '' }
          ]
        })
      }
    }

    // 创建链式连线
    for (let i = 0; i < N - 1; i++) {
      fs.addEdge(nodeIds[i], nodeIds[i + 1])
    }

    expect(fs.nodes.length).toBe(N)
    expect(fs.edges.length).toBe(N - 1)

    // 所有节点 ID 唯一
    expect(new Set(fs.nodes.map(n => n.id)).size).toBe(N)

    // 保存
    ps.syncScriptFromFlow()
    expect(await ps.saveProject()).toBe(true)

    const savedData = vi.mocked(api.saveProject).mock.calls[0][0] as ProjectData
    expect(savedData.flow.nodes.length).toBe(N)
    expect(savedData.flow.edges.length).toBe(N - 1)
    expect(savedData.script.length).toBeGreaterThan(1000)

    // 重新打开
    fs.loadFlow([], [])
    vi.mocked(api.openProject).mockResolvedValue({ success: true, data: savedData })
    await ps.openProject()

    expect(fs.nodes.length).toBe(N)
    expect(fs.edges.length).toBe(N - 1)

    // 验证第 48 个节点内容保留（48 % 3 = 0，是 dialog 节点）
    const midNode = fs.nodes.find(n => (n.data as any).character === '角色48')
    expect(midNode).toBeDefined()
    expect((midNode!.data as any).content).toContain('第 48 句对话')
  })

  it('连续快速添加节点（同一毫秒内）— ID 不重复', () => {
    const fs = useFlowStore()
    for (let i = 0; i < 100; i++) {
      fs.addNode('dialog')
    }
    expect(fs.nodes.length).toBe(100)
    expect(new Set(fs.nodes.map(n => n.id)).size).toBe(100)
  })
})

// ============================================================
// 场景 3：撤销/重做极限操作
// ============================================================
describe('场景 3: 撤销/重做极限', () => {
  it('超过 50 次撤销上限后最早的记录被丢弃', () => {
    const fs = useFlowStore()
    for (let i = 0; i < 60; i++) {
      fs.addNode('dialog')
    }
    expect(fs.nodes.length).toBe(60)

    // 撤销 55 次（超过上限 50，意味着后 50 次有效）
    for (let i = 0; i < 55; i++) {
      fs.undo()
    }
    // 最多退回 50 步
    expect(fs.nodes.length).toBeGreaterThanOrEqual(10)
    expect(fs.nodes.length).toBeLessThanOrEqual(11)
  })

  it('撤销后添加新节点会清空重做栈', () => {
    const fs = useFlowStore()

    fs.addNode('dialog')  // 节点 1
    fs.addNode('choice')  // 节点 2
    expect(fs.nodes.length).toBe(2)

    fs.undo()             // 回到 1 节点
    expect(fs.nodes.length).toBe(1)

    fs.addNode('condition') // 新添加 → 重做栈被清空
    expect(fs.nodes.length).toBe(2)

    // 此时应该无法重做到 2 节点
    fs.redo()
    expect(fs.nodes.length).toBe(2)
  })

  it('空撤销栈时 undo 不改变状态', () => {
    const fs = useFlowStore()
    expect(fs.nodes.length).toBe(0)

    fs.undo()
    expect(fs.nodes.length).toBe(0)

    fs.redo()
    expect(fs.nodes.length).toBe(0)
  })

  it('删除节点后撤销可以恢复', () => {
    const fs = useFlowStore()

    fs.addNode('dialog')
    fs.addNode('dialog')
    const nid = fs.nodes[0].id
    fs.removeNode(nid)
    expect(fs.nodes.length).toBe(1)

    fs.undo()
    expect(fs.nodes.length).toBe(2)
  })

  it('更新节点后撤销恢复旧值', () => {
    const fs = useFlowStore()
    fs.addNode('dialog')
    const nid = fs.nodes[0].id
    fs.updateNode(nid, { character: '新角色', content: '新内容' })
    expect((fs.nodes[0].data as any).character).toBe('新角色')

    // updateNode 现在也触发 saveSnapshot，撤销先恢复旧值
    fs.undo()
    expect(fs.nodes.length).toBe(1)
    expect((fs.nodes[0].data as any).character).toBe('')
    fs.undo()
    expect(fs.nodes.length).toBe(0)
  })
})

// ============================================================
// 场景 4：映射引擎深度测试
// ============================================================
describe('场景 4: 映射引擎深度测试', () => {
  it('超大文本内容（10KB）— 脚本生成正确且可往返', () => {
    const longContent = 'あ'.repeat(5000) + '。'.repeat(500) + 'A'.repeat(2000)
    const nodes: FlowNode[] = [{
      id: 'big',
      type: 'dialog',
      position: { x: 0, y: 0 },
      data: { id: 'big', label: '大文本', character: '朗读者', content: longContent }
    }]
    const script = flowToScript(nodes, [])
    expect(script.length).toBeGreaterThan(longContent.length)
    expect(script).toContain('朗读者')
    expect(script).toContain('@dialog')

    const result = scriptToFlow(script)
    expect(result.success).toBe(true)
    expect(result.nodes).toHaveLength(1)
    expect((result.nodes![0].data as any).content).toBe(longContent)
  })

  it('包含各种特殊字符：引号、反斜杠、换行转义', () => {
    const nodes: FlowNode[] = [{
      id: 'special',
      type: 'dialog',
      position: { x: 0, y: 0 },
      data: {
        id: 'special', label: 'S', character: '角"色"名',
        content: '他说："快\\来\\吧！"\n然后离开了。',
        background: 'C:\\bg\\test\\"美丽".png'
      }
    }]
    const script = flowToScript(nodes, [])
    expect(script).toContain('角\\"色\\"名')
    expect(script).toContain('他说：\\"快\\\\来\\\\吧！\\"')
    expect(script).toContain('C:\\\\bg\\\\test\\\\\\"美丽\\".png')

    const result = scriptToFlow(script)
    expect(result.success).toBe(true)
  })

  it('全 Unicode 字符集：Emoji、中文、日文、韩文、阿拉伯文', () => {
    const nodes: FlowNode[] = [{
      id: 'u1',
      type: 'dialog',
      position: { x: 0, y: 0 },
      data: {
        id: 'u1', label: 'U', character: '🌍🌏🌎',
        content: '中文 日本語 한국어 العربية hello 🎮✨⭐'
      }
    }]
    const script = flowToScript(nodes, [])
    expect(script).toContain('🌍🌏🌎')
    expect(script).toContain('中文')
    expect(script).toContain('日本語')
    expect(script).toContain('한국어')
    expect(script).toContain('العربية')
    expect(script).toContain('🎮✨⭐')

    const result = scriptToFlow(script)
    expect(result.success).toBe(true)
  })

  it('选择节点含大量选项（20 个）', () => {
    const options = Array.from({ length: 20 }, (_, i) => ({
      id: `o${i}`, text: `选项 ${String.fromCharCode(65 + i)}`, nextNodeId: `target${i}`
    }))
    const nodes: FlowNode[] = [{
      id: 'bigchoice',
      type: 'choice',
      position: { x: 0, y: 0 },
      data: { id: 'bigchoice', label: '大选择', title: '请选择', options }
    }]
    // 添加目标节点
    for (let i = 0; i < 20; i++) {
      nodes.push({
        id: `target${i}`, type: 'dialog', position: { x: i * 50, y: 200 },
        data: { id: `target${i}`, label: `T${i}`, character: `C${i}`, content: `内容${i}` }
      })
    }
    const script = flowToScript(nodes, [])
    expect(script).toContain('@choice')
    for (let i = 0; i < 20; i++) {
      expect(script).toContain(`选项 ${String.fromCharCode(65 + i)}`)
    }

    const result = scriptToFlow(script)
    expect(result.success).toBe(true)
    expect(result.nodes).toHaveLength(21)
    // choice 中的 20 个 option 应产生 20 条连线
    expect(result.edges!.filter(e => e.source === 'bigchoice')).toHaveLength(20)
  })

  it('条件节点含复杂表达式', () => {
    const nodes: FlowNode[] = [{
      id: 'cond_complex',
      type: 'condition',
      position: { x: 0, y: 0 },
      data: {
        id: 'cond_complex', label: '复杂条件',
        expression: '(角色A.好感度 > 50 && 角色B.好感度 > 30) || 已收集道具 == "神秘钥匙"',
        trueNextId: 'true_branch', falseNextId: 'false_branch'
      }
    }, {
      id: 'true_branch', type: 'dialog', position: { x: 0, y: 200 },
      data: { id: 'true_branch', label: 'T', character: '旁白', content: '条件满足！' }
    }, {
      id: 'false_branch', type: 'dialog', position: { x: 200, y: 200 },
      data: { id: 'false_branch', label: 'F', character: '旁白', content: '条件不满足' }
    }]
    const edges: FlowEdge[] = [
      { id: 'e_t', source: 'cond_complex', target: 'true_branch', label: 'true' },
      { id: 'e_f', source: 'cond_complex', target: 'false_branch', label: 'false' }
    ]
    const script = flowToScript(nodes, edges)
    expect(script).toContain('(角色A.好感度 > 50 && 角色B.好感度 > 30) || 已收集道具 == \\"神秘钥匙\\"')

    const result = scriptToFlow(script)
    expect(result.success).toBe(true)
    expect(result.nodes).toHaveLength(3)
    expect(result.edges).toHaveLength(2)
  })

  it('混合类型节点链：dialog → choice → condition → dialog', () => {
    const nodes: FlowNode[] = [
      { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', label: '开场', character: '旁白', content: '故事开始' } },
      { id: 'c1', type: 'choice', position: { x: 200, y: 0 }, data: { id: 'c1', label: '选择', title: '冒险?', options: [{ id: 'c1_o1', text: '是', nextNodeId: 'cond1' }, { id: 'c1_o2', text: '否', nextNodeId: 'd3' }] } },
      { id: 'cond1', type: 'condition', position: { x: 400, y: 0 }, data: { id: 'cond1', label: '判断', expression: '等级 >= 10', trueNextId: 'd2', falseNextId: 'd3' } },
      { id: 'd2', type: 'dialog', position: { x: 600, y: 0 }, data: { id: 'd2', label: '高阶', character: 'NPC', content: '你足够强！' } },
      { id: 'd3', type: 'dialog', position: { x: 800, y: 0 }, data: { id: 'd3', label: '低阶', character: 'NPC', content: '还需努力' } }
    ]
    const edges: FlowEdge[] = [
      { id: 'e1', source: 'd1', target: 'c1' },
      { id: 'e2', source: 'c1', target: 'cond1', label: '是' },
      { id: 'e3', source: 'c1', target: 'd3', label: '否' },
      { id: 'e4', source: 'cond1', target: 'd2', label: 'true' },
      { id: 'e5', source: 'cond1', target: 'd3', label: 'false' }
    ]
    const script = flowToScript(nodes, edges)
    expect(script).toContain('@dialog')
    expect(script).toContain('@choice')
    expect(script).toContain('@condition')

    const result = scriptToFlow(script)
    expect(result.success).toBe(true)
    expect(result.nodes).toHaveLength(5)
    expect(result.edges).toHaveLength(5)
  })

  it('空 content、空 character、空 title — 边界空值处理', () => {
    const nodes: FlowNode[] = [
      { id: 'empty_d', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'empty_d', label: '', character: '', content: '' } },
      { id: 'empty_c', type: 'choice', position: { x: 0, y: 100 }, data: { id: 'empty_c', label: '', title: '', options: [] } },
      { id: 'empty_cond', type: 'condition', position: { x: 0, y: 200 }, data: { id: 'empty_cond', label: '', expression: '', trueNextId: '', falseNextId: '' } }
    ]
    const script = flowToScript(nodes, [])
    expect(script).toContain('@dialog')
    expect(script).toContain('@choice')
    expect(script).toContain('@condition')
    expect(script).toContain('content: ""')
    expect(script).toContain('title: ""')
    expect(script).toContain('expr: ""')

    const result = scriptToFlow(script)
    expect(result.success).toBe(true)
    expect(result.nodes).toHaveLength(3)
  })
})

// ============================================================
// 场景 5：projectStore 异常路径
// ============================================================
describe('场景 5: projectStore 异常路径', () => {
  it('多次保存同一个项目，每次的更新时间变化', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    const ps = useProjectStore()
    const fs = useFlowStore()

    await ps.createProject('时间测试', 'E:/time.galgame')
    const originalUpdatedAt = ps.meta!.updatedAt

    await new Promise(r => setTimeout(r, 5))
    fs.addNode('dialog')
    ps.syncScriptFromFlow()
    await ps.saveProject()
    const updatedAt1 = ps.meta!.updatedAt
    expect(updatedAt1).not.toBe(originalUpdatedAt)

    await new Promise(r => setTimeout(r, 5))
    fs.addNode('dialog')
    await ps.saveProject()
    const updatedAt2 = ps.meta!.updatedAt
    expect(updatedAt2).not.toBe(updatedAt1)
  })

  it('保存后 isDirty 重置为 false，再次修改后恢复 true', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    const ps = useProjectStore()
    const fs = useFlowStore()

    await ps.createProject('脏状态测试', 'E:/dirty.galgame')
    expect(fs.isDirty).toBe(false)

    fs.addNode('dialog')
    expect(fs.isDirty).toBe(true)

    ps.syncScriptFromFlow()
    await ps.saveProject()
    expect(fs.isDirty).toBe(false)

    fs.addNode('choice')
    expect(fs.isDirty).toBe(true)
  })

  it('未保存修改后关闭项目，再打开新项目时旧状态已清除', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    const ps = useProjectStore()
    const fs = useFlowStore()

    await ps.createProject('项目 A', 'E:/a.galgame')
    fs.addNode('dialog')
    fs.addNode('choice')

    ps.closeProject()
    expect(ps.meta).toBeNull()
    expect(fs.nodes.length).toBe(2) // flowStore 不会被 closeProject 清空

    // 打开另一个项目
    const dataB = createMockProjectData({
      meta: {
        name: '项目 B', version: '1.0.0', createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), projectPath: 'E:/b.galgame', resolution: '1280x720'
      },
      flow: { nodes: [], edges: [] }, script: '', assets: []
    })
    vi.mocked(api.openProject).mockResolvedValue({ success: true, data: dataB })
    await ps.openProject()

    expect(ps.meta?.name).toBe('项目 B')
    expect(fs.nodes.length).toBe(0)
    expect(fs.edges.length).toBe(0)
  })

  it('未打开项目时 syncScriptFromFlow 不报错', () => {
    const ps = useProjectStore()
    expect(() => ps.syncScriptFromFlow()).not.toThrow()
  })

  it('连续两次保存之间脚本内容不变', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    const ps = useProjectStore()
    const fs = useFlowStore()

    await ps.createProject('稳定性测试', 'E:/stable.galgame')
    fs.addNode('dialog')
    fs.updateNode(fs.nodes[0].id, { character: '测试', content: '内容' })
    ps.syncScriptFromFlow()

    const scriptBefore = ps.script
    await ps.saveProject()
    await ps.saveProject()

    expect(ps.script).toBe(scriptBefore)
  })

  it('保存时 api 返回失败，isDirty 保持 true', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    const ps = useProjectStore()
    const fs = useFlowStore()

    await ps.createProject('失败测试', 'E:/fail.galgame')
    fs.addNode('dialog')
    expect(fs.isDirty).toBe(true)

    vi.mocked(api.saveProject).mockResolvedValueOnce({ success: false, error: '模拟失败' })
    const result = await ps.saveProject()
    expect(result).toBe(false)
    expect(fs.isDirty).toBe(true) // 保存失败后保持脏状态
  })
})

// ============================================================
// 场景 6：资源管理综合操作
// ============================================================
describe('场景 6: 资源管理综合操作', () => {
  it('导入多种类型资源后保存，再打开验证', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    vi.mocked(api.importAsset)
      .mockResolvedValueOnce({ success: true, data: [
        { name: 'forest.png', relativePath: 'assets/backgrounds/forest.png', type: 'image', size: 500000 },
        { name: 'town.png', relativePath: 'assets/backgrounds/town.png', type: 'image', size: 300000 }
      ]})
      .mockResolvedValueOnce({ success: true, data: [
        { name: 'bgm.mp3', relativePath: 'assets/audio/bgm.mp3', type: 'audio', size: 5000000 },
        { name: 'se.wav', relativePath: 'assets/audio/se.wav', type: 'audio', size: 200000 }
      ]})

    const ps = useProjectStore()
    const as = useAssetStore()
    await ps.createProject('资源项目', 'E:/assets2.galgame')

    await as.importAssets('image')
    await as.importAssets('audio')

    expect(as.assets.length).toBe(4)
    expect(as.assets.filter(a => a.type === 'image').length).toBe(2)
    expect(as.assets.filter(a => a.type === 'audio').length).toBe(2)

    await ps.saveProject()
    const savedData = vi.mocked(api.saveProject).mock.calls[0][0] as ProjectData
    expect(savedData.assets.length).toBe(4)

    // 验证保存的数据包含正确的资源信息
    const bgm = savedData.assets.find(a => a.name === 'bgm.mp3')
    expect(bgm).toBeDefined()
    expect(bgm!.size).toBe(5000000)
  })

  it('导入资源后重复保存，资源列表不变', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    vi.mocked(api.importAsset).mockResolvedValue({ success: true, data: [
      { name: 'bg.png', relativePath: 'assets/backgrounds/bg.png', type: 'image', size: 1000 }
    ]})

    const ps = useProjectStore()
    const as = useAssetStore()
    await ps.createProject('重复保存', 'E:/repeat.galgame')
    await as.importAssets('image')

    await ps.saveProject()
    const saved1 = vi.mocked(api.saveProject).mock.calls[0][0] as ProjectData
    expect(saved1.assets.length).toBe(1)

    // 不增删资源，再次保存
    await ps.saveProject()
    const saved2 = vi.mocked(api.saveProject).mock.calls[1][0] as ProjectData
    expect(saved2.assets.length).toBe(1)
  })
})

// ============================================================
// 场景 7：流程图操作的正确性（边界/错误操作）
// ============================================================
describe('场景 7: 流程图操作正确性', () => {
  it('删除连线后节点不受影响', () => {
    const fs = useFlowStore()
    fs.addNode('dialog')
    fs.addNode('dialog')
    fs.addEdge(fs.nodes[0].id, fs.nodes[1].id)

    expect(fs.nodes.length).toBe(2)
    expect(fs.edges.length).toBe(1)

    fs.removeEdge(fs.edges[0].id)

    expect(fs.nodes.length).toBe(2) // 节点不受影响
    expect(fs.edges.length).toBe(0)
  })

  it('删除节点时自动移除关联的连线', () => {
    const fs = useFlowStore()
    fs.addNode('dialog')  // node 0
    fs.addNode('choice')  // node 1
    fs.addNode('dialog')  // node 2
    fs.addEdge(fs.nodes[0].id, fs.nodes[1].id)
    fs.addEdge(fs.nodes[1].id, fs.nodes[2].id)

    expect(fs.edges.length).toBe(2)

    fs.removeNode(fs.nodes[1].id) // 删除中间的 choice

    expect(fs.nodes.length).toBe(2) // 只剩两头
    expect(fs.edges.length).toBe(0) // 所有 related 连线被清理
  })

  it('删除节点时 selectedNodeId 自动清除', () => {
    const fs = useFlowStore()
    fs.addNode('dialog')
    const nid = fs.nodes[0].id

    fs.selectedNodeId = nid
    expect(fs.selectedNodeId).toBe(nid)

    fs.removeNode(nid)
    expect(fs.selectedNodeId).toBeNull()
  })

  it('添加连线到不存在的节点 ID — 仍然添加（需由调用方负责有效性）', () => {
    const fs = useFlowStore()
    fs.addNode('dialog')
    fs.addEdge(fs.nodes[0].id, 'nonexistent_id')
    expect(fs.edges.length).toBe(1)
  })
})

// ============================================================
// 场景 8：同步状态管理细节
// ============================================================
describe('场景 8: 同步状态管理细节', () => {
  it('新建项目时 syncState 为 synced', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    const ps = useProjectStore()
    const fs = useFlowStore()

    await ps.createProject('状态测试', 'E:/sync2.galgame')
    expect(fs.syncState).toBe('synced')
  })

  it('保存后 syncState 重置为 synced', async () => {
    const api = createElectronApiMock()
    window.electronAPI = api
    const ps = useProjectStore()
    const fs = useFlowStore()

    await ps.createProject('保存同步', 'E:/save-sync.galgame')

    fs.addNode('dialog')
    ps.syncScriptFromFlow()
    expect(fs.syncState).toBe('synced')

    await ps.saveProject()
    expect(fs.syncState).toBe('synced')
  })
})

// ============================================================
// 场景 9：scriptToFlow 错误恢复能力
// ============================================================
describe('场景 9: scriptToFlow 错误恢复', () => {
  it('不完整脚本（缺少右大括号）— 不崩溃', () => {
    const result = scriptToFlow('@dialog(id: "n1", character: "A") {\n  content: "hello"\n')
    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errors!.length).toBeGreaterThan(0)
  })

  it('完全乱码脚本 — 不崩溃，返回错误', () => {
    const result = scriptToFlow('!@#$%^&*()_+{}|:"<>?~`')
    expect(result.errors).toBeDefined()
  })

  it('空对象脚本 — 不崩溃', () => {
    const result = scriptToFlow('{}')
    expect(result.nodes).toBeDefined()
  })

  it('仅注释的脚本 — 返回空结果', () => {
    const result = scriptToFlow('// 只有注释\n// 另一行注释\n\n// 空行')
    expect(result.success).toBe(true)
    expect(result.nodes).toHaveLength(0)
  })
})

// ============================================================
// 场景 10：构建过程中随时保存 — 复杂流程图任意阶段的保存可靠性
// ============================================================
describe('场景 10: 构建过程中随时保存', () => {
  let api: ElectronAPI
  let ps: ReturnType<typeof useProjectStore>
  let fs: ReturnType<typeof useFlowStore>

  beforeEach(async () => {
    api = createElectronApiMock()
    window.electronAPI = api
    ps = useProjectStore()
    fs = useFlowStore()
    await ps.createProject('随时保存', 'E:/anytime.galgame')
  })

  it('阶段 1: 只有1个孤立节点时保存 → 打开后节点保留', async () => {
    fs.addNode('dialog', { x: 100, y: 100 })
    fs.updateNode(fs.nodes[0].id, { character: '开场', content: '故事开始' })
    ps.syncScriptFromFlow()

    expect(await ps.saveProject()).toBe(true)
    expect(fs.isDirty).toBe(false)

    const saved1 = vi.mocked(api.saveProject).mock.calls[0][0] as ProjectData
    expect(saved1.flow.nodes.length).toBe(1)
    expect(saved1.flow.edges.length).toBe(0)

    // 重新打开验证
    fs.loadFlow([], [])
    vi.mocked(api.openProject).mockResolvedValue({ success: true, data: saved1 })
    await ps.openProject()
    expect(fs.nodes.length).toBe(1)
    expect((fs.nodes[0].data as any).content).toBe('故事开始')
  })

  it('阶段 2: 3个节点已添加但未连线时保存 → 打开后节点保留、连线为空', async () => {
    fs.addNode('dialog')
    fs.addNode('dialog')
    fs.addNode('dialog')
    fs.updateNode(fs.nodes[0].id, { character: 'A', content: '第一幕' })
    fs.updateNode(fs.nodes[1].id, { character: 'B', content: '第二幕' })
    fs.updateNode(fs.nodes[2].id, { character: 'C', content: '第三幕' })
    ps.syncScriptFromFlow()

    await ps.saveProject()

    const saved = vi.mocked(api.saveProject).mock.calls[0][0] as ProjectData
    expect(saved.flow.nodes.length).toBe(3)
    expect(saved.flow.edges.length).toBe(0)
    expect(saved.script).toContain('第一幕')
    expect(saved.script).toContain('第二幕')
    expect(saved.script).toContain('第三幕')

    // 重新打开
    fs.loadFlow([], [])
    vi.mocked(api.openProject).mockResolvedValue({ success: true, data: saved })
    await ps.openProject()
    expect(fs.nodes.length).toBe(3)
    expect(fs.edges.length).toBe(0)
  })

  it('阶段 3: 节点已连线但部分内容为空时保存 → 保存完整', async () => {
    fs.addNode('dialog')
    fs.addNode('choice')
    fs.addNode('dialog')
    const [n1, n2, n3] = fs.nodes
    fs.updateNode(n1.id, { character: '旁白', content: '' })
    fs.updateNode(n2.id, { title: '', options: [] })
    fs.updateNode(n3.id, { character: '', content: '没有角色名' })
    fs.addEdge(n1.id, n2.id)
    fs.addEdge(n2.id, n3.id, '继续')
    ps.syncScriptFromFlow()

    await ps.saveProject()

    const saved = vi.mocked(api.saveProject).mock.calls[0][0] as ProjectData
    expect(saved.flow.nodes.length).toBe(3)
    expect(saved.flow.edges.length).toBe(2)
    expect(saved.script).toContain('content: ""')
    expect(saved.script).toContain('title: ""')

    // 重新打开验证空值边界
    fs.loadFlow([], [])
    vi.mocked(api.openProject).mockResolvedValue({ success: true, data: saved })
    await ps.openProject()
    expect(fs.nodes.length).toBe(3)
    const emptyContent = fs.nodes.find(n => (n.data as any).content === '')
    expect(emptyContent).toBeDefined()
  })

  it('阶段 4: 复杂剧情第1次保存(4节点/3连线) → 继续编辑 → 第2次保存(7节点/7连线) → 验证累计正确', async () => {
    // === 第1次保存：开场部分 ===
    fs.addNode('dialog')
    fs.addNode('dialog')
    fs.addNode('choice')
    fs.addNode('dialog')
    fs.updateNode(fs.nodes[0].id, { character: '旁白', content: '这是一个关于勇者的故事。' })
    fs.updateNode(fs.nodes[1].id, { character: '勇者', content: '我要去冒险！' })
    fs.updateNode(fs.nodes[2].id, { title: '选择职业', options: [{ id: 'o1', text: '战士', nextNodeId: '' }, { id: 'o2', text: '法师', nextNodeId: '' }] })
    fs.updateNode(fs.nodes[3].id, { character: '长老', content: '勇敢的选择！' })
    fs.addEdge(fs.nodes[0].id, fs.nodes[1].id)
    fs.addEdge(fs.nodes[1].id, fs.nodes[2].id)
    fs.addEdge(fs.nodes[2].id, fs.nodes[3].id, '战士')
    ps.syncScriptFromFlow()
    expect(await ps.saveProject()).toBe(true)

    let saved = vi.mocked(api.saveProject).mock.calls[0][0] as ProjectData
    expect(saved.flow.nodes.length).toBe(4)
    expect(saved.flow.edges.length).toBe(3)
    expect(fs.isDirty).toBe(false)

    // === 继续编辑：添加分支 ===
    fs.addNode('dialog')
    fs.updateNode(fs.nodes[4].id, { character: '魔导师', content: '魔法之路充满智慧！' })
    fs.addEdge(fs.nodes[2].id, fs.nodes[4].id, '法师')

    fs.addNode('condition')
    fs.updateNode(fs.nodes[5].id, { expression: '等级 >= 10' })
    fs.addEdge(fs.nodes[3].id, fs.nodes[5].id)

    fs.addNode('dialog')
    fs.updateNode(fs.nodes[6].id, { character: '国王', content: '恭喜你成为勇士！' })
    fs.addEdge(fs.nodes[5].id, fs.nodes[6].id, 'true')
    fs.addEdge(fs.nodes[4].id, fs.nodes[6].id)

    expect(fs.nodes.length).toBe(7)
    expect(fs.edges.length).toBe(7)
    expect(fs.isDirty).toBe(true)

    ps.syncScriptFromFlow()
    expect(await ps.saveProject()).toBe(true)

    saved = vi.mocked(api.saveProject).mock.calls[1][0] as ProjectData
    expect(saved.flow.nodes.length).toBe(7)
    expect(saved.flow.edges.length).toBe(7)
    expect(saved.script).toContain('等级 >= 10')
    expect(saved.script).toContain('法师')
    expect(saved.script).toContain('战士')

    // === 重新打开验证：全部累计数据保留 ===
    fs.loadFlow([], [])
    vi.mocked(api.openProject).mockResolvedValue({ success: true, data: saved })
    await ps.openProject()
    expect(fs.nodes.length).toBe(7)
    expect(fs.edges.length).toBe(7)
    expect(fs.nodes.find(n => (n.data as any).character === '魔导师')).toBeDefined()
    expect(fs.nodes.find(n => (n.data as any).character === '国王')).toBeDefined()
    expect(fs.nodes.find(n => (n.data as any).expression === '等级 >= 10')).toBeDefined()
  })

  it('阶段 5: 10次增量保存（每次 +1 节点），最后打开验证100%数据完整', async () => {
    for (let i = 0; i < 10; i++) {
      fs.addNode(i % 2 === 0 ? 'dialog' : 'choice')
      const node = fs.nodes[fs.nodes.length - 1]
      if (node.type === 'dialog') {
        fs.updateNode(node.id, { character: `C${i}`, content: `增量保存第${i}次` })
      } else {
        fs.updateNode(node.id, { title: `选择${i}`, options: [{ id: `o${i}`, text: `选项${i}`, nextNodeId: '' }] })
      }
      if (i > 0) {
        fs.addEdge(fs.nodes[i - 1].id, fs.nodes[i].id)
      }
      ps.syncScriptFromFlow()
      expect(await ps.saveProject()).toBe(true)
      expect(fs.isDirty).toBe(false)
    }

    // 每次保存的数据应该正确累积
    for (let i = 0; i < 10; i++) {
      const saved = vi.mocked(api.saveProject).mock.calls[i][0] as ProjectData
      expect(saved.flow.nodes.length).toBe(i + 1)
      expect(saved.flow.edges.length).toBe(i)
    }

    // 重新打开最后一次保存的数据
    const lastSaved = vi.mocked(api.saveProject).mock.calls[9][0] as ProjectData
    expect(lastSaved.flow.nodes.length).toBe(10)
    expect(lastSaved.flow.edges.length).toBe(9)

    fs.loadFlow([], [])
    vi.mocked(api.openProject).mockResolvedValue({ success: true, data: lastSaved })
    await ps.openProject()
    expect(fs.nodes.length).toBe(10)
    expect(fs.edges.length).toBe(9)
    for (let i = 0; i < 10; i++) {
      const node = fs.nodes.find(n => (n.data as any).character === `C${i}` || (n.data as any).title === `选择${i}`)
      expect(node).toBeDefined()
    }
  })

  it('阶段 6: 追加节点时改动已有节点的内容 → 保存后新老内容都保留', async () => {
    // 初始：2 个节点
    fs.addNode('dialog')
    fs.addNode('dialog')
    fs.updateNode(fs.nodes[0].id, { character: 'A', content: '原始内容A' })
    fs.updateNode(fs.nodes[1].id, { character: 'B', content: '原始内容B' })
    fs.addEdge(fs.nodes[0].id, fs.nodes[1].id)
    ps.syncScriptFromFlow()
    await ps.saveProject()

    // 追加阶段：修改已有节点 + 新增节点
    fs.addNode('dialog')
    fs.updateNode(fs.nodes[2].id, { character: 'C', content: '新增内容C' })
    fs.addEdge(fs.nodes[1].id, fs.nodes[2].id)
    // 同时修改旧节点内容
    fs.updateNode(fs.nodes[0].id, { content: '修改后内容A' })
    ps.syncScriptFromFlow()
    await ps.saveProject()

    const saved = vi.mocked(api.saveProject).mock.calls[1][0] as ProjectData
    expect(saved.flow.nodes.length).toBe(3)
    expect(saved.flow.edges.length).toBe(2)

    // 验证修改后的内容已更新
    const savedNodeA = saved.flow.nodes.find(n => (n.data as any).character === 'A')
    expect(savedNodeA).toBeDefined()
    expect((savedNodeA!.data as any).content).toBe('修改后内容A')

    // 重新打开确认
    fs.loadFlow([], [])
    vi.mocked(api.openProject).mockResolvedValue({ success: true, data: saved })
    await ps.openProject()
    const loadedA = fs.nodes.find(n => (n.data as any).character === 'A')
    expect(loadedA).toBeDefined()
    expect((loadedA!.data as any).content).toBe('修改后内容A')
    expect(fs.nodes.find(n => (n.data as any).character === 'C')).toBeDefined()
  })

  it('阶段 7: 保存后立即修改 → 脏状态恢复 → 再次保存', async () => {
    fs.addNode('dialog')
    fs.updateNode(fs.nodes[0].id, { character: '测试', content: '保存前' })
    ps.syncScriptFromFlow()
    await ps.saveProject()
    expect(fs.isDirty).toBe(false)

    // 保存后立即修改
    fs.updateNode(fs.nodes[0].id, { content: '保存后修改' })
    fs.addNode('dialog')
    expect(fs.isDirty).toBe(true)

    // 再次保存
    ps.syncScriptFromFlow()
    await ps.saveProject()
    expect(fs.isDirty).toBe(false)

    const saved = vi.mocked(api.saveProject).mock.calls[1][0] as ProjectData
    expect(saved.flow.nodes.length).toBe(2)
    expect((saved.flow.nodes[0].data as any).content).toBe('保存后修改')
  })

  it('阶段 8: 删除节点后保存 → 重新打开确认删除生效', async () => {
    fs.addNode('dialog')
    fs.addNode('dialog')
    fs.addNode('dialog')
    fs.updateNode(fs.nodes[0].id, { character: '保留', content: '保留节点' })
    fs.updateNode(fs.nodes[1].id, { character: '删除', content: '准备删除' })
    fs.updateNode(fs.nodes[2].id, { character: '保留2', content: '保留节点2' })
    fs.addEdge(fs.nodes[0].id, fs.nodes[1].id)
    fs.addEdge(fs.nodes[1].id, fs.nodes[2].id)

    // 保存一次完整状态
    ps.syncScriptFromFlow()
    await ps.saveProject()
    expect(fs.nodes.length).toBe(3)
    expect(fs.edges.length).toBe(2)

    // 删除中间节点
    fs.removeNode(fs.nodes[1].id)
    expect(fs.nodes.length).toBe(2)
    expect(fs.edges.length).toBe(0)

    // 保存删除后的状态
    ps.syncScriptFromFlow()
    await ps.saveProject()

    const saved = vi.mocked(api.saveProject).mock.calls[1][0] as ProjectData
    expect(saved.flow.nodes.length).toBe(2)
    expect(saved.flow.edges.length).toBe(0)
    expect(saved.flow.nodes.find(n => (n.data as any).character === '删除')).toBeUndefined()

    // 重新打开确认删除
    fs.loadFlow([], [])
    vi.mocked(api.openProject).mockResolvedValue({ success: true, data: saved })
    await ps.openProject()
    expect(fs.nodes.length).toBe(2)
    expect(fs.nodes.find(n => (n.data as any).character === '删除')).toBeUndefined()
  })
})
