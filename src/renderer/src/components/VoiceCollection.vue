<template>
  <div v-if="visible" class="voice-overlay" @click.self="close">
    <div class="voice-dialog" @click.stop>
      <div class="voice-header">
        <span class="voice-title">🎙 语音收藏</span>
        <button class="voice-close" @click="close">✕</button>
      </div>
      <div class="voice-body">
        <div v-if="tracks.length === 0" class="voice-empty">暂无语音资源。在素材管理中添加音频文件。</div>
        <div v-for="track in tracks" :key="track.path" class="voice-item" :class="{ playing: currentTrack === track.path }" @click="togglePlay(track)">
          <span class="voice-icon">{{ currentTrack === track.path ? '⏸' : '▶' }}</span>
          <div class="voice-info">
            <div class="voice-name">{{ track.name }}</div>
            <div class="voice-char">{{ track.charName || '旁白' }}</div>
          </div>
          <span v-if="track.favorite" class="voice-fav">⭐</span>
          <span v-else class="voice-fav-empty" @click.stop="track.favorite = true">☆</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useAssetStore } from '../stores/assetStore'
import { useProjectStore } from '../stores/projectStore'
import { getAssetUrl } from '../utils/assetUrl'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const assetStore = useAssetStore()
const projectStore = useProjectStore()
const currentTrack = ref<string | null>(null)
let audio: HTMLAudioElement | null = null

interface VoiceTrack { name: string; path: string; charName?: string; favorite: boolean }

const tracks = computed<VoiceTrack[]>(() =>
  assetStore.assets.filter(a => a.type === 'audio').map(a => {
    const name = a.name || a.relativePath
    const charMatch = name.match(/^([^_-]+)[_-]/)
    return { name, path: a.relativePath, charName: charMatch?.[1], favorite: false }
  })
)

function togglePlay(track: VoiceTrack): void {
  if (currentTrack.value === track.path) { audio?.pause(); audio = null; currentTrack.value = null; return }
  audio?.pause()
  const pp = projectStore.meta?.projectPath
  if (!pp) return
  audio = new Audio(getAssetUrl(pp, track.path))
  audio.volume = 0.7
  audio.play().catch(() => {})
  audio.onended = () => { currentTrack.value = null }
  currentTrack.value = track.path
}

function close(): void { audio?.pause(); audio = null; currentTrack.value = null; emit('close') }
onUnmounted(() => { audio?.pause(); audio = null })
</script>

<style scoped>
.voice-overlay { position: fixed; inset: 0; z-index: 5000; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; }
.voice-dialog { width: 480px; max-height: 75vh; background: var(--bg-overlay); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; }
.voice-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border-color); }
.voice-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.voice-close { background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; }
.voice-body { flex: 1; overflow-y: auto; padding: 8px; }
.voice-empty { text-align: center; padding: 32px; color: var(--text-muted); }
.voice-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background .15s; }
.voice-item:hover { background: var(--bg-hover); }
.voice-item.playing { background: rgba(139,92,246,0.15); }
.voice-icon { font-size: 16px; width: 24px; text-align: center; }
.voice-info { flex: 1; }
.voice-name { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.voice-char { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
.voice-fav { font-size: 14px; cursor: pointer; }
.voice-fav-empty { font-size: 14px; cursor: pointer; color: var(--text-dim); }
</style>
