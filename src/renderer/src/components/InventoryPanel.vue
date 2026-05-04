<template>
  <div class="inventory-panel" v-if="displayItems.length > 0 || alwaysShow">
    <div class="panel-title">
      🎒 道具
      <span v-if="displayItems.length > 0" class="item-count">{{ displayItems.length }}</span>
    </div>
    <div class="item-grid">
      <div
        v-for="(entry, idx) in displayItems"
        :key="idx"
        class="item-slot"
        :class="[entry.def?.type || 'default', { new: entry.isNew }]"
        @mouseenter="tooltip = entry"
        @mouseleave="tooltip = null"
      >
        <span class="item-icon">{{ entry.def?.icon || '📦' }}</span>
        <span v-if="entry.count > 1" class="item-stack">×{{ entry.count }}</span>
        <span class="item-label">{{ entry.def?.name || entry.name }}</span>
      </div>
      <div v-if="displayItems.length === 0" class="empty-hint">暂无道具</div>
    </div>

    <!-- 悬停提示 -->
    <div v-if="tooltip" class="item-tooltip">
      <div class="tooltip-header">
        <span class="tooltip-icon">{{ tooltip.def?.icon || '📦' }}</span>
        <span class="tooltip-name">{{ tooltip.def?.name || tooltip.name }}</span>
        <span class="tooltip-type">{{ typeLabel(tooltip.def?.type) }}</span>
      </div>
      <div v-if="tooltip.def?.description" class="tooltip-desc">
        {{ tooltip.def.description }}
      </div>
      <div v-if="tooltip.count > 1" class="tooltip-count">数量: {{ tooltip.count }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useItemStore } from '../stores/itemStore'

const props = withDefaults(defineProps<{
  variables?: Record<string, number | string | boolean | string[]>
  alwaysShow?: boolean
}>(), { alwaysShow: false })

const itemStore = useItemStore()
const prevItems = ref<string[]>([])
const tooltip = ref<{ name: string; count: number; def?: any; isNew: boolean } | null>(null)

interface DisplayEntry {
  name: string; count: number; def?: any; isNew: boolean
}

const displayItems = computed<DisplayEntry[]>(() => {
  const vars = props.variables || {}
  const entries: DisplayEntry[] = []
  const seen = new Map<string, DisplayEntry>()

  for (const [key, val] of Object.entries(vars)) {
    if (!Array.isArray(val)) continue
    if (!key.match(/^(背包|inventory|items|道具)/i)) continue

    for (const item of val) {
      const name = String(item)
      const def = itemStore.getByName(name)
      if (seen.has(name)) {
        seen.get(name)!.count++
      } else {
        const entry: DisplayEntry = {
          name,
          count: 1,
          def: def || (name ? { name, icon: defaultIcon(name), type: 'key' } : undefined),
          isNew: !prevItems.value.includes(name)
        }
        seen.set(name, entry)
        entries.push(entry)
      }
    }
  }

  prevItems.value = entries.flatMap(e => Array(e.count).fill(e.name))
  return entries
})

function defaultIcon(name: string): string {
  const map: Record<string, string> = {
    '钥匙': '🔑', '地图': '🗺', '药水': '🧪', '剑': '⚔', '盾': '🛡',
    '书': '📖', '花': '🌸', '宝石': '💎', '金币': '💰', '信': '💌'
  }
  return map[name] || '📦'
}

function typeLabel(type?: string): string {
  const m: Record<string, string> = {
    key: '🔑关键', consumable: '🧪消耗', equipment: '⚔装备', material: '🔧材料', quest: '📋任务'
  }
  return m[type || 'key'] || '道具'
}
</script>

<style scoped>
.inventory-panel {
  padding: 10px 14px; background: var(--bg-overlay);
  border-top: 1px solid var(--border-color); position: relative;
}
.panel-title {
  font-size: 12px; font-weight: 600; color: var(--text-secondary);
  margin-bottom: 6px; text-align: center; display: flex; align-items: center;
  justify-content: center; gap: 6px;
}
.item-count {
  font-size: 10px; background: var(--color-purple); color: #fff;
  padding: 0 5px; border-radius: 8px;
}
.item-grid { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.item-slot {
  width: 56px; height: 56px; background: var(--bg-card); border-radius: 6px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1px; cursor: pointer; position: relative; transition: transform 0.2s, border-color 0.3s;
}
.item-slot.consumable { border: 1px solid var(--color-green); }
.item-slot.equipment { border: 1px solid var(--color-orange); }
.item-slot.material { border: 1px solid var(--color-gray); }
.item-slot.quest { border: 1px solid var(--color-yellow); }
.item-slot.key { border: 1px solid var(--color-blue); }
.item-slot.new { transform: scale(1.1); border-color: var(--accent-pink); }
.item-slot:hover { transform: scale(1.15); z-index: 2; }
.item-icon { font-size: 20px; }
.item-label { font-size: 9px; color: var(--text-dim); max-width: 48px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-stack {
  position: absolute; top: 2px; right: 3px; font-size: 9px;
  background: rgba(0,0,0,0.7); color: #fff; padding: 0 3px; border-radius: 4px;
}
.empty-hint { font-size: 11px; color: var(--text-muted); padding: 8px; }

/* Tooltip */
.item-tooltip {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  background: var(--bg-card); border: 1px solid var(--border-color-light);
  border-radius: 8px; padding: 8px 12px; margin-bottom: 6px;
  min-width: 160px; z-index: 10; box-shadow: var(--shadow-card);
}
.tooltip-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.tooltip-icon { font-size: 16px; }
.tooltip-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.tooltip-type { font-size: 10px; color: var(--text-dim); margin-left: auto; }
.tooltip-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.5; }
.tooltip-count { font-size: 10px; color: var(--text-dim); margin-top: 2px; }
</style>
