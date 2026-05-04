<template>
  <div class="main-layout">
    <!-- Top toolbar -->
    <header class="toolbar">
      <div class="toolbar-left">
        <span class="project-icon">🌸</span>
        <span class="project-name">{{ projectStore.meta?.name ?? '未命名项目' }}</span>
        <el-tag v-if="flowStore.isDirty" type="warning" size="small" round>未保存</el-tag>
      </div>

      <div class="toolbar-center">
        <div class="view-switcher">
          <button
            v-for="v in views"
            :key="v.key"
            class="view-btn"
            :class="{ active: uiStore.activeView === v.key }"
            @click="uiStore.switchView(v.key)"
          >
            <span class="view-icon">{{ v.icon }}</span>
            <span class="view-label">{{ v.label }}</span>
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <el-tooltip content="撤销 Ctrl+Z" placement="bottom">
          <el-button size="small" :icon="RefreshLeft" @click="onUndo" :disabled="flowStore.snapshotCount <= 0" />
        </el-tooltip>
        <el-tooltip content="重做 Ctrl+Y" placement="bottom">
          <el-button size="small" :icon="RefreshRight" @click="onRedo" />
        </el-tooltip>
        <el-button size="small" @click="syncCode" :icon="Refresh">
          同步代码
        </el-button>
        <el-button size="small" @click="saveProject">💾 保存</el-button>
        <el-button size="small" type="primary" @click="uiStore.previewWindowOpen = true">
          ▶ 预览
        </el-button>
        <el-button size="small" @click="galleryVisible = true">🖼 CG鉴赏</el-button>
        <el-button size="small" @click="musicVisible = true">🎵 音乐鉴赏</el-button>
        <el-button size="small" @click="spriteVisible = true">🎭 立绘鉴赏</el-button>
        <el-button size="small" @click="voiceVisible = true">🎙 语音收藏</el-button>
        <el-button size="small" @click="favsVisible = true">⭐ 收藏夹</el-button>
        <el-button size="small" @click="exportDialogVisible = true">📦 导出</el-button>
        <button
          class="theme-toggle"
          @click="uiStore.setTheme(uiStore.theme === 'dark' ? 'light' : 'dark')"
          :title="uiStore.theme === 'dark' ? '切换到浅色' : '切换到深色'"
        >
          {{ uiStore.theme === 'dark' ? '☀️' : '🌙' }}
        </button>
      </div>
    </header>

    <!-- Editor body: three-column layout -->
    <div class="editor-body">
      <!-- Left panel -->
      <aside v-if="uiStore.leftPanelVisible" class="left-panel">
        <el-tabs v-model="leftTab" class="panel-tabs">
          <el-tab-pane label="节点" name="nodes">
            <NodePanel />
          </el-tab-pane>
          <el-tab-pane label="角色" name="characters">
            <CharacterManager />
          </el-tab-pane>
          <el-tab-pane label="资源" name="assets">
            <AssetManager />
          </el-tab-pane>
          <el-tab-pane label="变量" name="variables">
            <VariableManager />
          </el-tab-pane>
          <el-tab-pane label="标记" name="flags">
            <GlobalFlagManager />
          </el-tab-pane>
          <el-tab-pane label="场景" name="scenes">
            <SceneManager />
          </el-tab-pane>
          <el-tab-pane label="成就" name="achievements">
            <AchievementManager />
          </el-tab-pane>
          <el-tab-pane label="道具" name="items">
            <ItemManager />
          </el-tab-pane>
          <el-tab-pane label="词典" name="glossary">
            <GlossaryEditor />
          </el-tab-pane>
          <el-tab-pane label="AI助手" name="ai">
            <AiAssistantPanel />
          </el-tab-pane>
        </el-tabs>
      </aside>

      <!-- Left panel toggle -->
      <button class="panel-toggle left-toggle" @click="uiStore.togglePanel('left')" :title="uiStore.leftPanelVisible ? '收起' : '展开'">
        <span class="toggle-arrow">{{ uiStore.leftPanelVisible ? '◀' : '▶' }}</span>
      </button>

      <!-- Center editor area -->
      <main class="editor-main">
        <FlowEditor v-show="uiStore.activeView === 'flow'" />
        <StoryTree v-show="uiStore.activeView === 'story-tree'" />
        <CodeEditor
          v-show="uiStore.activeView === 'code'"
          ref="codeEditorRef"
          @change="onCodeChange"
        />
      </main>

      <!-- Right panel toggle -->
      <button class="panel-toggle right-toggle" @click="uiStore.togglePanel('right')" :title="uiStore.rightPanelVisible ? '收起' : '展开'">
        <span class="toggle-arrow">{{ uiStore.rightPanelVisible ? '▶' : '◀' }}</span>
      </button>

      <!-- Right property panel -->
      <aside v-if="uiStore.rightPanelVisible" class="right-panel">
        <PropertyPanel />
      </aside>
    </div>

    <!-- Overlays -->
    <PreviewWindow />
    <ExportDialog v-model="exportDialogVisible" />
    <NodeSearch :visible="searchVisible" @close="searchVisible = false" />
    <CgGallery :visible="galleryVisible" @close="galleryVisible = false" />
    <MusicRoom :visible="musicVisible" @close="musicVisible = false" />
    <SpriteViewer :visible="spriteVisible" @close="spriteVisible = false" />
    <VoiceCollection :visible="voiceVisible" @close="voiceVisible = false" />
    <FavoritesPanel ref="favsRef" :visible="favsVisible" @close="favsVisible = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Refresh, RefreshLeft, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUIStore } from '../stores/uiStore'
