import { describe, it, expect } from 'vitest'
import { buildStoryTree } from '../renderer/src/utils/storyTree'
import type { FlowNode, FlowEdge } from '../renderer/src/types/index'

function n(id: string, type: string, overrides: any = {}): FlowNode {
  return {
    id,
    type: type as any,
    position: { x: 0, y: 0 },
    data: { id, label: `${id}`, ...overrides }
  }
}

describe('buildStoryTree', () => {
  it('空图返回 null', () => {
    expect(buildStoryTree([], [])).toBeNull()
  })

  it('单节点返回单节点树', () => {
    const root = buildStoryTree([n('n1', 'dialog')], [])
    expect(root).not.toBeNull()
    expect(root!.id).toBe('n1')
    expect(root!.children).toHaveLength(0)
  })

  it('线性链构建正确', () => {
    const nodes = [n('n1', 'dialog'), n('n2', 'dialog')]
    const edges = [{ id: 'e1', source: 'n1', target: 'n2' }]
    const root = buildStoryTree(nodes, edges)
    expect(root!.id).toBe('n1')
    expect(root!.children).toHaveLength(1)
    expect(root!.children[0].id).toBe('n2')
  })

  it('choice 节点展示分支标签', () => {
    const nodes = [
      n('c1', 'choice', { options: [
        { id: 'o1', text: '去海边', nextNodeId: 'd1' },
        { id: 'o2', text: '回家', nextNodeId: 'd2' }
      ]}),
      n('d1', 'dialog'),
      n('d2', 'dialog')
    ]
    const root = buildStoryTree(nodes, [])
    expect(root!.children).toHaveLength(2)
    const labels = root!.children.map((c) => c.branchLabel)
    expect(labels).toContain('去海边')
    expect(labels).toContain('回家')
  })

  it('循环引用不会无限递归', () => {
    const nodes = [n('n1', 'dialog'), n('n2', 'dialog')]
    const edges = [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n1' }
    ]
    const root = buildStoryTree(nodes, edges)
    expect(root!.id).toBe('n1')
    expect(root!.children).toHaveLength(1)
    // n2 → n1 → n2 (cycle detected, n2 as leaf)
    const n2 = root!.children[0]
    expect(n2.id).toBe('n2')
    const n1cycle = n2.children[0]
    expect(n1cycle.id).toBe('n1')
    // n1's child n2 is already visited, so n2 appears as leaf with 0 children
    expect(n1cycle.children[0].children).toHaveLength(0)
  })
})
