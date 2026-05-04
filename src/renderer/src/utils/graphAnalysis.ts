import type { FlowNode, FlowEdge } from '../types'

export interface GraphIssue {
  nodeId: string
  nodeLabel: string
  nodeType: string
  issue: 'unreachable' | 'dead-end' | 'orphan'
}

export interface GraphAnalysisResult {
  unreachableNodes: string[]
  deadEndNodes: string[]
  orphanNodes: string[]
  issues: GraphIssue[]
  issueCount: number
}

/**
 * 对流程图进行静态分析，检测：
 * - 不可达节点：没有路径从入口节点到达
 * - 死路节点：非 end 类型但没有出边
 * - 孤立节点：既无入边也无出边
 */
export function analyzeGraph(nodes: FlowNode[], edges: FlowEdge[]): GraphAnalysisResult {
  if (nodes.length === 0) {
    return { unreachableNodes: [], deadEndNodes: [], orphanNodes: [], issues: [], issueCount: 0 }
  }

  // 构建邻接表
  const outEdges = new Map<string, string[]>()
  const inEdges = new Map<string, string[]>()
  const nodeIds = new Set(nodes.map((n) => n.id))

  for (const n of nodes) {
    outEdges.set(n.id, [])
    inEdges.set(n.id, [])
  }

  for (const e of edges) {
    if (nodeIds.has(e.source)) {
      outEdges.get(e.source)!.push(e.target)
    }
    if (nodeIds.has(e.target)) {
      inEdges.get(e.target)!.push(e.source)
    }
  }

  // 查找节点数据中的隐含连接（choice options, condition true/false, random branches, goto target, nextNodeId）
  for (const n of nodes) {
    const implicitTargets = getImplicitTargets(n)
    for (const tgt of implicitTargets) {
      if (nodeIds.has(tgt) && !outEdges.get(n.id)!.includes(tgt)) {
        outEdges.get(n.id)!.push(tgt)
        inEdges.get(tgt)!.push(n.id)
      }
    }
  }

  // 入口节点 = 无入边的节点，但排除完全孤立节点（它不可能作为有效入口）
  const entryNodes = nodes
    .filter((n) => inEdges.get(n.id)!.length === 0 && (outEdges.get(n.id) ?? []).length > 0)
    .map((n) => n.id)
  // 如果没有任何有效入口，回退到第一个有出边的节点，再回退到第一个节点
  if (entryNodes.length === 0 && nodes.length > 0) {
    const firstWithOut = nodes.find((n) => (outEdges.get(n.id) ?? []).length > 0)
    entryNodes.push(firstWithOut ? firstWithOut.id : nodes[0].id)
  }

  // BFS 从所有有效入口出发，标记可达
  const reachable = new Set<string>()
  const queue = [...entryNodes]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const next of outEdges.get(id) ?? []) {
      if (!reachable.has(next)) {
        queue.push(next)
      }
    }
  }

  // 不可达节点
  const unreachableNodes = nodes.filter((n) => !reachable.has(n.id)).map((n) => n.id)

  // 死路节点（非 end 类型，无出边）
  const deadEndNodes = nodes
    .filter((n) => n.type !== 'end' && (outEdges.get(n.id) ?? []).length === 0)
    .map((n) => n.id)

  // 孤立节点（无入边也无出边）
  const orphanNodes = nodes
    .filter(
      (n) => (inEdges.get(n.id) ?? []).length === 0 && (outEdges.get(n.id) ?? []).length === 0
    )
    .map((n) => n.id)

  // 每个节点只保留最严重的一个分类：孤立 > 不可达 > 死路
  const reported = new Set<string>()
  const issues: GraphIssue[] = []
  for (const id of orphanNodes) {
    const n = nodes.find((x) => x.id === id)
    if (n) {
      issues.push({ nodeId: id, nodeLabel: n.data.label || '', nodeType: n.type, issue: 'orphan' })
      reported.add(id)
    }
  }
  for (const id of unreachableNodes) {
    if (reported.has(id)) continue
    const n = nodes.find((x) => x.id === id)
    if (n) {
      issues.push({ nodeId: id, nodeLabel: n.data.label || '', nodeType: n.type, issue: 'unreachable' })
      reported.add(id)
    }
  }
  for (const id of deadEndNodes) {
    if (reported.has(id)) continue
    const n = nodes.find((x) => x.id === id)
    if (n) {
      issues.push({ nodeId: id, nodeLabel: n.data.label || '', nodeType: n.type, issue: 'dead-end' })
      reported.add(id)
    }
  }

  return {
    unreachableNodes,
    deadEndNodes,
    orphanNodes,
    issues,
    issueCount: issues.length
  }
}

function getImplicitTargets(node: FlowNode): string[] {
  const data = node.data as Record<string, unknown>
  const targets: string[] = []

  if (data.nextNodeId) targets.push(data.nextNodeId)
  if (data.targetNodeId) targets.push(data.targetNodeId)
  if (data.trueNextId) targets.push(data.trueNextId)
  if (data.falseNextId) targets.push(data.falseNextId)

  if (data.options) {
    for (const opt of data.options) {
      if (opt.nextNodeId) targets.push(opt.nextNodeId)
    }
  }
  if (data.branches) {
    for (const br of data.branches) {
      if (br.targetNodeId) targets.push(br.targetNodeId)
    }
  }

  return targets.filter(Boolean)
}
