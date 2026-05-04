<template>
  <div class="property-panel">
    <div class="panel-header">
      <span class="panel-title">属性面板</span>
    </div>

    <div v-if="!selectedNode" class="empty-state">
      <span class="empty-icon">🖱️</span>
      <p>点击画布中的节点以编辑属性</p>
    </div>

    <!-- 对话节点表单 -->
    <div v-else-if="selectedNode.type === 'dialog'" class="panel-body">
      <div class="form-section">
        <div class="section-title">对话节点</div>

        <div class="form-item">
          <label class="form-label">节点名称</label>
          <el-input
            v-model="dialogForm.label"
            placeholder="输入节点名称"
            size="small"
            @input="onDialogChange"
          />
        </div>

        <div class="form-item">
          <label class="form-label">角色名</label>
          <el-select
            v-model="dialogForm.character"
            placeholder="选择角色"
            size="small"
            clearable
            filterable
            allow-create
            @change="onDialogChange"
          >
            <el-option
              v-for="c in characterStore.characters"
              :key="c.name"
              :label="c.name"
              :value="c.name"
            />
          </el-select>
        </div>

        <div class="form-item">
          <label class="form-label">
            对话内容
            <el-button size="small" text class="expand-btn" @click="expandDialogContent">
              {{ contentExpanded ? '收起' : '展开' }}
            </el-button>
          </label>
          <el-input
            v-model="dialogForm.content"
            type="textarea"
            :rows="contentExpanded ? 12 : 6"
            placeholder="输入对话内容"
            size="small"
            @input="onDialogChange"
          />
        </div>

        <div class="form-item">
          <label class="form-label">背景图</label>
          <el-select
            v-model="dialogForm.background"
            placeholder="选择背景图"
            size="small"
            clearable
            @change="onDialogChange"
          >
            <el-option
              v-for="asset in bgAssets"
              :key="asset.relativePath"
              :label="asset.name"
              :value="asset.relativePath"
            />
          </el-select>
        </div>

        <div class="form-item">
          <label class="form-label">角色立绘</label>
          <el-select
            v-model="dialogForm.characterSprite"
            placeholder="选择立绘"
            size="small"
            clearable
            @change="onDialogChange"
          >
            <el-option
              v-for="asset in spriteAssets"
              :key="asset.relativePath"
              :label="asset.name"
              :value="asset.relativePath"
            />
          </el-select>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">打字速度</label>
            <el-slider
              v-model="dialogForm.typingSpeed"
              :min="10"
              :max="150"
              :step="5"
              size="small"
              @input="onDialogChange"
            />
          </div>
          <span class="speed-label">{{ dialogForm.typingSpeed }}ms</span>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">字体大小</label>
            <el-input-number
              v-model="dialogForm.fontSize"
              :min="10"
              :max="36"
              size="small"
              @change="onDialogChange"
            />
          </div>
          <div class="form-item">
            <label class="form-label">文字颜色</label>
            <div style="display:flex;align-items:center;gap:6px;">
              <el-color-picker
                v-model="dialogForm.textColor"
                size="small"
                @change="onDialogChange"
              />
              <span class="color-hex">{{ dialogForm.textColor }}</span>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">场景过渡</label>
            <el-select
              v-model="dialogForm.transition"
              size="small"
              @change="onDialogChange"
            >
              <el-option label="无效果" value="none" />
              <el-option label="淡入" value="fade" />
              <el-option label="滑入" value="slide" />
            </el-select>
          </div>
          <div class="form-item">
            <label class="form-label">过渡时长</label>
            <el-input-number
              v-model="dialogForm.transitionDuration"
              :min="0"
              :max="2000"
              :step="50"
              size="small"
              @change="onDialogChange"
            />
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">下一节点</label>
          <el-select
            v-model="dialogForm.nextNodeId"
            placeholder="选择下一节点"
            size="small"
            clearable
            @change="onDialogChange"
          >
            <el-option
              v-for="node in allNodes"
              :key="node.id"
              :label="node.data.label"
              :value="node.id"
            />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 选择节点表单 -->
    <div v-else-if="selectedNode.type === 'choice'" class="panel-body">
      <div class="form-section">
        <div class="section-title">选择节点</div>

        <div class="form-item">
          <label class="form-label">节点名称</label>
          <el-input
            v-model="choiceForm.label"
            placeholder="输入节点名称"
            size="small"
            @input="onChoiceChange"
          />
        </div>

        <div class="form-item">
          <label class="form-label">标题</label>
          <el-input
            v-model="choiceForm.title"
            placeholder="输入选择标题"
            size="small"
            @input="onChoiceChange"
          />
        </div>

        <div class="form-item">
          <label class="form-label">选项列表</label>
          <div class="options-editor">
            <div
              v-for="(option, index) in choiceForm.options"
              :key="option.id"
              class="option-row"
            >
              <div class="option-index">{{ index + 1 }}</div>
              <div class="option-fields">
                <el-input
                  v-model="option.text"
                  placeholder="选项文本"
                  size="small"
                  @input="onChoiceChange"
                />
                <el-select
                  v-model="option.nextNodeId"
                  placeholder="选择目标节点"
                  size="small"
                  clearable
                  @change="onChoiceChange"
                >
                  <el-option
                    v-for="node in allNodes"
                    :key="node.id"
                    :label="node.data.label"
                    :value="node.id"
                  />
                </el-select>
              </div>
              <el-button
                type="danger"
                size="small"
                text
                @click="removeOption(index)"
              >✕</el-button>
            </div>
            <el-button
              type="primary"
              size="small"
              plain
              class="add-option-btn"
              @click="addOption"
            >+ 添加选项</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 条件节点表单 -->
    <div v-else-if="selectedNode.type === 'condition'" class="panel-body">
      <div class="form-section">
        <div class="section-title">条件节点</div>

        <div class="form-item">
          <label class="form-label">节点名称</label>
          <el-input
            v-model="conditionForm.label"
            placeholder="输入节点名称"
            size="small"
            @input="onConditionChange"
          />
        </div>

        <div class="form-item">
          <label class="form-label">条件一</label>
          <div class="condition-row">
            <el-select
              v-model="conditionForm.varA"
              placeholder="选择变量"
              size="small"
              class="cond-var"
              @change="onConditionChange"
            >
              <el-option
                v-for="name in variableStore.variableNames"
                :key="name"
                :label="name"
                :value="name"
              />
            </el-select>
            <el-select
              v-model="conditionForm.opA"
              size="small"
              class="cond-op"
              @change="onConditionChange"
            >
              <el-option label="≥" value=">=" />
              <el-option label="≤" value="<=" />
              <el-option label=">" value=">" />
              <el-option label="<" value="<" />
              <el-option label="=" value="==" />
              <el-option label="≠" value="!=" />
            </el-select>
            <el-input
              v-model="conditionForm.valA"
              placeholder="值"
              size="small"
              class="cond-val"
              @input="onConditionChange"
            />
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">连接方式</label>
          <el-select
            v-model="conditionForm.connector"
            size="small"
            @change="onConditionChange"
          >
            <el-option label="无（仅条件一）" value="" />
            <el-option label="且（AND）" value="&&" />
            <el-option label="或（OR）" value="||" />
          </el-select>
        </div>

        <div class="form-item" v-if="conditionForm.connector">
          <label class="form-label">条件二</label>
          <div class="condition-row">
            <el-select
              v-model="conditionForm.varB"
              placeholder="选择变量"
              size="small"
              class="cond-var"
              @change="onConditionChange"
            >
              <el-option
                v-for="name in variableStore.variableNames"
                :key="name"
                :label="name"
                :value="name"
              />
            </el-select>
            <el-select
              v-model="conditionForm.opB"
              size="small"
              class="cond-op"
              @change="onConditionChange"
            >
              <el-option label="≥" value=">=" />
              <el-option label="≤" value="<=" />
              <el-option label=">" value=">" />
              <el-option label="<" value="<" />
              <el-option label="=" value="==" />
              <el-option label="≠" value="!=" />
            </el-select>
            <el-input
              v-model="conditionForm.valB"
              placeholder="值"
              size="small"
              class="cond-val"
              @input="onConditionChange"
            />
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">True 分支节点</label>
          <el-select
            v-model="conditionForm.trueNextId"
            placeholder="选择条件为真时跳转的节点"
            size="small"
            clearable
            @change="onConditionChange"
          >
            <el-option
              v-for="node in allNodes"
              :key="node.id"
              :label="node.data.label"
              :value="node.id"
            />
          </el-select>
        </div>

        <div class="form-item">
          <label class="form-label">False 分支节点</label>
          <el-select
            v-model="conditionForm.falseNextId"
            placeholder="选择条件为假时跳转的节点"
            size="small"
            clearable
            @change="onConditionChange"
          >
            <el-option
              v-for="node in allNodes"
              :key="node.id"
              :label="node.data.label"
              :value="node.id"
            />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 通用表单（setVariable ~ item，共14种类型） -->
    <div v-else-if="selectedNode" class="panel-body">
      <NodeForm
        :node-type="selectedNode.type"
        :form-data="genericFormData"
        @change="onGenericFieldChange"
      />
    </div>
    <!-- 解锁条件（所有节点通用） -->
    <div v-if="selectedNode" class="unlock-section">
      <div class="section-title">🔒 解锁条件</div>
      <div class="form-item">
        <label class="form-label">条件表达式（留空 = 无条件）</label>
        <el-input
          v-model="unlockCondition"
          placeholder="如：affection >= 50 或 seen_good_ending"
          size="small"
          @input="onUnlockConditionChange"
        />
        <span class="form-hint">支持变量比较（>=, <=, >, <, ==, !=）和全局标记名（true/false）</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElInput, ElInputNumber, ElSelect, ElOption, ElButton, ElSwitch, ElSlider, ElColorPicker } from 'element-plus'
