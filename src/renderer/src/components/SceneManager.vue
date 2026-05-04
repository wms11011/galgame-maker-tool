<template>
  <div class="scene-manager">
    <div class="panel-header">
      <span class="panel-title">场景分组</span>
      <el-button size="small" text @click="onAddGroup">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>
    <div class="panel-body">
      <div v-if="flowStore.groups.length === 0" class="empty-hint">
        暂无分组，点击 + 创建
      </div>
      <div
        v-for="group in flowStore.groups"
        :key="group.id"
        class="group-item"
      >
        <div class="group-header" @click="toggleExpand(group.id)">
          <span class="expand-icon">{{ expanded.has(group.id) ? '▾' : '▸' }}</span>
          <span
            class="group-color-dot"
            :style="{ background: group.color }"
            @click.stop="showColorPicker(group)"
          ></span>
          <span class="group-name">{{ group.name }}</span>
          <span class="group-count">{{ group.nodeIds.length }}</span>
          <el-button
            class="group-action"
            size="small"
            text
            title="将选中节点加入此分组"
            @click.stop="captureSelected(group.id)"
          >
            <el-icon><Plus /></el-icon>
          </el-button>
          <el-button
            class="group-action"
            size="small"
            text
            @click.stop="onRenameGroup(group)"
          >
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button
            class="group-action"
            size="small"
            text
            @click.stop="onDeleteGroup(group.id)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <div v-show="expanded.has(group.id)" class="group-nodes">
          <!-- 章节设置 -->
          <div class="group-settings">
            <div class="setting-row">
              <span class="setting-label">章节标题卡</span>
              <el-switch
                :model-value="group.titleCard ?? false"
                size="small"
                @change="(v: boolean) => flowStore.setGroupTitleCard(group.id, v)"
              />
            </div>
            <div v-if="group.titleCard" class="setting-row">
              <span class="setting-label">背景图</span>
              <el-select
                :model-value="group.background || ''"
                placeholder="可选章节背景"
                size="small"
                clearable
                style="flex:1;"
                @change="(v: string) => flowStore.setGroupBackground(group.id, v)"
              >
                <el-option
                  v-for="asset in imageAssets"
                  :key="asset.relativePath"
                  :label="asset.name"
                  :value="asset.relativePath"
                />
              </el-select>
            </div>
            <div v-if="group.titleCard && group.background" class="bg-preview">
              <img :src="getBgPreviewUrl(group.background)" class="bg-thumb" />
            </div>

            <!-- 章节 BGM -->
            <div class="setting-row">
              <span class="setting-label">BGM</span>
              <el-select
                :model-value="group.bgm || ''"
                placeholder="选择背景音乐"
                size="small"
                clearable
                style="flex:1;"
                @change="(v: string) => flowStore.setGroupBgm(group.id, v)"
              >
                <el-option
                  v-for="asset in audioAssets"
                  :key="asset.relativePath"
                  :label="asset.name"
                  :value="asset.relativePath"
                />
              </el-select>
            </div>
            <div v-if="group.bgm" class="setting-row">
              <span class="setting-label">BGM 音量</span>
              <el-slider
                :model-value="group.bgmVolume ?? 0.7"
                :min="0"
                :max="1"
                :step="0.1"
                size="small"
                style="flex:1;"
                @change="(v: number) => flowStore.setGroupBgmVolume(group.id, v)"
              />
            </div>
            <div v-if="group.bgm" class="setting-row">
              <span class="setting-label">循环播放</span>
              <el-switch
                :model-value="group.bgmLoop ?? true"
                size="small"
                @change="(v: boolean) => flowStore.setGroupBgmLoop(group.id, v)"
              />
            </div>

            <!-- 章节默认背景 -->
            <div class="setting-row">
              <span class="setting-label">默认背景</span>
              <el-select
                :model-value="group.defaultBackground || ''"
                placeholder="节点默认背景"
                size="small"
                clearable
                style="flex:1;"
                @change="(v: string) => flowStore.setGroupDefaultBg(group.id, v)"
              >
                <el-option
                  v-for="asset in imageAssets"
                  :key="asset.relativePath"
                  :label="asset.name"
                  :value="asset.relativePath"
                />
              </el-select>
            </div>

            <!-- 章节解锁条件 -->
            <div class="setting-row">
              <span class="setting-label">解锁条件</span>
              <el-input
                :model-value="group.unlockCondition || ''"
                placeholder="如: 小樱好感度 >= 50"
                size="small"
                clearable
                style="flex:1;"
                @change="(v: string) => flowStore.setGroupUnlockCondition(group.id, v)"
              />
            </div>
            <!-- 章节转场效果 -->
            <div class="setting-row">
              <span class="setting-label">转场效果</span>
              <el-select
                :model-value="group.transition || 'none'"
                size="small"
                style="flex:1;"
                @change="(v: any) => flowStore.setGroupTransition(group.id, v)"
              >
                <el-option label="无" value="none" />
                <el-option label="淡入淡出" value="fade" />
                <el-option label="滑入" value="slide" />
                <el-option label="百叶窗" value="blinds" />
                <el-option label="马赛克" value="mosaic" />
                <el-option label="风吹" value="wind" />
                <el-option label="光圈" value="iris" />
                <el-option label="溶解" value="dissolve" />
              </el-select>
            </div>
            <!-- 粒子特效 -->
            <div class="setting-row">
              <span class="setting-label">粒子特效</span>
              <el-select :model-value="group.particlePreset || ''" size="small" style="flex:1;" clearable
                @change="(v: any) => flowStore.setGroupParticlePreset(group.id, v || '')">
                <el-option label="无" value="" />
                <el-option label="❄ 雪" value="snow" />
                <el-option label="🌧 雨" value="rain" />
                <el-option label="🌸 樱花" value="sakura" />
                <el-option label="🍂 落叶" value="leaf" />
                <el-option label="⭐ 星星" value="star" />
              </el-select>
            </div>
          </div>
          <!-- 节点列表 -->
          <div
            v-for="nodeId in group.nodeIds"
            :key="nodeId"
            class="group-node-item"
            @click="focusNode(nodeId)"
          >
            <span class="node-type-icon">{{ getNodeIcon(nodeId) }}</span>
            <span class="node-label">{{ getNodeLabel(nodeId) }}</span>
            <el-button
              class="node-remove-btn"
              size="small"
              text
              @click.stop="flowStore.removeNodeFromGroup(group.id, nodeId)"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <div v-if="group.nodeIds.length === 0" class="no-nodes">
            拖拽节点到此处
          </div>
        </div>
      </div>
    </div>

    <!-- 颜色选择器弹窗 -->
    <div v-if="colorPickerGroupId" class="color-picker-overlay" @click="colorPickerGroupId = ''">
      <div class="color-picker-popup" @click.stop>
        <div class="color-presets">
          <span
            v-for="c in presetColors"
            :key="c"
            class="color-swatch"
            :class="{ active: selectedColor === c }"
            :style="{ background: c }"
            @click="selectedColor = c"
          ></span>
        </div>
        <div class="color-picker-actions">
          <el-button size="small" @click="colorPickerGroupId = ''">取消</el-button>
          <el-button size="small" type="primary" @click="applyColor">确定</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Edit, Delete, Close } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useFlowStore } from '@renderer/stores/flowStore'
