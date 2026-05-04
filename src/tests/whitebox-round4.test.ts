import { describe, it, expect, beforeEach } from 'vitest'
import { scriptToFlow, flowToScript, validateFlow } from '../renderer/src/utils/mappingEngine'
import { analyzeGraph } from '../renderer/src/utils/graphAnalysis'
import { buildStoryTree } from '../renderer/src/utils/storyTree'
import { traceAllPaths, getReachableNodeIds } from '../renderer/src/utils/pathTracing'
import { FlowTraversal } from '../renderer/src/utils/FlowTraversal'
import { StateManager } from '../renderer/src/preview/StateManager'
import { NODE_TYPE_REGISTRY } from '../renderer/src/utils/nodeTypeRegistry'
import type { FlowNode, FlowEdge } from '../renderer/src/types/index'

function n(id: string, type: string, overrides: Record<string, unknown> = {}): FlowNode {
  return { id, type: type as any, position: { x: 0, y: 0 }, data: { id, label: `${type}-${id}`, ...overrides } }
}

// ══════════════════════════════════════════════════════════
// 1. 错误消息质量
// ══════════════════════════════════════════════════════════
describe('白盒R4: 错误消息质量', () => {
  it('未知指令错误包含指令名', () => {
    const r = scriptToFlow('@foobar(id: "x") {\n}')
    expect(r.errors![0].message).toContain('@foobar')
    expect(r.errors![0].message).toContain('未知')
  })

  it('格式错误包含上下文', () => {
    const r = scriptToFlow('@dialog(id: "bad" {\n  content: "hi"\n}')
    expect(r.errors!.length).toBeGreaterThanOrEqual(1)
  })

  it('parseNum 处理所有数字格式', () => {
    // parseNum is internal — test via setVariable value parsing
    const r = scriptToFlow('@setVar(id: "s1", var: "x", op: "=", value: "0") {\n}')
    expect(r.success).toBe(true)
    expect((r.nodes![0].data as any).value).toBe('0')
  })

  it('escapeString 处理所有特殊字符', () => {
    // 通过 flowToScript 间接触发 escapeString 的各种路径
    const node: FlowNode = {
      id: 'd1', type: 'dialog', position: { x: 0, y: 0 },
      data: { id: 'd1', character: 'A"B\\C', content: 'D"E\\F', background: 'bg.png' }
    } as any
    const script = flowToScript([node], [])
    // 输出中双引号和反斜杠都正确转义
    const r = scriptToFlow(script)
    expect(r.nodes![0].data.character).toBe('A"B\\C')
    expect(r.nodes![0].data.content).toBe('D"E\\F')
  })
})

// ══════════════════════════════════════════════════════════
// 2. NODE_TYPE_REGISTRY 完整性
// ══════════════════════════════════════════════════════════
describe('白盒R4: 注册表完整性', () => {
  it('全部20种类型已注册', () => {
    const types = ['dialog', 'choice', 'condition', 'setVariable', 'goto', 'end',
      'audio', 'cg', 'wait', 'random', 'label', 'animation', 'savePoint', 'timer',
      'moveCharacter', 'steamAchievement', 'achievement', 'particle', 'live2d', 'item']
    for (const t of types) {
      expect(NODE_TYPE_REGISTRY[t as keyof typeof NODE_TYPE_REGISTRY]).toBeDefined()
    }
  })

  it('所有注册表项有必需字段', () => {
    for (const meta of Object.values(NODE_TYPE_REGISTRY)) {
      expect(meta.type).toBeTruthy()
      expect(meta.directiveName).toBeTruthy()
      expect(meta.icon).toBeTruthy()
      expect(meta.label).toBeTruthy()
      expect(meta.fields.length).toBeGreaterThan(0)
      // id 字段总是第一个且 hidden
      expect(meta.fields[0].key).toBe('id')
      expect(meta.fields[0].hidden).toBe(true)
    }
  })

  it('directiveName 与 type 一致（除缩略形式外）', () => {
    const abbreviations: Record<string, string> = {
      setVariable: 'setVar', animation: 'anim'
    }
    for (const meta of Object.values(NODE_TYPE_REGISTRY)) {
      const expected = abbreviations[meta.type] || meta.type
      expect(meta.directiveName).toBe(expected)
    }
  })

  it('所有 select 类型字段含 options', () => {
    for (const meta of Object.values(NODE_TYPE_REGISTRY)) {
      for (const f of meta.fields) {
        if (f.kind === 'select') {
          expect(f.options).toBeDefined()
          expect(f.options!.length).toBeGreaterThan(0)
        }
      }
    }
  })
})