import { useFlowStore } from '@renderer/stores/flowStore'
import { useAssetStore } from '@renderer/stores/assetStore'
import type {
  DialogNodeData,
  ChoiceNodeData,
  ConditionNodeData,
  SetVariableNodeData,
  GotoNodeData,
  EndNodeData,
  AudioNodeData,
  CgNodeData,
  WaitNodeData,
  RandomNodeData,
  RandomBranch,
  LabelNodeData,
  AnimationNodeData,
  SavePointNodeData,
  TimerNodeData,
  MoveCharacterNodeData,
  SteamAchievementNodeData,
  AchievementNodeData,
  ParticleNodeData,
  Live2DNodeData,
  ItemNodeData,
  ChoiceOption
} from '@renderer/types/index'
import { useVariableStore } from '@renderer/stores/variableStore'
import { useCharacterStore } from '@renderer/stores/characterStore'
import { useAchievementStore } from '@renderer/stores/achievementStore'
import NodeForm from './NodeForm.vue'
import { NODE_TYPE_REGISTRY } from '@renderer/utils/nodeTypeRegistry'

const flowStore = useFlowStore()
const assetStore = useAssetStore()
const variableStore = useVariableStore()
const characterStore = useCharacterStore()
const achStore = useAchievementStore()

const selectedNode = computed(() => flowStore.selectedNode)

