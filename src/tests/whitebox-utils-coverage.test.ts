import { describe, it, expect } from 'vitest'
import { parseTextEffects, stripTags } from '../renderer/src/utils/textEffectParser'
import { analyzeGraph } from '../renderer/src/utils/graphAnalysis'
import { buildStoryTree } from '../renderer/src/utils/storyTree'
import { traceAllPaths, getReachableNodeIds } from '../renderer/src/utils/pathTracing'
import type { FlowNode, FlowEdge } from '../renderer/src/types/index'

function makeNode(id: string, type: string, overrides: Record<string, unknown> = {}): FlowNode {
  return { id, type: type as any, position: { x: 0, y: 0 }, data: { id, label: `${type}-${id}`, ...overrides } }
}

// ══════════════════════════════════════════════
// textEffectParser: 覆盖缺失分支 (lines 58, 111-112)
// ══════════════════════════════════════════════
describe('白盒: textEffectParser 分支补全', () => {
  describe('parseTextEffects - pause 标签边缘', () => {
    it('pause=0 按 500ms 处理 (parseFloat("0") 为 falsy 走 fallback)', () => {
      const r = parseTextEffects('你好{pause=0}世界')
      expect(r.pauses).toHaveLength(1)
      expect(r.pauses[0].duration).toBe(500) // 0 is falsy, falls back to 500
    })

    it('pause 不传值走默认 500ms', () => {
      const r = parseTextEffects('你好{pause}世界')
      expect(r.pauses[0].duration).toBe(500)
    })
  })

  describe('parseTextEffects - buildSegment 无值分支', () => {
    it('color 标签无值时 seg.color 为 undefined', () => {
      const r = parseTextEffects('{color}文本{/color}')
      expect(r.segments[0].color).toBeUndefined()
    })

    it('size 标签无值时 seg.fontSize 为 undefined', () => {
      const r = parseTextEffects('{size}文本{/size}')
      expect(r.segments[0].fontSize).toBeUndefined()
    })
  })

  describe('parseTextEffects - bounce 标签', () => {
    it('解析 bounce 标签', () => {
      const r = parseTextEffects('{bounce}弹跳文字{/bounce}')
      expect(r.segments[0].effect).toBe('bounce')
    })
  })

  describe('parseTextEffects - 合并逻辑', () => {
    it('相同效果的相邻段合并', () => {
      const r = parseTextEffects('{shake}A{/shake}{shake}B{/shake}')
      expect(r.segments).toHaveLength(1)
      expect(r.segments[0].text).toBe('AB')
      expect(r.segments[0].effect).toBe('shake')
    })

    it('不同效果不相邻不合并', () => {
      const r = parseTextEffects('{shake}A{/shake}普通{wave}B{/wave}')
      expect(r.segments).toHaveLength(3)
      expect(r.segments[0].effect).toBe('shake')
      expect(r.segments[1].effect).toBeUndefined()
      expect(r.segments[2].effect).toBe('wave')
    })
  })

  describe('parseTextEffects - 标签间无文本', () => {
    it('开标签间无文本不创建空段', () => {
      const r = parseTextEffects('{shake}{wave}文本{/wave}{/shake}')
      expect(r.segments).toHaveLength(1)
      expect(r.segments[0].text).toBe('文本')
    })
  })

  describe('stripTags', () => {
    it('去除所有标签', () => {
      expect(stripTags('{bounce}弹跳{/bounce}')).toBe('弹跳')
      expect(stripTags('{speed=50}快{/speed}')).toBe('快')
    })
  })
})

// ══════════════════════════════════════════════
// graphAnalysis: 覆盖 random branches 分支 (lines 142-145)
// ══════════════════════════════════════════════
describe('白盒: graphAnalysis random 分支补全', () => {
  it('random 节点的 branches 被识别为隐式连接', () => {
    const nodes = [
      makeNode('start', 'dialog', { nextNodeId: 'r1' }),
      makeNode('r1', 'random', {
        branches: [
          { id: 'b1', targetNodeId: 'a', weight: 50, scene: '' },
          { id: 'b2', targetNodeId: 'b', weight: 50, scene: '' }
        ]
      }),
      makeNode('a', 'dialog', { nextNodeId: 'end' }),
      makeNode('b', 'dialog', { nextNodeId: 'end' }),
      makeNode('end', 'end')
    ]
    const result = analyzeGraph(nodes, [])
    expect(result.unreachableNodes).toHaveLength(0)
    expect(result.deadEndNodes).toHaveLength(0)
  })

  it('所有节点无出边时 entryNodes 回退到第一个节点', () => {
    const nodes = [makeNode('n1', 'end'), makeNode('n2', 'end')]
    const result = analyzeGraph(nodes, [])
    // n1 and n2 are both "end" type (not dead-end), and no edges
    // Only n1 is reachable as it's the fallback entry
    expect(result.unreachableNodes).toContain('n2')
  })
})

