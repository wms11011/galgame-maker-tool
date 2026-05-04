/**
 * MCP Tools — AI 生成
 * 复用 aiService.generate() / aiService.streamGenerate()
 */
import { z } from 'zod'
import { generate, streamGenerate } from '../../main/services/aiService'
import type { AIGenerateRequest, AIContextData } from '../../main/services/aiService'
import { getState } from '../shared/projectState'

const GenerateTypeEnum = z.enum(['dialog', 'branch', 'translate', 'continue', 'character', 'fix'])
const LanguageEnum = z.enum(['zh', 'en', 'ja'])

export const GenerateScriptSchema = z.object({
  type: GenerateTypeEnum.describe('生成类型: dialog(对话), branch(分支), translate(翻译), continue(续写), character(角色设定), fix(脚本修复)'),
  prompt: z.string().describe('生成提示词，描述你想要的内容'),
  language: LanguageEnum.optional().default('zh').describe('目标语言（translate 类型时使用）'),
  includeContext: z.boolean().optional().default(true).describe('是否自动注入当前项目的角色、变量、标记等上下文'),
  stream: z.boolean().optional().default(false).describe('是否使用流式输出')
})

// ── Handler ──

export async function handleGenerateScript(args: z.infer<typeof GenerateScriptSchema>) {
  const state = getState()

  // 构建上下文
  const context: AIContextData = {
    characters: state.characters.map(c => ({
      name: c.name, personality: (c as any).personality || '', bio: (c as any).bio || '', sprite: (c as any).sprite
    })),
    variables: state.variables,
    globalFlags: state.globalFlags,
    currentScript: args.includeContext ? state.script : undefined,
    sceneName: state.groups?.[0]?.name,
  }

  const request: AIGenerateRequest = {
    type: args.type,
    prompt: args.prompt,
    context: args.includeContext ? context : undefined,
    language: args.language
  }

  try {
    const result = await generate(request)

    if (!result.success) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({
        success: false, error: result.error
      }) }] }
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify({
      success: true,
      content: result.content,
      script: result.script,
      tokensUsed: result.tokensUsed ?? 0
    }, null, 2) }] }
  } catch (err) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }) }] }
  }
}
