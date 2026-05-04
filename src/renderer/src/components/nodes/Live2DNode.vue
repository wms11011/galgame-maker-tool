<template>
  <div class="live2d-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">🎭</span>
      <span class="node-title">Live2D 立绘</span>
    </div>
    <div class="node-body">
      <div class="node-field"><span class="field-value">{{ data.label }}</span></div>
      <div class="live2d-badge-row">
        <span class="live2d-badge">{{ data.expression || 'neutral' }}</span>
        <span class="live2d-pos">{{ posLabel }}</span>
      </div>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Position, Handle } from '@vue-flow/core'

const props = defineProps<{
  id: string; selected?: boolean
  data: { id: string; label: string; model: string; expression?: string; position?: string; nextNodeId?: string }
}>()

const posLabel = computed(() => {
  const m: Record<string, string> = { left: '←左', center: '中', right: '右→' }
  return m[props.data.position || 'center'] || '中'
})
</script>

<style scoped>
.live2d-node { width: 200px; background: var(--bg-panel); border: 2px solid var(--color-purple); border-radius: var(--radius-md); padding: 0; font-size: var(--text-sm); color: var(--text-primary); box-shadow: var(--shadow-card); }
.live2d-node.selected { border-width: 3px; box-shadow: var(--shadow-glow) rgba(176,152,224,0.4); }
.node-header { display: flex; align-items: center; gap: 6px; padding: 8px 10px 6px; background: rgba(176,152,224,0.15); border-radius: 6px 6px 0 0; border-bottom: 1px solid rgba(176,152,224,0.3); }
.node-icon { font-size: 14px; }
.node-title { font-weight: 600; color: var(--text-dim); }
.node-body { padding: 8px 10px; text-align: center; }
.node-field { margin-bottom: var(--space-xs); }
.field-value { color: var(--text-primary); font-weight: 500; }
.live2d-badge-row { display: flex; gap: 6px; justify-content: center; }
.live2d-badge, .live2d-pos { display: inline-block; padding: 1px 8px; background: rgba(176,152,224,0.15); border: 1px solid rgba(176,152,224,0.3); border-radius: 3px; font-size: 11px; color: var(--text-dim); }
</style>