// 通用表单数据（由 NodeForm 组件驱动，用于非 dialog/choice/condition 的简单节点类型）
const genericFormData = computed<Record<string, unknown>>(() => {
  const node = selectedNode.value
  if (!node) return {}
  const d = node.data as Record<string, unknown>
  const result: Record<string, unknown> = {}
  const meta = NODE_TYPE_REGISTRY[node.type as keyof typeof NODE_TYPE_REGISTRY]
  if (meta) {
    for (const f of meta.fields) {
      if (f.hidden) continue
      result[f.key] = d[f.key] ?? f.default ?? ''
    }
  }
  return result
})

function onGenericFieldChange(key: string, value: unknown): void {
  const node = selectedNode.value
  if (!node) return
  flowStore.updateNode(node.id, { [key]: value })
}

const isArrayVariable = computed(() => {
  if (!setVarForm.variable) return false
  const v = variableStore.variables.find(x => x.name === setVarForm.variable)
  return v?.type === 'array'
})

const imageAssets = computed(() =>
  assetStore.assets.filter((a) => a.type === 'image')
)
const spriteAssets = computed(() =>
  assetStore.assets.filter((a) => a.type === 'image' && a.category === 'character')
)
const bgAssets = computed(() =>
  assetStore.assets.filter((a) => a.type === 'image' && a.category === 'background')
)
const cgAssets = computed(() =>
  assetStore.assets.filter((a) => a.type === 'image' && a.category === 'cg')
)
const audioAssets = computed(() =>
  assetStore.assets.filter((a) => a.type === 'audio')
)

