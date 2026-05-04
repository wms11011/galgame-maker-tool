<template>
  <div
    class="flow-editor-container"
    @dragover.prevent
    @drop="onDrop"
  >
    <VueFlow
      :nodes="flowNodes"
      :edges="flowEdges as any"
      :node-types="nodeTypes as any"
      fit-view-on-init
      @node-click="onNodeClick"
      @node-context-menu="onNodeContextMenu"
      @connect="onConnect"
      @edge-click="onEdgeClick"
      @nodes-change="onNodesChange"
    >
      <Background />
      <Controls />
      <MiniMap />
    </VueFlow>

    <!-- 场景分组背景 -->
    <div
      v-for="rect in groupRects"
      :key="rect.id"
      class="group-bg"
      :style="{
        left: rect.x + 'px',
        top: rect.y + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        borderColor: rect.color,
        background: rect.color + '08'
      }"
    >
      <span class="group-bg-label" :style="{ background: rect.color }">
        {{ rect.name }}
      </span>
    </div>

    <div class="flow-status-bar">
      <div v-if="graphAnalysis.issueCount > 0" class="graph-warnings">
        <el-popover placement="top-start" :width="300" trigger="click">
          <template #reference>
            <span class="warnings-badge">
                {{ graphAnalysis.issueCount }} 个问题
            </span>
          </template>
          <div class="warnings-list">
            <div
              v-for="issue in graphAnalysis.issues"
              :key="issue.nodeId"
              class="warning-item"
              @click="focusNode(issue.nodeId)"
            >
              <span class="warning-icon">
                {{ issue.issue === 'unreachable' ? '⊘' : issue.issue === 'dead-end' ? '⏹' : '○' }}
              </span>
              <span class="warning-label">{{ issue.nodeLabel || issue.nodeId }}</span>
              <span class="warning-type">{{ issueLabel(issue.issue) }}</span>
            </div>
          </div>
        </el-popover>
      </div>
      <div v-if="flowStore.coverageStats.total > 0" class="coverage-badge" @click="flowStore.clearCoverage()" title="点击清除覆盖记录">
        <span :class="coverageClass">{{ flowStore.coverageStats.pct }}%</span>
        已覆盖 {{ flowStore.coverageStats.covered }}/{{ flowStore.coverageStats.total }}
      </div>
      <div v-if="allPaths.length > 0" class="path-badge-wrapper">
        <el-popover placement="top-end" :width="360" trigger="click">
          <template #reference>
            <span class="path-count-badge">
              {{ allPaths.length }} 条路线
            </span>
          </template>
          <PathTracePanel :paths="allPaths" @focus-node="focusNode" />
        </el-popover>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted, onUnmounted, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { NodeMouseEvent, Connection, EdgeMouseEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { useFlowStore } from '@renderer/stores/flowStore'
import { analyzeGraph } from '@renderer/utils/graphAnalysis'
import type { GraphIssue } from '@renderer/utils/graphAnalysis'
import { traceAllPaths, getReachableNodeIds } from '@renderer/utils/pathTracing'
import PathTracePanel from './PathTracePanel.vue'
import DialogNode from './nodes/DialogNode.vue'
import ChoiceNode from './nodes/ChoiceNode.vue'
import ConditionNode from './nodes/ConditionNode.vue'
import SetVariableNode from './nodes/SetVariableNode.vue'
import GotoNode from './nodes/GotoNode.vue'
import EndNode from './nodes/EndNode.vue'
import AudioNode from './nodes/AudioNode.vue'
import CgNode from './nodes/CgNode.vue'
import WaitNode from './nodes/WaitNode.vue'
import RandomNode from './nodes/RandomNode.vue'
import LabelNode from './nodes/LabelNode.vue'
import AnimationNode from './nodes/AnimationNode.vue'
import SavePointNode from './nodes/SavePointNode.vue'
import TimerNode from './nodes/TimerNode.vue'
import MoveCharacterNode from './nodes/MoveCharacterNode.vue'
import SteamAchievementNode from './nodes/SteamAchievementNode.vue'
import AchievementNode from './nodes/AchievementNode.vue'
import ParticleNode from './nodes/ParticleNode.vue'
import Live2DNode from './nodes/Live2DNode.vue'
import ItemNode from './nodes/ItemNode.vue'
import type {
  NodeType,
  RandomNodeData,
  ConditionNodeData,
  ChoiceNodeData,
  DialogNodeData,
  SetVariableNodeData,
  GotoNodeData,
  AudioNodeData,
  CgNodeData,
  WaitNodeData,
  AnimationNodeData,
  SavePointNodeData,
  TimerNodeData,
  MoveCharacterNodeData,
  SteamAchievementNodeData,
  AchievementNodeData
} from '@renderer/types/index'

const flowStore = useFlowStore()
const { screenToFlowCoordinate, setCenter, viewport } = useVueFlow()

const graphAnalysis = computed(() => {
  try {
    return analyzeGraph(flowStore.nodes, flowStore.edges)
  } catch {
    return { unreachableNodes: [], deadEndNodes: [], orphanNodes: [], issues: [], issueCount: 0 }
  }
})
const allPaths = computed(() => {
  try {
    return traceAllPaths(flowStore.nodes, flowStore.edges)
  } catch {
    return []
  }
})

const reachableNodeIds = computed<Set<string>>(() => {
  if (!flowStore.selectedNodeId) return new Set()
  try {
    return getReachableNodeIds(flowStore.selectedNodeId, flowStore.nodes, flowStore.edges)
  } catch {
    return new Set()
  }
})

interface GroupRect {
  id: string
  name: string
  color: string
  x: number
  y: number
  width: number
  height: number
}

const groupRects = computed<GroupRect[]>(() => {
  const vp = viewport.value
  return flowStore.groups
    .map(group => {
      const groupNodes = flowStore.nodes.filter(n => group.nodeIds.includes(n.id))
      if (groupNodes.length === 0) return null

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const node of groupNodes) {
        const w = 200
        const h = node.type === 'label' ? 48 : node.type === 'dialog' ? 100 : 80
        minX = Math.min(minX, node.position.x)
        minY = Math.min(minY, node.position.y)
        maxX = Math.max(maxX, node.position.x + w)
        maxY = Math.max(maxY, node.position.y + h)
      }

      const pad = 24
      return {
        id: group.id,
        name: group.name,
        color: group.color,
        x: (minX - pad) * vp.zoom + vp.x,
        y: (minY - pad - 20) * vp.zoom + vp.y,
        width: (maxX - minX + pad * 2) * vp.zoom,
        height: (maxY - minY + pad * 2 + 20) * vp.zoom
      }
    })
    .filter((r): r is GroupRect => r !== null)
})

