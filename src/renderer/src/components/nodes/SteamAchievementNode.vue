<template>
  <div class="steam-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">🏆</span>
      <span class="node-title">Steam成就</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div v-if="data.achievementId" class="steam-id">
        <code>{{ data.achievementId }}</code>
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
    achievementId: string
    nextNodeId?: string
  }
}>()
</script>

<style scoped>
.steam-node {
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
.steam-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(216, 160, 48, 0.4);
}
.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(216, 160, 48, 0.12);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(216, 160, 48, 0.25);
}
.node-icon { font-size: 14px; }
.node-title { font-weight: 600; color: #F0C860; }
.node-body { padding: 8px 10px; text-align: center; }
.node-field { margin-bottom: var(--space-xs); }
.node-field:last-child { margin-bottom: 0; }
.field-value { color: var(--text-primary); font-weight: 500; }
.steam-id { margin-top: 4px; }
.steam-id code {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(216, 160, 48, 0.10);
  border: 1px solid rgba(216, 160, 48, 0.20);
  border-radius: 3px;
  font-size: 11px;
  color: #F0C860;
  font-family: monospace;
}
</style>
