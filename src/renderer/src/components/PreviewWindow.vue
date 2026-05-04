<template>
  <el-dialog
    v-model="uiStore.previewWindowOpen"
    title="剧情预览"
    width="auto"
    :close-on-click-modal="false"
    class="preview-dialog"
    @open="onOpen"
    @close="onClose"
  >
    <div class="preview-layout">
      <div ref="canvasContainer" class="canvas-container" @click="handleCanvasClick" />
      <AffectionPanel :variables="debugInfo.variables" />
      <InventoryPanel :variables="debugInfo.variables as any" />
      <DebugPanel v-if="showDebug" :info="debugInfo" />
    </div>

    <template #footer>
      <div class="preview-controls">
        <el-button @click="showDebug = !showDebug" :type="showDebug ? 'primary' : 'default'">
          🐛 调试
        </el-button>
        <el-button @click="restart">
          <el-icon><RefreshLeft /></el-icon> 从头播放
        </el-button>
        <el-button
          v-if="!isRunning"
          type="success"
          @click="autoPlay"
        >
          <el-icon><VideoPlay /></el-icon> 自动播放
        </el-button>
        <el-button
          v-else
          type="warning"
          @click="stopAutoPlay"
        >
          <el-icon><VideoPause /></el-icon> 暂停
        </el-button>
        <el-button
          v-if="debugInfo.isBreakpointPaused"
          type="danger"
          @click="resume"
        >
          <el-icon><VideoPlay /></el-icon> 继续执行
        </el-button>
        <el-button v-else type="primary" @click="next" :disabled="isRunning">
          下一步 <el-icon><ArrowRight /></el-icon>
        </el-button>
        <el-button @click="skipToEnd" :disabled="isRunning">
          <el-icon><DArrowRight /></el-icon> 跳到结局
        </el-button>
        <el-tooltip content="自动播放速度" placement="top">
          <el-slider
            v-model="autoSpeed"
            :min="100"
            :max="3000"
            :step="100"
            style="width: 120px"
            @change="onSpeedChange"
          />
        </el-tooltip>
        <el-button @click="backlogVisible = true" :disabled="dialogueLog.length === 0">📜 回看</el-button>
        <el-button @click="manualSave" title="快速存档">💾 存档</el-button>
        <el-button @click="saveDialogVisible = true" title="存档/读档">
          📂 存档管理 ({{ saveStore.saveCount }})
        </el-button>
        <el-button @click="uiStore.previewWindowOpen = false">关闭</el-button>

        <!-- 存档/读档弹窗 -->
        <el-dialog v-model="saveDialogVisible" title="存档管理" width="680px" :close-on-click-modal="false">
          <div class="save-slots">
            <div
              v-for="slot in 6"
              :key="slot"
              class="save-slot"
              :class="{ 'has-save': getSlotSave(slot), empty: !getSlotSave(slot) }"
            >
              <div v-if="getSlotSave(slot)" class="slot-content">
                <div class="slot-thumb" v-if="getSlotSave(slot).screenshot">
                  <img :src="getSlotSave(slot).screenshot" class="slot-img" />
                </div>
                <div v-else class="slot-thumb slot-thumb-nothumb">📷</div>
                <div class="slot-info">
                  <div class="slot-label">{{ getSlotSave(slot).slotLabel }}</div>
                  <div class="slot-date">{{ formatDate(getSlotSave(slot).timestamp) }}</div>
                  <div class="slot-node">{{ getSlotSave(slot).currentNodeLabel }}</div>
                </div>
                <div class="slot-actions">
                  <el-button size="small" @click="loadSlotSave(slot)">读档</el-button>
                  <el-button size="small" type="danger" @click="deleteSlotSave(slot)">删除</el-button>
                </div>
              </div>
              <div v-else class="slot-empty" @click="saveToSlot(slot)">
                <div class="slot-num">存档位 {{ slot }}</div>
                <div class="slot-hint">— 空 —</div>
              </div>
            </div>
          </div>
        </el-dialog>
      </div>
    </template>
  </el-dialog>
  <BacklogPanel :visible="backlogVisible" :entries="dialogueLog" @close="backlogVisible = false" @rollback="onRollback" />
  <!-- 紧急回避画面 -->
  <div v-if="panicVisible" class="panic-overlay" @click="panicVisible = false">
    <div class="panic-content">
      <div class="panic-icon">💻</div>
      <div class="panic-title">工作中...</div>
      <div class="panic-hint">点击任意位置返回</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { RefreshLeft, ArrowRight, VideoPlay, VideoPause, DArrowRight } from '@element-plus/icons-vue'
