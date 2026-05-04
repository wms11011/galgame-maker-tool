import type { FlowNode, FlowEdge } from '../types'

export interface StoryTreeNode {
  id: string
  label: string
  type: string
  endingType?: string
  branchLabel?: string
  children: StoryTreeNode[]
}

/**
 * 从流程图构建剧情树结构
 */
export function buildStoryTree(nodes: FlowNode[], edges: FlowEdge[]): StoryTreeNode | null {
  if (nodes.length === 0) return null

  // 构建邻接表
  const outEdges = new Map<string, { target: string; label?: string }[]>()
  const inEdges = new Map<string, string[]>()
  for (const n of nodes) {
    outEdges.set(n.id, [])
    inEdges.set(n.id, [])
  }
  for (const e of edges) {
    outEdges.get(e.source)?.push({ target: e.target, label: e.label })
    inEdges.get(e.target)?.push(e.source)
  }

  // 添加隐式连接
  for (const n of nodes) {
    const implicit = getImplicitChildren(n)
    for (const ic of implicit) {
      const existing = outEdges.get(n.id)
      if (existing && !existing.some((e) => e.target === ic.target)) {
        existing.push(ic)
        inEdges.get(ic.target)?.push(n.id)
      }
    }
  }

  // 找入口
  const entryNodes = nodes
    .filter((n) => (inEdges.get(n.id)?.length ?? 0) === 0 && (outEdges.get(n.id)?.length ?? 0) > 0)
    .map((n) => n.id)
  const rootId =
    entryNodes.length > 0
      ? entryNodes[0]
      : nodes.find((n) => (outEdges.get(n.id)?.length ?? 0) > 0)?.id ?? nodes[0]?.id

  if (!rootId) return null

  const rootNode = nodes.find(n => n.id === rootId)
  if (!rootNode) return null

  const ancestors = new Set<string>()
  return buildNode(rootId, nodes, outEdges, ancestors)
}

function buildNode(
  id: string,
  nodes: FlowNode[],
  outEdges: Map<string, { target: string; label?: string }[]>,
  ancestors: Set<string>
): StoryTreeNode {
  const node = nodes.find((n) => n.id === id)
  // Per-branch cycle detection: only stop if this node appears in the current ancestor chain
  const isCycle = ancestors.has(id)

  const children = (outEdges.get(id) ?? []).map((edge) => {
    if (isCycle) {
      // This node is part of a cycle — show children as leaf references only
      return {
        id: edge.target,
        label: getNodeLabel(edge.target, nodes),
        type: getNodeType(edge.target, nodes),
        branchLabel: edge.label || undefined,
        children: []
      }
    }
    // Clone ancestors per branch so sibling branches can independently expand the same nodes
    const branchAncestors = new Set(ancestors)
    branchAncestors.add(id)
    const child = buildNode(edge.target, nodes, outEdges, branchAncestors)
    child.branchLabel = edge.label || undefined
    return child
  })

  return {
    id,
    label: node ? node.data.label || `${node.type}-${id}` : id,
    type: node?.type ?? 'unknown',
    endingType: node?.type === 'end' ? (node.data as Record<string, unknown>).endingType as string : undefined,
    children
  }
}

function getNodeLabel(id: string, nodes: FlowNode[]): string {
  const node = nodes.find((n) => n.id === id)
  if (!node) return id
  return node.data.label || `${node.type}-${id}`
}

function getNodeType(id: string, nodes: FlowNode[]): string {
  return nodes.find((n) => n.id === id)?.type ?? 'unknown'
}

function getImplicitChildren(node: FlowNode): { target: string; label?: string }[] {
  const data = node.data as Record<string, unknown>
  const results: { target: string; label?: string }[] = []

  if (data.nextNodeId) results.push({ target: data.nextNodeId })
  if (data.targetNodeId) results.push({ target: data.targetNodeId })
  if (data.trueNextId) results.push({ target: data.trueNextId, label: 'true' })
  if (data.falseNextId) results.push({ target: data.falseNextId, label: 'false' })

  if (data.options) {
    for (const opt of data.options) {
      if (opt.nextNodeId) {
        results.push({ target: opt.nextNodeId, label: opt.text || '选项' })
      }
    }
  }
  if (data.branches) {
    for (const br of data.branches) {
      if (br.targetNodeId) {
        results.push({ target: br.targetNodeId, label: `权重:${br.weight}` })
      }
    }
  }

  return results
}
