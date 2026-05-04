<template>
  <div
    class="dialog-node"
    :class="{ selected: props.selected }"
    :style="nodeStyle"
  >
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">💬</span>
      <span class="node-title">对话节点</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-label">角色：</span>
        <span class="field-value">{{ props.data.character || '未设置' }}</span>
      </div>
      <div class="node-field content-field">
        <span class="field-value content-preview" :title="props.data.content || ''">{{ contentPreview }}</span>
      </div>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useCharacterStore } from '@renderer/stores/characterStore'
import type { DialogNodeData } from '@renderer/types/index'

const props = defineProps<{
  data: DialogNodeData
  selected?: boolean
}>()

const characterStore = useCharacterStore()

const characterColor = computed(() => {
  const name = props.data.character
  if (!name) return null
  const c = characterStore.characters.find(ch => ch.name === name)
  return c?.color || null
})

const nodeStyle = computed(() => {
  if (characterColor.value) {
    return {
      borderColor: characterColor.value,
      '--char-color': characterColor.value
    }
  }
  return {}
})

const contentPreview = computed(() => {
  const content = props.data.content || '（无内容）'
  return content.length > 30 ? content.slice(0, 30) + '...' : content
})
</script>

<style scoped>
.dialog-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--char-color, var(--color-blue));
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.dialog-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(59, 130, 246, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: var(--char-color, rgba(59, 130, 246, 0.15));
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid color-mix(in srgb, var(--char-color, rgba(59, 130, 246, 0.3)) 50%, transparent);
}

.node-icon {
  font-size: 14px;
}

.node-title {
  font-weight: 600;
  color: #8AB8E8;
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

.content-field {
  margin-top: 2px;
}

.content-preview {
  color: var(--text-dim);
  font-style: italic;
  line-height: 1.4;
}
</style>