import { useUIStore } from '../stores/uiStore'
import { useFlowStore } from '../stores/flowStore'
import { useProjectStore } from '../stores/projectStore'
import { useAssetStore } from '../stores/assetStore'
import { useVariableStore } from '../stores/variableStore'
import { useSaveStore } from '../stores/saveStore'
import { useAchievementStore } from '../stores/achievementStore'
import { PreviewEngine } from '../preview/previewEngine'
import { ElMessage } from 'element-plus'
import type { DebugInfo } from '../preview/previewEngine'
import type { ProjectData } from '../types/index'
import DebugPanel from './DebugPanel.vue'
import AffectionPanel from './AffectionPanel.vue'
import InventoryPanel from './InventoryPanel.vue'
import BacklogPanel from './BacklogPanel.vue'

const uiStore = useUIStore()
const flowStore = useFlowStore()
const projectStore = useProjectStore()
const assetStore = useAssetStore()
const variableStore = useVariableStore()
const saveStore = useSaveStore()
const achievementStore = useAchievementStore()

const canvasContainer = ref<HTMLElement | null>(null)
const showDebug = ref(false)
const isRunning = ref(false)
const autoSpeed = ref(800)
const saveDialogVisible = ref(false)
const backlogVisible = ref(false)
const panicVisible = ref(false)
const dialogueLog = ref<{ character: string; text: string; nodeId: string }[]>([])
let engine: PreviewEngine | null = null

const debugInfo = reactive<DebugInfo>({
  currentNodeId: null,
  currentNodeType: null,
  currentNodeLabel: null,
  visitedNodes: [],
  variables: {},
  variableHistory: [],
  stepCount: 0,
  isEnded: false,
  isRunning: false,
  isBreakpointPaused: false,
  speed: 800,
  achievements: [],
  lastAutoCheck: null,
  flagAliases: {}
})

function updateDebugInfo(info: DebugInfo): void {
  debugInfo.currentNodeId = info.currentNodeId
  debugInfo.currentNodeType = info.currentNodeType
  debugInfo.currentNodeLabel = info.currentNodeLabel
  debugInfo.visitedNodes = info.visitedNodes
  debugInfo.variables = info.variables
  debugInfo.variableHistory = info.variableHistory || []
  debugInfo.stepCount = info.stepCount
  debugInfo.isEnded = info.isEnded
  debugInfo.isRunning = info.isRunning
  // 同步引擎的 running 状态到按钮
  if (isRunning.value !== info.isRunning) {
    isRunning.value = info.isRunning
  }
  debugInfo.isBreakpointPaused = info.isBreakpointPaused
  debugInfo.speed = info.speed
  debugInfo.achievements = info.achievements || []
  debugInfo.lastAutoCheck = info.lastAutoCheck || null
  debugInfo.flagAliases = info.flagAliases || {}
}

async function onOpen() {
  if (!canvasContainer.value) return

  engine = new PreviewEngine()
  const resolution = projectStore.meta?.resolution ?? '1280x720'
  await engine.init(canvasContainer.value, resolution)

  const previewData: ProjectData = {
    meta: projectStore.meta!,
    flow: { nodes: flowStore.nodes, edges: flowStore.edges },
    script: projectStore.script,
    assets: assetStore.assets,
    variables: variableStore.variables,
    globalFlags: { ...variableStore.globalFlags },
    flagAliases: { ...variableStore.flagAliases },
    achievements: achievementStore.achievements.map(a => ({ ...a })),
    groups: flowStore.groups
  }

  await engine.loadProject(previewData)

  engine.setBreakpoints(flowStore.breakpointNodeIds)
  engine.onDebugUpdate(updateDebugInfo)

  engine.onSavePoint((saveInfo) => {
    saveStore.createSave(
      projectStore.meta?.name ?? '未命名',
      saveInfo.nodeId,
      saveInfo.slotLabel,
      saveInfo.variables,
      saveInfo.visitedNodeIds,
      engine?.getGlobalFlags() ?? {},
      undefined,
      captureScreenshot()
    )
    ElMessage.success(`💾 已存档: ${saveInfo.slotLabel}`)
  })

  engine.onAchievementUnlock((id: string, name: string) => {
    achievementStore.unlockAchievement(id)
    ElMessage.success({
      message: `🏆 成就已解锁: ${name}`,
      duration: 3000,
      showClose: true
    })
  })

  engine.onEnd(() => {})
  engine.onDialogue((char: string, text: string, nodeId: string) => {
    dialogueLog.value.push({ character: char, text, nodeId })
  })

  const firstNode = flowStore.nodes[0]
  if (firstNode) {
    engine.startFrom(firstNode.id)
  }
}

function getGlobalFlags(): Record<string, boolean> {
  return { ...variableStore.globalFlags }
}

function captureScreenshot(): string | undefined {
  try {
    const canvas = canvasContainer.value?.querySelector('canvas')
    if (canvas) return canvas.toDataURL('image/jpeg', 0.6)
  } catch { /* WebGL context may not support toDataURL */ }
  return undefined
}

