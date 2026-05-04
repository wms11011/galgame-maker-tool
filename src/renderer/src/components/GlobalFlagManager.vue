<template>
  <div class="flag-manager">
    <div class="panel-header">
      <span class="panel-title">全局标记</span>
      <el-button size="small" type="primary" text @click="showAddDialog = true">+ 添加</el-button>
    </div>
    <div class="panel-body">
      <div v-if="flags.length === 0" class="empty-state">
        <p>暂无全局标记</p>
        <p class="hint">全局标记在周目间持久保留，可用于解锁新剧情线</p>
      </div>
      <div v-for="[name, value] in flags" :key="name" class="flag-card">
        <div class="flag-item-main">
          <span class="flag-item-icon">🏴</span>
          <div class="flag-item-info">
            <span class="flag-item-name">{{ getAlias(name) || name }}</span>
            <span class="flag-item-key">{{ name }}</span>
          </div>
          <el-switch
            :model-value="value"
            size="small"
            @change="(val: boolean) => toggleFlag(name, val)"
          />
        </div>
        <div class="flag-item-actions">
          <el-button size="small" text @click="onEditAlias(name)">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button size="small" text @click="removeFlag(name)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 添加标记弹窗 -->
    <el-dialog v-model="showAddDialog" title="添加全局标记" width="400px" :close-on-click-modal="false">
      <el-form :model="newFlag" label-position="top" size="small">
        <el-form-item label="英文标记名 *" :error="keyError">
          <el-input
            v-model="newFlag.name"
            placeholder="只能使用英文字母和数字，如：seen_ending_1"
            @input="validateKey"
          />
        </el-form-item>
        <el-form-item label="中文别名">
          <el-input
            v-model="newFlag.alias"
            placeholder="如：看过结局1"
          />
        </el-form-item>
        <el-form-item label="初始值">
          <el-switch v-model="newFlag.value" size="small" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showAddDialog = false">取消</el-button>
        <el-button size="small" type="primary" :disabled="!isKeyValid" @click="addFlag">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑别名弹窗 -->
    <el-dialog v-model="showAliasDialog" title="编辑别名" width="360px" :close-on-click-modal="false">
      <el-form label-position="top" size="small">
        <el-form-item label="标记名">
          <el-input :model-value="editingKey" disabled />
        </el-form-item>
        <el-form-item label="中文别名">
          <el-input v-model="editingAlias" placeholder="留空则显示标记名" @keyup.enter="saveAlias" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showAliasDialog = false">取消</el-button>
        <el-button size="small" type="primary" @click="saveAlias">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'
import { useVariableStore } from '../stores/variableStore'
import { ElMessage, ElMessageBox } from 'element-plus'

const variableStore = useVariableStore()

const showAddDialog = ref(false)
const showAliasDialog = ref(false)
const newFlag = reactive({ name: '', alias: '', value: false })
const editingKey = ref('')
const editingAlias = ref('')

const keyError = ref('')
const isKeyValid = ref(false)

const flags = computed(() => Object.entries(variableStore.globalFlags))

function getAlias(name: string): string {
  return variableStore.flagAliases[name] || ''
}

function validateKey(): void {
  const name = newFlag.name.trim()
  if (!name) {
    keyError.value = ''
    isKeyValid.value = false
    return
  }
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    keyError.value = '只能使用英文字母、数字和下划线'
    isKeyValid.value = false
    return
  }
  if (name in variableStore.globalFlags) {
    keyError.value = '标记名已存在'
    isKeyValid.value = false
    return
  }
  keyError.value = ''
  isKeyValid.value = true
}

function addFlag(): void {
  const name = newFlag.name.trim()
  const alias = newFlag.alias.trim()
  if (!name || !isKeyValid.value) {
    ElMessage.warning('请输入合法的英文标记名')
    return
  }
  variableStore.setGlobalFlag(name, newFlag.value)
  if (alias) {
    variableStore.setFlagAlias(name, alias)
  }
  newFlag.name = ''
  newFlag.alias = ''
  newFlag.value = false
  keyError.value = ''
  isKeyValid.value = false
  showAddDialog.value = false
  ElMessage.success('标记已添加')
}

function onEditAlias(name: string): void {
  editingKey.value = name
  editingAlias.value = variableStore.flagAliases[name] || ''
  showAliasDialog.value = true
}

function saveAlias(): void {
  const alias = editingAlias.value.trim()
  if (alias) {
    variableStore.setFlagAlias(editingKey.value, alias)
  } else {
    variableStore.removeFlagAlias(editingKey.value)
  }
  showAliasDialog.value = false
}

async function removeFlag(name: string): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定要删除标记「${name}」吗？`, '确认删除', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
  } catch { return }
  delete variableStore.globalFlags[name]
  variableStore.removeFlagAlias(name)
  ElMessage.success('标记已删除')
}

function toggleFlag(name: string, value: boolean): void {
  variableStore.setGlobalFlag(name, value)
}
</script>

<style scoped>
.flag-manager {
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
  gap: 6px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
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
  color: var(--text-dim);
}

.flag-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.flag-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flag-item-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.flag-item-info {
  flex: 1;
  min-width: 0;
}

.flag-item-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.flag-item-key {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  font-family: monospace;
  margin-top: 1px;
}

.flag-item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.flag-card:hover .flag-item-actions {
  opacity: 1;
}
</style>
