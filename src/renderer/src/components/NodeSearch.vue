<template>
  <div v-if="visible" class="search-overlay" @click="close">
    <div class="search-dialog" @click.stop>
      <div class="search-input-wrap">
        <el-icon class="search-icon"><Search /></el-icon>
        <input
          ref="inputRef"
          v-model="query"
          class="search-input"
          placeholder="搜索节点..."
          @keydown="onKeydown"
        />
        <span class="search-hint">ESC 关闭</span>
      </div>
      <div class="search-results" v-if="results.length > 0">
        <div
          v-for="(item, idx) in results"
          :key="item.node.id"
          class="search-item"
          :class="{ active: idx === activeIdx }"
          @click="select(item.node)"
          @mouseenter="activeIdx = idx"
        >
          <span class="search-item-icon">{{ getIcon(item.node.type) }}</span>
          <span class="search-item-label">{{ item.node.data?.label || item.node.id }}</span>
          <span class="search-item-type">{{ typeName(item.node.type) }}</span>
          <span v-if="item.node.id === flowStore.selectedNodeId" class="search-item-current">当前</span>
        </div>
      </div>
      <div v-else-if="query" class="search-empty">无匹配结果</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useFlowStore } from '@renderer/stores/flowStore'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const flowStore = useFlowStore()
const query = ref('')
const activeIdx = ref(0)
const inputRef = ref<HTMLInputElement>()

interface SearchResult {
  node: ReturnType<typeof flowStore.nodes.value[number]>
  score: number
}

const results = computed<SearchResult[]>(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return flowStore.nodes.slice(0, 20).map(n => ({ node: n, score: 0 }))
  const scored = flowStore.nodes.map(n => {
    const label = String(n.data?.label ?? '').toLowerCase()
    const id = n.id.toLowerCase()
    const type = n.type.toLowerCase()
    let score = 0
    if (label === q) score += 100
    else if (label.startsWith(q)) score += 50
    else if (label.includes(q)) score += 20
    if (id === q) score += 80
    else if (id.includes(q)) score += 15
    if (type === q) score += 40
    else if (type.includes(q)) score += 10
    return { node: n, score }
  })
  return scored
    .filter(r => r.score > 0 || !q)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
})

watch(() => props.visible, async (v) => {
  if (v) {
    query.value = ''
    activeIdx.value = 0
    await nextTick()
    inputRef.value?.focus()
  }
})

function close(): void {
  emit('close')
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') { close(); return }
  if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx.value = Math.min(activeIdx.value + 1, results.value.length - 1); return }
  if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx.value = Math.max(activeIdx.value - 1, 0); return }
  if (e.key === 'Enter') {
    e.preventDefault()
    const r = results.value[activeIdx.value]
    if (r) select(r.node)
  }
}

function select(node: { id: string }): void {
  flowStore.selectedNodeId = node.id
  // Focus event is handled by FlowEditor's watcher
  close()
}

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    dialog: '💬', choice: '🔀', condition: '⚡', setVariable: '📊',
    goto: '⏭️', end: '🏁', audio: '🎵', cg: '🖼️',
    wait: '⏳', random: '🎲', label: '🏷️', animation: '🎬', savePoint: '💾',
    timer: '⏱️', moveCharacter: '🚶', steamAchievement: '🏆', achievement: '🏅',
    particle: '🌸', live2d: '🎭', item: '📦'
  }
  return icons[type] ?? '○'
}

function typeName(type: string): string {
  const names: Record<string, string> = {
    dialog: '对话', choice: '选择', condition: '条件', setVariable: '变量',
    goto: '跳转', end: '结束', audio: '音频', cg: 'CG',
    wait: '延时', random: '随机', label: '标签', animation: '动画', savePoint: '存档',
    timer: '计时器', moveCharacter: '移动', steamAchievement: '成就', achievement: '成就解锁',
    particle: '粒子特效', live2d: 'Live2D立绘', item: '道具操作'
  }
  return names[type] ?? type
}
</script>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
}

.search-dialog {
  width: 480px;
  max-height: 50vh;
  background: var(--bg-overlay);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.search-icon {
  color: var(--text-muted);
  font-size: 18px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 16px;
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-hint {
  font-size: 11px;
  color: var(--text-dim);
  flex-shrink: 0;
}

.search-results {
  overflow-y: auto;
  max-height: 320px;
  padding: 4px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.search-item:hover,
.search-item.active {
  background: var(--bg-hover);
}

.search-item-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.search-item-label {
  flex: 1;
  color: var(--text-primary);
  font-size: var(--text-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-item-type {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-item-current {
  font-size: 10px;
  color: var(--color-blue);
  background: rgba(59, 130, 246, 0.15);
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.search-empty {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