const coverageClass = computed(() => {
  const pct = flowStore.coverageStats.pct
  if (pct >= 80) return 'coverage-high'
  if (pct >= 40) return 'coverage-mid'
  return 'coverage-low'
})

function issueLabel(issue: GraphIssue['issue']): string {
  switch (issue) {
    case 'unreachable': return '不可达'
    case 'dead-end': return '死路'
    case 'orphan': return '孤立'
  }
}

function focusNode(nodeId: string): void {
  const node = flowStore.nodes.find((n) => n.id === nodeId)
  if (node) {
    flowStore.selectedNodeId = nodeId
    setCenter(node.position.x + 100, node.position.y + 25, { zoom: 1.5, duration: 300 })
  }
}

const nodeTypes = {
  dialog: markRaw(DialogNode),
  choice: markRaw(ChoiceNode),
  condition: markRaw(ConditionNode),
  setVariable: markRaw(SetVariableNode),
  goto: markRaw(GotoNode),
  end: markRaw(EndNode),
  audio: markRaw(AudioNode),
  cg: markRaw(CgNode),
  wait: markRaw(WaitNode),
  random: markRaw(RandomNode),
  label: markRaw(LabelNode),
  animation: markRaw(AnimationNode),
  savePoint: markRaw(SavePointNode),
  timer: markRaw(TimerNode),
  moveCharacter: markRaw(MoveCharacterNode),
  steamAchievement: markRaw(SteamAchievementNode),
  achievement: markRaw(AchievementNode),
  particle: markRaw(ParticleNode),
  live2d: markRaw(Live2DNode),
  item: markRaw(ItemNode)
}

// 直接在 store 节点上修改 class 属性，保持对象引用稳定（避免 VueFlow 内部重复）
const flowNodes = computed(() => {
  const seen = new Set<string>()
  const dupes: string[] = []
  for (const n of flowStore.nodes) {
    if (seen.has(n.id)) dupes.push(n.id)
    seen.add(n.id)
    const classes: string[] = []
    if (flowStore.coveredNodeIds.has(n.id)) classes.push('node-covered')
    if (flowStore.breakpointNodeIds.has(n.id)) classes.push('node-breakpoint')
    if (n.data.unlockCondition) classes.push('node-locked')
    if (reachableNodeIds.value.has(n.id)) classes.push('node-reachable')
    ;(n as any).class = classes.length > 0 ? classes.join(' ') : undefined
  }
  if (dupes.length > 0) {
    console.error('[FlowEditor] DUPLICATE nodes detected in store:', dupes, 'total:', flowStore.nodes.length)
  }
  return flowStore.nodes
})

const flowEdges = computed(() => flowStore.edges)