import { useAssetStore } from '@renderer/stores/assetStore'
import { useProjectStore } from '@renderer/stores/projectStore'
import { getAssetUrl } from '@renderer/utils/assetUrl'

const flowStore = useFlowStore()
const assetStore = useAssetStore()
const projectStore = useProjectStore()
const expanded = ref<Set<string>>(new Set())

const imageAssets = computed(() => assetStore.assets.filter(a => a.type === 'image' && a.category === 'background'))
const audioAssets = computed(() => assetStore.assets.filter(a => a.type === 'audio'))

function getBgPreviewUrl(relativePath: string): string {
  const projectPath = projectStore.meta?.projectPath
  if (!projectPath) return ''
  return getAssetUrl(projectPath, relativePath)
}

const presetColors = [
  '#A088D0', '#6BA4D8', '#74B88A', '#F0A060',
  '#E88080', '#DDC050', '#A088D0', '#64B0BC',
  '#D8A030', '#E890A8', '#60B0A0', '#A89888'
]

const colorPickerGroupId = ref('')
const selectedColor = ref('#6366f1')

function toggleExpand(groupId: string): void {
  const next = new Set(expanded.value)
  if (next.has(groupId)) next.delete(groupId)
  else next.add(groupId)
  expanded.value = next
}

function onAddGroup(): void {
  ElMessageBox.prompt('请输入场景名称', '新建场景', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValidator: (val) => val.trim() ? true : '名称不能为空'
  }).then(({ value }) => {
    if (value) {
      const id = flowStore.addGroup(value.trim())
      const next = new Set(expanded.value)
      next.add(id)
      expanded.value = next
    }
  }).catch(() => {})
}

