<template>
  <div class="timer-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">⏱️</span>
      <span class="node-title">计时器</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div class="timer-info-row">
        <span class="timer-badge">{{ modeLabel }}</span>
        <span class="timer-badge">{{ durationText }}</span>
      </div>
      <div v-if="data.variable" class="timer-var">
        → {{ data.variable }}
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
    mode: 'countdown' | 'stopwatch'
    duration: number
    variable: string
    nextNodeId?: string
  }
}>()

const modeLabel = computed(() => props.data.mode === 'countdown' ? '倒计时' : '秒表')
const durationText = computed(() => {
  const ms = props.data.duration || 0
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
})
</script>

<style scoped>
.timer-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--color-teal);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}
.timer-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(96, 176, 160, 0.4);
}
.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(96, 176, 160, 0.12);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(96, 176, 160, 0.25);
}
.node-icon { font-size: 14px; }
.node-title { font-weight: 600; color: #80D8C8; }
.node-body { padding: 8px 10px; text-align: center; }
.node-field { margin-bottom: var(--space-xs); }
.field-value { color: var(--text-primary); font-weight: 500; }
.timer-info-row { display: flex; justify-content: center; gap: 6px; margin-top: 4px; }
.timer-badge {
  display: inline-block;
  padding: 1px 8px;
  background: rgba(96, 176, 160, 0.10);
  border: 1px solid rgba(96, 176, 160, 0.20);
  border-radius: 3px;
  font-size: 11px;
  color: #80D8C8;
}
.timer-var { margin-top: 4px; font-size: 11px; color: var(--text-muted); }
</style>