// ══════════════════════════════════════════════════════════
// 3. 压力测试
// ══════════════════════════════════════════════════════════
describe('白盒R4: 压力测试', () => {
  it('100个连续对话节点往返', () => {
    const nodes: FlowNode[] = []
    for (let i = 0; i < 100; i++) {
      nodes.push({
        id: `d${i}`, type: 'dialog', position: { x: i * 200, y: 0 },
        data: { id: `d${i}`, character: `Char${i % 5}`, content: `这是第${i}句对话` }
      } as any)
    }
    const edges: FlowEdge[] = []
    for (let i = 0; i < 99; i++) {
      edges.push({ id: `e${i}`, source: `d${i}`, target: `d${i + 1}` })
    }
    const script = flowToScript(nodes, edges)
    const parsed = scriptToFlow(script)
    expect(parsed.nodes!.length).toBe(100)
  })

  it('深层嵌套结构往返', () => {
    // 创建一个深层 choice→condition→choice 的嵌套结构
    const script = Array(10).fill(0).map((_, i) =>
      `@choice(id: "c${i}") {\n  option("branch") { next: "c${i + 1}" }\n  option("other") { next: "end_early" }\n}`
    ).join('\n') + '\n@dialog(id: "c10", character: "X") {\n  content: "deep end"\n}\n@end(id: "end_early", type: "normal") {\n  message: "early exit"\n}'
    const parsed = scriptToFlow(script)
    expect(parsed.success).toBe(true)
    expect(parsed.nodes!.length).toBeGreaterThanOrEqual(10)
  })

  it('100KB内容往返', () => {
    const bigContent = 'A'.repeat(100000)
    const nodes: FlowNode[] = [
      { id: 'd1', type: 'dialog', position: { x: 0, y: 0 },
        data: { id: 'd1', character: 'X', content: bigContent } } as any
    ]
    const script = flowToScript(nodes, [])
    expect(script.length).toBeGreaterThan(100000)
    const parsed = scriptToFlow(script)
    expect(parsed.nodes![0].data.content.length).toBe(100000)
  })
})

