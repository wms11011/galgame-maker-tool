<template>
  <div class="movechar-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">🚶</span>
      <span class="node-title">角色移动</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div class="move-info-row">
        <span class="move-pos">{{ data.fromPosition }}</span>
        <span class="move-arrow">→</span>
        <span class="move-pos">{{ data.toPosition }}</span>
      </div>
      <div v-if="data.duration" class="move-duration">
        {{ (data.duration / 1000).toFixed(1) }}s {{ data.easing }}
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
    target: string
    fromPosition: string
    toPosition: string
    duration: number
    easing: string
    nextNodeId?: string
  }
}>()
</script>

<style scoped>
.movechar-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--color-pink);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}
.movechar-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(232, 144, 168, 0.4);
}
.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(232, 144, 168, 0.12);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(232, 144, 168, 0.25);
}
.node-icon { font-size: 14px; }
.node-title { font-weight: 600; color: #F8B8C8; }
.node-body { padding: 8px 10px; text-align: center; }
.node-field { margin-bottom: var(--space-xs); }
.field-value { color: var(--text-primary); font-weight: 500; }
.move-info-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
.move-pos {
  padding: 2px 10px;
  background: rgba(232, 144, 168, 0.10);
  border: 1px solid rgba(232, 144, 168, 0.20);
  border-radius: 4px;
  font-size: 11px;
  color: #F8B8C8;
}
.move-arrow { color: var(--text-muted); font-size: 12px; }
.move-duration { margin-top: 4px; font-size: 11px; color: var(--text-muted); }
</style>
