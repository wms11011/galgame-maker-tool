import axios from 'axios'
import * as fs from 'fs-extra'
import * as path from 'path'
import { app, safeStorage } from 'electron'

export type AIProvider = 'openai' | 'claude' | 'gemini' | 'custom'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  endpoint: string
  model: string
  temperature: number
  maxTokens: number
  enabled: boolean
}

export interface AIGenerateRequest {
  type: 'dialog' | 'branch' | 'translate' | 'continue' | 'character' | 'fix'
  prompt: string
  context?: AIContextData
  language?: 'zh' | 'en' | 'ja'
}

export interface AIContextData {
  characters: { name: string; personality: string; bio: string; sprite?: string }[]
  variables: { name: string; type: string; initialValue: unknown; description?: string }[]
  globalFlags: Record<string, boolean>
  currentScript?: string
  sceneName?: string
  selectedNodeId?: string
}

export interface AIGenerateResult {
  success: boolean
  content?: string
  script?: string
  error?: string
  tokensUsed?: number
}

const AI_PROVIDER_DEFAULTS: Record<AIProvider, { endpoint: string; model: string }> = {
  openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' },
  claude: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash' },
  custom: { endpoint: 'http://localhost:8080/v1', model: 'default' }
}

const CONFIG_FILENAME = 'ai-config.json'

function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILENAME)
}

export async function loadConfig(): Promise<AIConfig> {
  const configPath = getConfigPath()
  try {
    if (await fs.pathExists(configPath)) {
      const raw = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(raw) as AIConfig & { apiKeyEncrypted?: string }
      if (config.apiKeyEncrypted && safeStorage.isEncryptionAvailable()) {
        config.apiKey = safeStorage.decryptString(Buffer.from(config.apiKeyEncrypted, 'base64'))
        delete config.apiKeyEncrypted
      }
      return config
    }
  } catch { /* ignore parse errors, return default */ }

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

export async function saveConfig(config: AIConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const configPath = getConfigPath()
    await fs.ensureDir(path.dirname(configPath))
    const toSave: Record<string, unknown> = { ...config }
    if (config.apiKey && safeStorage.isEncryptionAvailable()) {
      toSave.apiKeyEncrypted = safeStorage.encryptString(config.apiKey).toString('base64')
      delete toSave.apiKey
    }
    await fs.writeFile(configPath, JSON.stringify(toSave, null, 2), 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function buildSystemPrompt(request: AIGenerateRequest): string {
  const langMap = { zh: '中文', en: 'English', ja: '日本語' }
  const lang = langMap[request.language ?? 'zh'] ?? '中文'

  const typePrompts: Record<string, string> = {
    dialog: `你是一个专业的视觉小说（Galgame）脚本编写助手。请根据用户描述生成一段 .gs 格式的对话脚本。
输出格式为 .gs 脚本代码，不要输出任何其他内容。
对话节点使用 @dialog 指令，简写格式为：角色名: "对话内容"
完整格式为：
@dialog(id: "node_xxx", character: "角色名") {
  content: "对话内容"
  background: "背景路径"
  sprite: "立绘路径"
  next: "下一节点ID"
}

请使用${lang}编写对话内容。`,

    branch: `你是一个专业的视觉小说（Galgame）分支设计助手。请根据用户描述生成包含选择节点的 .gs 脚本。
输出格式为 .gs 脚本代码，不要输出任何其他内容。
选择节点格式：
@choice(id: "node_xxx", title: "选择标题") {
  option("选项1") { next: "target1" }
  option("选项2") { next: "target2" }
}
条件节点格式：
@condition(id: "node_xxx") {
  expr: "变量 > 0"
  true: "trueNodeId"
  false: "falseNodeId"
}

请使用${lang}编写选项文本。`,

    translate: `你是一个专业的游戏文本翻译助手。请将用户提供的文本翻译为${lang}。
保持游戏文本的风格和语气，注意角色说话方式的差异。
只输出翻译结果，不要添加任何解释。`,

    continue: `你是一个专业的视觉小说（Galgame）续写助手。请根据现有脚本续写后续剧情。
输出格式为 .gs 脚本代码，不要输出任何其他内容。
保持与现有脚本的风格和角色设定一致。
请使用${lang}编写内容。`,

    character: `你是一个视觉小说角色设定助手。请根据用户描述生成角色设定。
输出格式为 JSON，包含以下字段：
{
  "name": "角色名",
  "personality": "性格描述",
  "bio": "背景故事",
  "sprite": "立绘路径"
}
只输出 JSON，不要添加任何解释。`,

    fix: `你是一个视觉小说脚本调试助手。请检查用户提供的脚本中的问题并修复。
常见问题包括：节点ID重复、连线断裂、变量未定义、条件表达式错误。
输出修复后的完整 .gs 脚本代码，并在最后用 // 注释说明修复了哪些问题。`
  }

  return typePrompts[request.type] ?? typePrompts.dialog
}

export function buildUserPrompt(request: AIGenerateRequest): string {
  const parts: string[] = []

  if (request.context) {
    const ctx = request.context

    if (ctx.characters.length > 0) {
      parts.push('## 角色设定')
      for (const c of ctx.characters) {
        parts.push(`- **${c.name}**：${c.personality} | ${c.bio}`)
      }
    }

    if (ctx.variables.length > 0) {
      parts.push('## 已定义变量')
      for (const v of ctx.variables) {
        parts.push(`- ${v.name} (${v.type}) = ${JSON.stringify(v.initialValue)}${v.description ? ` — ${v.description}` : ''}`)
      }
    }

    if (ctx.globalFlags && Object.keys(ctx.globalFlags).length > 0) {
      parts.push('## 全局标记')
      for (const [k, v] of Object.entries(ctx.globalFlags)) {
        parts.push(`- ${k} = ${v}`)
      }
    }

    if (ctx.sceneName) {
      parts.push(`## 当前章节：${ctx.sceneName}`)
    }

    if (ctx.currentScript) {
      const truncated = ctx.currentScript.length > 3000
        ? ctx.currentScript.slice(0, 3000) + '\n// ... (已截断)'
        : ctx.currentScript
      parts.push('## 当前脚本片段')
      parts.push(truncated)
    }
  }

  parts.push('## 用户需求')
  parts.push(request.prompt)

  return parts.join('\n')
}

export async function generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
  const config = await loadConfig()

  if (!config.enabled || !config.apiKey) {
    return { success: false, error: 'AI 未启用或 API Key 未配置' }
  }

  const systemPrompt = buildSystemPrompt(request)
  const userPrompt = buildUserPrompt(request)

  try {
    switch (config.provider) {
      case 'openai':
        return await callOpenAI(config, systemPrompt, userPrompt)
      case 'claude':
        return await callClaude(config, systemPrompt, userPrompt)
      case 'gemini':
        return await callGemini(config, systemPrompt, userPrompt)
      case 'custom':
        return await callCustom(config, systemPrompt, userPrompt)
      default:
        return { success: false, error: `未支持的提供商: ${config.provider}` }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function callOpenAI(config: AIConfig, systemPrompt: string, userPrompt: string): Promise<AIGenerateResult> {
  const url = `${config.endpoint}/chat/completions`
  const response = await axios.post(url, {
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  }, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }
  })

  const content = response.data?.choices?.[0]?.message?.content ?? ''
  const tokensUsed = response.data?.usage?.total_tokens ?? 0

  return { success: true, content, script: extractScript(content), tokensUsed }
}

async function callClaude(config: AIConfig, systemPrompt: string, userPrompt: string): Promise<AIGenerateResult> {
  const url = `${config.endpoint}/messages`
  const response = await axios.post(url, {
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  }, {
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }
  })

  const content = response.data?.content?.[0]?.text ?? ''
  const tokensUsed = (response.data?.usage?.input_tokens ?? 0) + (response.data?.usage?.output_tokens ?? 0)

  return { success: true, content, script: extractScript(content), tokensUsed }
}

async function callGemini(config: AIConfig, systemPrompt: string, userPrompt: string): Promise<AIGenerateResult> {
  const url = `${config.endpoint}/models/${config.model}:generateContent?key=${config.apiKey}`
  const response = await axios.post(url, {
    contents: [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
    ],
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens
    }
  }, {
    headers: { 'Content-Type': 'application/json' }
  })

  const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return { success: true, content, script: extractScript(content), tokensUsed: 0 }
}

async function callCustom(config: AIConfig, systemPrompt: string, userPrompt: string): Promise<AIGenerateResult> {
  const url = `${config.endpoint}/chat/completions`
  const response = await axios.post(url, {
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  }, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }
  })

  const content = response.data?.choices?.[0]?.message?.content ?? ''
  return { success: true, content, script: extractScript(content), tokensUsed: 0 }
}

