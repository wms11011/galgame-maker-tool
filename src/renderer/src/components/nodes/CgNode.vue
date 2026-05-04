<template>
  <div class="cg-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">🖼️</span>
      <span class="node-title">CG节点</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div class="node-field" v-if="data.src">
        <span class="field-value cg-file">{{ srcName }}</span>
      </div>
      <div class="cg-info-row">
        <span class="cg-badge">{{ transitionLabel }}</span>
        <span class="cg-duration">{{ data.duration }}ms</span>
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
    src: string
    transition: 'none' | 'fade' | 'zoom'
    duration: number
    nextNodeId?: string
  }
}>()

const srcName = computed(() => {
  const src = props.data.src || ''
  const parts = src.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || ''
})

const transitionLabels: Record<string, string> = {
  none: '无过渡',
  fade: '淡入',
  zoom: '缩放'
}
const transitionLabel = computed(() => transitionLabels[props.data.transition] || props.data.transition)
</script>

<style scoped>
.cg-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--color-cyan);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}

.cg-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(6, 182, 212, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(6, 182, 212, 0.15);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(6, 182, 212, 0.3);
}

.node-icon {
  font-size: 14px;
}

.node-title {
  font-weight: 600;
  color: #88CCD4;
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

.cg-file {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 400;
}

.cg-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
}

.cg-badge {
  display: inline-block;
  padding: 1px 6px;
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid rgba(6, 182, 212, 0.3);
  border-radius: 3px;
  font-size: 10px;
  color: #88CCD4;
}

.cg-duration {
  font-size: 10px;
  color: var(--text-muted);
}
</style>
