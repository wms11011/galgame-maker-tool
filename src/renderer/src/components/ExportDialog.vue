<template>
  <el-dialog v-model="visible" title="导出项目" width="480px" :close-on-click-modal="false">
    <el-form :model="config" label-width="100px" :disabled="exporting">
      <!-- 导出类型 -->
      <el-form-item label="导出类型">
        <el-radio-group v-model="config.type">
          <el-radio value="web">网页版</el-radio>
          <el-radio value="desktop">桌面版</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 分辨率 -->
      <el-form-item label="分辨率">
        <el-select v-model="config.resolution">
          <el-option label="1280×720" value="1280x720" />
          <el-option label="1920×1080" value="1920x1080" />
        </el-select>
      </el-form-item>

      <!-- 输出路径 -->
      <el-form-item label="输出路径">
        <div class="path-row">
          <el-input v-model="config.outputPath" placeholder="选择输出目录" readonly />
          <el-button @click="selectOutputPath">浏览</el-button>
        </div>
      </el-form-item>

      <!-- 压缩资源 -->
      <el-form-item label="压缩资源">
        <el-switch v-model="config.compressAssets" />
      </el-form-item>

      <!-- 调试信息 -->
      <el-form-item label="调试信息">
        <el-switch v-model="config.includeDebugInfo" />
      </el-form-item>

      <!-- 自定义图标 -->
      <el-form-item label="自定义图标">
        <div class="path-row">
          <el-input v-model="config.customIcon" placeholder="选择图标文件 (.ico/.png)" readonly />
          <el-button @click="selectIcon">选择</el-button>
        </div>
      </el-form-item>

      <!-- 桌面版目标平台 -->
      <el-form-item v-if="config.type === 'desktop'" label="目标平台">
        <el-checkbox-group v-model="config.targetPlatforms">
          <el-checkbox value="win">Windows</el-checkbox>
          <el-checkbox value="mac">macOS</el-checkbox>
          <el-checkbox value="linux">Linux</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </el-form>

    <!-- 进度条 -->
    <div v-if="exporting || exportDone" class="progress-section">
      <div class="progress-stage">{{ progressStage }}</div>
      <el-progress :percentage="progressPercent" :status="exportDone ? 'success' : undefined" />
    </div>

    <!-- 错误提示 -->
    <el-alert v-if="exportError" :title="exportError" type="error" :closable="false" class="mt-8" />

    <template #footer>
      <el-button v-if="exportDone" @click="openOutputDir">打开输出目录</el-button>
      <el-button @click="visible = false" :disabled="exporting">取消</el-button>
      <el-button type="primary" @click="startExport" :loading="exporting" :disabled="exportDone">
        开始导出
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { ExportConfig, ProjectData } from '../types/index'
import { useProjectStore } from '../stores/projectStore'
import { useFlowStore } from '../stores/flowStore'
import { useAssetStore } from '../stores/assetStore'
import { useVariableStore } from '../stores/variableStore'
import { useCharacterStore } from '../stores/characterStore'
import { useAchievementStore } from '../stores/achievementStore'

const visible = defineModel<boolean>({ default: false })

// 每次打开弹窗时重置导出状态
watch(visible, (val) => {
  if (val) {
    exportDone.value = false
    exportError.value = ''
    progressStage.value = ''
    progressPercent.value = 0
  }
})

const config = reactive<ExportConfig>({
  type: 'web',
  resolution: '1280x720',
  outputPath: '',
  compressAssets: true,
  includeDebugInfo: false,
  targetPlatforms: ['win']
})

const exporting = ref(false)
const exportDone = ref(false)
const exportError = ref('')
const progressStage = ref('')
const progressPercent = ref(0)

