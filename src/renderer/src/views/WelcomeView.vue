<template>
  <div class="welcome-view">
    <!-- Decorative background elements -->
    <div class="bg-decor">
      <span class="decor-petal p1">🌸</span>
      <span class="decor-petal p2">🍃</span>
      <span class="decor-petal p3">🌸</span>
      <span class="decor-petal p4">✨</span>
      <span class="decor-petal p5">🌸</span>
      <span class="decor-petal p6">🍃</span>
    </div>

    <div class="welcome-content">
      <!-- Logo area -->
      <div class="logo-area">
        <div class="logo-icon">🌸</div>
        <h1 class="title">GALGAME 制作工具</h1>
        <p class="subtitle">可视化剧情创作 · 让故事触手可及</p>
      </div>

      <!-- Action buttons -->
      <div class="action-buttons">
        <button class="btn-primary" @click="showNewProjectDialog = true">
          <span class="btn-icon">✨</span>
          <span>新建项目</span>
        </button>
        <button class="btn-secondary" @click="openProject">
          <span class="btn-icon">📂</span>
          <span>打开项目</span>
        </button>
      </div>

      <!-- Recent projects -->
      <div v-if="projectStore.recentProjects.length > 0" class="recent-section">
        <h3 class="recent-title">
          <span class="recent-icon">🕐</span> 最近项目
        </h3>
        <div class="recent-list">
          <div
            v-for="(meta, idx) in projectStore.recentProjects"
            :key="meta.projectPath"
            class="recent-item"
            :style="{ animationDelay: `${idx * 0.05}s` }"
            @click="openRecentProject(meta.projectPath)"
          >
            <div class="recent-left">
              <span class="recent-emoji">📁</span>
            </div>
            <div class="recent-center">
              <div class="recent-name">{{ meta.name }}</div>
              <div class="recent-path">{{ meta.projectPath }}</div>
            </div>
            <div class="recent-right">
              <span class="recent-date">{{ formatDate(meta.updatedAt) }}</span>
              <span class="recent-arrow">→</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <p class="footer-text">用流程图编织属于你的故事 ✦</p>
    </div>

    <!-- New project dialog -->
    <el-dialog v-model="showNewProjectDialog" title="新建项目" width="420px" :close-on-click-modal="false">
      <el-form :model="newProjectForm" label-width="80px">
        <el-form-item label="项目名称">
          <el-input v-model="newProjectForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="保存路径">
          <div class="path-row">
            <el-input v-model="newProjectForm.path" placeholder="选择保存目录" readonly />
            <el-button @click="selectSavePath">浏览</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNewProjectDialog = false">取消</el-button>
        <el-button type="primary" @click="createProject" :loading="creating">✨ 创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/projectStore'
import { ElMessage } from 'element-plus'

const router = useRouter()
const projectStore = useProjectStore()

const showNewProjectDialog = ref(false)
const creating = ref(false)

const newProjectForm = reactive({ name: '', path: '' })

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

async function selectSavePath() {
  const result = await window.electronAPI.showOpenDialog({
    title: '选择保存目录',
    properties: ['openDirectory']
  })
  if (result && result.success && result.data && result.data.length > 0) {
    newProjectForm.path = result.data[0]
  }
}

async function createProject() {
  if (!newProjectForm.name.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  if (!newProjectForm.path) {
    ElMessage.warning('请选择保存路径')
    return
  }

  creating.value = true
  try {
    await projectStore.createProject(newProjectForm.name.trim(), newProjectForm.path)
    showNewProjectDialog.value = false
    router.push('/editor')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建失败')
  } finally {
    creating.value = false
  }
}

async function openProject() {
  try {
    await projectStore.openProject()
    if (projectStore.isOpen) {
      router.push('/editor')
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '打开失败')
  }
}

async function openRecentProject(projectPath: string) {
  try {
    await projectStore.openProject()
    if (projectStore.isOpen) {
      router.push('/editor')
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '打开失败')
  }
}
</script>

<style scoped>
.welcome-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #FFF3EC 0%, #FFE8D8 30%, #FFEDE4 60%, #FFF5F0 100%);
  color: var(--text-primary);
  position: relative;
  overflow: hidden;
}

