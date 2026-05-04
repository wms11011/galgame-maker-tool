<template>
  <div v-if="visible" class="backlog-overlay" @click.self="close">
    <div class="backlog-dialog">
      <div class="backlog-header">
        <span class="backlog-title">📜 对话回看 ({{ entries.length }})</span>
        <button class="backlog-close" @click="close">✕</button>
      </div>
      <div class="backlog-body" ref="bodyRef">
        <div v-if="entries.length === 0" class="backlog-empty">暂无对话记录</div>
        <div v-for="(entry, idx) in entries" :key="idx" class="backlog-entry" @click="rollbackTo(idx)">
          <div class="entry-header">
            <span class="entry-char">{{ entry.character || '旁白' }}</span>
            <span class="entry-idx">#{{ entries.length - idx }}</span>
          </div>
          <div class="entry-text">{{ entry.text }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

interface DialogueEntry { character: string; text: string; nodeId: string }

const props = defineProps<{ visible: boolean; entries: DialogueEntry[] }>()
const emit = defineEmits<{ close: []; rollback: [idx: number] }>()

const bodyRef = ref<HTMLElement | null>(null)

watch(() => props.visible, async (v) => {
  if (v && bodyRef.value) {
    await nextTick()
    bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  }
})

function rollbackTo(idx: number): void {
  emit('rollback', idx)
}

function close(): void { emit('close') }
</script>

<style scoped>
.backlog-overlay { position: fixed; inset: 0; z-index: 5000; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; }
.backlog-dialog { width: 600px; max-height: 80vh; background: var(--bg-overlay); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; }
.backlog-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border-color); }
.backlog-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.backlog-close { background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; }
.backlog-body { flex: 1; overflow-y: auto; padding: 12px; }
.backlog-empty { text-align: center; padding: 32px; color: var(--text-muted); }
.backlog-entry { padding: 10px 12px; border-radius: 6px; cursor: pointer; margin-bottom: 6px; transition: background .15s; }
.backlog-entry:hover { background: var(--bg-hover); }
.entry-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.entry-char { font-size: 13px; font-weight: 600; color: var(--color-yellow); }
.entry-idx { font-size: 10px; color: var(--text-dim); }
.entry-text { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
</style>
