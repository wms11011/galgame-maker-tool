import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FlowNode, FlowEdge, NodeType, NodeData, SyncState, SceneGroup } from '../types'
import { NODE_TYPE_REGISTRY } from '../utils/nodeTypeRegistry'

interface FlowSnapshot {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

const MAX_HISTORY = 50
let nodeIdCounter = 0
let edgeIdCounter = 0

export const useFlowStore = defineStore('flow', () => {
  const nodes = ref<FlowNode[]>([])
  const edges = ref<FlowEdge[]>([])
  const selectedNodeId = ref<string | null>(null)
  const isDirty = ref(false)
  const syncState = ref<SyncState>('synced')
  const coveredNodeIds = ref<Set<string>>(new Set())
  const breakpointNodeIds = ref<Set<string>>(new Set())
  const groups = ref<SceneGroup[]>([])
  // 创建新对话节点时的默认值，自动记忆上次使用的角色/背景/立绘
  const dialogDefaults = ref<{ character: string; background: string; characterSprite: string }>({
    character: '', background: '', characterSprite: ''
  })

  const coverageStats = computed(() => {
    const total = nodes.value.length
    const covered = coveredNodeIds.value.size
    const pct = total > 0 ? Math.round((covered / total) * 100) : 0
    return { total, covered, pct }
  })

  const breakpointCount = computed(() => breakpointNodeIds.value.size)

  const undoStack = ref<FlowSnapshot[]>([])
  const redoStack = ref<FlowSnapshot[]>([])

  const selectedNode = computed(() =>
    selectedNodeId.value ? nodes.value.find((n) => n.id === selectedNodeId.value) ?? null : null
  )

  function saveSnapshot(): void {
    undoStack.value.push({
      nodes: JSON.parse(JSON.stringify(nodes.value)),
      edges: JSON.parse(JSON.stringify(edges.value))
    })
    if (undoStack.value.length > MAX_HISTORY) {
      undoStack.value.shift()
    }
    redoStack.value = []
  }

  function addNode(type: NodeType, position: { x: number; y: number } = { x: 100, y: 100 }): void {
    nodeIdCounter++
    let id = `node_${Date.now()}_${nodeIdCounter}_${Math.random().toString(36).slice(2, 6)}`
    while (nodes.value.some(n => n.id === id)) {
      id = `node_${Date.now()}_${++nodeIdCounter}_${Math.random().toString(36).slice(2, 6)}`
    }
    const meta = NODE_TYPE_REGISTRY[type]
    const data: Record<string, unknown> = { id }

    if (meta) {
      for (const f of meta.fields) {
        if (f.key === 'id') continue
        data[f.key] = f.default !== undefined ? f.default : ''
      }
      if (type === 'dialog') {
        data.character = dialogDefaults.value.character
        data.background = dialogDefaults.value.background
        data.characterSprite = dialogDefaults.value.characterSprite
      }
    }

    if (nodes.value.some(n => n.id === id)) {
      console.error(`[addNode] DUPLICATE ID SKIPPED: ${id}. Existing IDs:`, nodes.value.map(n => n.id))
      return
    }
    saveSnapshot()
    nodes.value.push({ id, type, position, data: data as NodeData })
    console.log(`[addNode] added: ${id} (type: ${type}, total: ${nodes.value.length})`)
    isDirty.value = true
  }

  function removeNode(id: string): void {
    saveSnapshot()
    nodes.value = nodes.value.filter((n) => n.id !== id)
    edges.value = edges.value.filter((e) => e.source !== id && e.target !== id)
    for (const g of groups.value) {
      g.nodeIds = g.nodeIds.filter(nid => nid !== id)
    }
    if (selectedNodeId.value === id) {
      selectedNodeId.value = null
    }
    isDirty.value = true
  }

  function updateNode(id: string, data: Partial<NodeData>): void {
    const node = nodes.value.find((n) => n.id === id)
    if (node) {
      saveSnapshot()
      node.data = { ...node.data, ...data } as NodeData
      isDirty.value = true
    }
  }

  function addEdge(source: string, target: string, label?: string): void {
    saveSnapshot()
    edgeIdCounter++
    const id = `edge_${source}_${target}_${Date.now()}_${edgeIdCounter}`
    edges.value.push({ id, source, target, label })
    isDirty.value = true
  }

  function removeEdge(id: string): void {
    saveSnapshot()
    edges.value = edges.value.filter((e) => e.id !== id)
    isDirty.value = true
  }

  function importNodesAndEdges(
    newNodes: FlowNode[],
    newEdges: FlowEdge[],
    positionOffset: { x: number; y: number } = { x: 0, y: 0 }
  ): { nodesAdded: number; edgesAdded: number } {
    saveSnapshot()
    const existingIds = new Set(nodes.value.map(n => n.id))
    const idRemap = new Map<string, string>()
    nodeIdCounter++
    for (const node of newNodes) {
      let newId: string
      if (existingIds.has(node.id)) {
        newId = `node_${Date.now()}_${nodeIdCounter}_${Math.random().toString(36).slice(2, 6)}`
        nodeIdCounter++
        while (existingIds.has(newId)) {
          newId = `node_${Date.now()}_${++nodeIdCounter}_${Math.random().toString(36).slice(2, 6)}`
        }
        idRemap.set(node.id, newId)
      } else {
        newId = node.id
        existingIds.add(newId)
      }
      nodes.value.push({
        ...node,
        id: newId,
        position: { x: node.position.x + positionOffset.x, y: node.position.y + positionOffset.y }
      })
    }
    for (const edge of newEdges) {
      edgeIdCounter++
      const source = idRemap.get(edge.source) ?? edge.source
      const target = idRemap.get(edge.target) ?? edge.target
      if (nodes.value.some(n => n.id === source) && nodes.value.some(n => n.id === target)) {
        edges.value.push({
          ...edge,
          id: `edge_${source}_${target}_${Date.now()}_${edgeIdCounter}`,
          source,
          target
        })
      }
    }
    isDirty.value = true
    return { nodesAdded: newNodes.length, edgesAdded: newEdges.length }
  }

  function loadFlow(newNodes: FlowNode[], newEdges: FlowEdge[]): void {
    nodes.value = newNodes
    edges.value = newEdges
    coveredNodeIds.value = new Set()
    selectedNodeId.value = null
    isDirty.value = false
    undoStack.value = []
    redoStack.value = []
  }

  function markNodesCovered(ids: string[]): void {
    const s = new Set(coveredNodeIds.value)
    for (const id of ids) s.add(id)
    coveredNodeIds.value = s
  }

  function clearCoverage(): void {
    coveredNodeIds.value = new Set()
  }

  function toggleBreakpoint(nodeId: string): void {
    const s = new Set(breakpointNodeIds.value)
    if (s.has(nodeId)) {
      s.delete(nodeId)
    } else {
      s.add(nodeId)
    }
    breakpointNodeIds.value = s
  }

  function hasBreakpoint(nodeId: string): boolean {
    return breakpointNodeIds.value.has(nodeId)
  }

  function clearBreakpoints(): void {
    breakpointNodeIds.value = new Set()
  }

  function addGroup(name: string, color: string = '#6366f1'): string {
    const id = `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    groups.value.push({ id, name, color, nodeIds: [] })
    isDirty.value = true
    return id
  }

  function removeGroup(id: string): void {
    groups.value = groups.value.filter(g => g.id !== id)
    isDirty.value = true
  }

  function renameGroup(id: string, name: string): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.name = name; isDirty.value = true }
  }

  function setGroupColor(id: string, color: string): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.color = color; isDirty.value = true }
  }

  function setGroupBackground(id: string, background: string): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.background = background; isDirty.value = true }
  }

  function setGroupTitleCard(id: string, enabled: boolean): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.titleCard = enabled; isDirty.value = true }
  }

  function setGroupBgm(id: string, bgm: string): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.bgm = bgm; isDirty.value = true }
  }

  function setGroupBgmVolume(id: string, volume: number): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.bgmVolume = volume; isDirty.value = true }
  }

  function setGroupBgmLoop(id: string, loop: boolean): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.bgmLoop = loop; isDirty.value = true }
  }

  function setGroupDefaultBg(id: string, bg: string): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.defaultBackground = bg; isDirty.value = true }
  }

  function setGroupUnlockCondition(id: string, condition: string): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.unlockCondition = condition; isDirty.value = true }
  }

  function setGroupTransition(id: string, transition: 'fade' | 'slide' | 'blinds' | 'mosaic' | 'wind' | 'iris' | 'dissolve' | 'none'): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.transition = transition; isDirty.value = true }
  }

  function setGroupParticlePreset(id: string, preset: string): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.particlePreset = (preset || undefined) as any; isDirty.value = true }
  }
  function setGroupParticleDensity(id: string, density: number): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.particleDensity = density; isDirty.value = true }
  }
  function setGroupParticleSpeed(id: string, speed: number): void {
    const g = groups.value.find(x => x.id === id)
    if (g) { g.particleSpeed = speed; isDirty.value = true }
  }

  function addNodeToGroup(groupId: string, nodeId: string): void {
    for (const g of groups.value) {
      const idx = g.nodeIds.indexOf(nodeId)
      if (idx !== -1) g.nodeIds.splice(idx, 1)
    }
    const g = groups.value.find(x => x.id === groupId)
    if (g && !g.nodeIds.includes(nodeId)) {
      g.nodeIds.push(nodeId)
      isDirty.value = true
    }
  }

  function addNodesToGroup(groupId: string, nodeIds: string[]): void {
    for (const g of groups.value) {
      g.nodeIds = g.nodeIds.filter(id => !nodeIds.includes(id))
    }
    const g = groups.value.find(x => x.id === groupId)
    if (g) {
      for (const nid of nodeIds) {
        if (!g.nodeIds.includes(nid)) g.nodeIds.push(nid)
      }
      isDirty.value = true
    }
  }

  function removeNodeFromGroup(groupId: string, nodeId: string): void {
    const g = groups.value.find(x => x.id === groupId)
    if (g) {
      g.nodeIds = g.nodeIds.filter(id => id !== nodeId)
      isDirty.value = true
    }
  }

  function getGroupByNodeId(nodeId: string): SceneGroup | undefined {
    return groups.value.find(g => g.nodeIds.includes(nodeId))
  }

  function setGroupNodes(groupId: string, nodeIds: string[]): void {
    const g = groups.value.find(x => x.id === groupId)
    if (g) { g.nodeIds = nodeIds; isDirty.value = true }
  }

  function loadGroups(loaded: SceneGroup[]): void {
    groups.value = loaded.map(g => ({ ...g, nodeIds: [...g.nodeIds] }))
  }

  function undo(): void {
    const snapshot = undoStack.value.pop()
    if (!snapshot) return
    redoStack.value.push({
      nodes: JSON.parse(JSON.stringify(nodes.value)),
      edges: JSON.parse(JSON.stringify(edges.value))
    })
    nodes.value = snapshot.nodes
    edges.value = snapshot.edges
    isDirty.value = true
  }

  function redo(): void {
    const snapshot = redoStack.value.pop()
    if (!snapshot) return
    undoStack.value.push({
      nodes: JSON.parse(JSON.stringify(nodes.value)),
      edges: JSON.parse(JSON.stringify(edges.value))
    })
    nodes.value = snapshot.nodes
    edges.value = snapshot.edges
    isDirty.value = true
  }

  function setDialogDefaults(patch: Partial<typeof dialogDefaults.value>): void {
    Object.assign(dialogDefaults.value, patch)
  }

  return {
    nodes,
    edges,
    selectedNodeId,
    isDirty,
    syncState,
    coveredNodeIds,
    coverageStats,
    selectedNode,
    addNode,
    removeNode,
    updateNode,
    addEdge,
    removeEdge,
    importNodesAndEdges,
    loadFlow,
    markNodesCovered,
    clearCoverage,
    breakpointNodeIds,
    breakpointCount,
    toggleBreakpoint,
    hasBreakpoint,
    clearBreakpoints,
    groups,
    addGroup,
    removeGroup,
    renameGroup,
    setGroupColor,
    setGroupBackground,
    setGroupTitleCard,
    setGroupBgm,
    setGroupBgmVolume,
    setGroupBgmLoop,
    setGroupDefaultBg,
    setGroupUnlockCondition,
    setGroupTransition,
    setGroupParticlePreset,
    setGroupParticleDensity,
    setGroupParticleSpeed,
    addNodeToGroup,
    addNodesToGroup,
    removeNodeFromGroup,
    getGroupByNodeId,
    setGroupNodes,
    loadGroups,
    undo,
    redo,
    dialogDefaults,
    setDialogDefaults
  }
})