/* ── Decorative floating petals ── */
.bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.decor-petal {
  position: absolute;
  font-size: 24px;
  opacity: 0.3;
  animation: floatPetal 8s ease-in-out infinite;
}

.p1 { top: 10%; left: 8%; animation-delay: 0s; font-size: 28px; }
.p2 { top: 20%; right: 12%; animation-delay: 1.5s; font-size: 20px; }
.p3 { top: 60%; left: 5%; animation-delay: 3s; font-size: 22px; }
.p4 { top: 15%; left: 45%; animation-delay: 4.5s; font-size: 18px; }
.p5 { bottom: 20%; right: 8%; animation-delay: 2s; font-size: 26px; }
.p6 { bottom: 30%; left: 15%; animation-delay: 5s; font-size: 20px; }

@keyframes floatPetal {
  0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
  25% { transform: translateY(-12px) rotate(8deg) scale(1.1); }
  50% { transform: translateY(-4px) rotate(-4deg) scale(0.95); }
  75% { transform: translateY(-16px) rotate(4deg) scale(1.05); }
}

.welcome-content {
  text-align: center;
  max-width: 560px;
  width: 100%;
  padding: 0 var(--space-xl);
  position: relative;
  z-index: 1;
}

/* ── Logo Area ── */
.logo-area {
  margin-bottom: 36px;
}

.logo-icon {
  font-size: 64px;
  margin-bottom: var(--space-md);
  animation: logoBounce 3s ease-in-out infinite;
  display: inline-block;
}

@keyframes logoBounce {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.08); }
}

.title {
  font-size: 42px;
  font-weight: 700;
  background: linear-gradient(135deg, #E88070 0%, #F0A0A8 40%, #D89080 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--space-sm);
  letter-spacing: 0.04em;
}

.subtitle {
  font-size: var(--text-xl);
  color: var(--text-muted);
  font-weight: 400;
}

/* ── Action Buttons ── */
.action-buttons {
  display: flex;
  gap: var(--space-lg);
  justify-content: center;
  margin-bottom: 48px;
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--text-xl);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #F0A0A8, #F09480);
  color: #fff;
  box-shadow: 0 4px 20px rgba(240, 160, 168, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 28px rgba(240, 160, 168, 0.5);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
}

.btn-secondary:hover {
  border-color: var(--accent-pink);
  color: var(--accent-pink);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(180, 130, 100, 0.12);
}

.btn-secondary:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 20px;
}

/* ── Recent Projects ── */
.recent-section {
  text-align: left;
  animation: fadeInUp 0.6s ease;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.recent-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
  display: flex;
  align-items: center;
  gap: 6px;
}

.recent-icon {
  font-size: 16px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.recent-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid var(--border-color);
  animation: fadeInUp 0.5s ease backwards;
}

.recent-item:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: var(--accent-pink);
  transform: translateX(4px);
  box-shadow: var(--shadow-card);
}

.recent-left {
  flex-shrink: 0;
}

.recent-emoji {
  font-size: 24px;
}

.recent-center {
  flex: 1;
  min-width: 0;
}

.recent-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.recent-path {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.recent-date {
  font-size: var(--text-sm);
  color: var(--text-dim);
}

.recent-arrow {
  font-size: 14px;
  color: var(--text-dim);
  transition: transform var(--transition-fast);
}

.recent-item:hover .recent-arrow {
  transform: translateX(3px);
  color: var(--accent-pink);
}

/* ── Footer ── */
.footer-text {
  margin-top: 40px;
  font-size: var(--text-sm);
  color: var(--text-dim);
}

/* ── Dialog ── */
.path-row {
  display: flex;
  gap: var(--space-sm);
  width: 100%;
}
</style>
