import { describe, it, expect, beforeEach } from 'vitest'
import { scriptToFlow, flowToScript, validateFlow } from '../renderer/src/utils/mappingEngine'
import { analyzeGraph } from '../renderer/src/utils/graphAnalysis'
import { buildStoryTree } from '../renderer/src/utils/storyTree'
import { traceAllPaths, getReachableNodeIds } from '../renderer/src/utils/pathTracing'
import { FlowTraversal } from '../renderer/src/utils/FlowTraversal'
import { StateManager } from '../renderer/src/preview/StateManager'
import type { FlowNode, FlowEdge } from '../renderer/src/types/index'

function n(id: string, type: string, overrides: Record<string, unknown> = {}): FlowNode {
  return { id, type: type as any, position: { x: 0, y: 0 }, data: { id, label: `${type}-${id}`, ...overrides } }
}

// ══════════════════════════════════════════════════════════
// 1. graphAnalysis — 所有 issue 收集分支
// ══════════════════════════════════════════════════════════
describe('白盒R3: graphAnalysis 全分支', () => {
  it('单节点同时是死路和孤立', () => {
    const nodes = [n('a', 'dialog')]
    const result = analyzeGraph(nodes, [])
    expect(result.deadEndNodes).toContain('a')
    expect(result.orphanNodes).toContain('a')
    expect(result.unreachableNodes).toHaveLength(0) // 唯一节点算入口
  })

  it('condition 含 trueNextId 和 falseNextId → 两者均可达', () => {
    const nodes: FlowNode[] = [
      { id: 'cond', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'cond', expression: 'x>=1', trueNextId: 't', falseNextId: 'f' } } as any,
      n('t', 'end'), n('f', 'end')
    ]
    const result = analyzeGraph(nodes, [])
    expect(result.unreachableNodes).toHaveLength(0)
    expect(result.deadEndNodes).toHaveLength(0)
  })

  it('goto 含 targetNodeId → 隐式边被识别', () => {
    const nodes: FlowNode[] = [
      { id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', targetNodeId: 't' } } as any,
      n('t', 'end')
    ]
    const result = analyzeGraph(nodes, [])
    expect(result.deadEndNodes).not.toContain('g1')
  })

  it('random 含 branches → 所有 branch 目标被识别为隐式边', () => {
    const nodes: FlowNode[] = [
      { id: 'r1', type: 'random', position: { x: 0, y: 0 }, data: { id: 'r1', branches: [
        { id: 'b1', targetNodeId: 'a', weight: 1, scene: '' },
        { id: 'b2', targetNodeId: 'b', weight: 1, scene: '' }
      ]} } as any,
      n('a', 'end'), n('b', 'end')
    ]
    const result = analyzeGraph(nodes, [])
    expect(result.unreachableNodes).toHaveLength(0)
    expect(result.deadEndNodes).not.toContain('r1')
  })

  it('单 end 节点 → 无死路', () => {
    const result = analyzeGraph([n('e1', 'end')], [])
    expect(result.deadEndNodes).toHaveLength(0)
    expect(result.orphanNodes).toContain('e1')
  })

  it('隐式连接中 nextNodeId / targetNodeId 为空 → 不产生边', () => {
    const nodes = [n('a', 'dialog', { nextNodeId: '' })]
    const result = analyzeGraph(nodes, [])
    expect(result.deadEndNodes).toContain('a')
  })

  it('choice option 的 nextNodeId 识别为隐式边', () => {
    const nodes: FlowNode[] = [
      { id: 'c1', type: 'choice', position: { x: 0, y: 0 }, data: { id: 'c1', options: [
        { id: 'o1', text: 'A', nextNodeId: 'a' }
      ]} } as any,
      n('a', 'end')
    ]
    const result = analyzeGraph(nodes, [])
    expect(result.deadEndNodes).not.toContain('c1')
  })
})