const allNodes = computed(() => flowStore.nodes)

// ---- Dialog form ----
const contentExpanded = ref(false)
function expandDialogContent(): void { contentExpanded.value = !contentExpanded.value }
const dialogForm = reactive<Omit<DialogNodeData, 'id'>>({
  label: '',
  character: '',
  content: '',
  background: '',
  characterSprite: '',
  nextNodeId: '',
  typingSpeed: 45,
  textColor: '#F5EDE4',
  fontSize: 16,
  transition: 'none',
  transitionDuration: 400
})

// ---- Choice form ----
const choiceForm = reactive<Omit<ChoiceNodeData, 'id'>>({ 
  label: '',
  title: '',
  options: []
})

// ---- Condition form ----
const conditionForm = reactive<{
  label: string
  varA: string
  opA: string
  valA: string
  connector: string
  varB: string
  opB: string
  valB: string
  trueNextId: string
  falseNextId: string
}>({
  label: '',
  varA: '',
  opA: '>=',
  valA: '',
  connector: '',
  varB: '',
  opB: '>=',
  valB: '',
  trueNextId: '',
  falseNextId: ''
})

function buildExpression(): string {
  if (!conditionForm.varA) return ''
  const exprA = `${conditionForm.varA} ${conditionForm.opA || '>='} ${conditionForm.valA || '0'}`
  if (conditionForm.connector && conditionForm.varB) {
    const exprB = `${conditionForm.varB} ${conditionForm.opB || '>='} ${conditionForm.valB || '0'}`
    return `${exprA} ${conditionForm.connector} ${exprB}`
  }
  return exprA
}

function parseExpression(expr: string): void {
  conditionForm.varA = ''
  conditionForm.opA = '>='
  conditionForm.valA = ''
  conditionForm.connector = ''
  conditionForm.varB = ''
  conditionForm.opB = '>='
  conditionForm.valB = ''

  if (!expr.trim()) return

  const parts = expr.match(/^(.+?)\s+(>=|<=|>|<|==|!=)\s+(\S+)\s*(&&|\|\|)?\s*(.*)$/)
  if (!parts) return

  conditionForm.varA = parts[1].trim()
  conditionForm.opA = parts[2]
  conditionForm.valA = parts[3].trim()

  if (parts[4] && parts[5]) {
    conditionForm.connector = parts[4]
    const sub = parts[5].match(/^(.+?)\s+(>=|<=|>|<|==|!=)\s+(\S+)$/)
    if (sub) {
      conditionForm.varB = sub[1].trim()
      conditionForm.opB = sub[2]
      conditionForm.valB = sub[3].trim()
    }
  }
}

// ---- Unlock condition (common to all node types) ----
const unlockCondition = ref('')

function onUnlockConditionChange(): void {
  const id = selectedNode.value?.id
  if (!id) return
  debounceUpdate(() => {
    flowStore.updateNode(id, { unlockCondition: unlockCondition.value || undefined })
  })
}

// Sync form when selected node changes
watch(
  selectedNode,
  (node) => {
    if (!node) {
      unlockCondition.value = ''
      return
    }
    // Sync unlock condition (common to all node types)
    unlockCondition.value = node.data.unlockCondition ?? ''

    if (node.type === 'dialog') {
      const d = node.data as DialogNodeData
      dialogForm.label = d.label ?? ''
      dialogForm.character = d.character ?? ''
      dialogForm.content = d.content ?? ''
      dialogForm.background = d.background ?? ''
      dialogForm.characterSprite = d.characterSprite ?? ''
      dialogForm.nextNodeId = d.nextNodeId ?? ''
      dialogForm.typingSpeed = d.typingSpeed ?? 45
      dialogForm.textColor = d.textColor ?? '#F5EDE4'
      dialogForm.fontSize = d.fontSize ?? 16
      dialogForm.transition = d.transition ?? 'none'
      dialogForm.transitionDuration = d.transitionDuration ?? 400
    } else if (node.type === 'choice') {
      const d = node.data as ChoiceNodeData
      choiceForm.label = d.label ?? ''
      choiceForm.title = d.title ?? ''
      choiceForm.options = d.options.map((o) => ({ ...o }))
    } else if (node.type === 'condition') {
      const d = node.data as ConditionNodeData
      conditionForm.label = d.label ?? ''
      parseExpression(d.expression ?? '')
      conditionForm.trueNextId = d.trueNextId ?? ''
      conditionForm.falseNextId = d.falseNextId ?? ''
    }
    // 其余14种类型（setVariable~item）由 NodeForm 的 genericFormData 自动同步，无需显式 watch
  },
  { immediate: true }
)

