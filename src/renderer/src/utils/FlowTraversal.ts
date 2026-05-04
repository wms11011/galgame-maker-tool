import type { FlowNode, FlowEdge, ChoiceOption, RandomBranch } from '../types/index'

export interface TraversalEdge {
  target: string
  label?: string
}

/**
 * 统一节点流程遍历工具
 * 同时服务 previewEngine.next() 和 FlowEditor 的 edge 管理
 */
export class FlowTraversal {
  private outEdges: Map<string, TraversalEdge[]>
  private implicitOut: Map<string, TraversalEdge[]>
  private edgeList: FlowEdge[]
  private nodeMap: Map<string, FlowNode>

  constructor(nodes: FlowNode[], edges: FlowEdge[]) {
    this.edgeList = edges
    this.nodeMap = new Map(nodes.map(n => [n.id, n]))

    this.outEdges = new Map()
    this.implicitOut = new Map()

    for (const n of nodes) {
      this.outEdges.set(n.id, [])
      this.implicitOut.set(n.id, [])
    }

    // Explicit edges
    for (const e of edges) {
      const existing = this.outEdges.get(e.source)
      if (existing) existing.push({ target: e.target, label: e.label })
    }

    // Implicit connections from node data
    for (const n of nodes) {
      const data = n.data as Record<string, unknown>
      const implicit: TraversalEdge[] = []

      if (data.nextNodeId) implicit.push({ target: data.nextNodeId as string })
      if (data.targetNodeId) implicit.push({ target: data.targetNodeId as string })
      if (data.trueNextId) implicit.push({ target: data.trueNextId as string, label: 'true' })
      if (data.falseNextId) implicit.push({ target: data.falseNextId as string, label: 'false' })

      const options = data.options as ChoiceOption[] | undefined
      if (options) {
        for (const opt of options) {
          if (opt.nextNodeId) implicit.push({ target: opt.nextNodeId, label: opt.text ?? '选项' })
        }
      }

      const branches = data.branches as RandomBranch[] | undefined
      if (branches) {
        for (const br of branches) {
          if (br.targetNodeId) implicit.push({ target: br.targetNodeId, label: `权重:${br.weight}` })
        }
      }

      // Merge implicit without duplicating explicit
      const existing = this.outEdges.get(n.id)!
      for (const ic of implicit) {
        if (!existing.some(e => e.target === ic.target)) {
          existing.push(ic)
        }
      }
      this.implicitOut.set(n.id, implicit)
    }
  }

  /** 获取节点的所有出口 */
  getOutgoing(nodeId: string): TraversalEdge[] {
    return this.outEdges.get(nodeId) ?? []
  }

  /** 获取线性节点的下一跳 */
  getNext(nodeId: string): string | null {
    const out = this.getOutgoing(nodeId)
    return out.length > 0 ? out[0].target : null
  }

  /** 获取选择节点的分支 */
  getChoiceTargets(nodeId: string): TraversalEdge[] {
    return this.getOutgoing(nodeId)
  }

  /** 获取条件节点的真/假分支（优先显式 edge，其次 data 字段） */
  getConditionTargets(nodeId: string): { trueTarget: string | null; falseTarget: string | null } {
    const outEdges = this.outEdges.get(nodeId) ?? []
    const trueEdge = outEdges.find(e => e.label === 'true')
    const falseEdge = outEdges.find(e => e.label === 'false')
    const node = this.nodeMap.get(nodeId)
    const data = node?.data as Record<string, unknown> | undefined
    return {
      trueTarget: trueEdge?.target ?? (data?.trueNextId as string) ?? null,
      falseTarget: falseEdge?.target ?? (data?.falseNextId as string) ?? null
    }
  }

  /** 获取随机节点的分支 */
  getRandomBranches(nodeId: string): RandomBranch[] {
    const node = this.nodeMap.get(nodeId)
    if (!node) return []
    return ((node.data as Record<string, unknown>).branches as RandomBranch[]) ?? []
  }

  /** 是否是线性自动推进节点 */
  isAutoAdvancing(nodeId: string): boolean {
    const types = ['setVariable', 'goto', 'audio', 'cg', 'wait', 'label', 'savePoint', 'animation', 'timer', 'moveCharacter', 'achievement', 'steamAchievement']
    const node = this.nodeMap.get(nodeId)
    return node ? types.includes(node.type) : false
  }

  /** 是否需要用户交互（自动播放在此暂停） */
  isInteractive(nodeId: string): boolean {
    const node = this.nodeMap.get(nodeId)
    return node?.type === 'choice'
  }

  /** 是否是结束节点 */
  isEndNode(nodeId: string): boolean {
    const node = this.nodeMap.get(nodeId)
    return node?.type === 'end'
  }

  /** 是否是对话节点 */
  isDialog(nodeId: string): boolean {
    const node = this.nodeMap.get(nodeId)
    return node?.type === 'dialog'
  }

  /** 获取节点 */
  getNode(nodeId: string): FlowNode | undefined {
    return this.nodeMap.get(nodeId)
  }

  /** 获取节点标签 */
  getNodeLabel(nodeId: string): string {
    const n = this.nodeMap.get(nodeId)
    if (!n) return nodeId
    return ((n.data as Record<string, unknown>).label as string) || `${n.type}-${nodeId}`
  }

  /** 是否存在从 start 到 target 的路径（BFS，用于循环检测） */
  hasPath(start: string, target: string): boolean {
    const visited = new Set<string>()
    const queue = [start]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (current === target) return true
      if (visited.has(current)) continue
      visited.add(current)
      for (const out of this.getOutgoing(current)) {
        if (!visited.has(out.target)) queue.push(out.target)
      }
    }
    return false
  }
}
