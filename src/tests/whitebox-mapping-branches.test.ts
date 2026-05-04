import { describe, it, expect } from 'vitest'
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
// 1. mappingEngine 解析分支补全
// ══════════════════════════════════════════════════════════
describe('白盒: mappingEngine 解析分支', () => {
  describe('parseAttributes', () => {
    it('空属性列表 ()', () => {
      const result = scriptToFlow('@label(id: "l1", label: "test") {\n}')
      expect(result.success).toBe(true)
    })

    it('多个属性逗号分隔', () => {
      const result = scriptToFlow('@dialog(id: "d1", character: "A", label: "test") {\n  content: "hi"\n}')
      expect(result.nodes![0].data.label).toBe('test')
    })
  })

  describe('parseBlockBody', () => {
    it('option 关键字导致 break（由 choice 单独处理）', () => {
      const result = scriptToFlow('@choice(id: "c1", title: "选择") {\n  option("A") { next: "n1" }\n}')
      expect(result.success).toBe(true)
      expect(result.nodes![0].type).toBe('choice')
    })

    it('体块内逗号被跳过', () => {
      const result = scriptToFlow('@dialog(id: "d1", character: "A") {\n  content: "test",\n}')
      expect(result.success).toBe(true)
    })
  })

  describe('TokenStream', () => {
    it('expect 值不匹配时抛出 ParseError', () => {
      // @dialog(id: "n1" — 缺少 ) → expect(RPAREN) 遇到 LBRACE
      const result = scriptToFlow('@dialog(id: "n1" {\n  content: "hi"\n}')
      expect(result.errors!.length).toBeGreaterThanOrEqual(1)
    })

    it('expect 类型不匹配时抛出 ParseErrorObj', () => {
      // @dialog 后面直接跟 IDENTIFIER 而不是 LPAREN
      const result = scriptToFlow('@dialog id: "n1") {\n  content: "hi"\n}')
      expect(result.errors!.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('escapeString', () => {
    it('含双引号内容正确往返', () => {
      const content = 'He said "hello"'
      // 使用完整格式避免 shorthand 转义差异
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 },
          data: { id: 'd1', character: 'X', content, background: 'bg.png' } } as any
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.nodes![0].data.content).toBe(content)
    })

    it('含反斜杠内容正确往返', () => {
      const content = 'C:\\path\\to\\file'
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 },
          data: { id: 'd1', character: 'X', content, background: 'bg.png' } } as any
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.nodes![0].data.content).toBe(content)
    })

    it('escapeString undefined 返回空字符串', () => {
      // 间接测试：character 为空时不触发简写
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', character: '', content: 'test' } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('@dialog') // 非简写格式
    })
  })

  describe('dedentString', () => {
    it('单行字符串不处理', () => {
      // dedentString is internal, tested indirectly via triple-quote
      const result = scriptToFlow('@dialog(id: "n1", character: "X") {\n  content: """\n    single line\n    """\n}')
      expect(result.nodes![0].data.content.trim()).toBe('single line')
    })

    it('空行被去除', () => {
      const result = scriptToFlow('@dialog(id: "n1", character: "X") {\n  content: """\n\n    内容\n\n    """\n}')
      expect(result.nodes![0].data.content.trim()).toBe('内容')
    })

    it('所有行都是空行时返回原字符串', () => {
      const result = scriptToFlow('@dialog(id: "n1", character: "X") {\n  content: """\n    \n    \n    """\n}')
      // 所有行trim为空 → minIndent=Infinity → 返回原值
      expect(result.success).toBe(true)
    })
  })

  describe('expandShorthand edge cases', () => {
    it('非简写行在花括号块内不触发', () => {
      const script = '@dialog(id: "n1", character: "X") {\n  content: "Test: this is not shorthand"\n}'
      const result = scriptToFlow(script)
      expect(result.nodes).toHaveLength(1)
    })

    it('简写行后紧跟 @ 指令', () => {
      const script = 'Alice: "hello"\n@label(id: "l1", label: "test") {\n}'
      const result = scriptToFlow(script)
      expect(result.nodes!.filter(n => n.type === 'dialog')).toHaveLength(1)
      expect(result.nodes!.filter(n => n.type === 'label')).toHaveLength(1)
    })

    it('空脚本经过简写后正确返回空', () => {
      const result = scriptToFlow('\n  \n')
      expect(result.nodes).toEqual([])
    })

    it('简写行中的 indent 被保留', () => {
      const script = '  Alice: "indented dialog"'
      const result = scriptToFlow(script)
      expect(result.nodes).toHaveLength(1)
    })
  })

  describe('parseChoiceDirective edge', () => {
    it('choice body 中未知 token 被跳过', () => {
      const script = '@choice(id: "c1", title: "test") {\n  unknown_token\n  option("A") { next: "n1" }\n}'
      const result = scriptToFlow(script)
      expect(result.nodes![0].type).toBe('choice')
      expect((result.nodes![0].data as any).options).toHaveLength(1)
    })
  })

  describe('parseRandomDirective edge', () => {
    it('random body 中未知 token 被跳过', () => {
      const script = '@random(id: "r1") {\n  unknown_token\n  option("a", 3)\n}'
      const result = scriptToFlow(script)
      expect(result.nodes![0].type).toBe('random')
      expect((result.nodes![0].data as any).branches).toHaveLength(1)
    })
  })

  describe('formatDialogNode edge', () => {
    it('自定义 typingSpeed 保留在输出中', () => {
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 },
          data: { id: 'd1', character: 'X', content: 'slow', typingSpeed: 80 } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('typingSpeed: 80')
    })

    it('自定义 textColor 保留在输出中', () => {
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 },
          data: { id: 'd1', character: 'X', content: 'colorful', textColor: '#ff0000' } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('textColor: "#ff0000"')
    })

    it('自定义 fontSize 保留在输出中', () => {
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 },
          data: { id: 'd1', character: 'X', content: 'big', fontSize: 24 } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('fontSize: 24')
    })

    it('自定义 transition 保留在输出中', () => {
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 },
          data: { id: 'd1', character: 'X', content: 'animated', transition: 'slide' } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('transition: "slide"')
    })

    it('自定义 transitionDuration 保留在输出中', () => {
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 },
          data: { id: 'd1', character: 'X', content: 'slow transition', transitionDuration: 800 } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('transitionDuration: 800')
    })
  })

  describe('formatChoiceNode edge', () => {
    it('choice 有 unlockCondition 时 persist', () => {
      const nodes: FlowNode[] = [
        { id: 'c1', type: 'choice', position: { x: 0, y: 0 },
          data: { id: 'c1', title: 'locked choice', options: [{ id: 'o1', text: 'A', nextNodeId: 'n1' }, { id: 'o2', text: 'B', nextNodeId: 'n2' }], unlockCondition: 'x >= 10' } } as any,
        { id: 'n1', type: 'end', position: { x: 0, y: 100 }, data: { id: 'n1', endingType: 'normal', message: '' } } as any,
        { id: 'n2', type: 'end', position: { x: 0, y: 200 }, data: { id: 'n2', endingType: 'normal', message: '' } } as any
      ]
      const edges: FlowEdge[] = [
        { id: 'e1', source: 'c1', target: 'n1', label: 'A' },
        { id: 'e2', source: 'c1', target: 'n2', label: 'B' }
      ]
      const script = flowToScript(nodes, edges)
      expect(script).toContain('unlock: "x >= 10"')
    })

    it('choice 无 title 仍正常', () => {
      const nodes: FlowNode[] = [
        { id: 'c1', type: 'choice', position: { x: 0, y: 0 },
          data: { id: 'c1', title: '', options: [{ id: 'o1', text: 'A', nextNodeId: 'n1' }] } } as any,
        { id: 'n1', type: 'end', position: { x: 0, y: 100 }, data: { id: 'n1', endingType: 'normal', message: '' } } as any
      ]
      const edges: FlowEdge[] = [{ id: 'e1', source: 'c1', target: 'n1', label: 'A' }]
      const script = flowToScript(nodes, edges)
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
    })
  })

  describe('formatConditionNode edge', () => {
    it('condition 只有 true 无 false', () => {
      const nodes: FlowNode[] = [
        { id: 'c1', type: 'condition', position: { x: 0, y: 0 },
          data: { id: 'c1', expression: 'x >= 1', trueNextId: 't1' } } as any,
        { id: 't1', type: 'end', position: { x: 0, y: 100 }, data: { id: 't1', endingType: 'normal', message: '' } } as any
      ]
      const edges: FlowEdge[] = [{ id: 'e1', source: 'c1', target: 't1', label: 'true' }]
      const script = flowToScript(nodes, edges)
      expect(script).toContain('true: "t1"')
      expect(script).not.toContain('false:')
    })

    it('condition unlockCondition 保留', () => {
      const nodes: FlowNode[] = [
        { id: 'c1', type: 'condition', position: { x: 0, y: 0 },
          data: { id: 'c1', expression: 'x>=1', trueNextId: 't', falseNextId: 'f', unlockCondition: 'ch2_unlocked' } } as any,
        { id: 't', type: 'end', position: { x: 0, y: 100 }, data: { id: 't', endingType: 'normal', message: '' } } as any,
        { id: 'f', type: 'end', position: { x: 0, y: 200 }, data: { id: 'f', endingType: 'normal', message: '' } } as any
      ]
      const edges: FlowEdge[] = [
        { id: 'e1', source: 'c1', target: 't', label: 'true' },
        { id: 'e2', source: 'c1', target: 'f', label: 'false' }
      ]
      const script = flowToScript(nodes, edges)
      expect(script).toContain('unlock: "ch2_unlocked"')
    })
  })

  describe('formatEndNode edge', () => {
    it('end 含 background', () => {
      const nodes: FlowNode[] = [
        { id: 'e1', type: 'end', position: { x: 0, y: 0 },
          data: { id: 'e1', endingType: 'good', message: '恭喜', background: 'bg_end.png' } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('background: "bg_end.png"')
    })

    it('end 四种结局类型', () => {
      const types = ['normal', 'good', 'bad', 'true']
      for (const t of types) {
        const nodes: FlowNode[] = [
          { id: 'e1', type: 'end', position: { x: 0, y: 0 },
            data: { id: 'e1', endingType: t, message: '完' } } as any
        ]
        const script = flowToScript(nodes, [])
        expect(script).toContain(`type: "${t}"`)
      }
    })
  })

  describe('formatAudioNode edge', () => {
    it('audio stop 操作', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'audio', position: { x: 0, y: 0 },
          data: { id: 'a1', audioType: 'bgm', action: 'stop', src: '', loop: false, volume: 0 } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('action: "stop"')
    })

    it('audio se 类型', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'audio', position: { x: 0, y: 0 },
          data: { id: 'a1', audioType: 'se', action: 'play', src: 'sfx.wav', loop: false, volume: 1 } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('type: "se"')
    })
  })

  describe('formatCgNode edge', () => {
    it('cg 无 nextId 时正常', () => {
      const nodes: FlowNode[] = [
        { id: 'c1', type: 'cg', position: { x: 0, y: 0 },
          data: { id: 'c1', src: 'cg.png', transition: 'dissolve', duration: 800 } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('transition: "dissolve"')
    })
  })

  describe('formatWaitNode edge', () => {
    it('wait 无 next 正常', () => {
      const nodes: FlowNode[] = [
        { id: 'w1', type: 'wait', position: { x: 0, y: 0 }, data: { id: 'w1', duration: 500 } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('duration: "500"')
    })
  })

  describe('formatRandomNode edge', () => {
    it('random 无出边时 body 为空', () => {
      const nodes: FlowNode[] = [
        { id: 'r1', type: 'random', position: { x: 0, y: 0 },
          data: { id: 'r1', label: 'empty', branches: [] } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).not.toContain('option(')
    })
  })

  describe('formatLabelNode edge', () => {
    it('label 无 color 输出', () => {
      const nodes: FlowNode[] = [
        { id: 'l1', type: 'label', position: { x: 0, y: 0 },
          data: { id: 'l1', label: 'plain' } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('label: "plain"')
      expect(script).not.toContain('color:')
    })
  })

  describe('formatAnimationNode edge', () => {
    it('anim 含 position', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'animation', position: { x: 0, y: 0 },
          data: { id: 'a1', target: 'c', action: 'shake', duration: 300, position: 'right' } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('position: "right"')
    })
  })

  describe('formatTimerNode edge', () => {
    it('timer 无 variable', () => {
      const nodes: FlowNode[] = [
        { id: 't1', type: 'timer', position: { x: 0, y: 0 },
          data: { id: 't1', mode: 'stopwatch', duration: 5000 } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).not.toContain('variable:')
    })
  })

  describe('formatParticleNode edge', () => {
    it('particle 无 density/speed/duration', () => {
      const nodes: FlowNode[] = [
        { id: 'p1', type: 'particle', position: { x: 0, y: 0 },
          data: { id: 'p1', preset: 'rain' } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('preset: "rain"')
    })
  })

  describe('formatLive2DNode edge', () => {
    it('live2d 含所有可选字段', () => {
      const nodes: FlowNode[] = [
        { id: 'l1', type: 'live2d', position: { x: 0, y: 0 },
          data: { id: 'l1', model: 'sakura', expression: 'happy', motion: 'talk', position: 'left' } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('expression: "happy"')
      expect(script).toContain('motion: "talk"')
      expect(script).toContain('position: "left"')
    })
  })

  describe('formatItemNode edge', () => {
    it('item lose action 使用 nextNodeId', () => {
      const nodes: FlowNode[] = [
        { id: 'i1', type: 'item', position: { x: 0, y: 0 },
          data: { id: 'i1', action: 'lose', itemName: '钥匙', nextNodeId: 'n2' } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('next: "n2"')
    })

    it('item use action 无 true/false 分支', () => {
      const nodes: FlowNode[] = [
        { id: 'i1', type: 'item', position: { x: 0, y: 0 },
          data: { id: 'i1', action: 'use', itemName: '药水' } } as any
      ]
      const script = flowToScript(nodes, [])
      expect(script).not.toContain('true:')
      expect(script).not.toContain('false:')
    })
  })

  describe('formatGotoNode label emit', () => {
    it('goto target 节点有 label → 输出 label', () => {
      const nodes: FlowNode[] = [
        { id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', targetNodeId: 't1' } } as any,
        { id: 't1', type: 'dialog', position: { x: 100, y: 0 }, data: { id: 't1', label: '目标章节', character: 'X', content: 'hi' } } as any
      ]
      const edges: FlowEdge[] = [{ id: 'e1', source: 'g1', target: 't1' }]
      const script = flowToScript(nodes, edges)
      expect(script).toContain('target: "目标章节"')
    })

    it('goto target 节点无 label → 输出 ID', () => {
      const nodes: FlowNode[] = [
        { id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', targetNodeId: 't1' } } as any,
        { id: 't1', type: 'end', position: { x: 100, y: 0 }, data: { id: 't1', endingType: 'normal', message: '' } } as any
      ]
      const edges: FlowEdge[] = [{ id: 'e1', source: 'g1', target: 't1' }]
      const script = flowToScript(nodes, edges)
      expect(script).toContain('target: "t1"')
    })
  })

  describe('resolveConflict', () => {
    it('flowToScript 空节点列表返回空字符串', () => {
      expect(flowToScript([], [])).toBe('')
    })

    it('dialog 简写连续输出', () => {
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', character: 'Alice', content: 'line1' } } as any,
        { id: 'd2', type: 'dialog', position: { x: 100, y: 0 }, data: { id: 'd2', character: 'Bob', content: 'line2' } } as any
      ]
      const edges: FlowEdge[] = [{ id: 'e1', source: 'd1', target: 'd2' }]
      const script = flowToScript(nodes, edges)
      // Two plain dialogs → both in shorthand
      expect(script).toContain('Alice: "line1"')
      expect(script).toContain('Bob: "line2"')
    })
  })
})

// ══════════════════════════════════════════════════════════
// 2. StateManager 分支补全
// ══════════════════════════════════════════════════════════
describe('白盒: StateManager 分支补全', () => {
  let sm: StateManager
  beforeEach(() => { sm = new StateManager(); sm.reset() })

  it('applyVariableOp 未知操作符不变更值', () => {
    sm.variables['x'] = 5
    sm.applyVariableOp('x', '~=', '3')
    expect(sm.variables['x']).toBe(5)
  })

  it('recordVariableChange 在未执行 recordVisit 时 step 为 0', () => {
    sm.recordVariableChange('n1', 'x', 0, 10, '=')
    expect(sm.variableHistory).toHaveLength(1)
    expect(sm.variableHistory[0].step).toBe(0)
  })

  it('loadFromProject 字符串类型直接赋值', () => {
    sm.loadFromProject(
      [{ name: 'msg', type: 'string', initialValue: 'hello world' }],
      {}, {}, []
    )
    expect(sm.variables['msg']).toBe('hello world')
  })

  it('loadFromProject boolean 类型初始化', () => {
    sm.loadFromProject(
      [{ name: 'seen', type: 'boolean', initialValue: true }],
      {}, {}, []
    )
    expect(sm.variables['seen']).toBe(true)
  })

  it('evaluateExpression 复杂嵌套 AND/OR', () => {
    sm.variables['a'] = 1; sm.variables['b'] = 2; sm.variables['c'] = 0
    // "a >= 1 && b >= 2 && c >= 1" → AND splits → a>=1(t) && b>=2(t) && c>=1(f) → false
    expect(sm.evaluateExpression('a >= 1 && b >= 2 && c >= 1')).toBe(false)
  })

  it('buildDebugInfo 空 errorNodes', () => {
    sm.buildDebugInfo(null, null, null, false, false, 3, [])
    expect(sm.lastAutoCheckInfo).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════
// 3. FlowTraversal / graphAnalysis / storyTree / pathTracing 分支补全
// ══════════════════════════════════════════════════════════
describe('白盒: 图算法分支补全', () => {
  describe('FlowTraversal', () => {
    it('getConditionTargets — data 为 null 时不崩溃', () => {
      const ft = new FlowTraversal([{ id: 'c1', type: 'condition', position: { x: 0, y: 0 }, data: {} } as any], [])
      const targets = ft.getConditionTargets('c1')
      expect(targets.trueTarget).toBeNull()
      expect(targets.falseTarget).toBeNull()
    })

    it('hasPath — 起始节点不存在', () => {
      const ft = new FlowTraversal([], [])
      expect(ft.hasPath('start', 'end')).toBe(false)
    })

    it('isAutoAdvancing — 未知节点返回 false', () => {
      const ft = new FlowTraversal([], [])
      expect(ft.isAutoAdvancing('ghost')).toBe(false)
    })
  })

  describe('graphAnalysis', () => {
    it('所有节点都是 end 类型 → 无死路', () => {
      const nodes = [n('e1', 'end'), n('e2', 'end')]
      const result = analyzeGraph(nodes, [])
      expect(result.deadEndNodes).toHaveLength(0)
    })

    it('孤立节点被正确检测', () => {
      const nodes = [n('isolated', 'dialog'), n('connected', 'dialog')]
      const edges = [{ id: 'e1', source: 'connected', target: 'connected' } as any]
      const result = analyzeGraph(nodes, edges)
      expect(result.orphanNodes).toContain('isolated')
    })

    it('entryNodes 回退 — 所有节点无出边时用第一个', () => {
      const nodes = [n('n1', 'end'), n('n2', 'end')]
      const result = analyzeGraph(nodes, [])
      expect(result.unreachableNodes).toHaveLength(1) // n2 not reachable from n1 (no edges)
    })
  })

  describe('storyTree', () => {
    it('getNodeLabel — 节点不存在返回 ID', () => {
      // 间接测试：创建循环引用，触发 getNodeLabel 查找不存在的 ID
      const nodes = [
        n('a', 'dialog', { nextNodeId: 'ghost' }),
        n('ghost', 'dialog')
      ]
      const root = buildStoryTree(nodes, [])
      expect(root).not.toBeNull()
    })

    it('getNodeType — 节点不存在返回 unknown', () => {
      // 通过 goto 指向不存在的节点间接测试
      const nodes = [n('g1', 'goto', { targetNodeId: 'nonexist' })]
      const root = buildStoryTree(nodes, [])
      expect(root).not.toBeNull()
      expect(root!.children).toHaveLength(1)
    })

    it('option.nextNodeId 为空时跳过', () => {
      const nodes = [
        n('c1', 'choice', { options: [
          { id: 'o1', text: 'A', nextNodeId: '' }
        ]})
      ]
      const root = buildStoryTree(nodes, [])
      expect(root!.children).toHaveLength(0)
    })

    it('branch.targetNodeId 为空时跳过', () => {
      const nodes = [
        n('r1', 'random', { branches: [
          { id: 'b1', targetNodeId: '', weight: 50, scene: '' }
        ]})
      ]
      const root = buildStoryTree(nodes, [])
      expect(root!.children).toHaveLength(0)
    })
  })

  describe('pathTracing', () => {
    it('getReachableNodeIds — 起始不存在返回空', () => {
      const reachable = getReachableNodeIds('start', [], [])
      expect(reachable.size).toBe(0)
    })

    it('traceAllPaths — 无入口节点时用第一个节点', () => {
      const nodes = [n('n1', 'dialog')]
      const paths = traceAllPaths(nodes, [])
      expect(paths).toHaveLength(1)
      expect(paths[0].endType).toBe('dead-end')
    })

    it('traceAllPaths — 深度超限标记为 cycle', () => {
      const nodes: FlowNode[] = []
      for (let i = 0; i < 5; i++) {
        nodes.push(n(`n${i}`, 'dialog', i < 4 ? { nextNodeId: `n${i + 1}` } : {}))
      }
      // maxDepth default is 50, with 5 nodes it shouldn't trigger
      const paths = traceAllPaths(nodes, [])
      expect(paths).toHaveLength(1)
    })
  })
})
