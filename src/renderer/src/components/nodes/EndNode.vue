<template>
  <div class="end-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">🏁</span>
      <span class="node-title">结束节点</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div class="node-field">
        <span class="end-type-badge">{{ endingTypeLabel }}</span>
      </div>
    </div>
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
    endingType: 'normal' | 'good' | 'bad' | 'true'
    message: string
    background?: string
  }
}>()

const endingTypeLabels: Record<string, string> = {
  normal: '普通结局',
  good: '好结局',
  bad: '坏结局',
  true: '真结局'
}

const endingTypeLabel = computed(() => endingTypeLabels[props.data.endingType] || props.data.endingType)
</script>

<style scoped>
.end-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--color-red);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}

.end-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(239, 68, 68, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(239, 68, 68, 0.15);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(239, 68, 68, 0.3);
}

.node-icon {
  font-size: 14px;
}

.node-title {
  font-weight: 600;
  color: #F0A8A8;
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

.end-type-badge {
  display: inline-block;
  padding: 1px 8px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 3px;
  font-size: 11px;
  color: #F0A8A8;
}
</style>
