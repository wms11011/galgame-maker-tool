<template>
  <div class="story-tree-panel">
    <div class="tree-header">
      <span class="tree-title">剧情树</span>
      <el-button size="small" text @click="expandAll">展开全部</el-button>
      <el-button size="small" text @click="collapseAll">收起全部</el-button>
    </div>

    <!-- Grouped view (when groups exist) -->
    <div v-if="groupTrees.length > 0" class="tree-body">
      <div v-for="group in groupTrees" :key="group.groupId" class="group-section">
        <div
          class="group-header"
          :class="{ expanded: expandedNodes.has(group.groupId) }"
          @click="toggleNode(group.groupId)"
        >
          <span class="group-expand">{{ expandedNodes.has(group.groupId) ? '▼' : '▶' }}</span>
          <span class="group-color-dot" :style="{ background: group.color }"></span>
          <span class="group-name">{{ group.name }}</span>
          <span class="group-count">{{ group.nodeCount }} 节点</span>
        </div>
        <div v-show="expandedNodes.has(group.groupId)" class="group-children">
          <TreeNodeItem
            v-for="root in group.roots"
            :key="root.id"
            :node="root"
            :depth="0"
            :expanded="expandedNodes"
            :flow-nodes="flowStore.nodes"
            @toggle="toggleNode"
            @select="selectNode"
          />
          <div v-if="group.roots.length === 0" class="group-empty">
            该章节无入口节点
          </div>
        </div>
      </div>
    </div>

    <!-- Fallback: flat tree view -->
    <div v-else-if="root" class="tree-body">
      <TreeNodeItem
        :node="root"
        :depth="0"
        :expanded="expandedNodes"
        :flow-nodes="flowStore.nodes"
        @toggle="toggleNode"
        @select="selectNode"
      />
    </div>

    <div v-else class="tree-empty">
      流程图为空，请先添加节点
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h, watch } from 'vue'
import { useFlowStore } from '../stores/flowStore'
import { buildStoryTree } from '../utils/storyTree'
import type { StoryTreeNode } from '../utils/storyTree'
import type { FlowNode } from '../types'

const flowStore = useFlowStore()

const expandedNodes = ref<Set<string>>(new Set())
const selectedNodeId = ref<string | null>(null)

const root = computed(() => buildStoryTree(flowStore.nodes, flowStore.edges))

interface GroupTree {
  groupId: string
  name: string
  color: string
  nodeCount: number
  roots: StoryTreeNode[]
}

// Build per-group trees
const groupTrees = computed<GroupTree[]>(() => {
  const groups = flowStore.groups
  if (groups.length === 0) return []

  const allEdges = flowStore.edges
  const allNodes = flowStore.nodes

  return groups.map((group) => {
    const groupNodeIds = new Set(group.nodeIds)
    const groupNodes = allNodes.filter((n) => groupNodeIds.has(n.id))
    const groupEdges = allEdges.filter((e) => groupNodeIds.has(e.source) && groupNodeIds.has(e.target))

    // Build a single tree from the group's own nodes and internal edges
    const tree = buildStoryTree(groupNodes, groupEdges)

    return {
      groupId: group.id,
      name: group.name,
      color: group.color,
      nodeCount: group.nodeIds.length,
      roots: tree ? [tree] : []
    }
  }).filter(g => g.roots.length > 0)
})

// Default expand all groups to level 2
watch(
  () => groupTrees.value,
  (trees) => {
    if (trees.length > 0) {
      const s = new Set<string>()
      for (const g of trees) {
        s.add(g.groupId)
        for (const root of g.roots) {
          s.add(root.id)
          for (const child of root.children) {
            s.add(child.id)
          }
        }
      }
      expandedNodes.value = s
    }
  },
  { immediate: true }
)

watch(
  () => root.value,
  (newRoot) => {
    if (newRoot && groupTrees.value.length === 0) {
      const s = new Set<string>()
      s.add(newRoot.id)
      for (const child of newRoot.children) {
        s.add(child.id)
      }
      expandedNodes.value = s
    }
  },
  { immediate: true }
)

function toggleNode(id: string) {
  const s = new Set(expandedNodes.value)
  if (s.has(id)) {
    s.delete(id)
  } else {
    s.add(id)
  }
  expandedNodes.value = s
}

function selectNode(id: string) {
  selectedNodeId.value = id
  flowStore.selectedNodeId = id
}

function expandAll() {
  const s = new Set<string>()

  if (groupTrees.value.length > 0) {
    for (const g of groupTrees.value) {
      s.add(g.groupId)
      const walk = (n: StoryTreeNode) => {
        s.add(n.id)
        for (const c of n.children) walk(c)
      }
      for (const root of g.roots) walk(root)
    }
  } else if (root.value) {
    const walk = (n: StoryTreeNode) => {
      s.add(n.id)
      for (const c of n.children) walk(c)
    }
    walk(root.value)
  }

  expandedNodes.value = s
}

function collapseAll() {
  expandedNodes.value = new Set()
}
</script>

