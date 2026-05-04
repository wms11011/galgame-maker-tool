<template>
  <div v-if="visible" class="gallery-overlay" @click.self="close" @keydown="onKeydown">
    <!-- Fullscreen viewer -->
    <div v-if="viewingIndex >= 0" class="gallery-viewer">
      <img :src="images[viewingIndex].src" class="gallery-full-img" />
      <div class="gallery-viewer-info">
        <span>{{ images[viewingIndex].label }}</span>
      </div>
      <button class="gallery-nav gallery-prev" @click="prev">◂</button>
      <button class="gallery-nav gallery-next" @click="next">▸</button>
      <button v-if="images[viewingIndex]?.nodeId" class="gallery-replay-btn" @click="emit('replay', images[viewingIndex].nodeId!)">▶ 回放场景</button>
      <button class="gallery-close" @click="viewingIndex = -1">✕</button>
    </div>

    <!-- Thumbnail grid -->
    <div v-else class="gallery-dialog" @click.stop>
      <div class="gallery-header">
        <span class="gallery-title">CG 鉴赏 ({{ unlockedCount }}/{{ images.length }})</span>
        <button class="gallery-close-btn" @click="close">✕</button>
      </div>
      <div v-if="images.length === 0" class="gallery-empty">
        暂无 CG 图片。在流程图中添加 CG 节点并设置图片路径。
      </div>
      <div v-else class="gallery-grid">
        <div
          v-for="(img, idx) in images"
          :key="idx"
          class="gallery-thumb"
          :class="{ locked: !img.unlocked }"
          @click="img.unlocked && (viewingIndex = idx)"
        >
          <template v-if="img.unlocked">
            <img :src="img.src" class="gallery-thumb-img" />
          </template>
          <template v-else>
            <div class="gallery-locked-overlay">
              <span class="gallery-lock-icon">🔒</span>
              <span class="gallery-lock-text">???</span>
            </div>
          </template>
          <span class="gallery-thumb-label">{{ img.unlocked ? img.label : '???' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFlowStore } from '@renderer/stores/flowStore'
import { useAssetStore } from '@renderer/stores/assetStore'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: []; replay: [nodeId: string] }>()

const flowStore = useFlowStore()
const assetStore = useAssetStore()

const viewingIndex = ref(-1)

interface CgImage {
  src: string
  label: string
  unlocked: boolean
  nodeId?: string
}

const images = computed<CgImage[]>(() => {
  const result: CgImage[] = []
  const seen = new Set<string>()

  for (const n of flowStore.nodes) {
    if (n.type === 'cg') {
      const data = n.data as import('@renderer/types').CgNodeData
      if (data.src && !seen.has(data.src)) {
        seen.add(data.src)
        result.push({
          src: data.src, label: data.label || n.id,
          unlocked: flowStore.coveredNodeIds.has(n.id), nodeId: n.id
        })
      }
    }
  }

  // Collect image assets
  for (const a of assetStore.assets) {
    if (a.type === 'image' && a.relativePath && !seen.has(a.relativePath)) {
      seen.add(a.relativePath)
      result.push({ src: a.relativePath, label: a.name || a.relativePath, unlocked: true })
    }
  }

  return result
})

function close(): void {
  viewingIndex.value = -1
  emit('close')
}

function prev(): void {
  if (images.value.length === 0) return
  viewingIndex.value = (viewingIndex.value - 1 + images.value.length) % images.value.length
}

function next(): void {
  if (images.value.length === 0) return
  viewingIndex.value = (viewingIndex.value + 1) % images.value.length
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    if (viewingIndex.value >= 0) viewingIndex.value = -1
    else close()
  }
  if (viewingIndex.value >= 0) {
    if (e.key === 'ArrowLeft') prev()
    if (e.key === 'ArrowRight') next()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.gallery-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-dialog {
  width: 90vw;
  max-width: 960px;
  max-height: 90vh;
  background: var(--bg-overlay);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.gallery-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.gallery-close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.gallery-close-btn:hover { color: var(--text-primary); background: var(--bg-hover); }

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
  padding: 16px;
  overflow-y: auto;
}

.gallery-thumb {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
}
.gallery-thumb:hover {
  transform: translateY(-2px);
  border-color: var(--color-blue);
}

.gallery-thumb-img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  display: block;
}

.gallery-thumb-label {
  display: block;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-empty {
  text-align: center;
  padding: 48px 20px;
  color: var(--text-muted);
  font-size: var(--text-base);
}

/* Fullscreen viewer */
.gallery-viewer {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-full-img {
  max-width: 95vw;
  max-height: 90vh;
  object-fit: contain;
}

.gallery-viewer-info {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--text-secondary);
  font-size: 14px;
  background: rgba(0,0,0,0.7);
  padding: 6px 16px;
  border-radius: 16px;
}

.gallery-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.5);
  color: #fff;
  border: none;
  font-size: 28px;
  padding: 16px 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.gallery-nav:hover { background: rgba(0,0,0,0.75); }
.gallery-prev { left: 16px; border-radius: 6px; }
.gallery-next { right: 16px; border-radius: 6px; }

.gallery-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border: none;
  font-size: 20px;
  padding: 8px 14px;
  cursor: pointer;
  border-radius: 6px;
}
.gallery-close:hover { background: rgba(0,0,0,0.75); }
.gallery-replay-btn {
  position: absolute; top: 16px; left: 16px;
  background: rgba(139,92,246,0.7); color: #fff; border: none;
  font-size: 14px; padding: 8px 14px; cursor: pointer; border-radius: 6px;
}
.gallery-replay-btn:hover { background: rgba(139,92,246,0.9); }

.gallery-thumb.locked { cursor: not-allowed; opacity: 0.6; }
.gallery-thumb.locked:hover { transform: none; border-color: var(--border-color); }
.gallery-locked-overlay {
  width: 100%; aspect-ratio: 16/9;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: #1a1a2e; gap: 4px;
}
.gallery-lock-icon { font-size: 28px; }
.gallery-lock-text { font-size: 14px; color: var(--text-dim); }
</style>
