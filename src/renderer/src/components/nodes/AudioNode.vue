<template>
  <div class="audio-node" :class="{ selected: props.selected }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">🎵</span>
      <span class="node-title">音频节点</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ data.label }}</span>
      </div>
      <div class="audio-info-row">
        <span class="audio-badge">{{ data.audioType === 'bgm' ? 'BGM' : 'SE' }}</span>
        <span class="audio-badge">{{ data.action === 'play' ? '▶ 播放' : '⏹ 停止' }}</span>
      </div>
      <div class="node-field" v-if="data.src && data.action === 'play'">
        <span class="field-value audio-file">{{ srcName }}</span>
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
    audioType: 'bgm' | 'se'
    action: 'play' | 'stop'
    src: string
    loop: boolean
    volume: number
    nextNodeId?: string
  }
}>()

const srcName = computed(() => {
  const src = props.data.src || ''
  const parts = src.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || src
})
</script>

<style scoped>
.audio-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--color-yellow);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}

.audio-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(234, 179, 8, 0.4);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(234, 179, 8, 0.15);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(234, 179, 8, 0.3);
}

.node-icon {
  font-size: 14px;
}

.node-title {
  font-weight: 600;
  color: #F0D878;
}

.node-body {
  padding: 8px 10px;
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

.audio-info-row {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
}

.audio-badge {
  display: inline-block;
  padding: 1px 6px;
  background: rgba(234, 179, 8, 0.15);
  border: 1px solid rgba(234, 179, 8, 0.3);
  border-radius: 3px;
  font-size: 10px;
  color: #F0D878;
}

.audio-file {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 400;
}
</style>