function handleKeydown(e: KeyboardEvent): void {
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (!flowStore.selectedNodeId) return
    flowStore.removeNode(flowStore.selectedNodeId)
    return
  }

  if (e.key === 'b' || e.key === 'B') {
    if (!flowStore.selectedNodeId) return
    flowStore.toggleBreakpoint(flowStore.selectedNodeId)
  }
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))

// Auto-center when selectedNodeId changes externally (e.g. from NodeSearch)
let lastClickSelected = ''
watch(() => flowStore.selectedNodeId, (newId) => {
  if (newId && newId !== lastClickSelected) {
    const node = flowStore.nodes.find(n => n.id === newId)
    if (node) {
      setCenter(node.position.x + 100, node.position.y + 25, { zoom: 1.5, duration: 300 })
    }
  }
  lastClickSelected = ''
})

function onNodeClick(event: NodeMouseEvent): void {
  flowStore.selectedNodeId = event.node.id
  lastClickSelected = event.node.id
}

function onNodeContextMenu(event: NodeMouseEvent): void {
  event.event?.preventDefault()
  flowStore.toggleBreakpoint(event.node.id)
}

function onNodesChange(changes: any[]): void {
  // 仅同步位置变更到 store，不替换整个 nodes 数组
  for (const change of changes) {
    if (change.type === 'position' && change.id) {
      const node = flowStore.nodes.find(n => n.id === change.id)
      if (node && change.position) {
        node.position = { ...change.position }
      }
    }
  }
}

function onConnect(connection: Connection): void {
  if (connection.source && connection.target) {
    flowStore.addEdge(connection.source, connection.target)

    const sourceNode = flowStore.nodes.find(n => n.id === connection.source)
    if (sourceNode) {
      const updateData: any = {}

      if (sourceNode.type === 'dialog') {
        updateData.nextNodeId = connection.target
      } else if (sourceNode.type === 'setVariable') {
        updateData.nextNodeId = connection.target
      } else if (sourceNode.type === 'goto') {
        updateData.targetNodeId = connection.target
      } else if (sourceNode.type === 'audio') {
        updateData.nextNodeId = connection.target
      } else if (sourceNode.type === 'cg') {
        updateData.nextNodeId = connection.target
      } else if (sourceNode.type === 'wait') {
        updateData.nextNodeId = connection.target
      } else if (sourceNode.type === 'random') {
        const data = sourceNode.data as RandomNodeData
        const branches = data.branches ? [...data.branches] : []
        const newBranch = {
          id: `br_${Date.now()}`,
          targetNodeId: connection.target,
          weight: 1
        }
        branches.push(newBranch)
        updateData.branches = branches
      } else if (sourceNode.type === 'animation') {
        updateData.nextNodeId = connection.target
      } else if (sourceNode.type === 'savePoint') {
        updateData.nextNodeId = connection.target
      } else if (sourceNode.type === 'timer') {
        updateData.nextNodeId = connection.target
      } else if (sourceNode.type === 'moveCharacter') {
        updateData.nextNodeId = connection.target
      } else if (sourceNode.type === 'steamAchievement') {
        updateData.nextNodeId = connection.target
      } else if (sourceNode.type === 'achievement') {
        updateData.nextNodeId = connection.target
      } else if (sourceNode.type === 'condition') {
        const data = sourceNode.data as ConditionNodeData
        if (!data.trueNextId) {
          updateData.trueNextId = connection.target
        } else if (!data.falseNextId) {
          updateData.falseNextId = connection.target
        }
      } else if (sourceNode.type === 'choice') {
        const data = sourceNode.data as ChoiceNodeData
        const options = data.options ? [...data.options] : []
        const targetNode = flowStore.nodes.find(n => n.id === connection.target)
        const newOption = {
          id: `opt_${Date.now()}`,
          text: targetNode?.data?.label ?? '',
          nextNodeId: connection.target
        }
        options.push(newOption)
        updateData.options = options
      }

      if (Object.keys(updateData).length > 0) {
        flowStore.updateNode(connection.source, updateData)
      }
    }
  }
}

