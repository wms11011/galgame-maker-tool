import type { FlowNode, FlowEdge } from '../types'

export interface PathNode {
  id: string
  type: string
  label: string
  branchLabel?: string
}

export interface StoryPath {
  id: string
  nodes: PathNode[]
  endType: 'end' | 'dead-end' | 'cycle' | 'open'
}

/**
 * 从流程图中枚举所有可能的剧情路线
 */
export function traceAllPaths(nodes: FlowNode[], edges: FlowEdge[]): StoryPath[] {
  if (nodes.length === 0) return []

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
    const implicit = getImplicitTargets(n)
    for (const ic of implicit) {
      const existing = outEdges.get(n.id)
      if (existing && !existing.some((e) => e.target === ic.target)) {
        existing.push(ic)
        inEdges.get(ic.target)?.push(n.id)
      }
    }
  }

  // 找入口节点
  const entryIds = nodes
    .filter((n) => (inEdges.get(n.id)?.length ?? 0) === 0)
    .map((n) => n.id)

  const startIds = entryIds.length > 0 ? entryIds : [nodes[0].id]
  const allPaths: StoryPath[] = []
  let pathCounter = 0

  for (const startId of startIds) {
    const initialPath: PathNode[] = [makePathNode(startId, nodes)]
    const results = dfsPaths(startId, nodes, outEdges, initialPath, new Set<string>(), 50)
    for (const r of results) {
      pathCounter++
      allPaths.push({ id: `path_${pathCounter}`, ...r })
    }
  }

  return allPaths
}

function dfsPaths(
  currentId: string,
  nodes: FlowNode[],
  outEdges: Map<string, { target: string; label?: string }[]>,
  currentPath: PathNode[],
  visitedIds: Set<string>,
  maxDepth: number
): { nodes: PathNode[]; endType: StoryPath['endType'] }[] {
  const outgoing = outEdges.get(currentId) ?? []
  const currentNode = nodes.find((n) => n.id === currentId)
  const isEndNode = currentNode?.type === 'end'

  // 终止条件
  if (isEndNode) {
    return [{ nodes: [...currentPath], endType: 'end' }]
  }

  if (currentPath.length >= maxDepth) {
    return [{ nodes: [...currentPath], endType: 'cycle' }]
  }

  if (outgoing.length === 0) {
    return [{ nodes: [...currentPath], endType: 'dead-end' }]
  }

  const results: { nodes: PathNode[]; endType: StoryPath['endType'] }[] = []

  for (const edge of outgoing) {
    // 循环检测
    if (visitedIds.has(edge.target)) {
      // 记录为循环终点
      const cycleNode = makePathNode(edge.target, nodes, edge.label)
      results.push({
        nodes: [...currentPath, cycleNode],
        endType: 'cycle'
      })
      continue
    }

    const nextNode = makePathNode(edge.target, nodes, edge.label)
    const newVisited = new Set(visitedIds)
    newVisited.add(currentId)

    const subPaths = dfsPaths(
      edge.target,
      nodes,
      outEdges,
      [...currentPath, nextNode],
      newVisited,
      maxDepth
    )
    results.push(...subPaths)
  }

  return results
}

function makePathNode(id: string, nodes: FlowNode[], branchLabel?: string): PathNode {
  const node = nodes.find((n) => n.id === id)
  const label = node ? (node.data.label || `${node.type}-${id}`) : id
  return {
    id,
    type: node?.type ?? 'unknown',
    label,
    branchLabel
  }
}

/**
 * 从指定节点出发，获取所有可达的节点 ID 集合
 */
export function getReachableNodeIds(
  startId: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
  maxDepth: number = 100
): Set<string> {
  const reachable = new Set<string>()
  const outEdges = buildOutEdges(nodes, edges)
  const visited = new Set<string>()

  function dfs(currentId: string, depth: number): void {
    if (depth >= maxDepth || visited.has(currentId)) return
    visited.add(currentId)
    reachable.add(currentId)

    const outgoing = outEdges.get(currentId) ?? []
    for (const { target } of outgoing) {
      if (!visited.has(target)) {
        dfs(target, depth + 1)
      }
    }
  }

  dfs(startId, 0)
  reachable.delete(startId) // 不包含自身
  return reachable
}

function buildOutEdges(
  nodes: FlowNode[],
  edges: FlowEdge[]
): Map<string, { target: string; label?: string }[]> {
  const outEdges = new Map<string, { target: string; label?: string }[]>()
  for (const n of nodes) {
    outEdges.set(n.id, [])
  }
  for (const e of edges) {
    outEdges.get(e.source)?.push({ target: e.target, label: e.label })
  }
  // 添加隐式连接
  for (const n of nodes) {
    const implicit = getImplicitTargets(n)
    for (const ic of implicit) {
      const existing = outEdges.get(n.id)
      if (existing && !existing.some((e) => e.target === ic.target)) {
        existing.push(ic)
      }
    }
  }
  return outEdges
}

function getImplicitTargets(node: FlowNode): { target: string; label?: string }[] {
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