<script lang="ts">
// 递归节点组件，使用 defineComponent 支持自身引用
export const TreeNodeItem = defineComponent({
  name: 'TreeNodeItem',
  props: {
    node: { type: Object as () => StoryTreeNode, required: true },
    depth: { type: Number, required: true },
    expanded: { type: Object as () => Set<string>, required: true },
    flowNodes: { type: Array as () => FlowNode[], required: true }
  },
  emits: ['toggle', 'select'],
  setup(props, { emit }) {
    const typeColors: Record<string, string> = {
      dialog: '#6BA4D8',
      choice: '#F0A060',
      condition: '#DDC050',
      setVariable: '#74B88A',
      goto: '#A088D0',
      end: '#E88080',
      audio: '#D8A030',
      cg: '#64B0BC',
      wait: '#A89888',
      random: '#D8A030',
      label: '#A89888',
      animation: '#E890A8'
    }

    const endingColors: Record<string, string> = {
      normal: '#94a3b8',
      good: '#22c55e',
      bad: '#ef4444',
      true: '#f59e0b'
    }

    const endingLabels: Record<string, string> = {
      normal: 'N', good: 'G', bad: 'B', true: 'T'
    }

    const typeIcons: Record<string, string> = {
      dialog: 'D', choice: '?', condition: '◇',
      setVariable: 'S', goto: '→', end: '■',
      audio: '♪', cg: '□', wait: '⏳',
      random: '⚄', label: '#', animation: '✦'
    }

    return () => {
      const { node, depth, expanded, flowNodes } = props
      const isExpanded = expanded.has(node.id)
      const hasChildren = node.children.length > 0
      const endingType = node.endingType || null
      const color = endingType ? (endingColors[endingType] || '#E88080') : (typeColors[node.type] || '#A89888')
      const icon = endingType ? (endingLabels[endingType] || '■') : (typeIcons[node.type] || '?')

      return h('div', { class: 'tree-node-wrapper' }, [
        h('div', {
          class: ['tree-node-row', { 'is-selected': false, 'is-ending': !!endingType }],
          style: { paddingLeft: `${depth * 20 + 8}px` },
          onClick: () => emit('select', node.id)
        }, [
          hasChildren
            ? h('span', {
                class: 'tree-toggle',
                onClick: (e: Event) => { e.stopPropagation(); emit('toggle', node.id) }
              }, isExpanded ? '▼' : '▶')
            : h('span', { class: 'tree-toggle-spacer' }),
          h('span', {
            class: 'tree-node-icon',
            style: { background: color + '22', color }
          }, icon),
          h('span', { class: 'tree-node-label' }, node.label),
          endingType ? h('span', { class: 'tree-ending-badge', style: { color: endingColors[endingType] } }, endingType.toUpperCase()) : null,
          node.branchLabel
            ? h('span', { class: 'tree-branch-label' }, node.branchLabel)
            : null
        ]),
        isExpanded && hasChildren
          ? h('div', { class: 'tree-children' },
              node.children.map((child) =>
                h(TreeNodeItem, {
                  key: child.id, node: child, depth: depth + 1,
                  expanded: props.expanded, flowNodes: props.flowNodes,
                  onToggle: (id: string) => emit('toggle', id),
                  onSelect: (id: string) => emit('select', id)
                })
              )
            )
          : null
      ])
    }
  }
})
</script>

<style scoped>
.story-tree-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-panel);
}

.tree-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.tree-title {
  font-size: var(--text-lg, 14px);
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.tree-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.tree-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm, 12px);
}

/* ── Group sections ── */
.group-section {
  margin: 2px 6px 4px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  background: var(--bg-card);
  transition: background var(--transition-fast);
}

.group-header:hover {
  background: var(--bg-hover);
}

.group-header.expanded {
  border-bottom: 1px solid var(--border-color);
}

.group-expand {
  font-size: 8px;
  color: var(--text-muted);
  width: 12px;
}

.group-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.group-name {
  flex: 1;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.group-count {
  font-size: var(--text-xs);
  color: var(--text-dim);
}

.group-children {
  padding: 2px 0 4px;
}

.group-empty {
  padding: 12px;
  text-align: center;
  color: var(--text-dim);
  font-size: var(--text-sm);
}

/* ── Tree nodes ── */
.tree-node-wrapper {
  user-select: none;
}

.tree-node-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  margin: 0 4px;
  transition: background 0.1s;
}

.tree-node-row:hover {
  background: var(--bg-hover);
}

.tree-node-row.is-selected {
  background: rgba(240, 160, 168, 0.18);
}

.tree-toggle {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
}

.tree-toggle:hover {
  color: var(--text-primary);
}

.tree-toggle-spacer {
  width: 16px;
  flex-shrink: 0;
}

.tree-node-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.tree-node-label {
  font-size: var(--text-sm, 12px);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-branch-label {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-card);
  padding: 0 4px;
  border-radius: 3px;
  margin-left: auto;
  flex-shrink: 0;
}

.tree-children {
  /* children are indented by the parent's paddingLeft */
}

.tree-node-row.is-ending {
  font-weight: 600;
}

.tree-ending-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 4px;
  background: var(--bg-card);
}
</style>
