<template>
  <div class="affection-panel" v-if="bars.length > 0">
    <div class="panel-title">❤ 角色好感度</div>
    <div
      v-for="bar in bars"
      :key="bar.name"
      class="affection-bar"
    >
      <div class="bar-header">
        <span class="bar-name">{{ bar.displayName }}</span>
        <span class="bar-value" :class="{ changed: bar.changed }">
          {{ bar.current }}/{{ bar.max }}
        </span>
      </div>
      <div class="bar-track">
        <div
          class="bar-fill"
          :style="{ width: bar.pct + '%', background: bar.color }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useVariableStore } from '../stores/variableStore'

const props = defineProps<{
  variables?: Record<string, number>
}>()

const variableStore = useVariableStore()
const prevValues = ref<Record<string, number>>({})

interface AffectionBar {
  name: string
  displayName: string
  current: number
  max: number
  pct: number
  color: string
  changed: boolean
}

const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#4ade80']

const bars = computed<AffectionBar[]>(() => {
  const vars = props.variables || {}
  const result: AffectionBar[] = []

  // 筛选命名规则: 好感度_角色名 或 affection_角色名
  for (const [key, val] of Object.entries(vars)) {
    const match = key.match(/^(好感度|affection|love)_(.+)$/i)
    if (!match) continue

    const displayName = match[2]
    const current = typeof val === 'number' ? val : Number(val) || 0
    const max = 100
    const pct = Math.min(100, Math.max(0, (current / max) * 100))
    const name = key

    const prev = prevValues.value[name]
    const changed = prev !== undefined && prev !== current

    result.push({
      name,
      displayName,
      current,
      max,
      pct,
      color: colors[result.length % colors.length],
      changed
    })
  }

  // 更新历史值
  for (const b of result) {
    prevValues.value[b.name] = b.current
  }

  return result.sort((a, b) => b.current - a.current)
})
</script>

<style scoped>
.affection-panel {
  padding: 12px 16px;
  background: var(--bg-overlay);
  border-left: 1px solid var(--border-color);
  min-width: 200px;
  max-height: 720px;
  overflow-y: auto;
}
.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
  text-align: center;
}
.affection-bar {
  margin-bottom: 10px;
}
.bar-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 3px;
}
.bar-name {
  color: var(--text-primary);
  font-weight: 500;
}
.bar-value {
  color: var(--text-muted);
  transition: color 0.3s;
}
.bar-value.changed {
  color: var(--color-yellow);
  font-weight: 700;
}
.bar-track {
  height: 10px;
  background: var(--bg-card);
  border-radius: 5px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.6s ease-out, background 0.6s;
}
</style>
