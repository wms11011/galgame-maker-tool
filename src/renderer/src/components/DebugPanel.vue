<template>
  <div class="debug-panel">
    <div class="panel-header">
      <span class="panel-title">调试面板</span>
      <span class="step-badge">{{ info.stepCount }} 步</span>
    </div>

    <!-- 当前节点 -->
    <div class="debug-section">
      <div class="section-label">当前节点</div>
      <div class="current-node" v-if="info.currentNodeType">
        <span class="node-type-badge" :style="{ background: typeColor(info.currentNodeType) }">
          {{ typeLabel(info.currentNodeType) }}
        </span>
        <span class="node-label-text">{{ info.currentNodeLabel || info.currentNodeId }}</span>
      </div>
      <div class="no-data" v-else>—</div>
    </div>

    <!-- 访问路径 -->
    <div class="debug-section">
      <div class="section-label">访问路径 ({{ info.visitedNodes.length }})</div>
      <div class="breadcrumb-list" v-if="info.visitedNodes.length > 0">
        <div
          v-for="(n, i) in info.visitedNodes"
          :key="i"
          class="breadcrumb-item"
          :class="{ current: n.id === info.currentNodeId }"
        >
          <span class="breadcrumb-index">{{ i + 1 }}</span>
          <span class="breadcrumb-type" :style="{ color: typeColor(n.type) }">
            {{ n.type }}
          </span>
          <span class="breadcrumb-label">{{ n.label }}</span>
        </div>
      </div>
      <div class="no-data" v-else>暂无记录</div>
    </div>

    <!-- 变量检查器 -->
    <div class="debug-section">
      <div class="section-label">变量值</div>
      <div class="var-table" v-if="varEntries.length > 0">
        <div v-for="[name, value] in varEntries" :key="name" class="var-row">
          <span class="var-name">{{ name }}</span>
          <span class="var-value">{{ value }}</span>
        </div>
      </div>
      <div class="no-data" v-else>无变量</div>
    </div>

    <!-- 变量变化轨迹 -->
    <div class="debug-section">
      <div class="section-label">变量变化轨迹 ({{ info.variableHistory?.length || 0 }})</div>
      <div class="history-list" v-if="info.variableHistory && info.variableHistory.length > 0">
        <div v-for="(change, i) in info.variableHistory" :key="i" class="history-item">
          <span class="history-step">#{{ change.step }}</span>
          <span class="history-op">{{ change.op }}</span>
          <span class="history-detail">
            <code>{{ change.varName }}</code>
            <span class="history-arrow">: {{ change.oldValue }} → {{ change.newValue }}</span>
          </span>
        </div>
      </div>
      <div class="no-data" v-else>暂无变化</div>
    </div>

    <!-- 成就状态 -->
    <div class="debug-section">
      <div class="section-label">
        成就 ({{ info.achievements?.length || 0 }})
        <span v-if="unlockedCount > 0" class="ach-count-badge">{{ unlockedCount }}/{{ info.achievements?.length }}</span>
      </div>
      <div class="ach-list" v-if="info.achievements && info.achievements.length > 0">
        <div
          v-for="ach in info.achievements"
          :key="ach.id"
          class="ach-row"
          :class="{ 'ach-unlocked': ach.unlocked }"
        >
          <span class="ach-status-icon">{{ ach.unlocked ? '✅' : '🔒' }}</span>
          <div class="ach-info-col">
            <span class="ach-name">{{ ach.name }}</span>
            <span v-if="ach.autoCheck" class="ach-auto-tag">自动</span>
            <span v-if="ach.condition" class="ach-cond-text">{{ ach.condition }}</span>
          </div>
        </div>
      </div>
      <div class="no-data" v-else>未定义成就</div>
    </div>

    <!-- 自动检测诊断 -->
    <div class="debug-section" v-if="info.lastAutoCheck">
      <div class="section-label">
        自动检测 (步骤 #{{ info.lastAutoCheck.step }})
        <span v-if="info.lastAutoCheck.newlyUnlocked.length > 0" class="auto-check-unlock-badge">🎉</span>
      </div>
      <div class="auto-check-info">
        <div class="auto-check-row">
          <span class="auto-check-key">候选</span>
          <span class="auto-check-val">{{ info.lastAutoCheck.candidateCount }} 个</span>
        </div>
        <div
          v-if="info.lastAutoCheck.candidateCount === 0 && info.achievements.length > 0"
          class="auto-check-hint"
        >
          💡 成就列表中需要至少一个成就同时满足：未解锁 + 开启自动检测 + 设置了条件
        </div>
        <div v-if="info.lastAutoCheck.newlyUnlocked.length > 0" class="auto-check-row unlock-row">
          <span class="auto-check-key">解锁</span>
          <span class="auto-check-val">
            <span v-for="name in info.lastAutoCheck.newlyUnlocked" :key="name" class="unlock-tag">{{ name }}</span>
          </span>
        </div>
        <div v-if="info.lastAutoCheck.results.length > 0" class="auto-check-results">
          <div
            v-for="(r, i) in info.lastAutoCheck.results"
            :key="i"
            class="auto-check-result-item"
            :class="{ 'result-pass': r.result, 'result-fail': !r.result }"
          >
            <span class="result-icon">{{ r.result ? '✅' : '❌' }}</span>
            <div class="result-detail">
              <span class="result-name">{{ r.name }}</span>
              <code class="result-cond">{{ r.condition }}</code>
              <code class="result-resolved">→ {{ r.resolvedCondition }}</code>
            </div>
          </div>
        </div>
        <div class="auto-check-vars" v-if="Object.keys(info.lastAutoCheck.variables).length > 0">
          <div class="auto-check-subkey">变量</div>
          <div class="auto-check-kv-list">
            <div v-for="(val, key) in info.lastAutoCheck.variables" :key="key" class="auto-check-kv-row">
              <span class="auto-check-kv-name">{{ key }}</span>
              <span class="auto-check-kv-value">{{ val }}</span>
            </div>
          </div>
        </div>
        <div class="auto-check-flags" v-if="Object.keys(info.lastAutoCheck.globalFlags).length > 0">
          <div class="auto-check-subkey">标记</div>
          <div class="auto-check-kv-list">
            <div v-for="(val, key) in info.lastAutoCheck.globalFlags" :key="key" class="auto-check-kv-row">
              <span class="auto-check-kv-name">{{ flagLabel(key) }}</span>
              <span class="auto-check-kv-value" :class="val ? 'flag-true' : 'flag-false'">{{ val ? '✓' : '✗' }}</span>
            </div>
          </div>
        </div>
        <div v-if="info.lastAutoCheck.error" class="auto-check-error">
          ⚠️ {{ info.lastAutoCheck.error }}
        </div>
      </div>
    </div>

    <!-- 错误日志 -->
    <div class="debug-section" v-if="info.errorNodes && info.errorNodes.length > 0">
      <div class="section-label">⚠️ 节点错误 ({{ info.errorNodes.length }})</div>
      <div class="error-list">
        <div v-for="err in info.errorNodes" :key="err.nodeId + err.timestamp" class="error-item">
          <span class="error-node-id">{{ err.nodeId }}</span>
          <span class="error-msg">{{ err.error }}</span>
        </div>
      </div>
    </div>

    <!-- 结束提示 -->
    <div v-if="info.isEnded" class="ended-banner">播放已结束</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DebugInfo } from '../../preview/previewEngine'