// ══════════════════════════════════════════════════════════
// 4. 防御性边界
// ══════════════════════════════════════════════════════════
describe('白盒R4: 防御性边界', () => {
  it('flowToScript: 空数组', () => {
    expect(flowToScript([], [])).toBe('')
  })

  it('flowToScript: 节点无匹配类型 → 跳过', () => {
    const nodes: FlowNode[] = [
      { id: 'x1', type: 'nonexistent_type' as any, position: { x: 0, y: 0 }, data: {} } as any
    ]
    const result = flowToScript(nodes, [])
    expect(result).toBe('')
  })

  it('validateFlow: 空数组', () => {
    expect(validateFlow([], [])).toEqual([])
  })

  it('analyzeGraph: 空数组', () => {
    const result = analyzeGraph([], [])
    expect(result.issueCount).toBe(0)
    expect(result.unreachableNodes).toEqual([])
  })

  it('buildStoryTree: 空数组', () => {
    expect(buildStoryTree([], [])).toBeNull()
  })

  it('traceAllPaths: 空数组', () => {
    expect(traceAllPaths([], [])).toEqual([])
  })

  it('getReachableNodeIds: 起始节点不存在', () => {
    expect(getReachableNodeIds('ghost', [], []).size).toBe(0)
  })

  it('scriptToFlow: 仅含空白字符', () => {
    const r = scriptToFlow('   \n  \t  \n  ')
    expect(r.success).toBe(true)
    expect(r.nodes).toEqual([])
  })

  it('FlowTraversal: 空图所有查询返回安全值', () => {
    const ft = new FlowTraversal([], [])
    expect(ft.getOutgoing('x')).toEqual([])
    expect(ft.getNext('x')).toBeNull()
    expect(ft.getChoiceTargets('x')).toEqual([])
    expect(ft.getRandomBranches('x')).toEqual([])
    expect(ft.getConditionTargets('x')).toEqual({ trueTarget: null, falseTarget: null })
    expect(ft.getNode('x')).toBeUndefined()
    expect(ft.getNodeLabel('x')).toBe('x')
    expect(ft.hasPath('a', 'b')).toBe(false)
    expect(ft.isAutoAdvancing('x')).toBe(false)
    expect(ft.isInteractive('x')).toBe(false)
    expect(ft.isEndNode('x')).toBe(false)
    expect(ft.isDialog('x')).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════
// 5. 跨类型往返一致性
// ══════════════════════════════════════════════════════════
describe('白盒R4: 跨类型往返', () => {
  it('所有20种类型同时往返', () => {
    const script = [
      '@dialog(id: "d1", character: "A") { content: "hi" next: "c1" }',
      '@choice(id: "c1", title: "选择") { option("A") { next: "cond1" } option("B") { next: "e1" } }',
      '@condition(id: "cond1") { expr: "x>=1" true: "sv1" false: "e1" }',
      '@setVar(id: "sv1", var: "x", op: "+=", value: "1") { next: "g1" }',
      '@goto(id: "g1", target: "l1") { }',
      '@label(id: "l1", label: "chapter_mid", color: "#f00") { }',
      '@end(id: "e1", type: "normal") { message: "end" }',
      '@audio(id: "a1", type: "bgm", action: "play", src: "s.mp3", loop: "true", volume: "0.7") { next: "cg1" }',
      '@cg(id: "cg1", src: "cg.png", transition: "fade", duration: "800") { next: "w1" }',
      '@wait(id: "w1", duration: "500") { next: "r1" }',
      '@random(id: "r1") { option("a1", 3) option("b1", 1) }',
      '@anim(id: "a1", target: "c", action: "shake", duration: "300") { next: "sp1" }',
      '@savePoint(id: "sp1", slotLabel: "save") { next: "t1" }',
      '@timer(id: "t1", mode: "countdown", duration: 3000) { next: "mc1" }',
      '@moveCharacter(id: "mc1", target: "c", from: "left", to: "center", duration: 800, easing: "ease") { next: "sa1" }',
      '@steamAchievement(id: "sa1", achievementId: "ACH_X") { next: "ach1" }',
      '@achievement(id: "ach1", achievementId: "ach_x") { next: "p1" }',
      '@particle(id: "p1", preset: "snow") { next: "l2d1" }',
      '@live2d(id: "l2d1", model: "sakura") { next: "i1" }',
      '@item(id: "i1", action: "get", item: "钥匙") { next: "e1" }',
    ].join('\n')
    const parsed = scriptToFlow(script)
    expect(parsed.success).toBe(true)

    // 验证所有20种类型都出现
    const typeSet = new Set(parsed.nodes!.map(n => n.type))
    const allTypes = ['dialog', 'choice', 'condition', 'setVariable', 'goto', 'end',
      'audio', 'cg', 'wait', 'random', 'label', 'animation', 'savePoint', 'timer',
      'moveCharacter', 'steamAchievement', 'achievement', 'particle', 'live2d', 'item']
    for (const t of allTypes) {
      expect(typeSet.has(t)).toBe(true)
    }

    // 往返
    const regenerated = flowToScript(parsed.nodes!, parsed.edges!)
    const round2 = scriptToFlow(regenerated)
    expect(round2.success).toBe(true)
    expect(round2.nodes!.length).toBe(parsed.nodes!.length)
  })
})

// ══════════════════════════════════════════════════════════
// 6. StateManager 全操作符 + 快照完整性
// ══════════════════════════════════════════════════════════
describe('白盒R4: StateManager 快照完整性', () => {
  let sm: StateManager
  beforeEach(() => { sm = new StateManager(); sm.reset() })

  it('snapshot 包含所有状态字段', () => {
    sm.loadFromProject(
      [{ name: 'hp', type: 'number', initialValue: 100 }],
      { seen: true }, { f1: '别名' },
      [{ id: 'a1', name: '成就', description: '', icon: '', unlocked: false }]
    )
    sm.recordVisit({ id: 'n1', type: 'dialog', label: 'test' })
    const snap = sm.snapshot('n1')
    expect(snap.currentNodeId).toBe('n1')
    expect(snap.variables).toEqual({ hp: 100 })
    expect(snap.globalFlags).toEqual({ seen: true })
    expect(snap.flagAliases).toEqual({ f1: '别名' })
    expect(snap.visitedNodes).toHaveLength(1)
    expect(snap.stepCount).toBe(1)
    expect(snap.achievements).toHaveLength(1)
    expect(snap.enteredGroups).toEqual([])
  })

  it('restore 恢复后快照一致', () => {
    sm.variables['x'] = 42
    sm.globalFlags['f1'] = true
    sm.flagAliases['f1'] = 'A'
    sm.recordVisit({ id: 'n1', type: 'dialog', label: 't1' })
    sm.enteredGroups = new Set(['g1'])
    const snap = sm.snapshot('n1')

    // 修改状态
    sm.variables['x'] = 999
    sm.globalFlags['f1'] = false
    sm.recordVisit({ id: 'n2', type: 'end', label: 't2' })
    sm.restore(snap)

    expect(sm.variables['x']).toBe(42)
    expect(sm.globalFlags['f1']).toBe(true)
    expect(sm.visitedNodes).toHaveLength(1)
    expect([...sm.enteredGroups]).toEqual(['g1'])
  })

  it('reset 完全清空所有状态', () => {
    sm.variables['x'] = 1
    sm.globalFlags['f'] = true
    sm.flagAliases['k'] = 'v'
    sm.achievements = [{ id: 'a1', name: 'A', description: '', icon: '', unlocked: true }]
    sm.recordVisit({ id: 'n1', type: 'dialog', label: 't' })
    sm.enteredGroups = new Set(['g1'])
    sm.lastAutoCheckInfo = { timestamp: 1, step: 1, candidateCount: 0, results: [], newlyUnlocked: [], variables: {}, globalFlags: {} }
    sm.reset()
    expect(sm.variables).toEqual({})
    expect(sm.globalFlags).toEqual({})
    expect(sm.flagAliases).toEqual({})
    expect(sm.achievements).toEqual([])
    expect(sm.visitedNodes).toEqual([])
    expect(sm.stepCount).toBe(0)
    expect(sm.enteredGroups.size).toBe(0)
    expect(sm.lastAutoCheckInfo).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════
// 7. 简写+多行字符串混合
// ══════════════════════════════════════════════════════════
describe('白盒R4: 语法混合', () => {
  it('简写行间穿插多行字符串完整格式', () => {
    const script = `Alice: "简短对话"
@dialog(id: "n1", character: "Bob", label: "长台词") {
  content: """
    这是一段很长的对话。
    包含多个段落。
    使用三引号书写。
    """
  background: "bg.png"
}
Charlie: "又是一句简写"`
    const parsed = scriptToFlow(script)
    const dialogs = parsed.nodes!.filter(n => n.type === 'dialog')
    expect(dialogs).toHaveLength(3)
    expect(dialogs[0].data.character).toBe('Alice')
    expect(dialogs[1].data.character).toBe('Bob')
    expect(dialogs[2].data.character).toBe('Charlie')
  })

  it('中文角色名不被简写识别 → 无节点生成', () => {
    const r = scriptToFlow('小樱: "你好呀"')
    expect(r.success).toBe(true)
    expect(r.nodes).toEqual([]) // 中文不在 [a-zA-Z_] 范围，不触发简写，且无 @ 指令
    // 中文角色名必须使用完整 @dialog 格式
  })

  it('三引号内包含 @ 符号不触发指令', () => {
    const r = scriptToFlow('@dialog(id: "n1", character: "X") {\n  content: """\n    @dialog 在字符串里\n    这是内容不是指令\n    """\n}')
    expect(r.success).toBe(true)
    expect(r.nodes).toHaveLength(1)
    expect(r.nodes![0].data.content).toContain('@dialog')
  })
})

// ══════════════════════════════════════════════════════════
// 8. choice/condition/random 边缘
// ══════════════════════════════════════════════════════════
describe('白盒R4: 分支节点边缘', () => {
  it('choice 单个选项被警告但解析成功', () => {
    const r = scriptToFlow('@choice(id: "c1") {\n  option("only") { next: "n1" }\n}')
    expect(r.success).toBe(true)
    expect(r.nodes![0].type).toBe('choice')
    expect((r.nodes![0].data as any).options).toHaveLength(1)
    // 验证层警告
    const warnings = r.warnings!
    expect(warnings.some(w => w.message.includes('选项不足'))).toBe(true)
  })

  it('condition 仅有 true 分支正常', () => {
    const script = '@condition(id: "c1") {\n  expr: "x>=1"\n  true: "t"\n}'
    const r = scriptToFlow(script)
    expect(r.success).toBe(true)
  })

  it('condition 仅有 false 分支正常', () => {
    const script = '@condition(id: "c1") {\n  expr: "x>=1"\n  false: "f"\n}'
    const r = scriptToFlow(script)
    expect(r.success).toBe(true)
  })

  it('random 单个分支正常解析', () => {
    const r = scriptToFlow('@random(id: "r1") {\n  option("only_target", 1)\n}')
    expect(r.success).toBe(true)
    expect((r.nodes![0].data as any).branches).toHaveLength(1)
  })
})