export function extractScript(content: string): string {
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

export function getStreamUrl(request: AIGenerateRequest, config: AIConfig): { url: string; body: unknown; headers: Record<string, string> } | null {
  if (!config.enabled || !config.apiKey) return null

  const systemPrompt = buildSystemPrompt(request)
  const userPrompt = buildUserPrompt(request)

  switch (config.provider) {
    case 'openai':
      return {
        url: `${config.endpoint}/chat/completions`,
        body: {
          model: config.model,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        },
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    case 'claude':
      return {
        url: `${config.endpoint}/messages`,
        body: {
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          stream: true,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        },
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    case 'custom':
      return {
        url: `${config.endpoint}/chat/completions`,
        body: {
          model: config.model,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        },
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    default:
      return null
  }
}

export async function* streamGenerate(request: AIGenerateRequest): AsyncGenerator<string> {
  const config = await loadConfig()
  const streamInfo = getStreamUrl(request, config)
  if (!streamInfo) throw new Error('AI 未启用或流式请求不支持此提供商')

  const response = await axios.post(streamInfo.url, streamInfo.body, {
    headers: streamInfo.headers,
    responseType: 'stream',
    timeout: 120000
  })

  const stream = response.data
  let buffer = ''

  for await (const chunk of stream) {
    buffer += chunk.toString('utf-8')
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === '') continue

      if (config.provider === 'claude') {
        if (trimmed.startsWith('event: content_block_delta')) continue
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6))
            if (data.type === 'content_block_delta' && data.delta?.text) {
              yield data.delta.text
            }
            if (data.type === 'message_stop') return
          } catch { /* skip malformed JSON */ }
        }
      } else {
        if (trimmed.startsWith('data: [DONE]')) return
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6))
            const content = data.choices?.[0]?.delta?.content
            if (content) yield content
          } catch { /* skip */ }
        }
      }
    }
  }
}