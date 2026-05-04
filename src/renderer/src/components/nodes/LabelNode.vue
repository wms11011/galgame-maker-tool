<template>
  <div class="label-node" :class="{ selected: props.selected }" :style="nodeStyle">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header" :style="headerStyle">
      <span class="node-icon">🏷️</span>
      <span class="node-title" :style="titleStyle">{{ data.label || '标签' }}</span>
    </div>
    <div class="node-body">
      <span class="label-hint">纯标注，不影响流程</span>
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
    color: string
  }
}>()

const c = computed(() => props.data.color || '#A89888')

const nodeStyle = computed(() => ({
  borderColor: c.value
}))

const headerStyle = computed(() => ({
  background: `${c.value}1a`,
  borderBottomColor: `${c.value}4d`
}))

const titleStyle = computed(() => ({
  color: c.value
}))
</script>

<style scoped>
.label-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px dashed var(--color-gray);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}

.label-node.selected {
  border-width: 3px;
  border-style: dashed;
  box-shadow: var(--shadow-glow) rgba(107, 114, 128, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(107, 114, 128, 0.15);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(107, 114, 128, 0.3);
}

.node-icon {
  font-size: 14px;
}

.node-title {
  font-weight: 600;
  color: var(--text-dim);
}

.node-body {
  padding: 6px 10px;
  text-align: center;
}

.label-hint {
  font-size: 10px;
  color: var(--text-dim);
  font-style: italic;
}
</style>
