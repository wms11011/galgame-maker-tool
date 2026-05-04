<template>
  <div class="ai-panel">
    <!-- 配置区域 -->
    <div class="ai-section">
      <div class="section-header">
        <span class="section-title">🤖 AI 设置</span>
        <span class="section-header-right">
          <el-switch v-model="config.enabled" size="small" />
          <span v-if="connectionStatus === 'ok'" class="status-ok">✓ 已连接</span>
          <span v-else-if="connectionStatus === 'fail'" class="status-fail">✗ 连接失败</span>
          <span v-else-if="connectionStatus === 'testing'" class="status-testing">⏳ 测试中...</span>
        </span>
      </div>
      <div class="section-body">
        <div class="config-row">
          <label class="config-label">提供商</label>
          <el-select v-model="config.provider" size="small" @change="onProviderChange" style="width: 100%">
            <el-option v-for="p in providerOptions" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </div>
        <div class="config-row">
          <label class="config-label">API Key</label>
          <el-input v-model="config.apiKey" size="small" type="password" show-password placeholder="粘贴 API Key" />
        </div>
        <div class="config-row">
          <label class="config-label">模型名称</label>
          <div class="model-row">
            <el-input v-model="config.model" size="small" placeholder="如 gpt-4o / claude-sonnet-4-20250514 / qwen/qwen3-14b" style="flex:1" />
            <el-button size="small" @click="testConfig" :loading="connectionStatus === 'testing'" type="primary" plain style="min-width:80px">
              {{ connectionStatus === 'testing' ? '检测中' : '测试连接' }}
            </el-button>
          </div>
        </div>
        <div class="config-row">
          <el-button size="small" text @click="showAdvanced = !showAdvanced" style="padding:0;color:var(--text-dim);font-size:12px">
            {{ showAdvanced ? '收起' : '展开' }}高级设置
          </el-button>
        </div>
        <div v-if="showAdvanced" class="advanced-section">
          <div class="config-row">
            <label class="config-label">API 端点</label>
            <el-input v-model="config.endpoint" size="small" placeholder="https://api.openai.com/v1" />
          </div>
          <div class="config-row">
            <label class="config-label">温度</label>
            <el-slider v-model="config.temperature" :min="0" :max="1" :step="0.1" size="small" />
          </div>
          <div class="config-row">
            <label class="config-label">最大 Tokens</label>
            <el-input-number v-model="config.maxTokens" :min="256" :max="8192" :step="256" size="small" style="width: 100%" />
          </div>
        </div>
        <div class="config-actions">
          <el-button size="small" type="primary" @click="saveConfig" :disabled="!config.apiKey">保存设置</el-button>
        </div>
      </div>
    </div>

    <!-- 生成请求区域 -->
    <div class="ai-section">
      <div class="section-header">
        <span class="section-title">✨ AI 创作</span>
      </div>
      <div class="section-body">
        <div class="type-selector">
          <button
            v-for="t in typeOptions"
            :key="t.value"
            class="type-btn"
            :class="{ active: generateType === t.value }"
            @click="generateType = t.value"
            :title="t.desc"
          >
            <span class="type-icon">{{ t.icon }}</span>
            <span class="type-label">{{ t.label }}</span>
          </button>
        </div>

        <div v-if="generateType === 'translate'" class="config-row">
          <label class="config-label">目标语言</label>
          <el-select v-model="targetLang" size="small" style="width: 100%">
            <el-option label="中文" value="zh" />
            <el-option label="English" value="en" />
            <el-option label="日本語" value="ja" />
          </el-select>
        </div>

        <div class="prompt-area">
          <textarea
            v-model="prompt"
            class="prompt-input"
            :placeholder="promptPlaceholder"
            rows="4"
          ></textarea>
        </div>

        <div class="generate-actions">
          <el-tooltip :content="(!config.enabled || !config.apiKey) ? '请先在 AI 设置中启用并配置 API Key' : (!prompt.trim() ? '请输入提示词' : '')" placement="top" :disabled="config.enabled && config.apiKey && prompt.trim()">
            <el-button
              size="small"
              type="primary"
              :loading="isGenerating"
              :disabled="!config.enabled || !config.apiKey || !prompt.trim()"
              @click="doGenerate"
            >
              {{ isGenerating ? '生成中...' : '🚀 生成' }}
            </el-button>
          </el-tooltip>
          <el-tooltip :content="(!config.enabled || !config.apiKey) ? '请先在 AI 设置中启用并配置 API Key' : (!prompt.trim() ? '请输入提示词' : '')" placement="top" :disabled="config.enabled && config.apiKey && prompt.trim()">
            <el-button
              size="small"
              :loading="isStreaming"
              :disabled="!config.enabled || !config.apiKey || !prompt.trim()"
              @click="doStream"
          >
            {{ isStreaming ? '流式生成中...' : '🌊 流式生成' }}
            </el-button>
          </el-tooltip>
          <el-button
            v-if="isStreaming || isGenerating"
            size="small"
            type="danger"
            @click="cancelGeneration"
          >
            ✖ 取消
          </el-button>
        </div>
      </div>
    </div>

    <!-- 结果展示区域 -->
    <div v-if="result || streamResult" class="ai-section result-section">
      <div class="section-header">
        <span class="section-title">📝 生成结果</span>
        <div class="result-actions">
          <el-button size="small" @click="copyResult">📋 复制</el-button>
          <el-button size="small" type="primary" @click="applyToFlow" :disabled="!canApply">
            {{ generateType === 'character' ? '👤 创建角色' : '插入流程图' }}
          </el-button>
          <el-button v-if="generateType !== 'character'" size="small" @click="applyToCode" :disabled="!canApply">追加到脚本</el-button>
        </div>
      </div>
      <div class="result-body">
        <pre class="result-content">{{ displayResult }}</pre>
        <div v-if="tokensUsed > 0" class="tokens-info">
          消耗 tokens: {{ tokensUsed }}
        </div>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="errorMsg" class="ai-error">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ errorMsg }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useFlowStore } from '../stores/flowStore'
