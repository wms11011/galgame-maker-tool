<template>
  <div class="asset-manager">
    <div class="asset-toolbar">
      <span class="toolbar-label">导入：</span>
      <el-button size="small" @click="importByCategory('character')">👤 立绘</el-button>
      <el-button size="small" @click="importByCategory('avatar')">😊 头像</el-button>
      <el-button size="small" @click="importByCategory('background')">🖼 背景</el-button>
      <el-button size="small" @click="importByCategory('item')">📦 道具</el-button>
      <el-button size="small" @click="importByCategory('cg')">🎬 CG</el-button>
      <el-button size="small" @click="importByCategory('live2d')">🎭 Live2D</el-button>
      <el-button size="small" @click="importAssets('audio')">🎵 音频</el-button>
    </div>

    <!-- 分类筛选 -->
    <div class="category-filters">
      <span class="filter-label">筛选：</span>
      <el-button
        v-for="cat in categories"
        :key="cat.value"
        size="small"
        :type="activeCategory === cat.value ? 'primary' : 'default'"
        @click="activeCategory = activeCategory === cat.value ? '' : cat.value"
      >{{ cat.label }}</el-button>
    </div>
    <div class="category-hint">💡 先导入图片，再在每张图片下方选择分类。标记为「📦道具」的图片会自动出现在道具编辑器的贴图选择中。</div>

    <el-tabs v-model="activeTab" class="asset-tabs">
      <!-- 图片资源 -->
      <el-tab-pane label="图片" name="image">
        <div v-if="filteredImageAssets.length === 0" class="empty-tip">暂无图片资源</div>
        <div v-else class="asset-grid">
          <div
            v-for="asset in filteredImageAssets"
            :key="asset.relativePath"
            class="asset-item"
          >
            <div class="asset-thumb">
              <img v-if="asset.thumbnail" :src="asset.thumbnail" class="thumb-img" />
              <el-icon v-else class="thumb-placeholder"><Picture /></el-icon>
              <span class="category-badge" v-if="asset.category">{{ catLabel(asset.category) }}</span>
            </div>
            <div class="asset-name" :title="asset.name" @dblclick.stop="startRename(asset)">
              <template v-if="renamingAsset === asset.relativePath">
                <input
                  class="rename-input"
                  v-model="renameValue"
                  @blur="doRename(asset.relativePath)"
                  @keydown.enter="doRename(asset.relativePath)"
                  @keydown.escape="renamingAsset = ''"
                  @click.stop
                  ref="renameInputRef"
                />
              </template>
              <template v-else>{{ asset.name }}</template>
            </div>
            <div class="asset-cat-tag" v-if="asset.category">{{ catLabel(asset.category) }}</div>
            <button class="asset-delete-btn" @click.stop="onDelete(asset)" title="删除">✕</button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 音频资源 -->
      <el-tab-pane label="音频" name="audio">
        <div v-if="audioAssets.length === 0" class="empty-tip">暂无音频资源</div>
        <div v-else class="asset-list">
          <div v-for="asset in audioAssets" :key="asset.relativePath" class="audio-item">
            <el-icon class="audio-icon"><Headset /></el-icon>
            <span class="audio-name" :title="asset.name" @dblclick.stop="startRename(asset)">
              <template v-if="renamingAsset === asset.relativePath">
                <input class="rename-input" v-model="renameValue" @blur="doRename(asset.relativePath)" @keydown.enter="doRename(asset.relativePath)" @keydown.escape="renamingAsset = ''" @click.stop />
              </template>
              <template v-else>{{ asset.name }}</template>
            </span>
            <span class="asset-size">{{ formatSize(asset.size) }}</span>
            <button class="audio-delete-btn" @click.stop="onDelete(asset)" title="删除">✕</button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Picture, Headset } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAssetStore } from '../stores/assetStore'
import type { AssetCategory } from '../types/index'

const assetStore = useAssetStore()
const activeTab = ref<'image' | 'audio'>('image')
const activeCategory = ref('')
const renamingAsset = ref('')
const renameValue = ref('')

const renameInputRef = ref<HTMLInputElement | null>(null)

function startRename(asset: { relativePath: string; name: string }) {
  renamingAsset.value = asset.relativePath
  const base = asset.name.replace(/\.[^.]+$/, '')
  renameValue.value = base
  setTimeout(() => {
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  }, 50)
}

