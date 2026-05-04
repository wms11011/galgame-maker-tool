<template>
  <div v-if="visible" class="favs-overlay" @click.self="close">
    <div class="favs-dialog" @click.stop>
      <div class="favs-header">
        <span class="favs-title">⭐ 收藏夹 ({{ favs.length }})</span>
        <button class="favs-close" @click="close">✕</button>
      </div>
      <div class="favs-body">
        <div v-if="favs.length === 0" class="favs-empty">暂无收藏。预览时按 <kbd>F</kbd> 键收藏当前画面</div>
        <div class="favs-grid">
          <div v-for="(fav, idx) in favs" :key="idx" class="fav-item" @click="viewIndex = idx">
            <img v-if="fav.dataUrl" :src="fav.dataUrl" class="fav-img" />
            <div class="fav-info">
              <span class="fav-label">{{ fav.label }}</span>
              <span class="fav-date">{{ fav.date }}</span>
            </div>
            <button class="fav-del" @click.stop="favs.splice(idx, 1)">✕</button>
          </div>
        </div>
      </div>
      <!-- 全屏查看 -->
      <div v-if="viewIndex >= 0" class="fav-viewer" @click="viewIndex = -1">
        <img v-if="favs[viewIndex]?.dataUrl" :src="favs[viewIndex].dataUrl" class="fav-full" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Favorite { dataUrl: string; label: string; date: string }
const favs = ref<Favorite[]>([])
const viewIndex = ref(-1)

function addFavorite(dataUrl: string, label: string): void {
  favs.value.unshift({ dataUrl, label, date: new Date().toLocaleString() })
}

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()
function close(): void { viewIndex.value = -1; emit('close') }

defineExpose({ addFavorite, favs })
</script>

<style scoped>
.favs-overlay { position: fixed; inset: 0; z-index: 5000; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; }
.favs-dialog { width: 700px; max-height: 85vh; background: var(--bg-overlay); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; }
.favs-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border-color); }
.favs-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.favs-close { background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; }
.favs-body { flex: 1; overflow-y: auto; padding: 12px; }
.favs-empty { text-align: center; padding: 40px; color: var(--text-muted); font-size: 13px; }
.favs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.fav-item { position: relative; background: var(--bg-card); border-radius: 6px; overflow: hidden; cursor: pointer; transition: transform .15s; }
.fav-item:hover { transform: translateY(-2px); }
.fav-img { width: 100%; aspect-ratio: 16/10; object-fit: cover; }
.fav-info { padding: 4px 8px; }
.fav-label { font-size: 11px; color: var(--text-primary); display: block; }
.fav-date { font-size: 10px; color: var(--text-dim); }
.fav-del { position: absolute; top: 3px; right: 3px; background: rgba(0,0,0,.7); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer; opacity: 0; }
.fav-item:hover .fav-del { opacity: 1; }
.fav-viewer { position: fixed; inset: 0; z-index: 6000; background: rgba(0,0,0,.95); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.fav-full { max-width: 95vw; max-height: 95vh; object-fit: contain; }
</style>
