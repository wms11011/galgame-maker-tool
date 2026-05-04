import { describe, it, expect } from 'vitest'
import { scriptToFlow, flowToScript } from '../renderer/src/utils/mappingEngine'
import type { FlowNode, FlowEdge } from '../renderer/src/types/index'

describe('性能回归', () => {
  it('100 节点线性链往返 < 200ms', () => {
    const nodes: FlowNode[] = []
    const edges: FlowEdge[] = []
    for (let i = 0; i < 100; i++) {
      nodes.push({
        id: `n${i}`, type: 'dialog', position: { x: i * 200, y: 0 },
        data: { id: `n${i}`, character: `C${i % 5}`, content: `对话内容第${i}句，包含一些较长的文本用于测试性能。` }
      } as any)
      if (i > 0) edges.push({ id: `e${i - 1}`, source: `n${i - 1}`, target: `n${i}` })
    }

    const start = performance.now()
    const script = flowToScript(nodes, edges)
    const mid = performance.now()
    const parsed = scriptToFlow(script)
    const end = performance.now()

    const formatMs = mid - start
    const parseMs = end - mid
    const totalMs = end - start

    expect(parsed.nodes!.length).toBe(100)
    expect(totalMs).toBeLessThan(200)
    console.log(`[Perf] 100 nodes: format=${formatMs.toFixed(1)}ms, parse=${parseMs.toFixed(1)}ms, total=${totalMs.toFixed(1)}ms`)
  })

  it('1000 节点线性链往返 < 2000ms', () => {
    const nodes: FlowNode[] = []
    const edges: FlowEdge[] = []
    for (let i = 0; i < 1000; i++) {
      nodes.push({
        id: `n${i}`, type: 'dialog', position: { x: i * 200, y: 0 },
        data: { id: `n${i}`, character: `C${i % 5}`, content: `对话${i}` }
      } as any)
      if (i > 0) edges.push({ id: `e${i - 1}`, source: `n${i - 1}`, target: `n${i}` })
    }

    const start = performance.now()
    const script = flowToScript(nodes, edges)
    const mid = performance.now()
    const parsed = scriptToFlow(script)
    const end = performance.now()

    expect(parsed.nodes!.length).toBe(1000)
    expect(end - start).toBeLessThan(2000)
  })

  it('10KB 内容往返 < 100ms', () => {
    const big = 'A'.repeat(10000)
    const nodes: FlowNode[] = [
      { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', character: 'X', content: big } } as any
    ]
    const start = performance.now()
    const script = flowToScript(nodes, [])
    const parsed = scriptToFlow(script)
    expect(parsed.nodes![0].data.content.length).toBe(10000)
    expect(performance.now() - start).toBeLessThan(100)
  })

  it('50 个 choice 嵌套往返 < 500ms', () => {
    const nodes: FlowNode[] = []
    const edges: FlowEdge[] = []
    for (let i = 0; i < 50; i++) {
      nodes.push({
        id: `c${i}`, type: 'choice', position: { x: i * 200, y: 0 },
        data: { id: `c${i}`, title: `选择${i}`, options: [
          { id: `o${i}_1`, text: 'A', nextNodeId: i < 49 ? `c${i + 1}` : 'end' },
          { id: `o${i}_2`, text: 'B', nextNodeId: 'end' }
        ] }
      } as any)
      if (i > 0) edges.push({ id: `e${i}`, source: `c${i - 1}`, target: `c${i}`, label: 'A' })
      edges.push({ id: `ex${i}`, source: `c${i}`, target: 'end', label: 'B' })
    }
    nodes.push({ id: 'end', type: 'end', position: { x: 50 * 200, y: 0 }, data: { id: 'end', endingType: 'normal', message: 'end' } } as any)

    const start = performance.now()
    const script = flowToScript(nodes, edges)
    const parsed = scriptToFlow(script)
    expect(parsed.nodes!.length).toBeGreaterThanOrEqual(50)
    expect(performance.now() - start).toBeLessThan(500)
  })
})