function assembleProjectData(): ProjectData {
  const projectStore = useProjectStore()
  const flowStore = useFlowStore()
  const assetStore = useAssetStore()
  const variableStore = useVariableStore()
  const characterStore = useCharacterStore()
  const achievementStore = useAchievementStore()

  // 手动提取纯数据：VueFlow 节点/边包含内部对象（handleBounds、events等），
  // 直接序列化会因循环引用/不可克隆对象而失败
  const plainNodes = flowStore.nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: { x: n.position.x, y: n.position.y },
    data: { ...n.data }
  }))
  const plainEdges = flowStore.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label || undefined
  }))
  const plainAssets = assetStore.assets.map(a => ({
    name: a.name,
    type: a.type,
    relativePath: a.relativePath,
    size: a.size
  }))
  const plainVars = variableStore.variables.map(v => ({
    name: v.name,
    type: (v as import('@renderer/types').VariableInfo).type || 'number',
    initialValue: v.initialValue,
    description: v.description
  }))
  const plainChars = characterStore.characters.map(c => ({
    name: c.name,
    personality: c.personality,
    bio: c.bio,
    sprite: c.sprite
  }))
  const plainGroups = flowStore.groups.map(g => ({
    id: g.id,
    name: g.name,
    color: g.color,
    nodeIds: [...g.nodeIds],
    background: g.background,
    titleCard: g.titleCard,
    bgm: g.bgm,
    bgmVolume: g.bgmVolume,
    bgmLoop: g.bgmLoop,
    defaultBackground: g.defaultBackground,
    unlockCondition: g.unlockCondition
  }))
  const plainAchs = achievementStore.achievements.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    color: a.color,
    unlocked: false,
    unlockCondition: a.unlockCondition,
    autoCheck: a.autoCheck
  }))

  return {
    meta: {
      name: projectStore.meta?.name || '',
      version: projectStore.meta?.version || '1.0.0',
      resolution: projectStore.meta?.resolution || '1280x720',
      projectPath: projectStore.meta?.projectPath || '',
      createdAt: projectStore.meta?.createdAt || '',
      updatedAt: projectStore.meta?.updatedAt || ''
    },
    flow: { nodes: plainNodes, edges: plainEdges },
    script: projectStore.script,
    assets: plainAssets,
    variables: plainVars,
    globalFlags: { ...variableStore.globalFlags },
    flagAliases: { ...variableStore.flagAliases },
    characters: plainChars,
    groups: plainGroups,
    achievements: plainAchs
  }
}

async function selectIcon() {
  const result = await window.electronAPI.showOpenDialog({
    title: '选择图标文件',
    filters: [
      { name: '图标文件', extensions: ['ico', 'png', 'icns'] }
    ],
    properties: ['openFile']
  })
  if (result && result.success && result.data && result.data.length > 0) {
    config.customIcon = result.data[0]
  }
}

async function selectOutputPath() {
  const result = await window.electronAPI.showOpenDialog({
    title: '选择输出目录',
    properties: ['openDirectory']
  })
  if (result && result.success && result.data && result.data.length > 0) {
    config.outputPath = result.data[0]
  }
}

async function startExport() {
  if (!config.outputPath) {
    exportError.value = '请先选择输出目录'
    return
  }

  exporting.value = true
  exportDone.value = false
  exportError.value = ''
  progressPercent.value = 0

  const unsubProgress = window.electronAPI.onExportProgress((stage, percent) => {
    progressStage.value = stage
    progressPercent.value = percent
  })

  try {
    const projectData = assembleProjectData()
    // 在渲染进程侧先 JSON 序列化，确保穿过 contextBridge 的是纯字符串而非 Vue 代理对象
    const payload = JSON.stringify({
      projectData,
      config: { ...config, includeDebugInfo: config.includeDebugInfo }
    })
    const result = await window.electronAPI.exportProject(payload)
    if (result?.success) {
      progressPercent.value = 100
      progressStage.value = '导出完成'
      exportDone.value = true
    } else {
      exportError.value = result?.error ?? '导出失败'
    }
  } catch (err) {
    exportError.value = err instanceof Error ? err.message : String(err)
  } finally {
    unsubProgress()
    exporting.value = false
  }
}

function openOutputDir() {
  if (config.outputPath) {
    window.electronAPI.openDirectory(config.outputPath)
  }
}
</script>

<style scoped>
.path-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.progress-section {
  margin-top: 16px;
}

.progress-stage {
  font-size: 13px;
  color: var(--text-dim);
  margin-bottom: 6px;
}

.mt-8 {
  margin-top: 8px;
}
</style>
