<template>
  <div class="achievement-manager">
    <div class="panel-header">
      <span class="panel-title">自定义成就</span>
      <el-button size="small" text @click="onAdd">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>

    <div class="panel-body">
      <!-- Progress bar -->
      <div v-if="achStore.totalCount > 0" class="ach-progress">
        <div class="ach-progress-bar">
          <div class="ach-progress-fill" :style="{ width: achStore.progressPct + '%' }"></div>
        </div>
        <span class="ach-progress-text">{{ achStore.unlockedCount }}/{{ achStore.totalCount }}</span>
      </div>

      <div v-if="achStore.achievements.length === 0" class="empty-hint">
        暂无成就，点击 + 创建
      </div>

      <div
        v-for="ach in achStore.achievements"
        :key="ach.id"
        class="ach-item"
        :class="{ unlocked: ach.unlocked }"
      >
        <div class="ach-item-main">
          <span class="ach-item-icon">{{ ach.icon }}</span>
          <div class="ach-item-info">
            <span class="ach-item-name">{{ ach.name }}</span>
            <span class="ach-item-desc">{{ ach.description }}</span>
            <span v-if="ach.unlockCondition" class="ach-item-cond" :title="ach.unlockCondition">条件: {{ ach.unlockCondition }}</span>
            <span v-if="ach.autoCheck" class="ach-item-auto">自动检测</span>
          </div>
          <el-switch
            :model-value="ach.unlocked"
            size="small"
            @change="(v: boolean) => v ? achStore.unlockAchievement(ach.id) : achStore.lockAchievement(ach.id)"
          />
        </div>
        <div class="ach-item-actions">
          <el-button size="small" text @click="onEdit(ach)">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button size="small" text @click="onDelete(ach.id)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>

      <div v-if="achStore.totalCount > 0" class="ach-footer">
        <el-button size="small" text type="danger" @click="onResetAll">重置全部</el-button>
      </div>
    </div>

    <!-- Edit dialog -->
    <div v-if="editingAch" class="ach-edit-overlay" @click.self="editingAch = null">
      <div class="ach-edit-dialog">
        <div class="ach-edit-title">编辑成就</div>
        <div class="ach-edit-field">
          <label>名称</label>
          <el-input v-model="editForm.name" placeholder="成就名称" />
        </div>
        <div class="ach-edit-field">
          <label>描述</label>
          <el-input v-model="editForm.description" type="textarea" :rows="2" placeholder="成就描述" />
        </div>
        <div class="ach-edit-field">
          <label>
            解锁条件
            <span class="ach-edit-hint">（可选，基于变量/标记判断）</span>
          </label>
          <div class="condition-builder">
            <div v-if="conditionClauses.length === 0" class="condition-empty">
              <el-button size="small" @click="addConditionClause">
                <el-icon><Plus /></el-icon> 添加条件
              </el-button>
            </div>
            <template v-for="(clause, idx) in conditionClauses" :key="idx">
              <div v-if="idx > 0" class="condition-connector">
                <el-radio-group v-model="conditionConnectors[idx - 1]" size="small">
                  <el-radio-button value="&&">且</el-radio-button>
                  <el-radio-button value="||">或</el-radio-button>
                </el-radio-group>
              </div>
              <div class="condition-row">
                <el-select
                  v-model="clause.source"
                  placeholder="选择变量/标记"
                  size="small"
                  style="width: 140px"
                  @change="() => onClauseSourceChange(clause)"
                >
                  <el-option-group label="变量">
                    <el-option
                      v-for="v in variableStore.variableNames"
                      :key="'v_' + v"
                      :label="v"
                      :value="v"
                    />
                  </el-option-group>
                  <el-option-group label="全局标记">
                    <el-option
                      v-for="f in variableStore.globalFlagNames"
                      :key="'f_' + f"
                      :label="f"
                      :value="f"
                    />
                  </el-option-group>
                </el-select>
                <el-select v-model="clause.operator" size="small" style="width: 70px">
                  <el-option
                    v-for="op in getOperators(clause.sourceType)"
                    :key="op"
                    :label="op"
                    :value="op"
                  />
                </el-select>
                <el-input-number
                  v-if="clause.sourceType === 'variable'"
                  v-model="clause.value"
                  size="small"
                  :controls="false"
                  style="width: 90px"
                />
                <el-switch
                  v-else
                  v-model="clause.value"
                  size="small"
                  active-text="true"
                  inactive-text="false"
                />
                <el-button
                  size="small"
                  text
                  @click="removeConditionClause(idx)"
                  :disabled="conditionClauses.length <= 1"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </template>
            <el-button
              v-if="conditionClauses.length > 0"
              size="small"
              text
              style="margin-top: 4px"
              @click="addConditionClause"
            >
              <el-icon><Plus /></el-icon> 添加条件
            </el-button>
          </div>
        </div>
        <div class="ach-edit-field">
          <label class="ach-edit-check">
            <el-switch v-model="editForm.autoCheck" size="small" />
            <span>自动检测</span>
            <span class="ach-edit-hint">（每节点执行后检测条件，无需专用成就节点）</span>
          </label>
        </div>
        <div class="ach-edit-actions">
          <el-button size="small" @click="editingAch = null">取消</el-button>
          <el-button size="small" type="primary" @click="saveEdit">保存</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAchievementStore } from '@renderer/stores/achievementStore'