import { useProjectStore } from '../stores/projectStore'
import { useCharacterStore } from '../stores/characterStore'
import type { AIConfig, AIProvider, AIGenerateResult, AIGenerateRequest } from '../types'
import { AI_TYPE_OPTIONS, AI_PROVIDER_OPTIONS, buildRequest, getDefaultConfig, getProviderDefaults, extractScriptFromContent } from '../utils/aiHelpers'
import { scriptToFlow } from '../utils/mappingEngine'

const flowStore = useFlowStore()
const projectStore = useProjectStore()
const characterStore = useCharacterStore()

const typeOptions = AI_TYPE_OPTIONS
const providerOptions = AI_PROVIDER_OPTIONS

const showAdvanced = ref(false)
const connectionStatus = ref<'idle' | 'testing' | 'ok' | 'fail'>('idle')
const config = reactive<AIConfig>(getDefaultConfig())
const generateType = ref<AIGenerateRequest['type']>('dialog')
const targetLang = ref<'zh' | 'en' | 'ja'>('zh')
const prompt = ref('')
const isGenerating = ref(false)
const isStreaming = ref(false)
const result = ref<AIGenerateResult | null>(null)
const streamResult = ref('')
const errorMsg = ref('')
const tokensUsed = ref(0)
let streamCancel: (() => void) | null = null

const promptPlaceholder = computed(() => {
  const map: Record<string, string> = {
    dialog: '描述你想生成的对话场景，例如："小樱在走廊上遇到了主角，两人讨论明天的考试"',
    branch: '描述你想生成的分支场景，例如："主角需要在帮助小樱和去图书馆之间做出选择"',
    translate: '输入需要翻译的文本',
    continue: '描述续写方向，例如："接下来主角决定去图书馆"',
    character: '描述角色设定，例如："一个温柔但有点害羞的女生，名叫小樱"',
    fix: '粘贴需要修复的脚本（或自动使用当前项目脚本）'
  }
  return map[generateType.value] ?? map.dialog
})

const displayResult = computed(() => {
  if (streamResult.value) return streamResult.value
  return result.value?.content ?? result.value?.script ?? ''
})

