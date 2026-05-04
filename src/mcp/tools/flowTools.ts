/**
 * MCP Tools — 流程图操作
 * 使用纯 TS projectState 替代 Pinia flowStore
 */
import { z } from 'zod'
import { getState, saveProject } from '../shared/projectState'
import { NODE_TYPE_REGISTRY } from '../../renderer/src/utils/nodeTypeRegistry'
import type { FlowNode, FlowEdge, NodeType } from '../../renderer/src/types/index'
import { analyzeGraph } from '../../renderer/src/utils/graphAnalysis'

// ── ID generation ──
let edgeCounter = 0
function nextEdgeId(): string { return `mcp_e_${Date.now()}_${++edgeCounter}` }

// ── Schema ──

export const AddNodeSchema = z.object({
  type: z.string().describe('节点类型，如 dialog/choice/condition/setVariable/goto 等'),
  label: z.string().optional().describe('节点显示名称'),
  character: z.string().optional().describe('对话节点的角色名'),
  content: z.string().optional().describe('对话节点的内容'),
  position: z.object({ x: z.number(), y: z.number() }).optional()
    .describe('节点在画布上的位置，默认 {x:100, y:100}')
})

export const DeleteNodeSchema = z.object({
  nodeId: z.string().describe('要删除的节点 ID')
})

export const UpdateNodeSchema = z.object({
  nodeId: z.string().describe('要更新的节点 ID'),
  data: z.record(z.unknown()).describe('要更新的字段名和值')
})

export const ConnectNodesSchema = z.object({
  source: z.string().describe('源节点 ID'),
  target: z.string().describe('目标节点 ID'),
  label: z.string().optional().describe('连线标签（如 true/false 或选项文本）')
})

export const GetFlowGraphSchema = z.object({
  includeAnalysis: z.boolean().optional().default(true)
    .describe('是否包含图分析结果（不可达/死路/孤立节点）')
})

// ── Handlers ──

export async function handleAddNode(args: z.infer<typeof AddNodeSchema>) {
  const state = getState()
  const type = args.type as NodeType
  const meta = NODE_TYPE_REGISTRY[type]

  if (!meta) {
    const msg = JSON.stringify({ error: `未知的节点类型: ${type}。有效类型: ${Object.keys(NODE_TYPE_REGISTRY).join(', ')}` })
    return { content: [{ type: 'text' as const, text: msg }] }
  }

  const id = `mcp_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const data: Record<string, unknown> = { id }

  // 从 registry 构建默认值
  for (const f of meta.fields) {
    if (f.key === 'id') continue
    data[f.key] = f.default !== undefined ? f.default : ''
  }

  // 覆盖用户指定的字段
  if (args.label) data.label = args.label
  if (args.character) data.character = args.character
  if (args.content) data.content = args.content

  const node: FlowNode = {
    id,
    type,
    position: args.position ?? { x: 100, y: state.nodes.length * 150 + 100 },
    data: data as any
  }

  state.nodes.push(node)
  try { saveProject() } catch { /* allow in-memory only */ }

  return { content: [{ type: 'text' as const, text: JSON.stringify({
    success: true, nodeId: id, nodeCount: state.nodes.length
  }, null, 2) }] }
}

export async function handleDeleteNode(args: z.infer<typeof DeleteNodeSchema>) {
  const state = getState()
  const idx = state.nodes.findIndex(n => n.id === args.nodeId)
  if (idx === -1) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      error: `节点不存在: ${args.nodeId}`
    }) }] }
  }

  const deleted = state.nodes.splice(idx, 1)[0]
  // 同时删除关联连线
  state.edges = state.edges.filter(e => e.source !== args.nodeId && e.target !== args.nodeId)
  try { saveProject() } catch { }

  return { content: [{ type: 'text' as const, text: JSON.stringify({
    success: true, deletedNodeId: deleted.id, remainingNodes: state.nodes.length, remainingEdges: state.edges.length
  }, null, 2) }] }
}

export async function handleUpdateNode(args: z.infer<typeof UpdateNodeSchema>) {
  const state = getState()
  const node = state.nodes.find(n => n.id === args.nodeId)
  if (!node) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      error: `节点不存在: ${args.nodeId}`
    }) }] }
  }

  // 合并用户字段到节点 data
  Object.assign(node.data, args.data)
  try { saveProject() } catch { }

  return { content: [{ type: 'text' as const, text: JSON.stringify({
    success: true, nodeId: node.id, updatedFields: Object.keys(args.data)
  }, null, 2) }] }
}

export async function handleConnectNodes(args: z.infer<typeof ConnectNodesSchema>) {
  const state = getState()
  const srcExists = state.nodes.some(n => n.id === args.source)
  const tgtExists = state.nodes.some(n => n.id === args.target)

  if (!srcExists || !tgtExists) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      error: `节点不存在: ${!srcExists ? args.source : args.target}`
    }) }] }
  }

  // 检查是否已存在相同连线
  const exists = state.edges.some(e => e.source === args.source && e.target === args.target)
  if (exists) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      success: true, note: '连线已存在，跳过'
    }) }] }
  }

  const edge: FlowEdge = {
    id: nextEdgeId(),
    source: args.source,
    target: args.target,
    label: args.label
  }
  state.edges.push(edge)
  try { saveProject() } catch { }

  return { content: [{ type: 'text' as const, text: JSON.stringify({
    success: true, edgeId: edge.id, source: args.source, target: args.target, edgeCount: state.edges.length
  }, null, 2) }] }
}

export async function handleGetFlowGraph(args: z.infer<typeof GetFlowGraphSchema>) {
  const state = getState()
  const result: any = {
    nodeCount: state.nodes.length,
    edgeCount: state.edges.length,
    nodes: state.nodes.map(n => ({ id: n.id, type: n.type, label: n.data.label || '', position: n.position })),
    edges: state.edges
  }

  if (args.includeAnalysis) {
    const analysis = analyzeGraph(state.nodes, state.edges)
    result.analysis = {
      issueCount: analysis.issueCount,
      issues: analysis.issues,
      unreachableNodes: analysis.unreachableNodes,
      deadEndNodes: analysis.deadEndNodes,
      orphanNodes: analysis.orphanNodes
    }
  }

  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
}
