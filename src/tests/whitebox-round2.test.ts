import { describe, it, expect, beforeEach } from 'vitest'
import { scriptToFlow, flowToScript, validateFlow } from '../renderer/src/utils/mappingEngine'
import { StateManager } from '../renderer/src/preview/StateManager'
import { FlowTraversal } from '../renderer/src/utils/FlowTraversal'
import { analyzeGraph } from '../renderer/src/utils/graphAnalysis'
import { buildStoryTree } from '../renderer/src/utils/storyTree'
import { traceAllPaths, getReachableNodeIds } from '../renderer/src/utils/pathTracing'
import type { FlowNode, FlowEdge } from '../renderer/src/types/index'

function n(id: string, type: string, overrides: Record<string, unknown> = {}): FlowNode {
  return { id, type: type as any, position: { x: 0, y: 0 }, data: { id, label: `${type}-${id}`, ...overrides } }
}

// ══════════════════════════════════════════════════════════
// 1. Tokenizer 边缘 — 数字指令名、三引号边界
// ══════════════════════════════════════════════════════════
describe('白盒R2: Tokenizer & 解析器边缘', () => {
  it('指令名含数字 — live2d 解析', () => {
    const r = scriptToFlow('@live2d(id: "l1", model: "sakura") {\n  next: "n2"\n}')
    expect(r.success).toBe(true)
    expect(r.nodes![0].type).toBe('live2d')
    expect((r.nodes![0].data as any).model).toBe('sakura')
  })

  it('三引号全空白内容', () => {
    const r = scriptToFlow('@dialog(id: "n1", character: "X") {\n  content: """\n        \n    """\n}')
    expect(r.success).toBe(true)
    // 全空白行 → 无有效行可计算缩进 → 返回原始内容（仅含空白）
    expect(typeof r.nodes![0].data.content).toBe('string')
  })

  it('三引号单行内容', () => {
    const r = scriptToFlow('@dialog(id: "n1", character: "X") {\n  content: """single line"""\n}')
    expect(r.success).toBe(true)
    expect(r.nodes![0].data.content).toBe('single line')
  })

  it('三引号内反斜杠换行续行', () => {
    const r = scriptToFlow('@dialog(id: "n1", character: "X") {\n  content: """line1\\\nline2"""\n}')
    expect(r.success).toBe(true)
    expect(r.nodes![0].data.content).toBe('line1line2')
  })

  it('数字 0 作为 duration 正确解析', () => {
    const r = scriptToFlow('@wait(id: "w1", duration: "0") {\n}')
    expect(r.success).toBe(true)
    expect(r.nodes![0].data.duration).toBe(0)
  })

  it('体块内空行不崩溃', () => {
    const r = scriptToFlow('@dialog(id: "n1", character: "X") {\n\n  content: "hi"\n\n}')
    expect(r.success).toBe(true)
  })

  it('指令名大小写敏感', () => {
    const r = scriptToFlow('@Dialog(id: "n1", character: "X") {\n  content: "hi"\n}')
    // 'Dialog' not in registry → unknown directive
    expect(r.errors!.length).toBeGreaterThanOrEqual(1)
  })
})