function onEdgeClick(event: EdgeMouseEvent): void {
  const edge = event.edge
  flowStore.removeEdge(edge.id)

  // Update node properties to remove reference to target
  const sourceNode = flowStore.nodes.find(n => n.id === edge.source)
  if (sourceNode) {
    const updateData: any = {}

    if (sourceNode.type === 'dialog') {
      const data = sourceNode.data as DialogNodeData
      if (data.nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'setVariable') {
      const data = sourceNode.data as SetVariableNodeData
      if (data.nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'goto') {
      const data = sourceNode.data as GotoNodeData
      if (data.targetNodeId === edge.target) {
        updateData.targetNodeId = ''
      }
    } else if (sourceNode.type === 'audio') {
      const data = sourceNode.data as AudioNodeData
      if (data.nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'cg') {
      const data = sourceNode.data as CgNodeData
      if (data.nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'wait') {
      const data = sourceNode.data as WaitNodeData
      if (data.nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'animation') {
      const data = sourceNode.data as AnimationNodeData
      if (data.nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'savePoint') {
      const data = sourceNode.data as SavePointNodeData
      if (data.nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'timer') {
      const data = sourceNode.data as TimerNodeData
      if (data.nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'moveCharacter') {
      const data = sourceNode.data as MoveCharacterNodeData
      if (data.nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'steamAchievement') {
      const data = sourceNode.data as SteamAchievementNodeData
      if (data.nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'achievement') {
      const data = sourceNode.data as AchievementNodeData
      if (data.nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'random') {
      const data = sourceNode.data as RandomNodeData
      if (data.branches) {
        updateData.branches = data.branches.filter(b => b.targetNodeId !== edge.target)
      }
    } else if (sourceNode.type === 'choice') {
      const data = sourceNode.data as ChoiceNodeData
      if (data.options) {
        updateData.options = data.options.map(option =>
          option.nextNodeId === edge.target ? { ...option, nextNodeId: '' } : option
        )
      }
    } else if (sourceNode.type === 'condition') {
      const data = sourceNode.data as ConditionNodeData
      if (data.trueNextId === edge.target) {
        updateData.trueNextId = ''
      }
      if (data.falseNextId === edge.target) {
        updateData.falseNextId = ''
      }
    }

    if (Object.keys(updateData).length > 0) {
      flowStore.updateNode(edge.source, updateData)
    }
  }
}

defineExpose({ focusNode })

let lastDropTime = 0
function onDrop(event: DragEvent): void {
  event.preventDefault()
  event.stopPropagation()
  // 防止同一拖拽触发两次 drop（事件冒泡）
  if (Date.now() - lastDropTime < 300) return
  lastDropTime = Date.now()

  const nodeType = event.dataTransfer?.getData('nodeType') as NodeType | undefined
  if (!nodeType) return

  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY
  })

  flowStore.addNode(nodeType, position)
}
</script>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
</style>

<style scoped>
.flow-editor-container {
  width: 100%;
  height: calc(100vh - 48px);
  background: var(--bg-canvas);
  position: relative;
}

.flow-status-bar {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  gap: 6px;
}

.graph-warnings {
  /* nested in status bar */
}

.warnings-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(232, 128, 128, 0.12);
  border: 1px solid rgba(232, 128, 128, 0.35);
  border-radius: var(--radius-sm, 6px);
  color: var(--color-red);
  font-size: var(--text-sm, 12px);
  cursor: pointer;
  user-select: none;
}

.warnings-badge:hover {
  background: rgba(232, 128, 128, 0.22);
}

.coverage-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm, 6px);
  font-size: var(--text-sm, 12px);
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.coverage-badge:hover {
  background: var(--bg-hover);
}

.coverage-high { color: var(--color-green); font-weight: 700; }
.coverage-mid  { color: var(--color-amber); font-weight: 700; }
.coverage-low  { color: var(--text-dim); font-weight: 700; }

.warnings-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  font-size: var(--text-sm, 12px);
}

.warning-item:hover {
  background: var(--bg-hover, #1e1e3a);
}

.warning-icon {
  font-size: 14px;
}

.warning-label {
  flex: 1;
  color: var(--text-primary);
}

.warning-type {
  color: var(--text-muted);
  font-size: 11px;
}

.path-badge-wrapper {
  /* nested */
}

.path-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(160, 136, 208, 0.12);
  border: 1px solid rgba(160, 136, 208, 0.35);
  border-radius: var(--radius-sm, 6px);
  color: var(--color-purple);
  font-size: var(--text-sm, 12px);
  cursor: pointer;
  user-select: none;
}

.path-count-badge:hover {
  background: rgba(160, 136, 208, 0.22);
}

.group-bg {
  position: absolute;
  pointer-events: none;
  border: 2px solid;
  border-radius: 12px;
  z-index: 1;
}

.group-bg-label {
  position: absolute;
  top: -10px;
  left: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 10px;
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: auto;
}
</style>

<style>
.node-covered {
  outline: 2px solid rgba(116, 184, 138, 0.5);
  border-radius: 10px;
}

.node-breakpoint {
  outline: 2px solid rgba(232, 128, 128, 0.6);
  border-radius: 10px;
}

.node-locked {
  outline: 2px dashed rgba(216, 160, 48, 0.5);
  border-radius: 10px;
}

.node-reachable {
  outline: 2px solid rgba(107, 164, 216, 0.5);
  border-radius: 10px;
}
</style>
