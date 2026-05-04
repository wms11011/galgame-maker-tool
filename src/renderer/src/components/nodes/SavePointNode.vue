<template>
  <div class="savepoint-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">💾</span>
      <span class="node-title">存档点</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div v-if="data.slotLabel" class="slot-badge">
        📁 {{ data.slotLabel }}
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
    slotLabel?: string
    nextNodeId?: string
  }
}>()
</script>

<style scoped>
.savepoint-node {
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

.savepoint-node.selected {
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

.node-title {
  font-weight: 600;
  color: #F8B8C8;
}

.node-body {
  padding: 8px 10px;
  text-align: center;
}

.node-field { margin-bottom: var(--space-xs); }
.node-field:last-child { margin-bottom: 0; }

.field-value {
  color: var(--text-primary);
  font-weight: 500;
}

.slot-badge {
  display: inline-block;
  padding: 1px 8px;
  background: rgba(232, 144, 168, 0.12);
  border: 1px solid rgba(232, 144, 168, 0.25);
  border-radius: 3px;
  font-size: 11px;
  color: #F8B8C8;
}
</style>