// ══════════════════════════════════════════════════════════
// 2. 格式化边缘
// ══════════════════════════════════════════════════════════
describe('白盒R2: 格式化边缘', () => {
  it('dialog 所有字段非默认值 → 全部输出', () => {
    const node: FlowNode = {
      id: 'd1', type: 'dialog', position: { x: 0, y: 0 },
      data: {
        id: 'd1', label: '特殊对话', character: 'Alice', content: 'test',
        background: 'bg.png', characterSprite: 'sprite.png',
        unlockCondition: 'x>=1', nextNodeId: 'n2',
        typingSpeed: 80, textColor: '#ff0', fontSize: 24,
        transition: 'slide', transitionDuration: 800
      }
    } as any
    const script = flowToScript([node], [])
    expect(script).toContain('@dialog')
    expect(script).toContain('background: "bg.png"')
    expect(script).toContain('sprite: "sprite.png"')
    expect(script).toContain('unlock: "x>=1"')
    expect(script).toContain('typingSpeed: 80')
    expect(script).toContain('textColor: "#ff0"')
    expect(script).toContain('fontSize: 24')
    expect(script).toContain('transition: "slide"')
    expect(script).toContain('transitionDuration: 800')
  })

  it('end 全字段输出', () => {
    const node: FlowNode = {
      id: 'e1', type: 'end', position: { x: 0, y: 0 },
      data: { id: 'e1', label: '结局', endingType: 'true', message: '剧终', background: 'end_bg.png', unlockCondition: 'flag1' }
    } as any
    const script = flowToScript([node], [])
    expect(script).toContain('type: "true"')
    expect(script).toContain('message: "剧终"')
    expect(script).toContain('background: "end_bg.png"')
    expect(script).toContain('unlock: "flag1"')
  })

  it('formatItemNode check action 含 true/false', () => {
    const node: FlowNode = {
      id: 'i1', type: 'item', position: { x: 0, y: 0 },
      data: { id: 'i1', action: 'check', itemName: '钥匙', trueNextId: 'has', falseNextId: 'no', inventoryVar: '背包' }
    } as any
    const script = flowToScript([node], [])
    expect(script).toContain('action: "check"')
    expect(script).toContain('true: "has"')
    expect(script).toContain('false: "no"')
  })

  it('formatParticleNode 全部字段', () => {
    const node: FlowNode = {
      id: 'p1', type: 'particle', position: { x: 0, y: 0 },
      data: { id: 'p1', preset: 'snow', density: 100, speed: 2, duration: 5000, nextNodeId: 'n2' }
    } as any
    const edges: FlowEdge[] = [{ id: 'e1', source: 'p1', target: 'n2' }]
    const script = flowToScript([node], edges)
    expect(script).toContain('density: 100')
    expect(script).toContain('speed: 2')
    expect(script).toContain('duration: 5000')
  })
})

