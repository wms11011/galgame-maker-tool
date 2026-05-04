import { describe, it, expect } from 'vitest'
import { analyzeGraph } from '../renderer/src/utils/graphAnalysis'
import type { FlowNode, FlowEdge } from '../renderer/src/types/index'

function makeNode(id: string, type: string, overrides: any = {}): FlowNode {
  return {
    id,
    type: type as any,
    position: { x: 0, y: 0 },
    data: { id, label: `${type}-${id}`, ...overrides }
  }
}

describe('graphAnalysis - 图分析', () => {
  // ── 不可达节点检测 ──────────────────────────────────────────

  describe('不可达节点 (unreachable)', () => {
    it('线性链全部可达 → 无问题', () => {
      const nodes = [makeNode('n1', 'dialog'), makeNode('n2', 'dialog')]
      const edges = [{ id: 'e1', source: 'n1', target: 'n2' }]
      const result = analyzeGraph(nodes, edges)
      expect(result.unreachableNodes).toHaveLength(0)
    })

    it('无出边的节点不被视为有效入口', () => {
      // n1 和 n2 都无出边，不视为入口。回退只用 n1，n2 不可达。
      const nodes = [makeNode('n1', 'dialog'), makeNode('n2', 'dialog')]
      const edges: FlowEdge[] = []
      const result = analyzeGraph(nodes, edges)
      expect(result.unreachableNodes).toContain('n2')
    })

    it('有入边但不在入口路径上的节点不可达', () => {
      // n1(入口)→n2, n3→n4 (n3有入边, 但n3不被入口可达), n4也不可达
      const nodes = [
        makeNode('n1', 'dialog'),
        makeNode('n2', 'dialog'),
        makeNode('n3', 'dialog'),
        makeNode('n4', 'dialog')
      ]
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n3', target: 'n4' }
      ]
      const result = analyzeGraph(nodes, edges)
      // n1→n2 is reachable from entry n1
      // n3 has no incoming edges → it's an entry too → n3 and n4 are reachable
      // So everything is reachable from an entry
      expect(result.unreachableNodes).toHaveLength(0)
    })

    it('反向边：入口节点无入边均可达', () => {
      // n2→n1, n2无入边是入口, n1有入边但从n2可达
      const nodes = [makeNode('n1', 'dialog'), makeNode('n2', 'dialog')]
      const edges = [{ id: 'e1', source: 'n2', target: 'n1' }]
      const result = analyzeGraph(nodes, edges)
      expect(result.unreachableNodes).toHaveLength(0)
    })

    it('循环图内所有节点相互可达', () => {
      const nodes = [makeNode('n1', 'dialog'), makeNode('n2', 'dialog'), makeNode('n3', 'dialog')]
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n1' }
      ]
      const result = analyzeGraph(nodes, edges)
      expect(result.unreachableNodes).toHaveLength(0)
    })
  })

  // ── 死路检测 ────────────────────────────────────────────────

  describe('死路节点 (dead-end)', () => {
    it('非 end 类型无出边 → 死路', () => {
      const nodes = [makeNode('n1', 'dialog')]
      const result = analyzeGraph(nodes, [])
      expect(result.deadEndNodes).toContain('n1')
    })

    it('end 类型无出边不算死路', () => {
      const nodes = [makeNode('n1', 'end')]
      const result = analyzeGraph(nodes, [])
      expect(result.deadEndNodes).toHaveLength(0)
    })

    it('有 nextNodeId 的节点不算死路', () => {
      const nodes = [
        makeNode('n1', 'dialog', { nextNodeId: 'n2' }),
        makeNode('n2', 'end')
      ]
      const result = analyzeGraph(nodes, [])
      expect(result.deadEndNodes).not.toContain('n1')
    })

    it('choice 有 option 连接的不算死路', () => {
      const nodes = [
        makeNode('n1', 'choice', { options: [{ id: 'opt1', text: 'A', nextNodeId: 'n2' }] }),
        makeNode('n2', 'end')
      ]
      const result = analyzeGraph(nodes, [])
      expect(result.deadEndNodes).not.toContain('n1')
    })

    it('链式连接的中间节点也不应标记为死路', () => {
      const nodes = [makeNode('n1', 'dialog'), makeNode('n2', 'dialog'), makeNode('n3', 'dialog')]
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' }
      ]
      const result = analyzeGraph(nodes, edges)
      expect(result.deadEndNodes).toContain('n3') // only last node has no output
      expect(result.deadEndNodes).not.toContain('n1')
      expect(result.deadEndNodes).not.toContain('n2')
    })
  })

  // ── 孤立节点检测 ────────────────────────────────────────────

  describe('孤立节点 (orphan)', () => {
    it('无入边无出边 → 孤立', () => {
      const nodes = [makeNode('n1', 'dialog'), makeNode('n2', 'dialog')]
      const edges = [{ id: 'e1', source: 'n1', target: 'n1' }]
      const result = analyzeGraph(nodes, edges)
      expect(result.orphanNodes).toContain('n2')
    })

    it('有入边的不算孤立', () => {
      const nodes = [makeNode('n1', 'dialog'), makeNode('n2', 'dialog')]
      const edges = [{ id: 'e1', source: 'n1', target: 'n2' }]
      const result = analyzeGraph(nodes, edges)
      expect(result.orphanNodes).toHaveLength(0)
    })
  })

  // ── 综合场景 ────────────────────────────────────────────────

  describe('综合场景', () => {
    it('空图无问题', () => {
      const result = analyzeGraph([], [])
      expect(result.issueCount).toBe(0)
    })

    it('单节点无连接：既是死路也是孤立', () => {
      const nodes = [makeNode('n1', 'dialog')]
      const result = analyzeGraph(nodes, [])
      expect(result.deadEndNodes).toContain('n1')
      expect(result.orphanNodes).toContain('n1')
      // 但不可达检测中，唯一的节点算入口节点所以可达
      expect(result.unreachableNodes).toHaveLength(0)
    })

    it('复杂分支图：正确检测所有问题', () => {
      // start → choice1 → branchA → endA
      //                  → branchB (死路: 无出边, 非end)
      // isolated (孤立: 无入边无出边)
      const nodes = [
        makeNode('start', 'dialog', { nextNodeId: 'choice1' }),
        makeNode('choice1', 'choice', { options: [
          { id: 'o1', text: 'A', nextNodeId: 'branchA' },
          { id: 'o2', text: 'B', nextNodeId: 'branchB' }
        ]}),
        makeNode('branchA', 'dialog', { nextNodeId: 'endA' }),
        makeNode('branchB', 'dialog'),
        makeNode('endA', 'end'),
        makeNode('isolated', 'dialog')
      ]
      const result = analyzeGraph(nodes, [])

      expect(result.unreachableNodes).toContain('isolated')
      expect(result.deadEndNodes).toContain('branchB')
      expect(result.orphanNodes).toContain('isolated')
      expect(result.issueCount).toBeGreaterThanOrEqual(2)
    })

    it('循环引用不导致死循环', () => {
      const nodes = [makeNode('n1', 'dialog'), makeNode('n2', 'dialog')]
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n1' }
      ]
      const result = analyzeGraph(nodes, edges)
      expect(result.unreachableNodes).toHaveLength(0)
    })
  })
})
