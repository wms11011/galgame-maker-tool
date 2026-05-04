import { describe, it, expect } from 'vitest'
import { traceAllPaths } from '../renderer/src/utils/pathTracing'
import type { FlowNode, FlowEdge } from '../renderer/src/types/index'

function n(id: string, type: string, overrides: any = {}): FlowNode {
  return {
    id,
    type: type as any,
    position: { x: 0, y: 0 },
    data: { id, label: `${type}-${id}`, ...overrides }
  }
}

describe('traceAllPaths', () => {
  it('空图返回空数组', () => {
    expect(traceAllPaths([], [])).toEqual([])
  })

  it('单节点返回一条路线', () => {
    const paths = traceAllPaths([n('n1', 'dialog')], [])
    expect(paths).toHaveLength(1)
    expect(paths[0].nodes[0].id).toBe('n1')
    expect(paths[0].endType).toBe('dead-end')
  })

  it('线性链返回一条路线', () => {
    const nodes = [n('n1', 'dialog'), n('n2', 'dialog'), n('n3', 'end')]
    const edges = [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' }
    ]
    const paths = traceAllPaths(nodes, edges)
    expect(paths).toHaveLength(1)
    expect(paths[0].nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3'])
    expect(paths[0].endType).toBe('end')
  })

  it('choice 节点产生分支路线', () => {
    const nodes = [
      n('c1', 'choice', { options: [
        { id: 'o1', text: '左', nextNodeId: 'd1' },
        { id: 'o2', text: '右', nextNodeId: 'd2' }
      ]}),
      n('d1', 'dialog'),
      n('d2', 'end')
    ]
    const paths = traceAllPaths(nodes, [])
    expect(paths).toHaveLength(2)
    expect(paths[0].nodes[0].id).toBe('c1')
  })

  it('condition 节点产生真/假两条路线', () => {
    const nodes = [
      n('cond', 'condition', { expression: 'x > 0', trueNextId: 't1', falseNextId: 'f1' }),
      n('t1', 'end'),
      n('f1', 'end')
    ]
    const paths = traceAllPaths(nodes, [])
    expect(paths).toHaveLength(2)
    const ids = paths.map((p) => p.nodes.map((n) => n.id))
    expect(ids).toContainEqual(['cond', 't1'])
    expect(ids).toContainEqual(['cond', 'f1'])
  })

  it('循环检测：到达已访问节点标记为 cycle', () => {
    const nodes = [n('n1', 'dialog'), n('n2', 'dialog')]
    const edges = [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n1' }
    ]
    const paths = traceAllPaths(nodes, edges)
    expect(paths.length).toBeGreaterThan(0)
    const hasCycle = paths.some((p) => p.endType === 'cycle')
    expect(hasCycle).toBe(true)
  })

  it('分支标签包含在路线节点中', () => {
    const nodes = [
      n('c1', 'choice', { options: [
        { id: 'o1', text: '海边', nextNodeId: 'd1' }
      ]}),
      n('d1', 'end')
    ]
    const paths = traceAllPaths(nodes, [])
    expect(paths).toHaveLength(1)
    const branchNode = paths[0].nodes.find((n) => n.branchLabel === '海边')
    expect(branchNode).toBeDefined()
  })

  it('多入口产生多组路线', () => {
    const nodes = [n('n1', 'dialog'), n('n2', 'dialog'), n('n3', 'end')]
    const edges = [
      { id: 'e1', source: 'n1', target: 'n3' },
      { id: 'e2', source: 'n2', target: 'n3' }
    ]
    const paths = traceAllPaths(nodes, edges)
    // n1 和 n2 都是入口
    expect(paths.length).toBeGreaterThanOrEqual(1)
  })

  it('random 节点分支算作不同路线', () => {
    const nodes = [
      n('r1', 'random', { branches: [
        { id: 'b1', targetNodeId: 'd1', weight: 5 },
        { id: 'b2', targetNodeId: 'd2', weight: 3 }
      ]}),
      n('d1', 'end'),
      n('d2', 'end')
    ]
    const paths = traceAllPaths(nodes, [])
    expect(paths).toHaveLength(2)
  })
})