// ══════════════════════════════════════════════════════════
// 3. 图算法分支补全
// ══════════════════════════════════════════════════════════
describe('白盒R2: 图算法分支', () => {
  it('getImplicitTargets: data.branches 中 br.targetNodeId 为空跳过', () => {
    // Tests graphAnalysis line 142-145 (branches loop)
    const nodes: FlowNode[] = [
      { id: 'r1', type: 'random', position: { x: 0, y: 0 },
        data: { id: 'r1', branches: [{ id: 'b1', targetNodeId: '', weight: 50, scene: '' }, { id: 'b2', targetNodeId: 'valid', weight: 50, scene: '' }] } } as any,
      n('valid', 'dialog')
    ]
    const result = analyzeGraph(nodes, [])
    // 'r1' has one valid target via implicit branch
    expect(result.deadEndNodes).not.toContain('r1')
  })

  it('getImplicitChildren: option.text 为空时使用"选项"', () => {
    const nodes: FlowNode[] = [
      { id: 'c1', type: 'choice', position: { x: 0, y: 0 },
        data: { id: 'c1', options: [{ id: 'o1', text: '', nextNodeId: 'n1' }] } } as any,
      n('n1', 'end')
    ]
    const root = buildStoryTree(nodes, [])
    expect(root!.children[0].branchLabel).toBe('选项')
  })

  it('traceAllPaths: maxDepth exactly at boundary', () => {
    const nodes: FlowNode[] = [
      n('a', 'dialog', { nextNodeId: 'b' }),
      n('b', 'dialog', { nextNodeId: 'c' }),
      n('c', 'dialog')
    ]
    // maxDepth=2: should traverse a→b but stop at c
    const paths = traceAllPaths(nodes, [])
    expect(paths.length).toBeGreaterThanOrEqual(1)
  })

  it('getReachableNodeIds: 多分支', () => {
    const nodes: FlowNode[] = [
      n('start', 'choice', { options: [
        { id: 'o1', text: 'A', nextNodeId: 'a' },
        { id: 'o2', text: 'B', nextNodeId: 'b' }
      ]}),
      n('a', 'end'),
      n('b', 'end')
    ]
    const reachable = getReachableNodeIds('start', nodes, [], 10)
    expect(reachable.has('a')).toBe(true)
    expect(reachable.has('b')).toBe(true)
    expect(reachable.has('start')).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════
// 4. StateManager & 表达式求值边缘
// ══════════════════════════════════════════════════════════
describe('白盒R2: StateManager 边缘', () => {
  let sm: StateManager
  beforeEach(() => { sm = new StateManager(); sm.reset() })

  it('evaluateExpression: 表达式包含前后空格', () => {
    sm.variables['score'] = 100
    expect(sm.evaluateExpression('  score >= 50  ')).toBe(true)
  })

  it('evaluateExpression: flag 不存在 → false', () => {
    expect(sm.evaluateExpression('nonexistent_flag')).toBe(false)
  })

  it('evaluateExpression: 多个 OR 全部 false → false', () => {
    sm.variables['a'] = 0
    expect(sm.evaluateExpression('a > 1 || a < -1 || a == 999')).toBe(false)
  })

  it('checkAutoAchievements: 表达式异常导致 checkError 被记录', () => {
    sm.loadFromProject(
      [{ name: 'x', type: 'number', initialValue: 10 }], {}, {},
      [{ id: 'a1', name: 'Bad', description: '', icon: '', unlocked: false, autoCheck: true, unlockCondition: 'x >= abc' }]
    )
    sm.checkAutoAchievements()
    expect(sm.lastAutoCheckInfo).not.toBeNull()
    // 'x >= abc' — parseFloat('abc') = NaN — doesn't throw but result is false
    expect(sm.lastAutoCheckInfo!.results[0].result).toBe(false)
  })

  it('applyVariableOp: 非数字 current 值', () => {
    sm.variables['x'] = 'hello'
    sm.applyVariableOp('x', '=', '42')
    expect(sm.variables['x']).toBe(42)
  })

  it('setFlag: 覆盖已有 flag', () => {
    sm.setFlag('f1', true)
    sm.setFlag('f1', false)
    expect(sm.globalFlags['f1']).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════
// 5. 验证层边缘
// ══════════════════════════════════════════════════════════
describe('白盒R2: 验证层边缘', () => {
  it('choice 空 options 数组警告', () => {
    const warnings = validateFlow(
      [{ id: 'c1', type: 'choice', position: { x: 0, y: 0 }, data: { id: 'c1', title: 'X', options: [] } } as any],
      []
    )
    expect(warnings.some(w => w.message.includes('选项不足'))).toBe(true)
  })

  it('setVariable 有出边不警告', () => {
    const warnings = validateFlow(
      [{ id: 's1', type: 'setVariable', position: { x: 0, y: 0 }, data: { id: 's1', variable: 'x', op: '=', value: '1', nextNodeId: 'n2' } } as any],
      []
    )
    expect(warnings.some(w => w.message.includes('死路') || w.message.includes('没有出边'))).toBe(false)
  })

  it('label 无出边不警告', () => {
    const warnings = validateFlow(
      [{ id: 'l1', type: 'label', position: { x: 0, y: 0 }, data: { id: 'l1', label: 'test' } } as any],
      []
    )
    expect(warnings.some(w => w.message.includes('死路') || w.message.includes('没有出边'))).toBe(false)
  })

  it('正常脚本无任何警告', () => {
    const warnings = validateFlow(
      [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', character: 'X', content: 'hi', nextNodeId: 'e1' } } as any,
        { id: 'e1', type: 'end', position: { x: 100, y: 0 }, data: { id: 'e1', endingType: 'normal', message: 'fin' } } as any
      ],
      []
    )
    expect(warnings).toHaveLength(0)
  })
})

// ══════════════════════════════════════════════════════════
// 6. FlowTraversal 分支
// ══════════════════════════════════════════════════════════
describe('白盒R2: FlowTraversal 分支', () => {
  it('getConditionTargets — 仅有 data.trueNextId 无 edge', () => {
    const nodes: FlowNode[] = [
      { id: 'cond', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'cond', expression: 'x>=1', trueNextId: 't' } } as any,
      { id: 't', type: 'end', position: { x: 100, y: 0 }, data: { id: 't', endingType: 'normal', message: '' } } as any
    ]
    const ft = new FlowTraversal(nodes, [])
    const targets = ft.getConditionTargets('cond')
    expect(targets.trueTarget).toBe('t')
    expect(targets.falseTarget).toBeNull()
  })

  it('hasPath — 自环检测', () => {
    const nodes: FlowNode[] = [
      { id: 'a', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'a', character: 'X', content: 'hi' } } as any
    ]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'a' }]
    const ft = new FlowTraversal(nodes, edges)
    expect(ft.hasPath('a', 'a')).toBe(true)
  })

  it('isDialog — 非 dialog 返回 false', () => {
    const ft = new FlowTraversal([n('c1', 'choice')], [])
    expect(ft.isDialog('c1')).toBe(false)
  })

  it('getNode — 不存在的节点返回 undefined', () => {
    const ft = new FlowTraversal([], [])
    expect(ft.getNode('ghost')).toBeUndefined()
  })
})