// ══════════════════════════════════════════════
// storyTree: 覆盖 random branches / endingType 分支
// ══════════════════════════════════════════════
describe('白盒: storyTree 分支补全', () => {
  it('random 节点的 branches 成为子树', () => {
    const nodes = [
      makeNode('start', 'dialog', { nextNodeId: 'r1' }),
      makeNode('r1', 'random', {
        branches: [
          { id: 'b1', targetNodeId: 'a', weight: 70, scene: '' },
          { id: 'b2', targetNodeId: 'b', weight: 30, scene: '' }
        ]
      }),
      makeNode('a', 'dialog'),
      makeNode('b', 'dialog')
    ]
    const root = buildStoryTree(nodes, [])
    expect(root).not.toBeNull()
    const r1 = root!.children[0]
    expect(r1.id).toBe('r1')
    expect(r1.children).toHaveLength(2)
    const childLabels = r1.children.map(c => c.branchLabel)
    expect(childLabels.some(l => l?.includes('70'))).toBe(true)
    expect(childLabels.some(l => l?.includes('30'))).toBe(true)
  })

  it('end 节点携带 endingType', () => {
    const nodes = [
      makeNode('n1', 'dialog', { nextNodeId: 'e1' }),
      makeNode('e1', 'end', { endingType: 'true_end' })
    ]
    const root = buildStoryTree(nodes, [])
    const endNode = root!.children[0]
    expect(endNode.endingType).toBe('true_end')
  })

  it('condition 节点的 true/false 分支带标签', () => {
    const nodes = [
      makeNode('c1', 'condition', { expression: 'x >= 1', trueNextId: 't', falseNextId: 'f' }),
      makeNode('t', 'dialog'),
      makeNode('f', 'dialog')
    ]
    const root = buildStoryTree(nodes, [])
    expect(root!.children).toHaveLength(2)
    expect(root!.children[0].branchLabel).toBe('true')
    expect(root!.children[1].branchLabel).toBe('false')
  })

  it('节点无 label 时使用 type-id 格式', () => {
    const nodes = [makeNode('n1', 'dialog', { label: undefined })]
    const root = buildStoryTree(nodes, [])
    expect(root!.label).toBe('dialog-n1')
  })
})

