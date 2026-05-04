import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}))
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn().mockResolvedValue(false),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    ensureDir: vi.fn()
  }
}))
vi.mock('electron', () => ({
  app: { getPath: vi.fn().mockReturnValue('/tmp/test-userdata') },
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    encryptString: vi.fn().mockReturnValue(Buffer.from('encrypted')),
    decryptString: vi.fn().mockReturnValue('test-key')
  }
}))

import * as aiService from '../main/services/aiService'
import axios from 'axios'
import { extractScriptFromContent } from '../renderer/src/utils/aiHelpers'

describe('AI 模块', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractScript', () => {
    it('从代码块中提取脚本', () => {
      const content = '这是一段说明\n```gs\n@dialog(id: "n1", character: "小明") {\n  content: "你好"\n}\n```\n更多说明'
      const result = aiService.extractScript(content)
      expect(result).toContain('@dialog')
      expect(result).toContain('你好')
      expect(result).not.toContain('这是一段说明')
    })

    it('从无代码块的文本中识别脚本行', () => {
      const content = '一些描述\n@dialog(id: "n1", character: "小明") {\n  content: "你好"\n}\n更多说明'
      const result = aiService.extractScript(content)
      expect(result).toContain('@dialog')
      expect(result).toContain('}')
    })

    it('识别简写格式', () => {
      const content = '小明: "你好世界"'
      const result = aiService.extractScript(content)
      expect(result).toContain('小明')
      expect(result).toContain('你好世界')
    })

    it('无脚本内容时返回原文', () => {
      const content = '普通描述文本，没有脚本标记'
      const result = aiService.extractScript(content)
      expect(result).toBe(content)
    })
  })

  describe('extractScriptFromContent (渲染进程)', () => {
    it('从代码块提取', () => {
      const content = '```gs\n@choice(id: "c1") {\n  option("A") { next: "a" }\n}\n```'
      const result = extractScriptFromContent(content)
      expect(result).toContain('@choice')
    })

    it('与主进程 extractScript 逻辑一致', () => {
      const content = '```\n@dialog(id: "n1", character: "小明") {\n  content: "你好"\n}\n```'
      const mainResult = aiService.extractScript(content)
      const rendererResult = extractScriptFromContent(content)
      expect(mainResult).toBe(rendererResult)
    })

    it('正确包含关闭花括号', () => {
      const content = '@dialog(id: "n1") {\n  content: "hi"\n}'
      const result = extractScriptFromContent(content)
      expect(result).toContain('}')
    })
  })

  describe('buildSystemPrompt', () => {
    it('dialog 类型包含 @dialog 格式说明', () => {
      const result = aiService.buildSystemPrompt({ type: 'dialog', prompt: 'test', language: 'zh' })
      expect(result).toContain('@dialog')
      expect(result).toContain('中文')
    })

    it('branch 类型包含 @choice 格式说明', () => {
      const result = aiService.buildSystemPrompt({ type: 'branch', prompt: 'test', language: 'zh' })
      expect(result).toContain('@choice')
      expect(result).toContain('@condition')
    })

    it('translate 类型包含语言指示', () => {
      const result = aiService.buildSystemPrompt({ type: 'translate', prompt: 'test', language: 'en' })
      expect(result).toContain('English')
    })

    it('character 类型要求 JSON 输出', () => {
      const result = aiService.buildSystemPrompt({ type: 'character', prompt: 'test', language: 'zh' })
      expect(result).toContain('JSON')
      expect(result).toContain('personality')
    })

    it('fix 类型包含调试提示', () => {
      const result = aiService.buildSystemPrompt({ type: 'fix', prompt: 'test', language: 'zh' })
      expect(result).toContain('调试')
      expect(result).toContain('节点ID重复')
    })
  })

  describe('buildUserPrompt', () => {
    it('包含用户提示词', () => {
      const result = aiService.buildUserPrompt({ type: 'dialog', prompt: '生成一段浪漫对话', language: 'zh' })
      expect(result).toContain('生成一段浪漫对话')
    })

    it('包含角色设定', () => {
      const request = {
        type: 'dialog' as const,
        prompt: 'test',
        language: 'zh' as const,
        context: {
          characters: [{ name: '小樱', personality: '温柔', bio: '女主', sprite: '' }],
          variables: [],
          globalFlags: {}
        }
      }
      const result = aiService.buildUserPrompt(request)
      expect(result).toContain('小樱')
      expect(result).toContain('温柔')
    })

    it('包含变量信息', () => {
      const request = {
        type: 'dialog' as const,
        prompt: 'test',
        language: 'zh' as const,
        context: {
          characters: [],
          variables: [{ name: 'score', type: 'number', initialValue: 0, description: '分数' }],
          globalFlags: {}
        }
      }
      const result = aiService.buildUserPrompt(request)
      expect(result).toContain('score')
      expect(result).toContain('分数')
    })

    it('截断过长的脚本片段', () => {
      const longScript = '@dialog '.repeat(500)
      const request = {
        type: 'continue' as const,
        prompt: '续写',
        language: 'zh' as const,
        context: {
          characters: [],
          variables: [],
          globalFlags: {},
          currentScript: longScript
        }
      }
      const result = aiService.buildUserPrompt(request)
      expect(result.length).toBeLessThan(longScript.length + 200)
      expect(result).toContain('已截断')
    })
  })

  describe('generate', () => {
    it('未启用时返回错误', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { choices: [{ message: { content: 'test' } }], usage: { total_tokens: 10 } }
      })
      const result = await aiService.generate({
        type: 'dialog',
        prompt: 'test',
        language: 'zh'
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('未启用')
    })
  })

  describe('getStreamUrl', () => {
    it('Claude 流式请求包含 temperature', () => {
      const config: aiService.AIConfig = {
        provider: 'claude',
        apiKey: 'test-key',
        endpoint: 'https://api.anthropic.com/v1',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.5,
        maxTokens: 2048,
        enabled: true
      }
      const result = aiService.getStreamUrl({ type: 'dialog', prompt: 'test', language: 'zh' }, config)
      expect(result).not.toBeNull()
      const body = result!.body as Record<string, unknown>
      expect(body.temperature).toBe(0.5)
    })

    it('OpenAI 流式请求包含 temperature', () => {
      const config: aiService.AIConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2048,
        enabled: true
      }
      const result = aiService.getStreamUrl({ type: 'dialog', prompt: 'test', language: 'zh' }, config)
      expect(result).not.toBeNull()
      const body = result!.body as Record<string, unknown>
      expect(body.temperature).toBe(0.7)
    })

    it('未启用时返回 null', () => {
      const config: aiService.AIConfig = {
        provider: 'openai',
        apiKey: '',
        endpoint: '',
        model: '',
        temperature: 0.7,
        maxTokens: 2048,
        enabled: false
      }
      const result = aiService.getStreamUrl({ type: 'dialog', prompt: 'test', language: 'zh' }, config)
      expect(result).toBeNull()
    })
  })
})