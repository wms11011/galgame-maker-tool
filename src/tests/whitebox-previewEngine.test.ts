import { describe, it, expect } from 'vitest'
import { scriptToFlow } from '../renderer/src/utils/mappingEngine'
import type { ProjectData } from '../renderer/src/types/index'
import * as fs from 'fs'
import * as path from 'path'

// Load main.gs
const mainGs = fs.readFileSync(path.resolve(__dirname, '../../test.galgame/script/main.gs'), 'utf-8')
const parsed = scriptToFlow(mainGs)

function makeProjectData(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    meta: { name: 'Test', version: '1.0', projectPath: '/test', createdAt: '', updatedAt: '', resolution: '1280x720' },
    flow: { nodes: parsed.nodes!, edges: parsed.edges! },
    script: mainGs, assets: [], variables: [], characters: [],
    globalFlags: {}, flagAliases: {}, groups: [], achievements: [], items: [], glossary: [],
    ...overrides,
  }
}

// ══════════════════════════════════════════════════════════
// Pure logic tests — no PIXI, no Audio, no DOM
// ══════════════════════════════════════════════════════════
import { PreviewEngine } from '../renderer/src/preview/previewEngine'

describe('PreviewEngine.initState() — 纯逻辑', () => {
  it('加载 main.gs 后状态正确初始化', () => {
    const engine = new PreviewEngine()
    const data = makeProjectData()
    engine.initState(data)

    expect(engine.projectData).toBeDefined()
    expect(engine.traversal).toBeDefined()
    expect(engine.state).toBeDefined()
    expect(engine.state.variables).toBeDefined()
    expect(engine.achievements).toBeDefined()
    expect(engine.visitedNodes).toEqual([])
    expect(engine.stepCount).toBe(0)
    expect(engine.running).toBe(false)
    expect(engine.errorNodes).toEqual([])
  })

  it('FlowTraversal 可以遍历节点', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData())

    const next = engine.traversal!.getNext('n1_dialog')
    expect(next).toBeTruthy()
  })

  it('choice 节点的所有分支可达', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData())

    const targets = engine.traversal!.getChoiceTargets('n9_choice')
    expect(targets.length).toBe(3)
    expect(targets.map(t => t.label)).toEqual(
      expect.arrayContaining(['热情', '腼腆', '冷漠'])
    )
  })

  it('condition 节点的 true/false 分支正确', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData())

    const targets = engine.traversal!.getConditionTargets('n30_condition')
    expect(targets.trueTarget).toBeTruthy()
    expect(targets.falseTarget).toBeTruthy()
  })

  it('random 节点的权重分支正确', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData())

    const branches = engine.traversal!.getRandomBranches('n46_random')
    expect(branches.length).toBe(3)
  })
})

describe('PreviewEngine.initState() — 变量加载', () => {
  it('加载自定义变量', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData({
      variables: [
        { name: '好感度', type: 'number', initialValue: 50 },
        { name: 'name', type: 'string', initialValue: 'Alice' },
      ]
    }))
    expect(engine.state.variables['好感度']).toBe(50)
    expect(engine.state.variables['name']).toBe('Alice')
  })

  it('加载全局标记', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData({
      globalFlags: { intro_seen: true, ch2_locked: false }
    }))
    expect(engine.state.globalFlags['intro_seen']).toBe(true)
    expect(engine.state.globalFlags['ch2_locked']).toBe(false)
  })

  it('加载成就定义', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData({
      achievements: [
        { id: 'ach1', name: '初来乍到', description: '', icon: '🎉', unlocked: false }
      ]
    }))
    expect(engine.achievements).toHaveLength(1)
    expect(engine.achievements[0].name).toBe('初来乍到')
  })

  it('加载道具数据', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData({
      items: [{ id: 'i1', name: '钥匙', icon: '🔑', type: 'key', description: '' }]
    }))
    expect(engine.state.variables['_items']).toHaveLength(1)
  })

  it('重复调用覆盖之前的状态', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData({
      variables: [{ name: 'a', type: 'number', initialValue: 1 }]
    }))
    expect(engine.state.variables['a']).toBe(1)
    engine.initState(makeProjectData({
      variables: [{ name: 'b', type: 'number', initialValue: 2 }]
    }))
    expect(engine.state.variables['a']).toBeUndefined()
    expect(engine.state.variables['b']).toBe(2)
  })
})

describe('PreviewEngine.initState() — 整个 main.gs 场景', () => {
  it('94+ 节点全部加载到 FlowTraversal', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData())
    expect(engine.traversal!.getNode('n1_dialog')).toBeDefined()
    expect(engine.traversal!.getNode('n94_end')).toBeDefined()
  })

  it('n1_dialog 的 next 链可达', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData())
    const next = engine.traversal!.getNext('n1_dialog')
    expect(next).toBeTruthy()
    expect(next).toBe('n2_savePoint')
  })

  it('所有 end 节点存在且可区分', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData())
    const endIds = parsed.nodes!.filter(n => n.type === 'end').map(n => n.id)
    expect(endIds.length).toBeGreaterThanOrEqual(2)
    for (const id of endIds) {
      expect(engine.traversal!.isEndNode(id)).toBe(true)
    }
  })

  it('autoAdvancing 节点类型正确识别', () => {
    const engine = new PreviewEngine()
    engine.initState(makeProjectData())
    expect(engine.traversal!.isAutoAdvancing('n3_setVariable')).toBe(true)
    expect(engine.traversal!.isAutoAdvancing('n20_goto')).toBe(true)
    expect(engine.traversal!.isAutoAdvancing('n9_choice')).toBe(false)
  })
})
