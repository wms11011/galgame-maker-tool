import { describe, it, expect, beforeEach } from 'vitest'
import { handleAddNode, handleDeleteNode, handleUpdateNode, handleConnectNodes, handleGetFlowGraph } from '../tools/flowTools'
import { setState, createEmptyState } from '../shared/projectState'

function getText(r: any): string { return r.content[0].text }
function getJSON(r: any): any { return JSON.parse(getText(r)) }

describe('MCP flow tools', () => {
  beforeEach(() => {
    setState(createEmptyState())
  })

  describe('add_node', () => {
    it('创建 dialog 节点', async () => {
      const r = await handleAddNode({ type: 'dialog', character: 'Alice', content: '你好' })
      const data = getJSON(r)
      expect(data.success).toBe(true)
      expect(data.nodeId).toMatch(/^mcp_dialog_/)
      expect(data.nodeCount).toBe(1)
    })

    it('创建 choice 节点', async () => {
      const r = await handleAddNode({ type: 'choice', label: '选择节点' })
      expect(getJSON(r).success).toBe(true)
    })

    it('创建所有 20 种类型', async () => {
      const types = ['dialog', 'choice', 'condition', 'setVariable', 'goto', 'end',
        'audio', 'cg', 'wait', 'random', 'label', 'animation', 'savePoint', 'timer',
        'moveCharacter', 'steamAchievement', 'achievement', 'particle', 'live2d', 'item']
      for (const t of types) {
        const r = await handleAddNode({ type: t })
        expect(getJSON(r).success).toBe(true)
      }
      const state = (await import('../shared/projectState')).getState()
      expect(state.nodes).toHaveLength(20)
    })

    it('无效类型返回错误', async () => {
      const r = await handleAddNode({ type: 'nonexistent' })
      expect(getJSON(r).error).toContain('未知的节点类型')
    })

    it('覆盖默认值', async () => {
      const r = await handleAddNode({ type: 'dialog', label: '自定义名称', character: 'Bob', content: 'hello', position: { x: 200, y: 300 } })
      expect(getJSON(r).success).toBe(true)
      const state = (await import('../shared/projectState')).getState()
      expect(state.nodes[0].data.label).toBe('自定义名称')
      expect(state.nodes[0].data.character).toBe('Bob')
      expect(state.nodes[0].position).toEqual({ x: 200, y: 300 })
    })

    it('自动计算位置', async () => {
      await handleAddNode({ type: 'dialog' })
      await handleAddNode({ type: 'dialog' })
      const state = (await import('../shared/projectState')).getState()
      expect(state.nodes[1].position.y).toBeGreaterThan(state.nodes[0].position.y)
    })
  })

  describe('delete_node', () => {
    it('删除存在的节点', async () => {
      await handleAddNode({ type: 'dialog' })
      const state = (await import('../shared/projectState')).getState()
      const nodeId = state.nodes[0].id

      const r = await handleDeleteNode({ nodeId })
      expect(getJSON(r).success).toBe(true)
      expect(getJSON(r).remainingNodes).toBe(0)
    })

    it('同时删除关联连线', async () => {
      await handleAddNode({ type: 'dialog' })
      await handleAddNode({ type: 'dialog' })
      const state = (await import('../shared/projectState')).getState()
      const [a, b] = [state.nodes[0].id, state.nodes[1].id]
      await handleConnectNodes({ source: a, target: b })

      const r = await handleDeleteNode({ nodeId: a })
      const data = getJSON(r)
      expect(data.remainingEdges).toBe(0)
    })

    it('不存在的节点返回错误', async () => {
      const r = await handleDeleteNode({ nodeId: 'ghost' })
      expect(getJSON(r).error).toContain('不存在')
    })
  })

  describe('update_node', () => {
    it('更新节点内容', async () => {
      await handleAddNode({ type: 'dialog', content: 'old' })
      const state = (await import('../shared/projectState')).getState()
      const nodeId = state.nodes[0].id

      const r = await handleUpdateNode({ nodeId, data: { content: 'new', character: 'Alice' } })
      expect(getJSON(r).success).toBe(true)
      expect(state.nodes[0].data.content).toBe('new')
      expect(state.nodes[0].data.character).toBe('Alice')
    })

    it('不存在的节点返回错误', async () => {
      const r = await handleUpdateNode({ nodeId: 'ghost', data: { content: 'x' } })
      expect(getJSON(r).error).toContain('不存在')
    })
  })

  describe('connect_nodes', () => {
    it('创建连线', async () => {
      await handleAddNode({ type: 'dialog' })
      await handleAddNode({ type: 'dialog' })
      const state = (await import('../shared/projectState')).getState()
      const [a, b] = [state.nodes[0].id, state.nodes[1].id]

      const r = await handleConnectNodes({ source: a, target: b, label: 'next' })
      expect(getJSON(r).success).toBe(true)
      expect(getJSON(r).source).toBe(a)
    })

    it('重复连线跳过', async () => {
      await handleAddNode({ type: 'dialog' })
      await handleAddNode({ type: 'dialog' })
      const state = (await import('../shared/projectState')).getState()
      const [a, b] = [state.nodes[0].id, state.nodes[1].id]
      await handleConnectNodes({ source: a, target: b })
      const r = await handleConnectNodes({ source: a, target: b })
      expect(getJSON(r).note).toContain('已存在')
    })

    it('源或目标不存在返回错误', async () => {
      await handleAddNode({ type: 'dialog' })
      const state = (await import('../shared/projectState')).getState()
      const a = state.nodes[0].id
      const r = await handleConnectNodes({ source: a, target: 'ghost' })
      expect(getJSON(r).error).toContain('不存在')
    })
  })

  describe('get_flow_graph', () => {
    it('返回图结构', async () => {
      await handleAddNode({ type: 'dialog', character: 'Alice', content: 'hi' })
      await handleAddNode({ type: 'end', label: '结局' })
      const r = await handleGetFlowGraph({ includeAnalysis: true })
      const data = getJSON(r)
      expect(data.nodeCount).toBe(2)
      expect(data.analysis).toBeDefined()
      expect(data.analysis.issueCount).toBeGreaterThanOrEqual(0)
    })

    it('不包含分析结果', async () => {
      await handleAddNode({ type: 'dialog' })
      const r = await handleGetFlowGraph({ includeAnalysis: false })
      const data = getJSON(r)
      expect(data.analysis).toBeUndefined()
    })
  })
})