import { useFlowStore } from '../stores/flowStore'
import { useProjectStore } from '../stores/projectStore'
import { useRouter } from 'vue-router'
import FlowEditor from '../components/FlowEditor.vue'
import StoryTree from '../components/StoryTree.vue'
import CodeEditor from '../components/CodeEditor.vue'
import NodePanel from '../components/NodePanel.vue'
import PropertyPanel from '../components/PropertyPanel.vue'
import AssetManager from '../components/AssetManager.vue'
import PreviewWindow from '../components/PreviewWindow.vue'
import ExportDialog from '../components/ExportDialog.vue'
import VariableManager from '../components/VariableManager.vue'
import GlobalFlagManager from '../components/GlobalFlagManager.vue'
import SceneManager from '../components/SceneManager.vue'
import CharacterManager from '../components/CharacterManager.vue'
import ItemManager from '../components/ItemManager.vue'
import NodeSearch from '../components/NodeSearch.vue'
import CgGallery from '../components/CgGallery.vue'
import MusicRoom from '../components/MusicRoom.vue'
import SpriteViewer from '../components/SpriteViewer.vue'
import VoiceCollection from '../components/VoiceCollection.vue'
import GlossaryEditor from '../components/GlossaryEditor.vue'
import FavoritesPanel from '../components/FavoritesPanel.vue'
import AchievementManager from '../components/AchievementManager.vue'
import AiAssistantPanel from '../components/AiAssistantPanel.vue'
import { scriptToFlow } from '../utils/mappingEngine'

const router = useRouter()
const uiStore = useUIStore()
const flowStore = useFlowStore()
const projectStore = useProjectStore()

const views = [
  { key: 'flow' as const, icon: '🔀', label: '流程图' },
  { key: 'story-tree' as const, icon: '🌳', label: '剧情树' },
  { key: 'code' as const, icon: '📝', label: '代码' }
]

const leftTab = ref('nodes')
const exportDialogVisible = ref(false)
const searchVisible = ref(false)
const galleryVisible = ref(false)
const musicVisible = ref(false)
const spriteVisible = ref(false)
const voiceVisible = ref(false)
const favsVisible = ref(false)
const favsRef = ref()
const codeEditorRef = ref()

function syncCode() {
  if (flowStore.nodes.length === 0) {
    ElMessage.warning('流程图中没有节点')
    return
  }
  try {
    projectStore.syncScriptFromFlow()
    ElMessage.success('代码同步成功')
  } catch (error) {
    ElMessage.error('代码生成失败: ' + (error as Error).message)
  }
}

async function saveProject() {
  if (uiStore.activeView === 'code' && codeEditorRef.value) {
    const currentValue = codeEditorRef.value.getValue()
    if (currentValue !== projectStore.script) {
      projectStore.script = currentValue
    }
  }
  const success = await projectStore.saveProject()
  if (success) {
    ElMessage.success('项目保存成功')
  } else {
    ElMessage.error('项目保存失败')
  }
}

function onCodeChange(value: string) {
  projectStore.script = value
  flowStore.isDirty = true

  // 脚本 → 流程图同步（带错误容错）
  const result = scriptToFlow(value)
  if (result.success && result.nodes.length > 0) {
    // 保留已有节点的位置信息
    const existingPositions = new Map(flowStore.nodes.map(n => [n.id, n.position]))
    const mergedNodes = result.nodes.map(n => ({
      ...n,
      position: existingPositions.get(n.id) ?? n.position ?? { x: 0, y: 0 }
    }))
    flowStore.loadFlow(mergedNodes, result.edges)
  }
  if (result.errors.length > 0 && codeEditorRef.value) {
    codeEditorRef.value.clearErrors()
    for (const err of result.errors) {
      codeEditorRef.value.addError(err.line ?? 1, err.message)
    }
  }
}

watch(
  () => projectStore.script,
  (newScript) => {
    if (codeEditorRef.value && codeEditorRef.value.getValue() !== newScript) {
      codeEditorRef.value.setValue(newScript)
    }
  },
  { immediate: true }
)

