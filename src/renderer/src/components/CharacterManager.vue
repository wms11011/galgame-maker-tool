<template>
  <div class="character-manager">
    <div class="panel-header">
      <span class="panel-title">角色管理</span>
      <el-button size="small" type="primary" text @click="openAdd">+ 添加</el-button>
    </div>
    <div class="panel-body">
      <div v-if="characterStore.characters.length === 0" class="empty-state">
        <p>暂无角色，点击"+ 添加"创建</p>
        <p class="hint">预定义角色后可在对话节点中直接选择</p>
      </div>
      <div v-for="c in characterStore.characters" :key="c.name" class="char-card">
        <div class="char-avatar">
          <span v-if="c.live2dModel" class="live2d-badge-char" title="Live2D 动态立绘">🎭</span>
          <img v-if="c.avatar" :src="getSpriteUrl(c.avatar)" class="char-img char-avatar-img" />
          <img v-else-if="c.sprite" :src="getSpriteUrl(c.sprite)" class="char-img" />
          <span v-else class="char-placeholder">👤</span>
        </div>
        <div class="char-info">
          <span class="char-name">{{ c.name }}</span>
          <span v-if="c.personality" class="char-personality">{{ c.personality }}</span>
          <span v-if="c.bio" class="char-bio">{{ c.bio }}</span>
        </div>
        <div class="char-actions">
          <el-button size="small" text @click="openEdit(c)">编辑</el-button>
          <el-button size="small" type="danger" text @click="removeChar(c.name)">删除</el-button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="showDialog" :title="isEdit ? '编辑角色' : '添加角色'" width="420px" :close-on-click-modal="false">
      <el-form :model="form" label-position="top" size="small">
        <el-form-item label="角色名">
          <el-input v-model="form.name" placeholder="如：小花、小李" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="性格">
          <el-input v-model="form.personality" placeholder="如：温柔、活泼、傲娇" />
        </el-form-item>
        <el-form-item label="人设描述">
          <el-input v-model="form.bio" type="textarea" :rows="3" placeholder="角色背景介绍" />
        </el-form-item>
        <el-form-item label="头像">
          <el-select v-model="form.avatar" placeholder="选择头像图片" clearable>
            <el-option v-for="asset in avatarAssets" :key="asset.relativePath" :label="asset.name" :value="asset.relativePath" />
          </el-select>
          <div class="form-hint">用于角色列表和对话字幕中的小头像。建议使用方形小图。</div>
        </el-form-item>
        <el-form-item label="立绘 (静态)">
          <el-select v-model="form.sprite" placeholder="选择 PNG/JPG 立绘" clearable>
            <el-option v-for="asset in spriteAssets" :key="asset.relativePath" :label="asset.name" :value="asset.relativePath" />
          </el-select>
        </el-form-item>
        <el-form-item label="Live2D 模型">
          <el-select v-model="form.live2dModel" placeholder="选择 .moc3 或 .model3.json" clearable>
            <el-option v-for="asset in live2dAssets" :key="asset.relativePath" :label="asset.name" :value="asset.relativePath" />
          </el-select>
          <div class="form-hint">支持 .model3.json / .moc3 文件。预览时自动启用动态立绘</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showDialog = false">取消</el-button>
        <el-button size="small" type="primary" @click="saveChar">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useCharacterStore } from '../stores/characterStore'
import { useAssetStore } from '../stores/assetStore'
import { useProjectStore } from '../stores/projectStore'
import { getAssetUrl } from '../utils/assetUrl'
import { ElMessage, ElMessageBox } from 'element-plus'

const characterStore = useCharacterStore()
const assetStore = useAssetStore()
const projectStore = useProjectStore()

const showDialog = ref(false)
const isEdit = ref(false)
const editingName = ref('')

const spriteAssets = computed(() => assetStore.assets.filter(a => a.type === 'image' && a.category === 'character'))
const avatarAssets = computed(() => assetStore.assets.filter(a => a.type === 'image' && a.category === 'avatar'))
const live2dAssets = computed(() => assetStore.assets.filter(a => a.type === 'image' && a.category === 'live2d'))

const form = reactive({
  name: '', personality: '', bio: '', sprite: '', live2dModel: '', avatar: ''
})

function getSpriteUrl(relativePath: string): string {
  const projectPath = projectStore.meta?.projectPath
  if (!projectPath) return ''
  if (relativePath.startsWith('file://')) return relativePath
  return getAssetUrl(projectPath, relativePath)
}

function openAdd(): void {
  isEdit.value = false
  form.name = ''; form.personality = ''; form.bio = ''; form.sprite = ''; form.live2dModel = ''; form.avatar = ''
  showDialog.value = true
}

function openEdit(c: { name: string; personality: string; bio: string; sprite: string; live2dModel?: string; avatar?: string }): void {
  isEdit.value = true
  editingName.value = c.name
  form.name = c.name
  form.personality = c.personality || ''
  form.bio = c.bio || ''
  form.sprite = c.sprite || ''
  form.live2dModel = c.live2dModel || ''
  form.avatar = c.avatar || ''
  showDialog.value = true
}

function saveChar(): void {
  const name = form.name.trim()
  if (!name) { ElMessage.warning('请输入角色名'); return }
  if (isEdit.value) {
    characterStore.updateCharacter(editingName.value, {
      name, personality: form.personality, bio: form.bio, sprite: form.sprite, live2dModel: form.live2dModel, avatar: form.avatar
    })
    ElMessage.success('角色已更新')
  } else {
    if (characterStore.characters.some(c => c.name === name)) {
      ElMessage.warning('角色名已存在')
      return
    }
    characterStore.addCharacter({
      name, personality: form.personality, bio: form.bio, sprite: form.sprite, live2dModel: form.live2dModel, avatar: form.avatar
    })
    ElMessage.success('角色已添加')
  }
  showDialog.value = false
}

function removeChar(name: string): void {
  ElMessageBox.confirm(`确定要删除角色「${name}」吗？`, '确认删除', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }).then(() => {
    characterStore.removeCharacter(name)
    ElMessage.success('角色已删除')
  }).catch(() => {})
}
</script>

<style scoped>
.character-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-panel);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-dim);
  padding: var(--space-xl);
  text-align: center;
}

.empty-state p {
  font-size: var(--text-base);
  line-height: 1.5;
}

.hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.char-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.char-card:hover {
  border-color: var(--accent-pink);
  box-shadow: var(--shadow-sm);
}

.char-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.char-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.char-placeholder {
  font-size: 22px;
}
.char-avatar-img {
  border-radius: 50%;
}
.form-hint {
  font-size: 10px; color: var(--text-dim); margin-top: 2px;
}

.char-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.char-name {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.char-personality {
  font-size: var(--text-xs);
  color: var(--color-purple);
}

.char-bio {
  font-size: var(--text-xs);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.char-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}
</style>
