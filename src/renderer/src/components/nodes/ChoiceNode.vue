<template>
  <div
    class="choice-node"
    :class="{ selected: props.selected }"
  >
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">🔀</span>
      <span class="node-title">选择节点</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-label">标题：</span>
        <span class="field-value">{{ props.data.title || '未设置' }}</span>
      </div>
      <div class="options-list">
        <div
          v-for="(option, index) in displayOptions"
          :key="option.id"
          class="option-item"
        >
          <span class="option-index">{{ index + 1 }}.</span>
          <span class="option-text">{{ option.text || '（空选项）' }}</span>
        </div>
        <div v-if="(props.data.options ?? []).length === 0" class="no-options">
          暂无选项
        </div>
      </div>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { ChoiceNodeData } from '@renderer/types/index'

const props = defineProps<{
  data: ChoiceNodeData
  selected?: boolean
}>()

const displayOptions = computed(() => (props.data.options ?? []).slice(0, 4))
</script>

<style scoped>
.choice-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--color-green);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}

.choice-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(34, 197, 94, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(34, 197, 94, 0.15);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(34, 197, 94, 0.3);
}

.node-icon {
  font-size: 14px;
}

.node-title {
  font-weight: 600;
  color: #94D0A4;
}

.node-body {
  padding: 8px 10px;
}

.node-field {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs);
  margin-bottom: 6px;
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

.options-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 3px 6px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--color-green);
}

.option-index {
  color: #94D0A4;
  font-weight: 600;
  flex-shrink: 0;
}

.option-text {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-options {
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: var(--space-xs) 0;
}
</style>