const canApply = computed(() => {
  const content = displayResult.value
  if (!content) return false
  if (generateType.value === 'translate') return false
  if (generateType.value === 'character') return true  // JSON 角色数据可应用
  return content.includes('@') || content.match(/^.+: "/)
})

function onProviderChange(provider: AIProvider): void {
  const defaults = getProviderDefaults(provider)
  config.endpoint = defaults.endpoint
  config.model = defaults.model
}

async function loadConfig(): void {
  if (!window.electronAPI) return
  try {
    const res = await window.electronAPI.aiGetConfig()
    if (res.success && res.data) {
      Object.assign(config, res.data)
    }
  } catch { /* ignore */ }
}

async function saveConfig(): void {
  if (!window.electronAPI) return
  try {
    const res = await window.electronAPI.aiSaveConfig(JSON.parse(JSON.stringify(config)))
    if (res.success) {
      ElMessage.success('AI 设置已保存')
    } else {
      ElMessage.error(res.error ?? '保存失败')
    }
  } catch (err) {
    ElMessage.error('保存失败: ' + (err instanceof Error ? err.message : String(err)))
  }
}

async function testConfig(): void {
  if (!window.electronAPI) return
  if (!config.apiKey) { ElMessage.warning('请先输入 API Key'); return }
  connectionStatus.value = 'testing'
  const testRequest = { type: 'dialog', prompt: '请回复"连接成功"', language: 'zh' }
  try {
    const res = await window.electronAPI.aiGenerate(testRequest)
    const data = res?.data || res
    if (data?.success || data?.content) {
      connectionStatus.value = 'ok'
      if (!config.enabled) config.enabled = true
    } else {
      connectionStatus.value = 'fail'
      ElMessage.error('连接失败: ' + (data?.error ?? res?.error ?? '请检查 API Key 和端点'))
    }
  } catch (err) {
    connectionStatus.value = 'fail'
    ElMessage.error('连接失败: ' + (err instanceof Error ? err.message : String(err)))
  }
}

async function doGenerate(): void {
  if (!window.electronAPI || !prompt.value.trim()) return
  isGenerating.value = true
  errorMsg.value = ''
  result.value = null
  streamResult.value = ''
  tokensUsed.value = 0

  const lang = generateType.value === 'translate' ? targetLang.value : 'zh'
  const request = buildRequest(generateType.value, prompt.value.trim(), lang, flowStore.selectedNodeId)

  try {
    const res = await window.electronAPI.aiGenerate(JSON.parse(JSON.stringify(request))) as AIGenerateResult
    if (res.success) {
      result.value = res
      tokensUsed.value = res.tokensUsed ?? 0
    } else {
      errorMsg.value = res.error ?? '生成失败'
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : String(err)
  } finally {
    isGenerating.value = false
  }
}

async function doStream(): void {
  if (!window.electronAPI || !prompt.value.trim()) return
  isStreaming.value = true
  errorMsg.value = ''
  result.value = null
  streamResult.value = ''
  tokensUsed.value = 0

  const lang = generateType.value === 'translate' ? targetLang.value : 'zh'
  const request = buildRequest(generateType.value, prompt.value.trim(), lang, flowStore.selectedNodeId)

  streamCancel = window.electronAPI.aiStream(JSON.parse(JSON.stringify(request)), (chunk) => {
    if (chunk.type === 'text') {
      streamResult.value += chunk.content
    } else if (chunk.type === 'done') {
      isStreaming.value = false
    } else if (chunk.type === 'error') {
      errorMsg.value = chunk.content
      isStreaming.value = false
    }
  })

  try {
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (!isStreaming.value) {
          clearInterval(check)
          resolve()
        }
      }, 200)
    })
  } catch { /* cancelled */ }
}

function cancelGeneration(): void {
  if (streamCancel) {
    streamCancel()
    streamCancel = null
  }
  isStreaming.value = false
  isGenerating.value = false
  ElMessage.info('已取消生成')
}

