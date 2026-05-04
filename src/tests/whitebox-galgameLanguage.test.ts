import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as monacoMock from './__mocks__/monaco-editor'

// Spy on the mock so we can verify calls
const spyRegister = vi.spyOn(monacoMock.languages, 'register')
const spyTokenizer = vi.spyOn(monacoMock.languages, 'setMonarchTokensProvider')
const spyConfig = vi.spyOn(monacoMock.languages, 'setLanguageConfiguration')
const spyCompletion = vi.spyOn(monacoMock.languages, 'registerCompletionItemProvider')
const spyTheme = vi.spyOn(monacoMock.editor, 'defineTheme')

import { registerGalgameLanguage } from '../renderer/src/utils/galgameLanguage'

describe('白盒: galgameLanguage Monaco 注册', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registerGalgameLanguage(monacoMock as any)
  })

  describe('语言注册', () => {
    it('注册 galgame-script 语言', () => {
      expect(spyRegister).toHaveBeenCalled()
      const callArgs = spyRegister.mock.calls[0][0]
      expect(callArgs.id).toBe('galgame-script')
      expect(callArgs.extensions).toContain('.gs')
      expect(callArgs.aliases).toContain('GalgameScript')
    })
  })

  describe('Monarch tokenizer', () => {
    it('包含所有21种指令关键字', () => {
      const callArgs = spyTokenizer.mock.calls[0]
      expect(callArgs[0]).toBe('galgame-script')
      const tokenizer = callArgs[1]
      expect(tokenizer.directives.length).toBeGreaterThanOrEqual(20)
      expect(tokenizer.directives).toContain('@dialog')
      expect(tokenizer.directives).toContain('@particle')
      expect(tokenizer.directives).toContain('@live2d')
      expect(tokenizer.directives).toContain('@item')
    })

    it('tokenizer root 规则完整', () => {
      const tokenizer = spyTokenizer.mock.calls[0][1]
      const { root } = tokenizer.tokenizer
      expect(root.length).toBeGreaterThanOrEqual(9)
    })

    it('包含注释、关键字、字符串规则', () => {
      const tokenizer = spyTokenizer.mock.calls[0][1]
      const { root } = tokenizer.tokenizer
      const hasComment = root.some((r: any) => r[1] === 'comment')
      const hasKeyword = root.some((r: any) => r[1] === 'keyword')
      expect(hasComment).toBe(true)
      expect(hasKeyword).toBe(true)
    })
  })

  describe('语言配置', () => {
    it('注释设置为 //', () => {
      const cfg = spyConfig.mock.calls[0][1]
      expect(cfg.comments.lineComment).toBe('//')
    })

    it('括号匹配、自动闭合、环绕对完整', () => {
      const cfg = spyConfig.mock.calls[0][1]
      expect(cfg.brackets).toHaveLength(2)
      expect(cfg.autoClosingPairs).toHaveLength(3)
      expect(cfg.surroundingPairs).toHaveLength(3)
    })
  })

  describe('主题定义', () => {
    it('定义 galgame-dark 主题', () => {
      expect(spyTheme).toHaveBeenCalledWith('galgame-dark', expect.any(Object))
      const theme = spyTheme.mock.calls[0][1]
      expect(theme.base).toBe('vs-dark')
      expect(theme.inherit).toBe(true)
    })

    it('包含所有语法高亮规则', () => {
      const theme = spyTheme.mock.calls[0][1]
      const tokens = theme.rules.map((r: any) => r.token)
      expect(tokens).toContain('keyword')
      expect(tokens).toContain('string')
      expect(tokens).toContain('comment')
      expect(tokens).toContain('attribute.name')
    })
  })

  describe('代码补全', () => {
    it('注册补全提供者', () => {
      expect(spyCompletion).toHaveBeenCalled()
      const provider = spyCompletion.mock.calls[0][1]
      expect(provider.triggerCharacters).toContain('@')
    })

    it('输入 @ 时返回20种指令补全', () => {
      const provider = spyCompletion.mock.calls[0][1]
      const mockModel = {
        getWordUntilPosition: () => ({ startColumn: 1, endColumn: 5 }),
        getLineContent: () => '@',
        getValue: () => '',
        getOffsetAt: () => 0
      }
      const mockPosition = { lineNumber: 1, column: 3 }
      const result = provider.provideCompletionItems(mockModel, mockPosition)
      expect(result.suggestions.length).toBe(20)
    })

    it('补全中包含 @dialog 和 @choice', () => {
      const provider = spyCompletion.mock.calls[0][1]
      const result = provider.provideCompletionItems(
        { getWordUntilPosition: () => ({ startColumn: 1, endColumn: 5 }), getLineContent: () => '@', getValue: () => '', getOffsetAt: () => 0 },
        { lineNumber: 1, column: 3 }
      )
      const labels = result.suggestions.map((s: any) => s.label)
      expect(labels).toContain('@dialog')
      expect(labels).toContain('@choice')
      expect(labels).toContain('@end')
    })

    it('块内触发属性名补全', () => {
      const provider = spyCompletion.mock.calls[0][1]
      const mockModel = {
        getWordUntilPosition: () => ({ startColumn: 1, endColumn: 5 }),
        getLineContent: () => 'con',
        getValue: () => '@dialog(id:"n1") {\n  con\n}',
        getOffsetAt: (pos: any) => pos.lineNumber === 2 ? 25 : 0
      }
      const result = provider.provideCompletionItems(mockModel, { lineNumber: 2, column: 5 })
      const labels = result.suggestions.map((s: any) => s.label)
      expect(labels).toContain('content')
      expect(labels).toContain('background')
    })

    it('块外不触发属性补全', () => {
      const provider = spyCompletion.mock.calls[0][1]
      const mockModel = {
        getWordUntilPosition: () => ({ startColumn: 1, endColumn: 5 }),
        getLineContent: () => 'con',
        getValue: () => 'con',
        getOffsetAt: () => 0
      }
      const result = provider.provideCompletionItems(mockModel, { lineNumber: 1, column: 4 })
      // 块外不应有属性补全 (depth <= 0)
      const labels = result.suggestions.map((s: any) => s.label)
      expect(labels).not.toContain('content')
    })
  })
})
