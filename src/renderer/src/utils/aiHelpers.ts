import type {
  AIGenerateRequest,
  AIContextData,
  AIConfig,
  AIProvider
} from '../types'
import { AI_PROVIDER_DEFAULTS } from '../types'
import { useCharacterStore } from '../stores/characterStore'
import { useVariableStore } from '../stores/variableStore'
import { useFlowStore } from '../stores/flowStore'
import { useProjectStore } from '../stores/projectStore'
import { flowToScript } from './mappingEngine'

export type AIGenerateType = AIGenerateRequest['type']

export function buildContext(selectedNodeId?: string): AIContextData {
  const charStore = useCharacterStore()
  const varStore = useVariableStore()
  const flowStore = useFlowStore()
  const projStore = useProjectStore()

  const currentScript = projStore.script || (flowStore.nodes.length > 0 ? flowToScript(flowStore.nodes, flowStore.edges) : '')

  const sceneName = selectedNodeId
    ? flowStore.getGroupByNodeId(selectedNodeId)?.name ?? undefined
    : undefined

  const truncatedScript = currentScript.length > 3000
    ? currentScript.slice(0, 3000) + '\n// ... (已截断)'
    : currentScript

  // JSON 序列化消除 Pinia reactive Proxy，避免 IPC 传输失败
  return JSON.parse(JSON.stringify({
    characters: charStore.characters,
    variables: varStore.variables,
    globalFlags: varStore.globalFlags,
    currentScript: truncatedScript,
    sceneName,
    selectedNodeId
  }))
}

export function buildRequest(
  type: AIGenerateType,
  prompt: string,
  language: 'zh' | 'en' | 'ja' = 'zh',
  selectedNodeId?: string
): AIGenerateRequest {
  return {
    type,
    prompt,
    context: buildContext(selectedNodeId),
    language
  }
}

export function getDefaultConfig(): AIConfig {
  return {
    provider: 'openai',
    apiKey: '',
    endpoint: AI_PROVIDER_DEFAULTS.openai.endpoint,
    model: AI_PROVIDER_DEFAULTS.openai.model,
    temperature: 0.7,
    maxTokens: 2048,
    enabled: false
  }
}

export function getProviderDefaults(provider: AIProvider): { endpoint: string; model: string } {
  return AI_PROVIDER_DEFAULTS[provider] ?? AI_PROVIDER_DEFAULTS.custom
}

export const AI_TYPE_OPTIONS: { value: AIGenerateType; label: string; icon: string; desc: string }[] = [
  { value: 'dialog', label: '生成对话', icon: '💬', desc: '根据描述生成一段角色对话脚本' },
  { value: 'branch', label: '设计分支', icon: '🔀', desc: '根据描述生成选择/条件分支脚本' },
  { value: 'continue', label: '续写剧情', icon: '✍️', desc: '基于当前脚本续写后续剧情' },
  { value: 'translate', label: '翻译文本', icon: '🌐', desc: '将文本翻译为指定语言' },
  { value: 'character', label: '角色设定', icon: '🎭', desc: '生成角色性格和背景设定' },
  { value: 'fix', label: '修复脚本', icon: '🔧', desc: '检查并修复脚本中的问题' }
]

export const AI_PROVIDER_OPTIONS: { value: AIProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'claude', label: 'Anthropic (Claude)' },
  { value: 'gemini', label: 'Google (Gemini)' },
  { value: 'custom', label: '自定义 (OpenAI兼容)' }
]

export function extractScriptFromContent(content: string): string {
  const codeBlockMatch = content.match(/```(?:gs|galgame-script)?\s*\n([\s\S]*?)\n```/)
  if (codeBlockMatch) return codeBlockMatch[1]

  const lines = content.split('\n')
  const scriptLines: string[] = []
  let inScript = false
  for (const line of lines) {
    if (line.trim().startsWith('@') || line.trim().match(/^.+: "/) || inScript) {
      inScript = true
      scriptLines.push(line)
    }
    if (line.trim() === '}' && inScript) {
      scriptLines.push(line)
      inScript = false
    }
  }

  if (scriptLines.length > 0) return scriptLines.join('\n')

  return content
}