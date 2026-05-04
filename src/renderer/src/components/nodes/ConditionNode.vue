<template>
  <div
    class="condition-node"
    :class="{ selected: props.selected }"
  >
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">⚡</span>
      <span class="node-title">条件节点</span>
    </div>
    <div class="node-body">
      <div class="expression-block">
        <span class="field-label">条件：</span>
        <code class="expression">{{ props.data.expression || '未设置' }}</code>
      </div>
      <div class="branches">
        <div class="branch true-branch">
          <span class="branch-label true">T 真</span>
          <span class="branch-target">→ {{ props.data.trueNextId || '—' }}</span>
        </div>
        <div class="branch false-branch">
          <span class="branch-label false">F 假</span>
          <span class="branch-target">→ {{ props.data.falseNextId || '—' }}</span>
        </div>
      </div>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { ConditionNodeData } from '@renderer/types/index'

const props = defineProps<{
  data: ConditionNodeData
  selected?: boolean
}>()
</script>

<style scoped>
.condition-node {
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

.condition-node.selected {
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
  color: #fdba74;
}

.node-body {
  padding: 8px 10px;
}

.expression-block {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.field-label {
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.expression {
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.3);
  border-radius: 3px;
  padding: 1px 4px;
  color: #fed7aa;
  font-family: monospace;
  font-size: 11px;
  word-break: break-all;
}

.branches {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.branch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
}

.true-branch {
  background: rgba(34, 197, 94, 0.1);
  border-left: 2px solid var(--color-green);
}

.false-branch {
  background: rgba(239, 68, 68, 0.1);
  border-left: 2px solid var(--color-red);
}

.branch-label {
  font-weight: 600;
  font-size: 11px;
}

.branch-label.true {
  color: #86efac;
}

.branch-label.false {
  color: #fca5a5;
}

.branch-target {
  color: var(--text-secondary);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}
</style>
