<template>
  <div class="goto-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">⏭️</span>
      <span class="node-title">跳转节点</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div class="node-field" v-if="data.targetNodeId">
        <span class="field-label">目标：</span>
        <span class="field-value goto-target">{{ targetLabel }}</span>
      </div>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Position, Handle } from '@vue-flow/core'
import { useFlowStore } from '@renderer/stores/flowStore'

const props = defineProps<{
  id: string
  selected?: boolean
  data: {
    id: string
    label: string
    targetNodeId: string
  }
}>()

const flowStore = useFlowStore()

const targetLabel = computed(() => {
  const target = flowStore.nodes.find(n => n.id === props.data.targetNodeId)
  return target?.data?.label ?? props.data.targetNodeId
})
</script>

<style scoped>
.goto-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--color-purple);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}

.goto-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(160, 136, 208, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(160, 136, 208, 0.12);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(160, 136, 208, 0.25);
}

.node-icon {
  font-size: 14px;
}

.node-title {
  font-weight: 600;
  color: #C0B0E8;
}

.node-body {
  padding: 8px 10px;
}

.node-field {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
}

.node-field:last-child {
  margin-bottom: 0;
}

.field-label {
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.field-value {
  color: var(--text-primary);
  word-break: break-all;
}

.goto-target {
  color: #C0B0E8;
  font-weight: 500;
}
</style>
