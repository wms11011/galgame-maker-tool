<template>
  <div
    class="setvar-node"
    :class="{ selected: props.selected }"
  >
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">📊</span>
      <span class="node-title">变量设置</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label || '变量设置' }}</span>
      </div>
      <div class="node-field" v-if="data.variable">
        <span class="field-value var-expr">{{ data.variable }} {{ data.op || '=' }} {{ data.value }}</span>
      </div>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { SetVariableNodeData } from '@renderer/types/index'

const props = defineProps<{
  data: SetVariableNodeData
  selected?: boolean
}>()
</script>

<style scoped>
.setvar-node {
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

.setvar-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(139, 92, 246, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(139, 92, 246, 0.15);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(139, 92, 246, 0.3);
}

.node-icon {
  font-size: 14px;
}

.node-title {
  font-weight: 600;
  color: #c4b5fd;
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

.field-value {
  color: var(--text-primary);
  word-break: break-all;
}

.var-expr {
  color: #a78bfa;
  font-weight: 600;
}
</style>