const props = defineProps<{
  info: DebugInfo
}>()

// 系统内置标记的英文 key 到中文别名映射
const builtinFlagAlias: Record<string, string> = {
  seen_normal_ending: '看过普通结局',
  seen_good_ending: '看过好结局',
  seen_bad_ending: '看过坏结局',
  seen_true_ending: '看过真结局',
  completed_once: '已通关'
}

function flagLabel(key: string): string {
  // 用户自定义别名优先，其次是系统内置，最后用原始 key
  return props.info.flagAliases?.[key] || builtinFlagAlias[key] || key
}

const varEntries = computed(() => Object.entries(props.info.variables))
const unlockedCount = computed(() =>
  props.info.achievements?.filter(a => a.unlocked).length ?? 0
)

function typeColor(type: string | null): string {
  const map: Record<string, string> = {
    dialog: '#6BA4D8',
    choice: '#74B88A',
    condition: '#F0A060',
    setVariable: '#A088D0',
    goto: '#A088D0',
    end: '#E88080',
    audio: '#DDC050',
    cg: '#64B0BC',
    wait: '#A89888',
    random: '#D8A030',
    label: '#A89888',
    animation: '#F0A060',
    savePoint: '#E890A8',
    achievement: '#D8A030',
    steamAchievement: '#D8A030',
    timer: '#60B0A0',
    moveCharacter: '#E890A8'
  }
  return map[type || ''] || '#A89888'
}

function typeLabel(type: string | null): string {
  const map: Record<string, string> = {
    dialog: '对话',
    choice: '选择',
    condition: '条件',
    setVariable: '变量',
    goto: '跳转',
    end: '结束',
    audio: '音频',
    cg: 'CG',
    wait: '延时',
    random: '随机',
    label: '标签',
    animation: '动画',
    savePoint: '存档',
    achievement: '成就',
    steamAchievement: 'Steam成就',
    timer: '计时器',
    moveCharacter: '移动立绘'
  }
  return map[type || ''] || type || '?'
}
</script>

