<template>
  <div class="path-trace-panel">
    <div class="panel-header">
      <span class="panel-title">路径追踪</span>
      <span class="path-count">{{ paths.length }} 条路线</span>
    </div>

    <div class="path-stats">
      <div class="stat-item">
        <span class="stat-label">总路线</span>
        <span class="stat-value">{{ paths.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">正常结局</span>
        <span class="stat-value stat-end">{{ endCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">死路</span>
        <span class="stat-value stat-dead">{{ deadCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">循环</span>
        <span class="stat-value stat-cycle">{{ cycleCount }}</span>
      </div>
    </div>

    <div class="path-list" v-if="paths.length > 0">
      <div
        v-for="path in paths"
        :key="path.id"
        class="path-item"
        :class="{ expanded: expandedPaths.has(path.id) }"
      >
        <div class="path-summary" @click="togglePath(path.id)">
          <span class="path-end-badge" :class="'end-' + path.endType">
            {{ endTypeLabel(path.endType) }}
          </span>
          <span class="path-route">
            <span
              v-for="(n, i) in path.nodes"
              :key="n.id"
              class="path-node-chip"
              :style="{ background: typeColor(n.type) }"
              @click.stop="focusNode(n.id)"
            >
              {{ n.branchLabel || n.label }}
            </span>
            <span v-if="path.nodes.length === 0" class="path-empty">空路径</span>
          </span>
          <span class="path-length">{{ path.nodes.length }} 步</span>
        </div>
        <div v-if="expandedPaths.has(path.id)" class="path-detail">
          <div
            v-for="(n, i) in path.nodes"
            :key="n.id"
            class="detail-step"
            @click="focusNode(n.id)"
          >
            <span class="detail-index">{{ i + 1 }}</span>
            <span class="detail-type" :style="{ color: typeColor(n.type) }">{{ n.type }}</span>
            <span class="detail-label">{{ n.label }}</span>
            <span v-if="n.branchLabel" class="detail-branch">{{ n.branchLabel }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-paths">流程图中没有可追踪的路线</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StoryPath } from '../utils/pathTracing'

const props = defineProps<{
  paths: StoryPath[]
}>()

const emit = defineEmits<{
  focusNode: [nodeId: string]
}>()

const expandedPaths = ref<Set<string>>(new Set())

const endCount = computed(() => props.paths.filter((p) => p.endType === 'end').length)
const deadCount = computed(() => props.paths.filter((p) => p.endType === 'dead-end').length)
const cycleCount = computed(() => props.paths.filter((p) => p.endType === 'cycle').length)

function togglePath(id: string): void {
  const s = new Set(expandedPaths.value)
  if (s.has(id)) {
    s.delete(id)
  } else {
    s.add(id)
  }
  expandedPaths.value = s
}

function focusNode(nodeId: string): void {
  emit('focusNode', nodeId)
}

function endTypeLabel(type: string): string {
  switch (type) {
    case 'end': return '结局'
    case 'dead-end': return '死路'
    case 'cycle': return '循环'
    case 'open': return '未完成'
    default: return type
  }
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    dialog: '#6BA4D8',
    choice: '#74B88A',
    condition: '#F0A060',
    setVariable: '#A088D0',
    goto: '#A088D0',
    end: '#E88080',
    audio: '#DDC050',
    cg: '#64B0BC',
    wait: '#A89888',
    random: '#D8A030',
    label: '#A89888',
    animation: '#F0A060'
  }
  return map[type] || '#A89888'
}
</script>

<style scoped>
.path-trace-panel {
  width: 340px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  background: var(--bg-overlay);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.path-count {
  font-size: 11px;
  background: var(--color-blue);
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
}

.path-stats {
  display: flex;
  gap: 2px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-color);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  font-size: 10px;
  color: var(--text-muted);
  display: block;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-end { color: var(--color-green); }
.stat-dead { color: var(--color-red); }
.stat-cycle { color: var(--color-amber); }

.path-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.path-item {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  margin-bottom: 4px;
  overflow: hidden;
}

.path-item:hover {
  border-color: var(--border-color-light);
}

.path-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  cursor: pointer;
}

.path-summary:hover {
  background: var(--bg-hover);
}

.path-end-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}

.end-end { background: rgba(116, 184, 138, 0.15); color: var(--color-green); }
.end-dead-end { background: rgba(232, 128, 128, 0.15); color: var(--color-red); }
.end-cycle { background: rgba(216, 160, 48, 0.15); color: var(--color-amber); }
.end-open { background: rgba(168, 152, 136, 0.15); color: var(--color-gray); }

.path-route {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  overflow: hidden;
}

.path-node-chip {
  font-size: 10px;
  color: #fff;
  padding: 1px 5px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.path-node-chip:hover {
  opacity: 0.8;
}

.path-length {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.path-detail {
  border-top: 1px solid var(--border-color);
  padding: 4px 8px;
  max-height: 200px;
  overflow-y: auto;
}

.detail-step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  font-size: 11px;
  cursor: pointer;
  border-radius: 2px;
}

.detail-step:hover {
  background: var(--bg-card);
}

.detail-index {
  width: 18px;
  height: 18px;
  background: var(--bg-card);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.detail-type {
  width: 28px;
  font-size: 10px;
  flex-shrink: 0;
}

.detail-label {
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-branch {
  font-size: 10px;
  color: var(--color-orange);
}

.no-paths {
  padding: 24px;
  text-align: center;
  color: var(--text-dim);
  font-size: var(--text-sm);
}
</style>