import { useVariableStore } from '@renderer/stores/variableStore'
import { parseCondition, buildCondition, defaultClause, getOperators, type ConditionClause } from '@renderer/utils/conditionBuilder'
import type { AchievementDef } from '@renderer/types'

const achStore = useAchievementStore()
const variableStore = useVariableStore()

// Edit form state
const editingAch = ref<AchievementDef | null>(null)
const editForm = reactive({
  name: '',
  description: '',
  autoCheck: false
})

// Condition builder state
const conditionClauses = ref<ConditionClause[]>([])
const conditionConnectors = ref<('&&' | '||')[]>([])

function onClauseSourceChange(clause: ConditionClause): void {
  const name = clause.source
  if (variableStore.variableNames.includes(name)) {
    clause.sourceType = 'variable'
    clause.operator = '>='
    clause.value = 0
  } else if (variableStore.globalFlagNames.includes(name)) {
    clause.sourceType = 'flag'
    clause.operator = '=='
    clause.value = true
  }
}

function addConditionClause(): void {
  conditionClauses.value.push(defaultClause())
  if (conditionClauses.value.length > 1) {
    conditionConnectors.value.push('&&')
  }
}

function removeConditionClause(idx: number): void {
  if (conditionClauses.value.length <= 1) return
  conditionClauses.value.splice(idx, 1)
  if (idx > 0) {
    conditionConnectors.value.splice(idx - 1, 1)
  } else {
    conditionConnectors.value.splice(0, 1)
  }
}

function loadCondition(expr: string): void {
  const parsed = parseCondition(expr, variableStore.variableNames, variableStore.globalFlagNames)
  conditionClauses.value = parsed.clauses
  conditionConnectors.value = parsed.connectors
  if (conditionClauses.value.length === 0) {
    conditionClauses.value.push(defaultClause())
    conditionConnectors.value = []
  }
}

function buildCurrentCondition(): string {
  return buildCondition(conditionClauses.value, conditionConnectors.value)
}

function openEdit(ach: AchievementDef): void {
  editingAch.value = ach
  editForm.name = ach.name
  editForm.description = ach.description
  editForm.autoCheck = ach.autoCheck || false
  loadCondition(ach.unlockCondition || '')
}

function saveEdit(): void {
  if (!editingAch.value || !editForm.name.trim()) return
  const condition = buildCurrentCondition()
  achStore.updateAchievement(editingAch.value.id, {
    name: editForm.name.trim(),
    description: editForm.description.trim(),
    unlockCondition: condition || undefined,
    autoCheck: editForm.autoCheck || undefined
  })
  editingAch.value = null
  ElMessage.success('成就已更新')
}

function onAdd(): void {
  const name = '新成就'
  const id = achStore.addAchievement(name, '')
  const ach = achStore.getById(id)
  if (ach) openEdit(ach)
}

function onEdit(ach: AchievementDef): void {
  openEdit(ach)
}

function onDelete(id: string): void {
  const ach = achStore.getById(id)
  ElMessageBox.confirm(`确定要删除成就"${ach?.name || id}"吗？`, '删除成就', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    achStore.removeAchievement(id)
    ElMessage.success('成就已删除')
  }).catch(() => {})
}

function onResetAll(): void {
  ElMessageBox.confirm('确定要重置所有成就的解锁状态吗？', '重置成就', {
    confirmButtonText: '重置',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    achStore.resetAll()
    ElMessage.success('已重置')
  }).catch(() => {})
}
</script>

<style scoped>
.achievement-manager {
  width: 100%;
  height: 100%;
  background: var(--bg-panel);
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-body {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
}

.ach-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.ach-progress-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-input);
  border-radius: 3px;
  overflow: hidden;
}

.ach-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--color-amber), var(--color-green));
  transition: width 0.3s ease;
}

.ach-progress-text {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.empty-hint {
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
  padding: var(--space-xl) 0;
}

.ach-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.ach-item.unlocked {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.05);
}

.ach-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ach-item-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.ach-item-info {
  flex: 1;
  min-width: 0;
}

.ach-item-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.ach-item-desc {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ach-item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.ach-item:hover .ach-item-actions {
  opacity: 1;
}

.ach-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.ach-item-cond {
  display: block;
  font-size: 9px;
  color: var(--color-amber);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ach-item-auto {
  display: inline-block;
  font-size: 9px;
  color: var(--color-blue);
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  padding: 0 4px;
  border-radius: 3px;
  margin-top: 2px;
}

/* Edit dialog */
.ach-edit-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ach-edit-dialog {
  width: 400px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ach-edit-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.ach-edit-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ach-edit-field label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.ach-edit-hint {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 10px;
}

.ach-edit-check {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 6px;
}

.ach-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

/* Condition builder */
.condition-builder {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.condition-empty {
  padding: 4px 0;
}

.condition-connector {
  display: flex;
  justify-content: center;
  padding: 2px 0;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
