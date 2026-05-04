<template>
  <div class="node-panel">
    <div class="panel-header">
      <span class="panel-title">节点库</span>
    </div>
    <div class="panel-body">
      <div
        v-for="item in nodeItems"
        :key="item.type"
        class="node-card"
        :style="{ borderColor: item.color }"
        draggable="true"
        @dragstart="onDragStart($event, item.type)"
      >
        <div class="card-icon" :style="{ color: item.color }">{{ item.icon }}</div>
        <div class="card-info">
          <div class="card-name" :style="{ color: item.color }">{{ item.name }}</div>
          <div class="card-desc">{{ item.desc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeType } from '@renderer/types/index'
import { NODE_TYPE_REGISTRY } from '@renderer/utils/nodeTypeRegistry'

const nodeItems = computed(() =>
  Object.values(NODE_TYPE_REGISTRY)
    .filter(m => !m.deprecated)
    .map(m => ({
      type: m.type,
      icon: m.icon,
      name: m.label,
      desc: m.desc,
      color: m.color
    }))
)

function onDragStart(event: DragEvent, type: NodeType): void {
  event.dataTransfer?.setData('nodeType', type)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}
</script>

<style scoped>
.node-panel {
  width: 100%;
  height: 100%;
  background: var(--bg-panel);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-body {
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.node-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px var(--space-md);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-left-width: 4px;
  border-radius: var(--radius-sm);
  cursor: grab;
  transition: all var(--transition-fast);
  user-select: none;
}

.node-card:hover {
  background: var(--bg-hover);
  border-color: var(--accent-pink);
  transform: translateX(3px);
  box-shadow: var(--shadow-sm);
}

.node-card:active {
  cursor: grabbing;
  transform: scale(0.97);
}

.card-icon {
  font-size: 22px;
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}

.node-card:hover .card-icon {
  transform: scale(1.1);
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-name {
  font-size: var(--text-base);
  font-weight: 600;
}

.card-desc {
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
