<template>
  <div class="animation-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">🎬</span>
      <span class="node-title">动画节点</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div class="node-field" v-if="data.target">
        <span class="field-label">目标:</span>
        <span class="field-value-inline">{{ data.target === 'screen' ? '画面' : data.target }}</span>
      </div>
      <div class="anim-info-row">
        <span class="anim-badge">{{ actionLabel }}</span>
        <span class="anim-duration">{{ data.duration }}ms</span>
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
    target: string
    action: 'enter' | 'exit' | 'shake' | 'flash'
    position?: 'left' | 'center' | 'right'
    duration: number
    nextNodeId?: string
  }
}>()

const actionLabels: Record<string, string> = {
  enter: '入场',
  exit: '退场',
  shake: '震动',
  flash: '闪烁'
}
const actionLabel = computed(() => actionLabels[props.data.action] || props.data.action)
</script>

<style scoped>
.animation-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--color-orange);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}

.animation-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(249, 115, 22, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(249, 115, 22, 0.15);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(249, 115, 22, 0.3);
}

.node-icon {
  font-size: 14px;
}

.node-title {
  font-weight: 600;
  color: #F8C090;
}

.node-body {
  padding: 8px 10px;
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

.field-label {
  color: var(--text-muted);
  font-size: 11px;
}

.field-value-inline {
  color: var(--text-primary);
  font-weight: 500;
  font-size: var(--text-sm);
}

.anim-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
  margin-top: 4px;
}

.anim-badge {
  display: inline-block;
  padding: 1px 6px;
  background: rgba(249, 115, 22, 0.15);
  border: 1px solid rgba(249, 115, 22, 0.3);
  border-radius: 3px;
  font-size: 10px;
  color: #F8C090;
}

.anim-duration {
  font-size: 10px;
  color: var(--text-muted);
}
</style>