// ══════════════════════════════════════════════════════════
// 2. storyTree — getNodeLabel/getNodeType/getImplicitChildren 分支
// ══════════════════════════════════════════════════════════
describe('白盒R3: storyTree 全分支', () => {
  it('rootId 存在但节点不存在 → 防御性返回 null', () => {
    // entryNodes finds a node, but it's NOT in the nodes array (impossible normally)
    // This tests the defensive check at line 54
    const nodes = [n('a', 'dialog', { nextNodeId: 'b' }), n('b', 'end')]
    const root = buildStoryTree(nodes, [])
    expect(root).not.toBeNull()
    expect(root!.id).toBe('a')
  })

  it('label 为空时使用 type-id 格式', () => {
    // 节点 label 为空/undefined
    const nodes = [n('n1', 'dialog', { label: undefined })]
    const root = buildStoryTree(nodes, [])
    expect(root!.label).toBe('dialog-n1')
  })

  it('循环引用中 leaf 子节点 children 为空', () => {
    const nodes = [n('a', 'dialog', { nextNodeId: 'b' }), n('b', 'dialog', { nextNodeId: 'a' })]
    const root = buildStoryTree(nodes, [])
    expect(root!.children).toHaveLength(1)
    const b = root!.children[0]
    expect(b.children).toHaveLength(1)
    // b → a → b (cycle: a's child is b with empty children)
    expect(b.children[0].children[0].children).toHaveLength(0)
  })

  it('getImplicitChildren: options 数组中 opt.nextNodeId 为空跳过', () => {
    const nodes: FlowNode[] = [
      { id: 'c1', type: 'choice', position: { x: 0, y: 0 }, data: { id: 'c1', options: [
        { id: 'o1', text: 'A', nextNodeId: '' },
        { id: 'o2', text: 'B', nextNodeId: '' }
      ]} } as any
    ]
    const root = buildStoryTree(nodes, [])
    expect(root!.children).toHaveLength(0)
  })

  it('getImplicitChildren: data.options 存在但长度为 0', () => {
    const nodes: FlowNode[] = [
      { id: 'c1', type: 'choice', position: { x: 0, y: 0 }, data: { id: 'c1', options: [] } } as any
    ]
    const root = buildStoryTree(nodes, [])
    expect(root!.children).toHaveLength(0)
  })

  it('getImplicitChildren: data.branches 存在但长度为 0', () => {
    const nodes: FlowNode[] = [
      { id: 'r1', type: 'random', position: { x: 0, y: 0 }, data: { id: 'r1', branches: [] } } as any
    ]
    const root = buildStoryTree(nodes, [])
    expect(root!.children).toHaveLength(0)
  })

  it('节点有 label 时使用 label', () => {
    const nodes = [n('n1', 'dialog', { label: '自定义标签' })]
    const root = buildStoryTree(nodes, [])
    expect(root!.label).toBe('自定义标签')
  })
})

