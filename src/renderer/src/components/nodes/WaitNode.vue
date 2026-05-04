<template>
  <div class="wait-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">⏳</span>
      <span class="node-title">延时节点</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div class="wait-duration-row">
        <span class="wait-badge">{{ durationText }}</span>
      </div>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Position, Handle } from '@vue-flow/core'

const props = defineProps<{
  id: string
  selected?: boolean
  data: {
    id: string
    label: string
    duration: number
    nextNodeId?: string
  }
}>()

const durationText = computed(() => {
  const ms = props.data.duration || 0
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  return `${ms}ms`
})
</script>

<style scoped>
.wait-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--color-gray);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}

.wait-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(100, 116, 139, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(100, 116, 139, 0.15);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(100, 116, 139, 0.3);
}

.node-icon {
  font-size: 14px;
}

.node-title {
  font-weight: 600;
  color: var(--text-dim);
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

.wait-duration-row {
  display: flex;
  justify-content: center;
}

.wait-badge {
  display: inline-block;
  padding: 1px 8px;
  background: rgba(100, 116, 139, 0.15);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 3px;
  font-size: 11px;
  color: var(--text-dim);
}
</style>