// Debounce helper
let debounceTimer: ReturnType<typeof setTimeout> | null = null
function debounceUpdate(fn: () => void): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fn, 300)
}

function onDialogChange(): void {
  const id = selectedNode.value?.id
  if (!id) return
  // 自动记忆本次使用的角色/背景/立绘作为新建节点的默认值
  flowStore.setDialogDefaults({
    character: dialogForm.character,
    background: dialogForm.background || '',
    characterSprite: dialogForm.characterSprite || ''
  })
  debounceUpdate(() => {
    const oldNextNodeId = (selectedNode.value?.data as DialogNodeData).nextNodeId
    flowStore.updateNode(id, {
      label: dialogForm.label,
      character: dialogForm.character,
      content: dialogForm.content,
      background: dialogForm.background || undefined,
      characterSprite: dialogForm.characterSprite || undefined,
      nextNodeId: dialogForm.nextNodeId || undefined,
      typingSpeed: dialogForm.typingSpeed,
      textColor: dialogForm.textColor,
      fontSize: dialogForm.fontSize,
      transition: dialogForm.transition,
      transitionDuration: dialogForm.transitionDuration
    })
    
    // Create or remove edge based on nextNodeId change
    if (oldNextNodeId !== dialogForm.nextNodeId) {
      // Remove old edge if it exists
      if (oldNextNodeId) {
        const oldEdge = flowStore.edges.find(edge => 
          edge.source === id && edge.target === oldNextNodeId
        )
        if (oldEdge) {
          flowStore.removeEdge(oldEdge.id)
        }
      }
      // Create new edge if nextNodeId is set
      if (dialogForm.nextNodeId) {
        const existingEdge = flowStore.edges.find(edge => 
          edge.source === id && edge.target === dialogForm.nextNodeId
        )
        if (!existingEdge) {
          flowStore.addEdge(id, dialogForm.nextNodeId)
        }
      }
    }
  })
}

function onChoiceChange(): void {
  const id = selectedNode.value?.id
  if (!id) return
  debounceUpdate(() => {
    const oldOptions = (selectedNode.value?.data as ChoiceNodeData).options || []
    flowStore.updateNode(id, {
      label: choiceForm.label,
      title: choiceForm.title,
      options: choiceForm.options.map((o) => ({ ...o }))
    })
    
    // Handle edge changes for choice options
    const oldOptionMap = new Map(oldOptions.map(opt => [opt.id, opt.nextNodeId]))
    const newOptionMap = new Map(choiceForm.options.map(opt => [opt.id, opt.nextNodeId]))
    
    // Check all options for changes
    for (const [optionId, newNextNodeId] of newOptionMap) {
      const oldNextNodeId = oldOptionMap.get(optionId)
      if (oldNextNodeId !== newNextNodeId) {
        // Remove old edge if it exists
        if (oldNextNodeId) {
          const oldEdge = flowStore.edges.find(edge => 
            edge.source === id && edge.target === oldNextNodeId
          )
          if (oldEdge) {
            flowStore.removeEdge(oldEdge.id)
          }
        }
        // Create new edge if nextNodeId is set
        if (newNextNodeId) {
          const existingEdge = flowStore.edges.find(edge => 
            edge.source === id && edge.target === newNextNodeId
          )
          if (!existingEdge) {
            const option = choiceForm.options.find(o => o.id === optionId)
            flowStore.addEdge(id, newNextNodeId, option?.text)
          }
        }
      }
    }
    
    // Check for removed options
    for (const [optionId, oldNextNodeId] of oldOptionMap) {
      if (!newOptionMap.has(optionId) && oldNextNodeId) {
        const oldEdge = flowStore.edges.find(edge => 
          edge.source === id && edge.target === oldNextNodeId
        )
        if (oldEdge) {
          flowStore.removeEdge(oldEdge.id)
        }
      }
    }
  })
}