<style scoped>
.debug-panel {
  width: 240px;
  height: 720px;
  max-height: 720px;
  background: var(--bg-panel);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
  overflow-x: hidden;
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

.step-badge {
  font-size: 11px;
  background: var(--color-blue);
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
}

.debug-section {
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-color);
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.current-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-type-badge {
  font-size: 10px;
  color: #fff;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.node-label-text {
  font-size: var(--text-sm);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.breadcrumb-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  border-radius: 3px;
  font-size: 11px;
}

.breadcrumb-item.current {
  background: rgba(59, 130, 246, 0.15);
}

.breadcrumb-index {
  width: 18px;
  height: 18px;
  background: var(--bg-card);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.breadcrumb-type {
  width: 32px;
  font-size: 10px;
  flex-shrink: 0;
}

.breadcrumb-label {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.var-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.var-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 6px;
  background: var(--bg-card);
  border-radius: 3px;
}

.var-name {
  font-size: var(--text-sm);
  color: var(--color-green);
  font-weight: 500;
}

.var-value {
  font-size: var(--text-sm);
  color: var(--text-primary);
  font-family: monospace;
}

.no-data {
  font-size: var(--text-sm);
  color: var(--text-dim);
  font-style: italic;
}

/* 自动检测诊断 */
.auto-check-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.auto-check-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.auto-check-key {
  color: var(--text-muted);
  flex-shrink: 0;
  width: 28px;
}

.auto-check-val {
  color: var(--text-primary);
}

.auto-check-hint {
  font-size: 10px;
  color: var(--color-amber);
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.15);
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.auto-check-unlock-badge {
  font-size: 12px;
  margin-left: 4px;
}

.unlock-row {
  align-items: flex-start;
}

.unlock-tag {
  display: inline-block;
  font-size: 10px;
  background: rgba(116, 184, 138, 0.15);
  color: var(--color-green);
  padding: 1px 6px;
  border-radius: 3px;
  margin-right: 4px;
  margin-bottom: 2px;
}

.auto-check-results {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 2px;
}

.auto-check-result-item {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 3px 4px;
  border-radius: 3px;
  font-size: 10px;
}

.result-pass {
  background: rgba(116, 184, 138, 0.08);
}

.result-fail {
  background: rgba(239, 68, 68, 0.05);
}

.result-icon {
  flex-shrink: 0;
  font-size: 10px;
  margin-top: 1px;
}

.result-detail {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.result-name {
  font-size: 10px;
  color: var(--text-primary);
  font-weight: 500;
}

.result-cond,
.result-resolved {
  font-size: 9px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-resolved {
  color: var(--color-blue);
}

.auto-check-vars,
.auto-check-flags {
  margin-top: 4px;
}

.auto-check-subkey {
  color: var(--text-muted);
  font-size: 10px;
  margin-bottom: 3px;
}

.auto-check-kv-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-card);
  border-radius: 4px;
  padding: 4px 6px;
}

.auto-check-kv-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  padding: 1px 0;
}

.auto-check-kv-name {
  color: var(--color-green);
  font-weight: 500;
}

.auto-check-kv-value {
  color: var(--text-primary);
  font-family: monospace;
}

.flag-true {
  color: var(--color-green);
}

.flag-false {
  color: var(--text-dim);
}

.auto-check-error {
  font-size: 10px;
  color: var(--color-red);
  background: rgba(232, 128, 128, 0.1);
  padding: 3px 6px;
  border-radius: 3px;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.error-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px;
  background: rgba(232, 128, 128, 0.08);
  border: 1px solid rgba(232, 128, 128, 0.2);
  border-radius: 4px;
  font-size: 10px;
}

.error-node-id {
  color: var(--color-red);
  font-weight: 600;
  font-family: monospace;
}

.error-msg {
  color: var(--text-secondary);
  word-break: break-all;
}

.ended-banner {
  margin: var(--space-md);
  padding: 8px;
  background: rgba(232, 128, 128, 0.12);
  border: 1px solid rgba(232, 128, 128, 0.25);
  border-radius: var(--radius-sm);
  color: var(--color-red);
  text-align: center;
  font-size: var(--text-sm);
  font-weight: 600;
}

.history-list {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  font-size: 11px;
  border-radius: 2px;
}

.history-item:hover {
  background: var(--bg-card);
}

.history-step {
  width: 22px;
  color: var(--text-muted);
  font-size: 10px;
  flex-shrink: 0;
}

.history-op {
  width: 18px;
  height: 16px;
  background: rgba(160, 136, 208, 0.18);
  color: var(--color-purple);
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  flex-shrink: 0;
}

.history-detail {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-detail code {
  color: var(--color-green);
  font-size: 10px;
}

.history-arrow {
  color: var(--text-muted);
  font-size: 10px;
}

.ach-count-badge {
  font-size: 10px;
  color: var(--color-amber);
  margin-left: 4px;
}

.ach-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
}

.ach-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 4px 6px;
  background: var(--bg-card);
  border-radius: 3px;
  font-size: 11px;
}

.ach-row.ach-unlocked {
  background: rgba(116, 184, 138, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.ach-status-icon {
  font-size: 12px;
  flex-shrink: 0;
  margin-top: 1px;
}

.ach-info-col {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.ach-name {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
}

.ach-auto-tag {
  display: inline-block;
  font-size: 9px;
  background: rgba(59, 130, 246, 0.15);
  color: var(--color-blue);
  padding: 0 4px;
  border-radius: 2px;
  width: fit-content;
  margin-top: 1px;
}

.ach-cond-text {
  font-size: 9px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
