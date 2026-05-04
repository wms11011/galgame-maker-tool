<template>
  <div class="ach-node" :class="{ selected: props.selected, unlocked: achDef?.unlocked }">
    <Handle type="target" :position="Position.Top" />
    <div class="node-header">
      <span class="node-icon">{{ achDef?.icon || '🏆' }}</span>
      <span class="node-title">成就解锁</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="field-value">{{ achievementLabel }}</span>
      </div>
      <div v-if="achDef" class="ach-desc">{{ achDef.description }}</div>
      <div v-if="achDef?.unlockCondition" class="ach-cond">条件: {{ achDef.unlockCondition }}</div>
      <div v-if="achDef?.autoCheck" class="ach-auto-badge">自动检测</div>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Position, Handle } from '@vue-flow/core'
import { useAchievementStore } from '@renderer/stores/achievementStore'

const props = defineProps<{
  id: string
  selected?: boolean
  data: {
    id: string
    label: string
    achievementId: string
    nextNodeId?: string
  }
}>()

const achievementStore = useAchievementStore()
const achDef = computed(() => achievementStore.getById(props.data.achievementId))
const achievementLabel = computed(() => achDef.value?.name || props.data.label)
</script>

<style scoped>
.ach-node {
  width: 200px;
  background: var(--bg-panel);
  border: 2px solid var(--color-amber);
  border-radius: var(--radius-md);
  padding: 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: border-width var(--transition-fast), box-shadow var(--transition-fast);
}
.ach-node.selected {
  border-width: 3px;
  box-shadow: var(--shadow-glow) rgba(216, 160, 48, 0.4);
}
.ach-node.unlocked {
  border-color: var(--color-green);
  opacity: 0.85;
}
.ach-node.unlocked.selected {
  box-shadow: var(--shadow-glow) rgba(116, 184, 138, 0.4);
}
.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  background: rgba(216, 160, 48, 0.12);
  border-radius: 6px 6px 0 0;
  border-bottom: 1px solid rgba(216, 160, 48, 0.25);
}
.ach-node.unlocked .node-header {
  background: rgba(116, 184, 138, 0.12);
  border-bottom-color: rgba(116, 184, 138, 0.25);
}
.node-icon { font-size: 14px; }
.node-title { font-weight: 600; color: #F0C860; }
.ach-node.unlocked .node-title { color: #94D0A4; }
.node-body { padding: 8px 10px; text-align: center; }
.node-field { margin-bottom: 2px; }
.field-value { color: var(--text-primary); font-weight: 500; }
.ach-desc {
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.3;
}
.ach-cond {
  margin-top: 4px;
  font-size: 9px;
  color: var(--color-amber);
  background: rgba(216, 160, 48, 0.08);
  border: 1px solid rgba(216, 160, 48, 0.15);
  padding: 2px 6px;
  border-radius: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ach-auto-badge {
  margin-top: 4px;
  font-size: 9px;
  color: var(--color-blue);
  background: rgba(107, 164, 216, 0.12);
  padding: 2px 6px;
  border-radius: 3px;
  display: inline-block;
}
</style>