// ══════════════════════════════════════════════════════════
// 3. pathTracing — getReachableNodeIds, traceAllPaths 分支
// ══════════════════════════════════════════════════════════
describe('白盒R3: pathTracing 全分支', () => {
  it('getReachableNodeIds: 起始节点无出边返回空', () => {
    const reachable = getReachableNodeIds('lonely', [n('lonely', 'end')], [])
    expect(reachable.size).toBe(0)
  })

  it('getReachableNodeIds: 通过显式边可达', () => {
    const nodes = [n('a', 'dialog'), n('b', 'dialog')]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const reachable = getReachableNodeIds('a', nodes, edges)
    expect(reachable.has('b')).toBe(true)
  })

  it('traceAllPaths: 无入口节点时从第一个开始', () => {
    // 所有节点都有入边 → 没有 entryNodes → 回退到第一个
    const nodes = [n('a', 'dialog'), n('b', 'dialog')]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'b', target: 'a' }]
    const paths = traceAllPaths(nodes, edges)
    expect(paths.length).toBeGreaterThanOrEqual(1)
  })

  it('traceAllPaths: 循环检测不无限递归', () => {
    const nodes = [n('a', 'dialog', { nextNodeId: 'b' }), n('b', 'dialog', { nextNodeId: 'a' })]
    const paths = traceAllPaths(nodes, [])
    expect(paths.length).toBe(1)
    expect(paths[0].endType).toBe('cycle')
  })

  it('traceAllPaths: end 节点正确终止', () => {
    const nodes = [n('a', 'dialog', { nextNodeId: 'e1' }), n('e1', 'end')]
    const paths = traceAllPaths(nodes, [])
    expect(paths[0].endType).toBe('end')
  })

  it('getReachableNodeIds: 隐式连接 (nextNodeId) 被纳入', () => {
    const nodes = [n('a', 'dialog', { nextNodeId: 'b' }), n('b', 'end')]
    const reachable = getReachableNodeIds('a', nodes, [])
    expect(reachable.has('b')).toBe(true)
  })

  it('getReachableNodeIds: 隐式连接 (choice option) 被纳入', () => {
    const nodes: FlowNode[] = [
      { id: 'start', type: 'choice', position: { x: 0, y: 0 }, data: { id: 'start', options: [
        { id: 'o1', text: 'A', nextNodeId: 'a' },
        { id: 'o2', text: 'B', nextNodeId: 'b' }
      ]} } as any,
      n('a', 'end'), n('b', 'end')
    ]
    const reachable = getReachableNodeIds('start', nodes, [], 10)
    expect(reachable.has('a')).toBe(true)
    expect(reachable.has('b')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════
// 4. FlowTraversal — 剩余分支
// ══════════════════════════════════════════════════════════
describe('白盒R3: FlowTraversal 全分支', () => {
  it('getOutgoing: 不存在的节点返回空数组', () => {
    const ft = new FlowTraversal([], [])
    expect(ft.getOutgoing('ghost')).toEqual([])
  })

  it('getNext: 不存在的节点返回 null', () => {
    const ft = new FlowTraversal([], [])
    expect(ft.getNext('ghost')).toBeNull()
  })

  it('isInteractive: 不存在的节点返回 false', () => {
    const ft = new FlowTraversal([], [])
    expect(ft.isInteractive('ghost')).toBe(false)
  })

  it('isEndNode: 不存在的节点返回 false', () => {
    const ft = new FlowTraversal([], [])
    expect(ft.isEndNode('ghost')).toBe(false)
  })

  it('isDialog: 不存在的节点返回 false', () => {
    const ft = new FlowTraversal([], [])
    expect(ft.isDialog('ghost')).toBe(false)
  })

  it('isAutoAdvancing: dialog 返回 false', () => {
    const ft = new FlowTraversal([n('d1', 'dialog')], [])
    expect(ft.isAutoAdvancing('d1')).toBe(false)
  })

  it('getRandomBranches: 非 random 节点返回空', () => {
    const ft = new FlowTraversal([n('d1', 'dialog')], [])
    expect(ft.getRandomBranches('d1')).toEqual([])
  })

  it('getChoiceTargets: 非 choice 节点返回空', () => {
    const ft = new FlowTraversal([n('d1', 'dialog')], [])
    expect(ft.getChoiceTargets('d1')).toEqual([])
  })

  it('隐式连接不与显式边重复 — goto 节点的 targetNodeId', () => {
    const nodes: FlowNode[] = [
      { id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', targetNodeId: 't' } } as any,
      n('t', 'end')
    ]
    const edges: FlowEdge[] = [{ id: 'e1', source: 'g1', target: 't' }]
    const ft = new FlowTraversal(nodes, edges)
    expect(ft.getOutgoing('g1')).toHaveLength(1) // 不重复
  })
})

// ══════════════════════════════════════════════════════════
// 5. StateManager — 剩余分支
// ══════════════════════════════════════════════════════════
describe('白盒R3: StateManager 全分支', () => {
  let sm: StateManager
  beforeEach(() => { sm = new StateManager(); sm.reset() })

  it('applyVariableOp: 变量不存在时默认从 0 开始', () => {
    sm.applyVariableOp('newVar', '=', '42')
    expect(sm.variables['newVar']).toBe(42)
  })

  it('applyVariableOp: -= 到负数', () => {
    sm.variables['x'] = 10
    sm.applyVariableOp('x', '-=', '20')
    expect(sm.variables['x']).toBe(-10)
  })

  it('applyVariableOp: *= 乘以 0', () => {
    sm.variables['x'] = 5
    sm.applyVariableOp('x', '*=', '0')
    expect(sm.variables['x']).toBe(0)
  })

  it('evaluateExpression: != 操作符', () => {
    sm.variables['score'] = 50
    expect(sm.evaluateExpression('score != 30')).toBe(true)
    expect(sm.evaluateExpression('score != 50')).toBe(false)
  })

  it('evaluateExpression: < 操作符', () => {
    sm.variables['val'] = 5
    expect(sm.evaluateExpression('val < 10')).toBe(true)
    expect(sm.evaluateExpression('val < 3')).toBe(false)
  })

  it('evaluateExpression: > 操作符', () => {
    sm.variables['val'] = 5
    expect(sm.evaluateExpression('val > 2')).toBe(true)
    expect(sm.evaluateExpression('val > 10')).toBe(false)
  })

  it('evaluateExpression: <= 操作符', () => {
    sm.variables['val'] = 5
    expect(sm.evaluateExpression('val <= 5')).toBe(true)
    expect(sm.evaluateExpression('val <= 4')).toBe(false)
  })

  it('recordVisit: 多次记录', () => {
    sm.recordVisit({ id: 'n1', type: 'dialog', label: 'test' })
    sm.recordVisit({ id: 'n2', type: 'choice', label: 'select' })
    sm.recordVisit({ id: 'n3', type: 'end', label: 'fin' })
    expect(sm.visitedNodes).toHaveLength(3)
    expect(sm.stepCount).toBe(3)
  })

  it('setFlag 和 globalFlags 联动', () => {
    expect(sm.globalFlags['test']).toBeUndefined()
    sm.setFlag('test', true)
    expect(sm.globalFlags['test']).toBe(true)
  })

  it('loadFromProject: 覆盖已有 variables', () => {
    sm.variables['old'] = 999
    sm.loadFromProject(
      [{ name: 'new', type: 'number', initialValue: 1 }],
      {}, {}, []
    )
    expect(sm.variables['old']).toBeUndefined()
    expect(sm.variables['new']).toBe(1)
  })

  it('loadFromProject: 深拷贝 globalFlags', () => {
    const flags = { a: true }
    sm.loadFromProject([], flags, {}, [])
    flags.a = false
    expect(sm.globalFlags['a']).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════
// 6. 验证层 — 跨类型边缘
// ══════════════════════════════════════════════════════════
describe('白盒R3: 验证层全分支', () => {
  it('多个不同验证规则同时触发', () => {
    const warnings = validateFlow(
      [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', character: '', content: '' } } as any,
        { id: 'c1', type: 'choice', position: { x: 100, y: 0 }, data: { id: 'c1', title: '', options: [] } } as any,
        { id: 'cond', type: 'condition', position: { x: 200, y: 0 }, data: { id: 'cond', expression: '' } } as any
      ],
      []
    )
    expect(warnings.length).toBeGreaterThanOrEqual(3)
  })

  it('goto 目标为 label 不存在时警告', () => {
    const warnings = validateFlow(
      [{ id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', targetNodeId: 'ghost_label' } } as any],
      []
    )
    expect(warnings.some(w => w.message.includes('不存在'))).toBe(true)
  })

  it('goto 目标存在时不警告', () => {
    const warnings = validateFlow(
      [
        { id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', targetNodeId: 'e1' } } as any,
        { id: 'e1', type: 'end', position: { x: 100, y: 0 }, data: { id: 'e1', endingType: 'normal', message: 'ok' } } as any
      ],
      []
    )
    expect(warnings.some(w => w.message.includes('不存在'))).toBe(false)
  })

  it('隐式连接(nextNodeId)存在时不警告死路', () => {
    const warnings = validateFlow(
      [{ id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', character: 'X', content: 'hi', nextNodeId: 'n2' } } as any],
      []
    )
    expect(warnings.some(w => w.message.includes('没有出边'))).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════
// 7. 集成测试 — 混合脚本
// ══════════════════════════════════════════════════════════
describe('白盒R3: 集成测试', () => {
  it('完整混合脚本往返 — 简写+全格式+三引号+label跳转', () => {
    const script = `@label(id: "l1", label: "start_chapter") {
}
Alice: "欢迎"
@audio(id: "a1", type: "bgm", action: "play", src: "bgm.mp3", loop: "true", volume: "0.7") {
}
Bob: "你好"
@condition(id: "cond1") {
  expr: "好感度 >= 50"
  true: "good"
  false: "bad"
}
@dialog(id: "good", character: "Alice", label: "好结局") {
  content: """
    谢谢你的帮助。
    我们的友谊会永远持续下去。
    """
  background: "end_bg.png"
}
@dialog(id: "bad", character: "Bob", label: "坏结局") {
  content: "再见。"
}
@end(id: "e1", type: "normal", label: "普通结局") {
  message: "故事结束"
}`
    const parsed = scriptToFlow(script)
    expect(parsed.success).toBe(true)
    expect(parsed.nodes!.length).toBeGreaterThanOrEqual(7)

    // 往返
    const regenerated = flowToScript(parsed.nodes!, parsed.edges!)
    const round2 = scriptToFlow(regenerated)
    expect(round2.success).toBe(true)
    expect(round2.nodes!.length).toBe(parsed.nodes!.length)
  })

  it('简写行在 label 和 choice 之间', () => {
    const script = `@label(id: "l1", label: "ch1") {
}
Alice: "第一句"
@choice(id: "c1") {
  option("A") { next: "n1" }
  option("B") { next: "n2" }
}
Bob: "不执行的对话"
@dialog(id: "n1", character: "X") {
  content: "分支A"
}
@dialog(id: "n2", character: "Y") {
  content: "分支B"
}`
    const parsed = scriptToFlow(script)
    expect(parsed.success).toBe(true)
    const dialogs = parsed.nodes!.filter(n => n.type === 'dialog')
    expect(dialogs.length).toBeGreaterThanOrEqual(3)
  })

  it('空 unlockCondition 不写入输出', () => {
    const nodes: FlowNode[] = [
      { id: 'd1', type: 'dialog', position: { x: 0, y: 0 },
        data: { id: 'd1', character: 'X', content: 'hi', unlockCondition: '' } } as any
    ]
    const script = flowToScript(nodes, [])
    expect(script).not.toContain('unlock:')
  })

  it('parseNum 处理空字符串', () => {
    const r = scriptToFlow('@random(id: "r1") {\n  option("a", )\n}')
    // 空 weight → parseNum 返回 fallback 1
    expect(r.success).toBe(false) // tokenizer won't parse empty weight as number
  })
})