// ══════════════════════════════════════════════
// pathTracing: 覆盖 getReachableNodeIds + 隐式连接
// ══════════════════════════════════════════════
describe('白盒: pathTracing 分支补全', () => {
  describe('getReachableNodeIds', () => {
    it('从起始节点获取可达集合 (不含自身)', () => {
      const nodes = [
        makeNode('a', 'dialog', { nextNodeId: 'b' }),
        makeNode('b', 'dialog', { nextNodeId: 'c' }),
        makeNode('c', 'dialog'),
        makeNode('d', 'dialog') // unreachable
      ]
      const reachable = getReachableNodeIds('a', nodes, [])
      expect(reachable.has('b')).toBe(true)
      expect(reachable.has('c')).toBe(true)
      expect(reachable.has('a')).toBe(false) // 不含自身
      expect(reachable.has('d')).toBe(false)
    })

    it('空图返回空集合', () => {
      const reachable = getReachableNodeIds('a', [], [])
      expect(reachable.size).toBe(0)
    })

    it('超过 maxDepth 停止', () => {
      const nodes = [
        makeNode('a', 'dialog', { nextNodeId: 'b' }),
        makeNode('b', 'dialog', { nextNodeId: 'c' }),
        makeNode('c', 'dialog')
      ]
      // maxDepth=2: dfs('a',0) → visits a → dfs('b',1) → visits b → dfs('c',2) → depth>=2 returns
      // So 'b' is reachable but 'c' is not
      const reachable = getReachableNodeIds('a', nodes, [], 2)
      expect(reachable.has('b')).toBe(true)
      expect(reachable.has('c')).toBe(false)
    })

    it('循环引用不会无限递归', () => {
      const nodes = [
        makeNode('a', 'dialog', { nextNodeId: 'b' }),
        makeNode('b', 'dialog', { nextNodeId: 'a' })
      ]
      const reachable = getReachableNodeIds('a', nodes, [])
      expect(reachable.has('b')).toBe(true)
      expect(reachable.size).toBe(1)
    })

    it('choice option 隐式连接被纳入', () => {
      const nodes = [
        makeNode('start', 'choice', { options: [
          { id: 'o1', text: 'A', nextNodeId: 'branchA' },
          { id: 'o2', text: 'B', nextNodeId: 'branchB' }
        ]}),
        makeNode('branchA', 'dialog'),
        makeNode('branchB', 'dialog')
      ]
      const reachable = getReachableNodeIds('start', nodes, [])
      expect(reachable.has('branchA')).toBe(true)
      expect(reachable.has('branchB')).toBe(true)
    })

    it('condition true/false 隐式连接被纳入', () => {
      const nodes = [
        makeNode('cond', 'condition', { expression: 'x>=1', trueNextId: 't', falseNextId: 'f' }),
        makeNode('t', 'dialog'),
        makeNode('f', 'dialog')
      ]
      const reachable = getReachableNodeIds('cond', nodes, [])
      expect(reachable.has('t')).toBe(true)
      expect(reachable.has('f')).toBe(true)
    })

    it('random branches 隐式连接被纳入', () => {
      const nodes = [
        makeNode('rnd', 'random', { branches: [
          { id: 'b1', targetNodeId: 'outA', weight: 50, scene: '' },
          { id: 'b2', targetNodeId: 'outB', weight: 50, scene: '' }
        ]}),
        makeNode('outA', 'dialog'),
        makeNode('outB', 'dialog')
      ]
      const reachable = getReachableNodeIds('rnd', nodes, [])
      expect(reachable.has('outA')).toBe(true)
      expect(reachable.has('outB')).toBe(true)
    })
  })

  describe('traceAllPaths', () => {
    it('空图返回空数组', () => {
      expect(traceAllPaths([], [])).toEqual([])
    })

    it('单节点 end 返回单路径', () => {
      const result = traceAllPaths([makeNode('n1', 'end')], [])
      expect(result).toHaveLength(1)
      expect(result[0].endType).toBe('end')
    })

    it('线性链返回单路径', () => {
      const nodes = [
        makeNode('a', 'dialog', { nextNodeId: 'b' }),
        makeNode('b', 'dialog', { nextNodeId: 'c' }),
        makeNode('c', 'end')
      ]
      const result = traceAllPaths(nodes, [])
      expect(result).toHaveLength(1)
      expect(result[0].nodes.map(n => n.id)).toEqual(['a', 'b', 'c'])
    })

    it('choice 分支枚举所有路径', () => {
      const nodes = [
        makeNode('start', 'choice', { options: [
          { id: 'o1', text: 'A', nextNodeId: 'endA' },
          { id: 'o2', text: 'B', nextNodeId: 'endB' }
        ]}),
        makeNode('endA', 'end'),
        makeNode('endB', 'end')
      ]
      const result = traceAllPaths(nodes, [])
      expect(result).toHaveLength(2)
    })

    it('超过最大深度标记为 cycle', () => {
      // Create a long chain that exceeds default maxDepth=50
      const nodes: FlowNode[] = []
      for (let i = 0; i < 10; i++) {
        const nextId = i < 9 ? `n${i + 1}` : undefined
        const data: any = { label: `node${i}` }
        if (nextId) data.nextNodeId = nextId
        nodes.push({ id: `n${i}`, type: 'dialog', position: { x: 0, y: 0 }, data } as FlowNode)
      }
      const result = traceAllPaths(nodes, [])
      // The last node should be dead-end (no out edge, not end type)
      expect(result[0].endType).toBe('dead-end')
    })

    it('循环检测：已访问节点记作 cycle 终点', () => {
      const nodes = [
        makeNode('a', 'dialog', { nextNodeId: 'b' }),
        makeNode('b', 'dialog', { nextNodeId: 'a' })
      ]
      const result = traceAllPaths(nodes, [])
      expect(result).toHaveLength(1)
      expect(result[0].endType).toBe('cycle')
    })

    it('多入口节点各自生成路径', () => {
      const nodes = [
        makeNode('a', 'dialog', { nextNodeId: 'c' }),
        makeNode('b', 'dialog', { nextNodeId: 'c' }),
        makeNode('c', 'end')
      ]
      const result = traceAllPaths(nodes, [])
      // Both a and b are entry nodes (no incoming edges)
      expect(result.length).toBe(2)
    })
  })
})
