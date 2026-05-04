import { describe, it, expect } from 'vitest'
import { FlowTraversal } from '../renderer/src/utils/FlowTraversal'
import type { FlowNode, FlowEdge } from '../renderer/src/types/index'

function n(id: string, type: string, overrides: Record<string, unknown> = {}): FlowNode {
  return { id, type: type as any, position: { x: 0, y: 0 }, data: { id, label: id, ...overrides } as any }
}

function e(source: string, target: string, label?: string): FlowEdge {
  return { id: `e_${source}_${target}`, source, target, label }
}

describe('FlowTraversal', () => {
  it('linear chain', () => {
    const nodes = [n('a', 'dialog'), n('b', 'dialog'), n('c', 'end', { endingType: 'normal', message: '' })]
    const edges = [e('a', 'b'), e('b', 'c')]
    const ft = new FlowTraversal(nodes, edges)
    expect(ft.getNext('a')).toBe('b')
    expect(ft.getNext('b')).toBe('c')
  })

  it('implicit nextNodeId fallback', () => {
    const nodes = [n('a', 'dialog', { nextNodeId: 'b' }), n('b', 'dialog')]
    const ft = new FlowTraversal(nodes, [])
    expect(ft.getNext('a')).toBe('b')
  })

  it('choice node targets', () => {
    const nodes = [
      n('c', 'choice', { options: [{ id: 'o1', text: 'A', nextNodeId: 'a' }, { id: 'o2', text: 'B', nextNodeId: 'b' }] }),
      n('a', 'dialog'),
      n('b', 'dialog')
    ]
    const ft = new FlowTraversal(nodes, [])
    const targets = ft.getChoiceTargets('c')
    expect(targets).toHaveLength(2)
    expect(targets.map(t => t.target)).toContain('a')
    expect(targets.map(t => t.target)).toContain('b')
  })

  it('condition targets', () => {
    const nodes = [n('c', 'condition', { expression: 'x >= 1', trueNextId: 't', falseNextId: 'f' })]
    const ft = new FlowTraversal(nodes, [])
    const targets = ft.getConditionTargets('c')
    expect(targets.trueTarget).toBe('t')
    expect(targets.falseTarget).toBe('f')
  })

  it('isAutoAdvancing', () => {
    const nodes = [n('a', 'dialog'), n('b', 'wait', { duration: 1000 }), n('c', 'choice', { options: [] })]
    const ft = new FlowTraversal(nodes, [])
    expect(ft.isAutoAdvancing('a')).toBe(false)
    expect(ft.isAutoAdvancing('b')).toBe(true)
    expect(ft.isAutoAdvancing('c')).toBe(false)
  })

  it('isInteractive', () => {
    const nodes = [n('a', 'dialog'), n('b', 'choice', { options: [] }), n('c', 'end', { endingType: 'normal', message: '' })]
    const ft = new FlowTraversal(nodes, [])
    expect(ft.isInteractive('a')).toBe(false)
    expect(ft.isInteractive('b')).toBe(true)
    expect(ft.isInteractive('c')).toBe(false)
  })

  it('isEndNode', () => {
    const nodes = [n('a', 'dialog'), n('b', 'end', { endingType: 'good', message: 'end' })]
    const ft = new FlowTraversal(nodes, [])
    expect(ft.isEndNode('a')).toBe(false)
    expect(ft.isEndNode('b')).toBe(true)
  })

  it('hasPath detects reachable nodes', () => {
    const nodes = [n('a', 'dialog'), n('b', 'dialog'), n('c', 'dialog'), n('d', 'end', { endingType: 'normal', message: '' })]
    const edges = [e('a', 'b'), e('b', 'c'), e('c', 'd')]
    const ft = new FlowTraversal(nodes, edges)
    expect(ft.hasPath('a', 'd')).toBe(true)
    expect(ft.hasPath('d', 'a')).toBe(false)
  })

  it('hasPath with cycles', () => {
    const nodes = [n('a', 'dialog'), n('b', 'dialog')]
    const edges = [e('a', 'b'), e('b', 'a')]
    const ft = new FlowTraversal(nodes, edges)
    expect(ft.hasPath('a', 'a')).toBe(true)
  })
})