function copyResult(): void {
  const content = displayResult.value
  if (!content) return
  navigator.clipboard.writeText(content).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function applyToFlow(): void {
  // character 类型：解析 JSON 并创建角色
  if (generateType.value === 'character') {
    try {
      const jsonMatch = displayResult.value.match(/\{[\s\S]*\}/)
      const char = JSON.parse(jsonMatch?.[0] || displayResult.value)
      if (char.name) {
        const exists = characterStore.characters.some(c => c.name === char.name)
        if (exists) characterStore.updateCharacter(char.name, char as any)
        else characterStore.addCharacter(char as any)
        ElMessage.success(`角色「${char.name}」${exists ? '已更新' : '已创建'}`)
        return
      }
    } catch { ElMessage.error('角色数据解析失败，请检查 JSON 格式') }
    return
  }

  const script = result.value?.script ?? extractScriptFromDisplay()
  if (!script) return

  const parsed = scriptToFlow(script)
  if (parsed.success && parsed.nodes.length > 0) {
    const offset = {
      x: Math.max(...flowStore.nodes.map(n => n.position.x)) + 200,
      y: Math.min(...flowStore.nodes.map(n => n.position.y))
    }
    const { nodesAdded, edgesAdded } = flowStore.importNodesAndEdges(parsed.nodes, parsed.edges ?? [], offset)
    ElMessage.success(`已插入 ${nodesAdded} 个节点和 ${edgesAdded} 条连线（可 Ctrl+Z 撤销）`)
  } else {
    ElMessage.error('脚本解析失败: ' + (parsed.errors?.map(e => e.message).join(', ') ?? '未知错误'))
  }
}

function applyToCode(): void {
  const script = result.value?.script ?? extractScriptFromDisplay()
  if (!script) return

  projectStore.script += '\n\n' + script
  flowStore.isDirty = true
  ElMessage.success('已追加到脚本末尾')
}

function extractScriptFromDisplay(): string {
  return extractScriptFromContent(displayResult.value)
}

onMounted(() => {
  loadConfig()
})

onUnmounted(() => {
  if (streamCancel) {
    streamCancel()
    streamCancel = null
  }
})
</script>

<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: var(--space-sm);
}

.ai-section {
  margin-bottom: var(--space-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid var(--border-color);
}

.section-header:hover {
  background: var(--bg-hover);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.toggle-icon {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.section-body {
  padding: var(--space-md);
}

.config-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.config-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.section-header-right {
  display: flex; align-items: center; gap: 8px;
}
.status-ok { font-size: 12px; color: #22c55e; font-weight: 600; }
.status-fail { font-size: 12px; color: #ef4444; font-weight: 600; }
.status-testing { font-size: 12px; color: var(--color-orange); }
.model-row { display: flex; gap: 8px; align-items: center; }
.advanced-section { border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 4px; }

.config-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.type-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  font-family: inherit;
}

.type-btn:hover {
  border-color: var(--accent-pink);
  background: var(--bg-hover);
}

.type-btn.active {
  background: linear-gradient(135deg, var(--accent-pink), var(--accent-coral));
  color: #fff;
  border-color: transparent;
  font-weight: 600;
}

.type-icon {
  font-size: 14px;
}

.type-label {
  font-size: var(--text-sm);
}

.prompt-area {
  margin-bottom: var(--space-sm);
}

.prompt-input {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: var(--text-base);
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  outline: none;
  transition: border-color var(--transition-fast);
}

.prompt-input:focus {
  border-color: var(--accent-pink);
  box-shadow: var(--shadow-glow);
}

.prompt-input::placeholder {
  color: var(--text-muted);
}

.generate-actions {
  display: flex;
  gap: var(--space-sm);
}

.result-section {
  border-color: var(--accent-pink);
}

.result-actions {
  display: flex;
  gap: var(--space-xs);
}

.result-body {
  padding: var(--space-md);
}

.result-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
  max-height: 300px;
  overflow-y: auto;
  line-height: 1.6;
}

.tokens-info {
  margin-top: var(--space-xs);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.ai-error {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-sm);
  margin-top: var(--space-sm);
}

.error-icon {
  font-size: 16px;
}

.error-text {
  font-size: var(--text-sm);
  color: #ef4444;
}
</style>