<template>
  <div class="item-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header"><span class="node-icon">{{ icon }}</span><span class="node-title">{{ title }}</span></div>
    <div class="node-body"><span class="field-value">{{ data.itemName || '?' }}</span></div>
    <Handle type="source" :position="Position.Bottom" />
    <Handle v-if="data.action === 'check'" type="source" :position="Position.Right" id="true" />
    <Handle v-if="data.action === 'check'" type="source" :position="Position.Left" id="false" />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'; import { Position, Handle } from '@vue-flow/core'
const props = defineProps<{ id: string; selected?: boolean; data: { label: string; action: string; itemName: string } }>()
const icon = computed(() => ({ get: '📥', use: '🧪', lose: '🗑', check: '🔍' }[props.data.action] || '📦'))
const title = computed(() => ({ get: '获得道具', use: '使用道具', lose: '失去道具', check: '检查道具' }[props.data.action] || '道具'))
</script>
<style scoped>
.item-node { width: 180px; background: var(--bg-panel); border: 2px solid var(--color-amber); border-radius: var(--radius-md); padding: 0; font-size: var(--text-sm); color: var(--text-primary); }
.item-node.selected { border-width: 3px; box-shadow: var(--shadow-glow) rgba(232,176,64,0.4); }
.node-header { display: flex; align-items: center; gap: 6px; padding: 6px 8px 4px; background: rgba(232,176,64,0.15); border-radius: 6px 6px 0 0; }
.node-icon { font-size: 14px; } .node-title { font-weight: 600; color: var(--text-dim); font-size: 12px; }
.node-body { padding: 6px 8px; text-align: center; } .field-value { font-weight: 500; }
</style>