function onRenameGroup(group: { id: string; name: string }): void {
  ElMessageBox.prompt('请输入新名称', '重命名场景', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: group.name,
    inputValidator: (val) => val.trim() ? true : '名称不能为空'
  }).then(({ value }) => {
    if (value) flowStore.renameGroup(group.id, value.trim())
  }).catch(() => {})
}

function onDeleteGroup(groupId: string): void {
  ElMessageBox.confirm('确定要删除此场景分组吗？节点不会被删除。', '删除场景', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    flowStore.removeGroup(groupId)
    ElMessage.success('场景已删除')
  }).catch(() => {})
}

function showColorPicker(group: { id: string; color: string }): void {
  colorPickerGroupId.value = group.id
  selectedColor.value = group.color
}

function applyColor(): void {
  if (colorPickerGroupId.value) {
    flowStore.setGroupColor(colorPickerGroupId.value, selectedColor.value)
    colorPickerGroupId.value = ''
  }
}

function getNodeIcon(nodeId: string): string {
  const n = flowStore.nodes.find(x => x.id === nodeId)
  if (!n) return '○'
  const icons: Record<string, string> = {
    dialog: '💬', choice: '🔀', condition: '⚡', setVariable: '📊',
    goto: '⏭️', end: '🏁', audio: '🎵', cg: '🖼️',
    wait: '⏳', random: '🎲', label: '🏷️', animation: '🎬', savePoint: '💾'
  }
  return icons[n.type] ?? '○'
}

function getNodeLabel(nodeId: string): string {
  const n = flowStore.nodes.find(x => x.id === nodeId)
  return n?.data?.label ?? nodeId
}

function captureSelected(groupId: string): void {
  if (flowStore.selectedNodeId) {
    flowStore.addNodeToGroup(groupId, flowStore.selectedNodeId)
    const next = new Set(expanded.value)
    next.add(groupId)
    expanded.value = next
  }
}

function focusNode(nodeId: string): void {
  flowStore.selectedNodeId = nodeId
}
</script>

<style scoped>
.scene-manager {
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

.empty-hint {
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
  padding: var(--space-xl) 0;
}

.group-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-fast);
}

.group-header:hover {
  background: var(--bg-hover);
}

.expand-icon {
  font-size: 10px;
  color: var(--text-muted);
  width: 12px;
}

.group-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color var(--transition-fast);
}

.group-color-dot:hover {
  border-color: var(--text-muted);
}

.group-name {
  flex: 1;
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-input);
  padding: 1px 6px;
  border-radius: 10px;
}

.group-action {
  padding: 2px !important;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.group-header:hover .group-action {
  opacity: 1;
}

.group-nodes {
  border-top: 1px solid var(--border-color);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-settings {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-bottom: 1px dashed var(--border-color);
  margin-bottom: 4px;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-sm);
}

.setting-label {
  color: var(--text-muted);
  white-space: nowrap;
  min-width: 70px;
}

.bg-preview {
  display: flex;
  justify-content: center;
}

.bg-thumb {
  width: 100%;
  max-height: 60px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.group-node-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--text-sm);
  transition: background var(--transition-fast);
}

.group-node-item:hover {
  background: var(--bg-hover);
}

.node-type-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-remove-btn {
  padding: 0 !important;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.group-node-item:hover .node-remove-btn {
  opacity: 1;
}

.no-nodes {
  text-align: center;
  color: var(--text-muted);
  font-size: 11px;
  padding: 8px 0;
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  margin: 2px 0;
}

.color-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-picker-popup {
  background: var(--bg-overlay);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
}

.color-presets {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: var(--space-md);
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.color-swatch:hover {
  transform: scale(1.15);
}

.color-swatch.active {
  border-color: var(--text-primary);
  transform: scale(1.1);
}

.color-picker-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}
</style>
