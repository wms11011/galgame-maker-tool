<template>
  <div class="random-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">🎲</span>
      <span class="node-title">随机节点</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div class="branch-info">
        <span class="random-badge" v-if="data.branches && data.branches.length > 0">
          {{ data.branches.length }} 个分支
        </span>
        <span class="random-badge empty" v-else>无分支</span>
      </div>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { Position, Handle } from '@vue-flow/core'

const props = defineProps<{
  id: string
  selected?: boolean
  data: {
    id: string
    label: string
    branches: { id: string; targetNodeId: string; weight: number }[]
  }
}>()
</script>

<style scoped>
.random-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--color-amber);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}

.random-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(245, 158, 11, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(245, 158, 11, 0.15);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(245, 158, 11, 0.3);
}

.node-icon {
  font-size: 14px;
}

.node-title {
  font-weight: 600;
  color: #F0C860;
}

.node-body {
  padding: 8px 10px;
  text-align: center;
}

.node-field {
  margin-bottom: var(--space-xs);
}

.node-field:last-child {
  margin-bottom: 0;
}

.field-value {
  color: var(--text-primary);
  font-weight: 500;
}

.branch-info {
  display: flex;
  justify-content: center;
}

.random-badge {
  display: inline-block;
  padding: 1px 8px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 3px;
  font-size: 11px;
  color: #F0C860;
}

.random-badge.empty {
  background: rgba(100, 116, 139, 0.1);
  border-color: rgba(100, 116, 139, 0.3);
  color: var(--text-muted);
}
</style>
