<template>
  <div v-if="visible" class="sprite-overlay" @click.self="close">
    <div class="sprite-dialog" @click.stop>
      <div class="sprite-header">
        <span class="sprite-title">🎭 立绘鉴赏</span>
        <select v-model="selectedChar" class="sprite-select">
          <option v-for="c in characters" :key="c.name" :value="c.name">{{ c.name }}</option>
        </select>
        <button class="sprite-close" @click="close">✕</button>
      </div>
      <div class="sprite-body">
        <template v-if="currentChar">
          <div class="sprite-main">
            <img v-if="currentCharSpriteUrl" :src="currentCharSpriteUrl" class="sprite-img" />
            <div v-else class="sprite-null">暂无立绘</div>
          </div>
          <div class="sprite-sidebar">
            <div class="char-info-section">
              <div class="char-name">{{ currentChar.name }}</div>
              <div v-if="currentChar.personality" class="char-tag">{{ currentChar.personality }}</div>
              <div v-if="currentChar.bio" class="char-bio">{{ currentChar.bio }}</div>
              <div v-if="currentChar.live2dModel" class="char-live2d">🎭 Live2D: {{ currentChar.live2dModel }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCharacterStore } from '../stores/characterStore'
import { useProjectStore } from '../stores/projectStore'
import { getAssetUrl } from '../utils/assetUrl'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const characterStore = useCharacterStore()
const projectStore = useProjectStore()
const selectedChar = ref('')
const characters = computed(() => characterStore.characters)
const currentChar = computed(() => characters.value.find(c => c.name === selectedChar.value))
const currentCharSpriteUrl = computed(() => {
  if (!currentChar.value?.sprite || !projectStore.meta?.projectPath) return ''
  return getAssetUrl(projectStore.meta.projectPath, currentChar.value.sprite)
})
function close(): void { selectedChar.value = ''; emit('close') }
</script>

<style scoped>
.sprite-overlay { position: fixed; inset: 0; z-index: 5000; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; }
.sprite-dialog { width: 700px; max-height: 85vh; background: var(--bg-overlay); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; }
.sprite-header { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border-color); }
.sprite-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.sprite-select { flex: 1; padding: 4px 8px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; }
.sprite-close { background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; }
.sprite-body { display: flex; flex: 1; overflow: hidden; }
.sprite-main { flex: 1; display: flex; align-items: center; justify-content: center; background: #1a1a2e; min-height: 400px; }
.sprite-img { max-width: 100%; max-height: 100%; object-fit: contain; }
.sprite-null { color: var(--text-dim); font-size: 16px; }
.sprite-sidebar { width: 200px; padding: 14px; border-left: 1px solid var(--border-color); overflow-y: auto; }
.char-name { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.char-tag { display: inline-block; padding: 2px 8px; background: var(--color-purple); color: #fff; border-radius: 4px; font-size: 11px; margin-bottom: 8px; }
.char-bio { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.char-live2d { font-size: 11px; color: var(--color-pink); margin-top: 8px; }
</style>
