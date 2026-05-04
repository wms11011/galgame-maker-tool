<template>
  <div class="item-manager">
    <div class="panel-header">
      <span class="panel-title">🎒 道具模板</span>
      <el-button size="small" text @click="onAdd"><el-icon><Plus /></el-icon></el-button>
    </div>
    <div class="panel-body">
      <div v-if="itemStore.items.length === 0" class="empty-hint">暂无道具模板，点击 + 创建</div>
      <div v-for="item in itemStore.items" :key="item.id" class="item-row" @click="editItem = { ...item }">
        <span class="item-icon">
          <img v-if="item.iconPath" :src="imgUrl(item.iconPath)" class="item-thumb" />
          <span v-else>{{ item.icon }}</span>
        </span>
        <span class="item-name">{{ item.name }}</span>
        <span class="item-type-badge" :class="item.type">{{ typeLabel(item.type) }}</span>
        <el-button class="item-del" size="small" text @click.stop="onDelete(item.id)"><el-icon><Delete /></el-icon></el-button>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editItem?.id ? '编辑道具' : '新建道具'" width="400px">
      <el-form v-if="editItem" label-width="70px" size="small">
        <el-form-item label="名称"><el-input v-model="editItem.name" /></el-form-item>
        <el-form-item label="贴图">
          <el-select v-model="editItem.iconPath" placeholder="选择道具贴图" clearable size="small" style="width:100%">
            <el-option v-for="a in itemAssets" :key="a.relativePath" :label="a.name" :value="a.relativePath" />
          </el-select>
        </el-form-item>
        <el-form-item label="备选图标">
          <el-input v-model="editItem.icon" placeholder="无贴图时用 emoji，如 🔑" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="editItem.type">
            <el-option label="🔑 关键道具" value="key" />
            <el-option label="🧪 消耗品" value="consumable" />
            <el-option label="⚔ 装备" value="equipment" />
            <el-option label="🔧 材料" value="material" />
            <el-option label="📋 任务" value="quest" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="editItem.description" type="textarea" :rows="2" placeholder="道具说明" /></el-form-item>
        <el-form-item label="可堆叠"><el-switch v-model="editItem.stackable" /></el-form-item>
        <el-form-item v-if="editItem.stackable" label="最大堆叠"><el-input-number v-model="editItem.maxStack" :min="2" :max="999" /></el-form-item>
        <el-form-item label="消耗品"><el-switch v-model="editItem.consumable" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useItemStore } from '../stores/itemStore'
import { useAssetStore } from '../stores/assetStore'
import { useProjectStore } from '../stores/projectStore'
import { getAssetUrl } from '../utils/assetUrl'
import type { ItemDef } from '../types'

const itemStore = useItemStore()
const assetStore = useAssetStore()
const projectStore = useProjectStore()
const showDialog = ref(false)
const editItem = ref<Partial<ItemDef> | null>(null)

// 获取分类为"道具"的图片资源
const itemAssets = computed(() =>
  assetStore.assets.filter(a => a.type === 'image' && a.category === 'item')
)

function imgUrl(relativePath: string): string {
  return projectStore.meta?.projectPath ? getAssetUrl(projectStore.meta.projectPath, relativePath) : ''
}

function onAdd(): void {
  editItem.value = { id: `item_${Date.now()}`, name: '', icon: '📦', iconPath: '', type: 'key', description: '', stackable: true, maxStack: 99, consumable: false }
  showDialog.value = true
}

async function onDelete(id: string): Promise<void> {
  try {
    await ElMessageBox.confirm('确定要删除此道具吗？', '确认删除', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
  } catch { return }
  itemStore.removeItem(id)
  ElMessage.success('道具已删除')
}

function onSave(): void {
  if (!editItem.value?.name) { ElMessage.warning('请输入道具名称'); return }
  const isUpdate = itemStore.items.some(i => i.id === editItem.value!.id)
  if (isUpdate) {
    itemStore.updateItem(editItem.value!.id!, editItem.value!)
    ElMessage.success('道具已更新')
  } else {
    itemStore.addItem(editItem.value as ItemDef)
    ElMessage.success('道具已创建')
  }
  showDialog.value = false
}

function typeLabel(t: string): string {
  const m: Record<string, string> = { key: '关键', consumable: '消耗', equipment: '装备', material: '材料', quest: '任务' }
  return m[t] || t
}
</script>

<style scoped>
.item-manager { display: flex; flex-direction: column; height: 100%; background: var(--bg-panel); }
.panel-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
.panel-title { font-size: 13px; font-weight: 600; color: var(--text-primary); flex: 1; }
.panel-body { flex: 1; overflow-y: auto; padding: 4px; }
.empty-hint { text-align: center; padding: 24px; color: var(--text-muted); font-size: 12px; }
.item-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; transition: background 0.15s; }
.item-row:hover { background: var(--bg-hover); }
.item-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.item-thumb { width: 100%; height: 100%; object-fit: contain; border-radius: 3px; }
.item-name { flex: 1; font-size: 13px; color: var(--text-primary); font-weight: 500; }
.item-type-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; color: #fff; }
.item-type-badge.key { background: var(--color-blue); }
.item-type-badge.consumable { background: var(--color-green); }
.item-type-badge.equipment { background: var(--color-orange); }
.item-type-badge.material { background: var(--color-gray); }
.item-type-badge.quest { background: var(--color-yellow); }
.item-del { visibility: hidden; }
.item-row:hover .item-del { visibility: visible; }
</style>