async function doRename(oldPath: string) {
  if (!renameValue.value.trim() || renameValue.value === oldPath.replace(/\.[^.]+$/, '')) {
    renamingAsset.value = ''
    return
  }
  const ok = await assetStore.renameAsset(oldPath, renameValue.value.trim())
  if (ok) {
    ElMessage.success('重命名成功')
  } else {
    ElMessage.error('重命名失败')
  }
  renamingAsset.value = ''
}

const categories = [
  { value: 'character', label: '👤 立绘' },
  { value: 'avatar', label: '😊 头像' },
  { value: 'background', label: '🖼 背景' },
  { value: 'item', label: '📦 道具' },
  { value: 'cg', label: '🎬 CG' },
  { value: 'live2d', label: '🎭 Live2D' },
  { value: 'other', label: '📁 其他' },
] as const

const imageAssets = computed(() => assetStore.assets.filter(a => a.type === 'image'))
const audioAssets = computed(() => assetStore.assets.filter(a => a.type === 'audio'))

const filteredImageAssets = computed(() => {
  if (!activeCategory.value) return imageAssets.value
  return imageAssets.value.filter(a => a.category === activeCategory.value)
})

function catLabel(cat: string): string {
  const m: Record<string, string> = { character: '立绘', avatar: '头像', background: '背景', item: '道具', cg: 'CG', live2d: 'Live2D', other: '其他' }
  return m[cat] || cat
}

function formatSize(bytes: number): string {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return bytes + ' B'
}

async function importByCategory(category: string) { await assetStore.importAssets('image', category) }
async function importAssets(type: 'audio') { await assetStore.importAssets(type) }
async function onDelete(asset: { relativePath: string; name: string }) {
  try {
    await ElMessageBox.confirm(
      `确定要删除资源「${asset.name}」吗？此操作不可恢复。`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }
  await assetStore.deleteAsset(asset.relativePath)
}
</script>

<style scoped>
.asset-manager { display: flex; flex-direction: column; height: 100%; background: var(--bg-panel); }
.asset-toolbar { display: flex; gap: 4px; padding: 6px 10px; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; align-items: center; }
.toolbar-label { font-size: 11px; color: var(--text-dim); margin-right: 2px; flex-shrink: 0; }
.category-filters { display: flex; gap: 4px; padding: 6px 10px; flex-wrap: wrap; border-bottom: 1px solid var(--border-color); align-items: center; }
.filter-label { font-size: 11px; color: var(--text-dim); margin-right: 2px; }
.category-hint { font-size: 10px; color: var(--text-dim); padding: 4px 10px; border-bottom: 1px solid var(--border-color); line-height: 1.5; }
.asset-tabs { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.empty-tip { text-align: center; padding: 24px; color: var(--text-muted); font-size: 12px; }
.asset-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 8px; overflow-y: auto; }
.asset-item { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; position: relative; }
.asset-thumb { position: relative; aspect-ratio: 16/10; background: #1a1a2e; display: flex; align-items: center; justify-content: center; }
.thumb-img { width: 100%; height: 100%; object-fit: cover; }
.thumb-placeholder { font-size: 28px; color: var(--text-dim); }
.category-badge { position: absolute; top: 3px; right: 3px; font-size: 9px; background: rgba(0,0,0,.7); color: #fff; padding: 1px 4px; border-radius: 3px; }
.asset-cat-tag { padding: 0 8px 4px; font-size: 9px; color: var(--text-dim); text-align: center; }
.asset-delete-btn { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border: none; border-radius: 50%; background: rgba(239,68,68,.8); color: #fff; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity .15s; z-index: 2; }
.asset-item:hover .asset-delete-btn { opacity: 1; pointer-events: auto; }
.asset-name { padding: 4px 8px 0; font-size: 11px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: default; }
.rename-input { width: 100%; padding: 2px 4px; font-size: 11px; border: 1px solid var(--accent-pink); border-radius: 3px; background: var(--bg-card); color: var(--text-primary); outline: none; }
.asset-cat-select { width: 100%; padding: 2px 6px 6px; }
.asset-list { padding: 6px; overflow-y: auto; }
.audio-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 4px; position: relative; }
.audio-item:hover { background: var(--bg-hover); }
.audio-icon { font-size: 20px; color: var(--text-dim); flex-shrink: 0; }
.audio-name { flex: 1; font-size: 11px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.audio-delete-btn { width: 18px; height: 18px; border: none; border-radius: 50%; background: rgba(239,68,68,.7); color: #fff; font-size: 10px; cursor: pointer; flex-shrink: 0; opacity: 0; transition: opacity .15s; }
.audio-item:hover .audio-delete-btn { opacity: 1; }
.asset-size { font-size: 10px; color: var(--text-dim); flex-shrink: 0; }
</style>