function makeSave(slot?: number): void {
  if (!engine || !projectStore.meta) return
  const state = engine.getSaveState()
  if (!state.currentNodeId) return
  const label = slot ? `存档位 ${slot}` : undefined
  saveStore.createSave(
    projectStore.meta.name,
    state.currentNodeId,
    debugInfo.currentNodeLabel || state.currentNodeId,
    state.variables,
    state.visitedNodeIds,
    { ...state.globalFlags },
    label,
    captureScreenshot()
  )
}

function manualSave(): void { makeSave() }

function getSlotSave(slot: number) {
  return saveStore.saves[slot - 1] ?? null
}

function saveToSlot(slot: number): void { makeSave(slot) }

function loadSlotSave(slot: number): void {
  if (!engine) return
  const save = getSlotSave(slot)
  if (!save) return
  engine.loadSaveState({
    currentNodeId: save.currentNodeId,
    variables: save.variables,
    visitedNodeIds: save.visitedNodeIds,
    globalFlags: save.globalFlags
  })
  isRunning.value = false
  saveDialogVisible.value = false
}

function onRollback(idx: number): void {
  const entry = dialogueLog.value[idx]
  if (entry && engine) {
    engine.renderNode(entry.nodeId)
    dialogueLog.value = dialogueLog.value.slice(0, idx)
  }
  backlogVisible.value = false
}

function deleteSlotSave(slot: number): void {
  const save = getSlotSave(slot)
  if (save) saveStore.deleteSave(save.id)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function onClose() {
  stopAutoPlay()
  if (engine) {
    const info = engine.getDebugInfo()
    const ids = info.visitedNodes.map((n) => n.id)
    flowStore.markNodesCovered(ids)
    // 保存全局标记回 store（跨周目持久化）
    const flags = engine.getGlobalFlags()
    for (const [key, val] of Object.entries(flags)) {
      if (val) {
        variableStore.setGlobalFlag(key, val)
      }
    }
    // 回写成就解锁状态
    const unlockedAchs = engine.getAchievements().filter(a => a.unlocked)
    for (const ach of unlockedAchs) {
      achievementStore.unlockAchievement(ach.id)
    }
    engine.destroy()
  }
  engine = null
  showDebug.value = false
}

function next() {
  engine?.next()
}

function restart() {
  flowStore.clearCoverage()
  engine?.restart()
  isRunning.value = false
}

function autoPlay() {
  if (!engine) return
  engine.startAutoPlay()
  isRunning.value = true
}

function stopAutoPlay() {
  if (!engine) return
  engine.stopAutoPlay()
  isRunning.value = false
}

function resume() {
  engine?.resume()
}

function skipToEnd() {
  if (!engine) return
  engine.skipToEnd()
}

function onSpeedChange(val: number) {
  engine?.setAutoSpeed(val)
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') { panicVisible.value = !panicVisible.value }
}
function handleCanvasClick() { engine?.next() }

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  engine?.destroy()
})
</script>

<style scoped>
.preview-layout {
  display: flex;
  align-items: flex-start;
  height: 720px;
}

.canvas-container {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  line-height: 0;
  flex-shrink: 0;
  width: 1280px;
  height: 720px;
}

.preview-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.save-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.save-list-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.save-slots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.save-slot { border-radius: 8px; border: 2px dashed var(--border-color); min-height: 140px; position: relative; overflow: hidden; }
.save-slot.has-save { border-style: solid; border-color: var(--color-green); }
.save-slot.empty { cursor: pointer; display: flex; align-items: center; justify-content: center; }
.save-slot.empty:hover { border-color: var(--accent-pink); background: var(--bg-hover); }
.slot-content { display: flex; gap: 10px; padding: 10px; }
.slot-thumb { width: 80px; height: 60px; border-radius: 4px; overflow: hidden; flex-shrink: 0; background: #1a1a2e; display: flex; align-items: center; justify-content: center; }
.slot-img { width: 100%; height: 100%; object-fit: cover; }
.slot-thumb-nothumb { font-size: 24px; color: var(--text-dim); }
.slot-info { flex: 1; min-width: 0; }
.slot-label { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }
.slot-date { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.slot-node { font-size: 11px; color: var(--text-dim); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.slot-actions { display: flex; flex-direction: column; gap: 4px; }
.slot-empty { text-align: center; padding: 20px; }
.slot-num { font-size: 14px; font-weight: 600; color: var(--text-dim); }
.slot-hint { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.panic-overlay { position: fixed; inset: 0; z-index: 10000; background: #1a1a2e; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.panic-content { text-align: center; }
.panic-icon { font-size: 80px; margin-bottom: 16px; }
.panic-title { font-size: 28px; font-weight: 700; color: #e8e8e8; margin-bottom: 8px; }
.panic-hint { font-size: 14px; color: #64748b; }
</style>
