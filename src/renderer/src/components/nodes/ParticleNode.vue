<template>
  <div class="particle-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">🌸</span>
      <span class="node-title">粒子特效</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div class="particle-badge-row">
        <span class="particle-badge">{{ presetLabel }}</span>
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
    preset: string
    nextNodeId?: string
  }
}>()

const presetLabel = computed(() => {
  const map: Record<string, string> = {
    rain: '🌧 雨', snow: '❄ 雪', sakura: '🌸 樱花',
    leaf: '🍂 落叶', star: '⭐ 星星'
  }
  return map[props.data.preset] || props.data.preset || 'snow'
})
</script>

<style scoped>
.particle-node {
  width: 200px; background: var(--bg-panel);
  border: 2px solid var(--color-pink); border-radius: var(--radius-md);
  padding: 0; font-size: var(--text-sm); color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}
.particle-node.selected {
  border-width: 3px; box-shadow: var(--shadow-glow) rgba(240, 160, 184, 0.4);
}
.node-header {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px 6px; background: rgba(240, 160, 184, 0.15);
  border-radius: 6px 6px 0 0; border-bottom: 1px solid rgba(240, 160, 184, 0.3);
}
.node-icon { font-size: 14px; }
.node-title { font-weight: 600; color: var(--text-dim); }
.node-body { padding: 8px 10px; text-align: center; }
.node-field { margin-bottom: var(--space-xs); }
.field-value { color: var(--text-primary); font-weight: 500; }
.particle-badge-row { display: flex; justify-content: center; }
.particle-badge {
  display: inline-block; padding: 1px 8px;
  background: rgba(240, 160, 184, 0.15); border: 1px solid rgba(240, 160, 184, 0.3);
  border-radius: 3px; font-size: 11px; color: var(--text-dim);
}
</style>
