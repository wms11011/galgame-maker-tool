<template>
  <div class="variable-manager">
    <div class="panel-header">
      <span class="panel-title">变量管理</span>
      <el-button size="small" type="primary" text @click="showAddDialog = true">+ 添加</el-button>
    </div>
    <div class="panel-body">
      <div v-if="variableStore.variables.length === 0" class="empty-state">
        <p>暂无变量，点击"+ 添加"创建</p>
        <p class="hint">变量用于条件判断和数值跟踪</p>
      </div>
      <div v-for="v in variableStore.variables" :key="v.name" class="var-card">
        <div class="var-info">
          <span class="var-name">{{ v.name }}</span>
          <span class="var-init">初始值: {{ v.initialValue }}</span>
          <span v-if="v.description" class="var-desc">{{ v.description }}</span>
        </div>
        <el-button type="danger" size="small" text @click="removeVar(v.name)">删除</el-button>
      </div>
    </div>

    <!-- 添加变量对话框 -->
    <el-dialog v-model="showAddDialog" title="添加变量" width="360px" :close-on-click-modal="false">
      <el-form :model="newVar" label-position="top" size="small">
        <el-form-item label="变量名">
          <el-input v-model="newVar.name" placeholder="如：好感度、金钱" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="newVar.type" style="width:100%">
            <el-option label="数字 (number)" value="number" />
            <el-option label="字符串 (string)" value="string" />
            <el-option label="布尔值 (boolean)" value="boolean" />
            <el-option label="数组 (array)" value="array" />
          </el-select>
        </el-form-item>
        <el-form-item label="初始值">
          <el-input-number v-if="newVar.type === 'number'" v-model="newVar.initialValue" :min="-99999" :max="99999" controls-position="right" style="width: 100%" />
          <el-input v-else-if="newVar.type === 'string'" v-model="newVar.initialValue" placeholder="初始字符串" />
          <el-switch v-else-if="newVar.type === 'boolean'" v-model="newVar.initialValue" />
          <el-input v-else v-model="newVar.initialValue" placeholder="逗号分隔，如: 钥匙,地图,药水" />
        </el-form-item>
        <el-form-item label="描述（可选）">
          <el-input v-model="newVar.description" placeholder="变量用途说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showAddDialog = false">取消</el-button>
        <el-button size="small" type="primary" @click="addVar">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useVariableStore } from '../stores/variableStore'
import { ElMessage, ElMessageBox } from 'element-plus'

const variableStore = useVariableStore()

onMounted(() => {
  // 组件已挂载
})

const showAddDialog = ref(false)

const newVar = reactive({
  name: '',
  type: 'number' as string,
  initialValue: [] as number | string | boolean | string[],
  description: ''
})

function addVar(): void {
  const name = newVar.name.trim()
  if (!name) {
    ElMessage.warning('请输入变量名')
    return
  }
  if (variableStore.variables.some(v => v.name === name)) {
    ElMessage.warning('变量名已存在')
    return
  }
  // 数组类型：逗号分隔字符串 → 数组
  let iv: any = newVar.initialValue
  if (newVar.type === 'array' && typeof iv === 'string') {
    iv = iv ? iv.split(',').map((s: string) => s.trim()).filter(Boolean) : []
  }
  variableStore.addVariable({
    name,
    type: (newVar.type || 'number') as import('@renderer/types').VariableType,
    initialValue: iv,
    description: newVar.description || undefined
  })
  newVar.name = ''
  newVar.type = 'number'
  newVar.initialValue = 0
  newVar.description = ''
  showAddDialog.value = false
  ElMessage.success('变量已添加')
}

async function removeVar(name: string): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定要删除变量「${name}」吗？`, '确认删除', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
  } catch { return }
  variableStore.removeVariable(name)
  ElMessage.success('变量已删除')
}
</script>

<style scoped>
.variable-manager {
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

.var-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  gap: 8px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.var-card:hover {
  border-color: var(--accent-pink);
  box-shadow: var(--shadow-sm);
}

.var-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.var-name {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-blue);
}

.var-init {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.var-desc {
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