async function handleShortcut(event: string) {
  switch (event) {
    case 'shortcut:save':
    case 'menu:save-project':
      saveProject()
      break
    case 'shortcut:undo':
    case 'menu:undo':
      flowStore.undo()
      break
    case 'shortcut:redo':
    case 'menu:redo':
      flowStore.redo()
      break
    case 'shortcut:preview':
    case 'menu:preview':
      uiStore.previewWindowOpen = true
      break
    case 'menu:new-project': {
      try {
        const { value: name } = await ElMessageBox.prompt('请输入项目名称', '新建项目', {
          confirmButtonText: '下一步',
          cancelButtonText: '取消',
          inputValidator: (val) => val.trim() ? true : '项目名称不能为空'
        })
        if (!name) return
        const result = await window.electronAPI.showOpenDialog({
          title: '选择保存目录',
          properties: ['openDirectory']
        })
        if (result && result.success && result.data && result.data.length > 0) {
          await projectStore.createProject(name.trim(), result.data[0])
          if (projectStore.isOpen) {
            router.push('/editor')
          }
        }
      } catch { /* cancelled */ }
      break
    }
    case 'menu:open-project': {
      try {
        await projectStore.openProject()
        if (projectStore.isOpen) {
          router.push('/editor')
        }
      } catch (err) {
        ElMessage.error(err instanceof Error ? err.message : '打开失败')
      }
      break
    }
    case 'menu:toggle-panel':
      uiStore.togglePanel('left')
      break
  }
}

const shortcutEvents = [
  'shortcut:save', 'shortcut:undo', 'shortcut:redo', 'shortcut:preview',
  'menu:save-project', 'menu:undo', 'menu:redo', 'menu:preview',
  'menu:new-project', 'menu:open-project', 'menu:toggle-panel'
] as const

const eventHandlers: Record<string, () => void> = {}
for (const evt of shortcutEvents) {
  eventHandlers[evt] = () => handleShortcut(evt)
}

function onUndo(): void { flowStore.undo() }
function onRedo(): void { flowStore.redo() }

function onKeydown(e: KeyboardEvent): void {
  // Ctrl+K → 节点搜索
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    searchVisible.value = !searchVisible.value
    return
  }
  // Ctrl+Z → 撤销 (不拦截输入框中的默认行为)
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    const tag = (e.target as HTMLElement).tagName
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable) {
      e.preventDefault()
      onUndo()
    }
  }
  // Ctrl+Y 或 Ctrl+Shift+Z → 重做
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    const tag = (e.target as HTMLElement).tagName
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable) {
      e.preventDefault()
      onRedo()
    }
  }
}

onMounted(() => {
  for (const evt of shortcutEvents) {
    window.addEventListener(evt, eventHandlers[evt])
  }
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  for (const evt of shortcutEvents) {
    window.removeEventListener(evt, eventHandlers[evt])
  }
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-page);
  color: var(--text-primary);
  position: relative;
}

/* ── Toolbar ── */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 var(--space-lg);
  background: linear-gradient(135deg, #FFF8F4 0%, #FFEDE0 50%, #FFF3EC 100%);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  position: relative;
  z-index: 20;
}

:root[data-theme="dark"] .toolbar {
  background: linear-gradient(135deg, #2A1E18 0%, #302218 50%, #281C16 100%);
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.project-icon {
  font-size: 18px;
}

.project-name {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── View Switcher ── */
.view-switcher {
  display: flex;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 2px;
}

.view-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 14px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--text-muted);
  transition: all var(--transition-fast);
  font-family: inherit;
  white-space: nowrap;
}

.view-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.view-btn.active {
  background: linear-gradient(135deg, var(--accent-pink), var(--accent-coral));
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(240, 160, 168, 0.3);
}

.view-icon {
  font-size: 14px;
}

.view-label {
  font-size: var(--text-sm);
}

/* ── Theme Toggle ── */
.theme-toggle {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  border-color: var(--accent-pink);
  background: var(--bg-hover);
}

/* ── Editor Body ── */
.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  background: var(--bg-canvas);
}

/* ── Side Panels ── */
.left-panel,
.right-panel {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-panel);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
  position: relative;
  z-index: 10;
}

.left-panel {
  border-right: 1px solid var(--border-color);
}

.right-panel {
  border-left: 1px solid var(--border-color);
}

.editor-main {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: var(--bg-canvas);
}

/* ── Panel Toggle Buttons ── */
.panel-toggle {
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  cursor: pointer;
  color: var(--text-muted);
  transition: all var(--transition-fast);
  flex-shrink: 0;
  font-family: inherit;
  padding: 0;
  position: relative;
  z-index: 15;
}

.panel-toggle:hover {
  background: var(--accent-pink);
  color: #fff;
  border-color: var(--accent-pink);
}

.toggle-arrow {
  font-size: 8px;
  transition: transform var(--transition-fast);
}

.left-toggle { border-left: none; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.right-toggle { border-right: none; border-radius: var(--radius-sm) 0 0 var(--radius-sm); }

/* ── Panel Tabs ── */
.panel-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.panel-tabs .el-tabs__header) {
  margin: 0;
  padding: 0 var(--space-sm);
  border-bottom: 1px solid var(--border-color);
}

:deep(.panel-tabs .el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

:deep(.panel-tabs .el-tab-pane) {
  height: 100%;
}
</style>
