<template>
  <div class="glossary-panel">
    <div class="panel-header">
      <span class="panel-title">📖 用语词典</span>
      <el-button size="small" text @click="onAdd"><el-icon><Plus /></el-icon></el-button>
    </div>
    <div class="panel-body">
      <div v-if="store.terms.length === 0" class="empty-hint">暂无术语，点击 + 创建</div>
      <div v-for="term in store.terms" :key="term.term" class="term-item" @click="editTerm = { ...term }; editingOldTerm = term.term">
        <span class="term-word">{{ term.term }}</span>
        <span class="term-cat">{{ term.category }}</span>
        <span class="term-desc-preview">{{ term.definition?.slice(0, 30) }}{{ (term.definition?.length || 0) > 30 ? '...' : '' }}</span>
        <el-button size="small" text class="term-del" @click.stop="onDelete(term.term)"><el-icon><Delete /></el-icon></el-button>
      </div>
    </div>
    <el-dialog v-model="showDialog" :title="editTerm?.term ? '编辑术语' : '新建术语'" width="400px">
      <el-form v-if="editTerm" label-width="70px" size="small">
        <el-form-item label="术语"><el-input v-model="editTerm.term" /></el-form-item>
        <el-form-item label="分类"><el-input v-model="editTerm.category" placeholder="世界观/角色/地点" /></el-form-item>
        <el-form-item label="释义"><el-input v-model="editTerm.definition" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useGlossaryStore } from '../stores/glossaryStore'
import type { GlossaryTerm } from '../stores/glossaryStore'

const store = useGlossaryStore()
const showDialog = ref(false)
const editTerm = ref<GlossaryTerm | null>(null)
const editingOldTerm = ref('')

function onAdd(): void { editTerm.value = { term: '', category: '', definition: '' }; editingOldTerm.value = ''; showDialog.value = true }
async function onDelete(term: string): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定要删除术语「${term}」吗？`, '确认删除', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
  } catch { return }
  store.removeTerm(term)
  ElMessage.success('术语已删除')
}
function onSave(): void {
  if (!editTerm.value?.term) { ElMessage.warning('请输入术语名称'); return }
  const isUpdate = !!editingOldTerm.value
  if (isUpdate) {
    store.updateTerm(editingOldTerm.value, editTerm.value)
    ElMessage.success('术语已更新')
  } else {
    store.addTerm(editTerm.value)
    ElMessage.success('术语已添加')
  }
  showDialog.value = false
}
</script>

<style scoped>
.glossary-panel { display: flex; flex-direction: column; height: 100%; background: var(--bg-panel); }
.panel-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
.panel-title { font-size: 13px; font-weight: 600; color: var(--text-primary); flex: 1; }
.panel-body { flex: 1; overflow-y: auto; padding: 4px; }
.empty-hint { padding: 24px; text-align: center; color: var(--text-muted); font-size: 12px; }
.term-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 4px; cursor: pointer; transition: background .1s; }
.term-item:hover { background: var(--bg-hover); }
.term-word { font-weight: 600; color: var(--color-purple); font-size: 13px; min-width: 60px; }
.term-cat { font-size: 10px; padding: 1px 5px; background: var(--bg-card); border-radius: 3px; color: var(--text-dim); }
.term-desc-preview { flex: 1; font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.term-del { visibility: hidden; }
.term-item:hover .term-del { visibility: visible; }
</style>