function onConditionChange(): void {
  const id = selectedNode.value?.id
  if (!id) return
  debounceUpdate(() => {
    const oldTrueNextId = (selectedNode.value?.data as ConditionNodeData).trueNextId
    const oldFalseNextId = (selectedNode.value?.data as ConditionNodeData).falseNextId
    const expression = buildExpression()
    flowStore.updateNode(id, {
      label: conditionForm.label,
      expression,
      trueNextId: conditionForm.trueNextId,
      falseNextId: conditionForm.falseNextId
    })
    
    // Handle edge changes for true branch
    if (oldTrueNextId !== conditionForm.trueNextId) {
      // Remove old edge if it exists
      if (oldTrueNextId) {
        const oldEdge = flowStore.edges.find(edge => 
          edge.source === id && edge.target === oldTrueNextId
        )
        if (oldEdge) {
          flowStore.removeEdge(oldEdge.id)
        }
      }
      // Create new edge if trueNextId is set
      if (conditionForm.trueNextId) {
        const existingEdge = flowStore.edges.find(edge => 
          edge.source === id && edge.target === conditionForm.trueNextId
        )
        if (!existingEdge) {
          flowStore.addEdge(id, conditionForm.trueNextId)
        }
      }
    }
    
    // Handle edge changes for false branch
    if (oldFalseNextId !== conditionForm.falseNextId) {
      // Remove old edge if it exists
      if (oldFalseNextId) {
        const oldEdge = flowStore.edges.find(edge => 
          edge.source === id && edge.target === oldFalseNextId
        )
        if (oldEdge) {
          flowStore.removeEdge(oldEdge.id)
        }
      }
      // Create new edge if falseNextId is set
      if (conditionForm.falseNextId) {
        const existingEdge = flowStore.edges.find(edge => 
          edge.source === id && edge.target === conditionForm.falseNextId
        )
        if (!existingEdge) {
          flowStore.addEdge(id, conditionForm.falseNextId)
        }
      }
    }
  })
}








function addRandomBranch(): void {
  const newBranch: RandomBranch = {
    id: `br_${Date.now()}`,
    targetNodeId: '',
    weight: 1
  }
  randomForm.branches.push(newBranch)
  onRandomChange()
}

function removeRandomBranch(index: number): void {
  randomForm.branches.splice(index, 1)
  onRandomChange()
}

const totalWeight = computed(() => randomForm.branches.reduce((sum, b) => sum + (b.weight || 0), 0))

const weightPercentages = computed(() => {
  const total = totalWeight.value
  if (total === 0) return ''
  return randomForm.branches.map(b => `${Math.round((b.weight || 0) / total * 100)}%`).join(' / ')
})








function addOption(): void {
  const newOption: ChoiceOption = {
    id: `opt_${Date.now()}`,
    text: '新选项',
    nextNodeId: ''
  }
  choiceForm.options.push(newOption)
  onChoiceChange()
}

function removeOption(index: number): void {
  choiceForm.options.splice(index, 1)
  onChoiceChange()
}
</script>

<style scoped>
.property-panel {
  width: 260px;
  height: 100%;
  background: var(--bg-panel);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
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

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  color: var(--text-dim);
  padding: var(--space-xl);
  text-align: center;
}

.empty-icon {
  font-size: 32px;
  opacity: 0.5;
}

.empty-state p {
  font-size: var(--text-base);
  line-height: 1.5;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border-color);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.form-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.options-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.option-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.option-index {
  width: 18px;
  height: 18px;
  background: var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-top: var(--space-xs);
}

.option-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.add-option-btn {
  width: 100%;
  margin-top: var(--space-xs);
}

.weight-summary {
  font-size: var(--text-sm);
  color: var(--text-muted);
  text-align: center;
  padding: var(--space-xs);
}

.condition-row {
  display: flex;
  gap: var(--space-xs);
}

.cond-var {
  flex: 2;
}

.cond-op {
  flex: 1;
}

.cond-val {
  flex: 1;
}

.unlock-section {
  padding: var(--space-md);
  border-top: 1px solid var(--border-color);
  margin-top: 0;
  background: var(--bg-card);
}

.form-hint {
  font-size: var(--text-xs);
  color: var(--text-dim);
  margin-top: 2px;
}
</style>
