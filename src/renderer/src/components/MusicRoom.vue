<template>
  <div v-if="visible" class="music-overlay" @click.self="close">
    <div class="music-dialog" @click.stop>
      <div class="music-header">
        <span class="music-title">🎵 音乐鉴赏 ({{ tracks.length }})</span>
        <button class="music-close-btn" @click="close">✕</button>
      </div>
      <div v-if="tracks.length === 0" class="music-empty">
        暂无 BGM。在素材管理中添加音频文件。
      </div>
      <div v-else class="music-list">
        <div
          v-for="track in tracks"
          :key="track.name"
          class="music-item"
          :class="{ playing: currentTrack === track.name, locked: !track.unlocked }"
          @click="track.unlocked && togglePlay(track)"
        >
          <div class="music-item-icon">
            <span v-if="!track.unlocked">🔒</span>
            <span v-else-if="currentTrack === track.name">⏸</span>
            <span v-else>▶</span>
          </div>
          <div class="music-item-info">
            <div class="music-item-name">{{ track.unlocked ? track.name : '???' }}</div>
            <div class="music-item-meta">{{ track.unlocked ? track.type : '未解锁' }}</div>
          </div>
          <div v-if="track.unlocked" class="music-item-listen">
            <span>🔊</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useAssetStore } from '@renderer/stores/assetStore'
import { useFlowStore } from '@renderer/stores/flowStore'
import { useProjectStore } from '@renderer/stores/projectStore'
import { getAssetUrl } from '@renderer/utils/assetUrl'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const assetStore = useAssetStore()
const flowStore = useFlowStore()
const projectStore = useProjectStore()

const currentTrack = ref<string | null>(null)
let audio: HTMLAudioElement | null = null

interface MusicTrack {
  name: string
  type: string
  unlocked: boolean
  relativePath: string
}

const tracks = computed<MusicTrack[]>(() =>
  assetStore.assets
    .filter(a => a.type === 'audio')
    .map(a => ({
      name: a.name || a.relativePath,
      type: 'BGM',
      relativePath: a.relativePath,
      unlocked: flowStore.coveredNodeIds.size > 0 || true // editor mode: all unlocked
    }))
)

function togglePlay(track: MusicTrack): void {
  if (currentTrack.value === track.name) {
    audio?.pause()
    audio = null
    currentTrack.value = null
    return
  }
  audio?.pause()
  const projectPath = projectStore.meta?.projectPath
  if (!projectPath) return
  const url = getAssetUrl(projectPath, track.relativePath)
  audio = new Audio(url)
  audio.volume = 0.6
  audio.play().catch(() => {})
  audio.onended = () => { currentTrack.value = null }
  currentTrack.value = track.name
}

function close(): void {
  audio?.pause()
  audio = null
  currentTrack.value = null
  emit('close')
}

onUnmounted(() => { audio?.pause(); audio = null })
</script>

<style scoped>
.music-overlay {
  position: fixed; inset: 0; z-index: 5000;
  background: rgba(0,0,0,0.9);
  display: flex; align-items: center; justify-content: center;
}
.music-dialog {
  width: 480px; max-height: 80vh;
  background: var(--bg-overlay);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden; display: flex; flex-direction: column;
}
.music-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border-color);
}
.music-title { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.music-close-btn {
  background: none; border: none; color: var(--text-muted);
  font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 4px;
}
.music-close-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
.music-list { padding: 8px; overflow-y: auto; max-height: 60vh; }
.music-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 8px; cursor: pointer;
  transition: background 0.15s;
}
.music-item:hover:not(.locked) { background: var(--bg-hover); }
.music-item.playing { background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3); }
.music-item.locked { opacity: 0.5; cursor: not-allowed; }
.music-item-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border-radius: 50%; font-size: 14px; }
.music-item-info { flex: 1; min-width: 0; }
.music-item-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.music-item-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.music-item-listen { font-size: 14px; color: var(--text-dim); }
.music-empty { text-align: center; padding: 48px 20px; color: var(--text-muted); }
</style>
