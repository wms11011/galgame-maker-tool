import { describe, it, expect } from 'vitest'
import { FlowTraversal } from '../renderer/src/utils/FlowTraversal'
import type { FlowNode, FlowEdge } from '../renderer/src/types/index'

function n(id: string, type: string, overrides: Record<string, unknown> = {}): FlowNode {
  return { id, type: type as any, position: { x: 0, y: 0 }, data: { id, label: `${type}-${id}`, ...overrides } }
}

describe('白盒: FlowTraversal 分支补全', () => {
  describe('构造与基础查询', () => {
    it('空图不报错', () => {
      const ft = new FlowTraversal([], [])
      expect(ft.getOutgoing('n1')).toEqual([])
      expect(ft.getNext('n1')).toBeNull()
    })

    it('线性链 getNext 返回下一跳', () => {
      const nodes = [n('a', 'dialog'), n('b', 'dialog')]
      const edges = [{ id: 'e1', source: 'a', target: 'b' }]
      const ft = new FlowTraversal(nodes, edges)
      expect(ft.getNext('a')).toBe('b')
      expect(ft.getNext('b')).toBeNull()
    })
  })

  describe('getOutgoing', () => {
    it('返回节点的所有出口 (显式 + 隐式)', () => {
      const nodes = [
        n('a', 'dialog', { nextNodeId: 'b' }),
        n('b', 'dialog')
      ]
      const ft = new FlowTraversal(nodes, [])
      expect(ft.getOutgoing('a')).toHaveLength(1)
      expect(ft.getOutgoing('a')[0].target).toBe('b')
    })

    it('不存在的节点返回空数组', () => {
      const ft = new FlowTraversal([], [])
      expect(ft.getOutgoing('no-exist')).toEqual([])
    })
  })

  describe('getChoiceTargets', () => {
    it('choice 节点返回所有选项目标', () => {
      const nodes = [
        n('c1', 'choice', { options: [
          { id: 'o1', text: 'A', nextNodeId: 'endA' },
          { id: 'o2', text: 'B', nextNodeId: 'endB' }
        ]}),
        n('endA', 'end'),
        n('endB', 'end')
      ]
      const ft = new FlowTraversal(nodes, [])
      const targets = ft.getChoiceTargets('c1')
      expect(targets).toHaveLength(2)
    })
  })

  describe('getConditionTargets', () => {
    it('优先返回显式 true/false edge', () => {
      const nodes = [
        n('cond', 'condition', { expression: 'x>=1', trueNextId: 't1', falseNextId: 'f1' }),
        n('t1', 'dialog'),
        n('f1', 'dialog'),
        n('t2', 'dialog'),
        n('f2', 'dialog')
      ]
      const edges = [
        { id: 'e1', source: 'cond', target: 't2', label: 'true' },
        { id: 'e2', source: 'cond', target: 'f2', label: 'false' }
      ]
      const ft = new FlowTraversal(nodes, edges)
      const targets = ft.getConditionTargets('cond')
      // 显式 edge 优先于 data 字段
      expect(targets.trueTarget).toBe('t2')
      expect(targets.falseTarget).toBe('f2')
    })

    it('无显式 edge 时回退到 data 字段', () => {
      const nodes = [
        n('cond', 'condition', { expression: 'x>=1', trueNextId: 't1', falseNextId: 'f1' }),
        n('t1', 'dialog'),
        n('f1', 'dialog')
      ]
      const ft = new FlowTraversal(nodes, [])
      const targets = ft.getConditionTargets('cond')
      expect(targets.trueTarget).toBe('t1')
      expect(targets.falseTarget).toBe('f1')
    })

    it('都不存在时返回 null', () => {
      const nodes = [n('cond', 'condition', { expression: 'x>=1' })]
      const ft = new FlowTraversal(nodes, [])
      const targets = ft.getConditionTargets('cond')
      expect(targets.trueTarget).toBeNull()
      expect(targets.falseTarget).toBeNull()
    })
  })

  describe('getRandomBranches', () => {
    it('返回 random 节点的 branches', () => {
      const branches = [
        { id: 'b1', targetNodeId: 'a', weight: 70, scene: '' },
        { id: 'b2', targetNodeId: 'b', weight: 30, scene: '' }
      ]
      const nodes = [n('r1', 'random', { branches })]
      const ft = new FlowTraversal(nodes, [])
      const result = ft.getRandomBranches('r1')
      expect(result).toEqual(branches)
    })

    it('不存在的节点返回空数组', () => {
      const ft = new FlowTraversal([], [])
      expect(ft.getRandomBranches('no-exist')).toEqual([])
    })
  })

  describe('isAutoAdvancing', () => {
    it('自动推进节点类型返回 true', () => {
      const ft = new FlowTraversal(
        ['setVariable', 'goto', 'audio', 'cg', 'wait', 'label', 'savePoint', 'animation', 'timer', 'moveCharacter', 'achievement', 'steamAchievement'].map((t, i) => n(`n${i}`, t)),
        []
      )
      expect(ft.isAutoAdvancing('n0')).toBe(true) // setVariable
      expect(ft.isAutoAdvancing('n1')).toBe(true) // goto
    })

    it('dialog / choice / end 返回 false', () => {
      const nodes = [n('d1', 'dialog'), n('c1', 'choice'), n('e1', 'end')]
      const ft = new FlowTraversal(nodes, [])
      expect(ft.isAutoAdvancing('d1')).toBe(false)
      expect(ft.isAutoAdvancing('c1')).toBe(false)
      expect(ft.isAutoAdvancing('e1')).toBe(false)
    })

    it('不存在的节点返回 false', () => {
      const ft = new FlowTraversal([], [])
      expect(ft.isAutoAdvancing('no-exist')).toBe(false)
    })
  })

  describe('isInteractive', () => {
    it('choice 节点返回 true', () => {
      const ft = new FlowTraversal([n('c1', 'choice')], [])
      expect(ft.isInteractive('c1')).toBe(true)
    })

    it('非 choice 返回 false', () => {
      const ft = new FlowTraversal([n('d1', 'dialog')], [])
      expect(ft.isInteractive('d1')).toBe(false)
    })

    it('不存在的节点返回 false', () => {
      const ft = new FlowTraversal([], [])
      expect(ft.isInteractive('no-exist')).toBe(false)
    })
  })

  describe('isEndNode / isDialog', () => {
    it('end 节点返回 true', () => {
      const ft = new FlowTraversal([n('e1', 'end')], [])
      expect(ft.isEndNode('e1')).toBe(true)
      expect(ft.isDialog('e1')).toBe(false)
    })

    it('dialog 节点返回 true', () => {
      const ft = new FlowTraversal([n('d1', 'dialog')], [])
      expect(ft.isEndNode('d1')).toBe(false)
      expect(ft.isDialog('d1')).toBe(true)
    })
  })

  describe('getNode', () => {
    it('返回存在的节点', () => {
      const node = n('test', 'dialog')
      const ft = new FlowTraversal([node], [])
      const result = ft.getNode('test')
      expect(result).toBeDefined()
      expect(result!.id).toBe('test')
    })

    it('不存在的节点返回 undefined', () => {
      const ft = new FlowTraversal([], [])
      expect(ft.getNode('no-exist')).toBeUndefined()
    })
  })

  describe('getNodeLabel', () => {
    it('返回节点 label', () => {
      const ft = new FlowTraversal([n('test', 'dialog', { label: '我的标签' })], [])
      expect(ft.getNodeLabel('test')).toBe('我的标签')
    })

    it('无 label 返回 type-id', () => {
      const ft = new FlowTraversal([n('test', 'dialog', { label: undefined })], [])
      expect(ft.getNodeLabel('test')).toBe('dialog-test')
    })

    it('不存在的节点返回 id', () => {
      const ft = new FlowTraversal([], [])
      expect(ft.getNodeLabel('ghost')).toBe('ghost')
    })
  })

  describe('hasPath', () => {
    it('直接连接存在路径', () => {
      const nodes = [n('a', 'dialog'), n('b', 'dialog')]
      const edges = [{ id: 'e1', source: 'a', target: 'b' }]
      const ft = new FlowTraversal(nodes, edges)
      expect(ft.hasPath('a', 'b')).toBe(true)
    })

    it('间接连接存在路径', () => {
      const nodes = [n('a', 'dialog'), n('b', 'dialog'), n('c', 'dialog')]
      const edges = [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' }
      ]
      const ft = new FlowTraversal(nodes, edges)
      expect(ft.hasPath('a', 'c')).toBe(true)
    })

    it('无路径返回 false', () => {
      const nodes = [n('a', 'dialog'), n('b', 'dialog')]
      const ft = new FlowTraversal(nodes, [])
      expect(ft.hasPath('a', 'b')).toBe(false)
    })

    it('起始节点到自身返回 true（BFS 起始即为 target）', () => {
      const ft = new FlowTraversal([n('a', 'dialog')], [])
      // BFS starts with queue[0] === 'a', and current === target is checked immediately
      // Actually looking at the code: while loop checks `if (current === target) return true`
      // for the first element too. But actually, BFS starts with start added to queue
      // and the while loop first dequeues `start` and checks `current === target`.
      // Since start === target, it returns true immediately.
      expect(ft.hasPath('a', 'a')).toBe(true)
    })

    it('循环图中有路径', () => {
      const nodes = [n('a', 'dialog'), n('b', 'dialog'), n('c', 'dialog')]
      const edges = [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
        { id: 'e3', source: 'c', target: 'a' }
      ]
      const ft = new FlowTraversal(nodes, edges)
      expect(ft.hasPath('a', 'c')).toBe(true)
    })
  })

  describe('隐式连接去重', () => {
    it('隐式连接不与显式 edge 重复', () => {
      const nodes = [n('a', 'dialog', { nextNodeId: 'b' }), n('b', 'dialog')]
      const edges = [{ id: 'e1', source: 'a', target: 'b' }]
      const ft = new FlowTraversal(nodes, edges)
      expect(ft.getOutgoing('a')).toHaveLength(1) // 不重复
    })

    it('goto 的 targetNodeId 被纳入', () => {
      const nodes = [n('g1', 'goto', { targetNodeId: 'target' }), n('target', 'dialog')]
      const ft = new FlowTraversal(nodes, [])
      expect(ft.getOutgoing('g1')).toHaveLength(1)
      expect(ft.getOutgoing('g1')[0].target).toBe('target')
    })
  })
})
