import { describe, it, expect, beforeEach, vi } from 'vitest'
import { handleListAssets, handleImportAsset } from '../tools/assetTools'
import { setState, createEmptyState } from '../shared/projectState'
import * as fs from 'fs-extra'
import { resolve, join } from 'path'
import { tmpdir } from 'os'

function getJSON(r: any): any { return JSON.parse(r.content[0].text) }

describe('MCP asset tools', () => {
  let tmpProject: string

  beforeEach(async () => {
    tmpProject = resolve(tmpdir(), `mcp-test-${Date.now()}`)
    await fs.ensureDir(join(tmpProject, 'assets', 'backgrounds'))
    await fs.writeFile(join(tmpProject, 'assets', 'backgrounds', 'sky.png'), Buffer.from([0x89, 0x50, 0x4E, 0x47]))

    const state = createEmptyState()
    state.projectPath = tmpProject
    setState(state)
  })

  describe('list_assets', () => {
    it('列出所有资源', async () => {
      const r = await handleListAssets({})
      const data = getJSON(r)
      expect(data.count).toBeGreaterThanOrEqual(1)
      expect(data.assets.some((a: any) => a.name === 'sky.png')).toBe(true)
      expect(data.categories).toContain('background')
    })

    it('按分类过滤', async () => {
      const r = await handleListAssets({ category: 'background' })
      const data = getJSON(r)
      expect(data.assets.every((a: any) => a.category === 'background')).toBe(true)
    })

    it('未打开项目返回错误', async () => {
      const state = createEmptyState()
      state.projectPath = null
      setState(state)
      const r = await handleListAssets({})
      expect(getJSON(r).error).toContain('未打开项目')
    })
  })

  describe('import_asset', () => {
    it('导入图片', async () => {
      const srcFile = join(tmpProject, 'test.png')
      await fs.writeFile(srcFile, Buffer.from([0x89, 0x50, 0x4E, 0x47]))

      const r = await handleImportAsset({ filePath: srcFile, category: 'background', type: 'image' })
      const data = getJSON(r)
      expect(data.success).toBe(true)
      expect(data.asset.name).toBe('test.png')
      expect(data.asset.category).toBe('background')
      expect(data.totalAssets).toBe(1)
    })

    it('文件不存在返回错误', async () => {
      const r = await handleImportAsset({ filePath: '/nonexistent/file.png' })
      expect(getJSON(r).error).toContain('不存在')
    })

    it('不支持的格式返回错误', async () => {
      const srcFile = join(tmpProject, 'doc.pdf')
      await fs.writeFile(srcFile, 'test')
      const r = await handleImportAsset({ filePath: srcFile, type: 'image' })
      expect(getJSON(r).error).toContain('不支持')
    })

    it('未打开项目返回错误', async () => {
      const state = createEmptyState()
      state.projectPath = null
      setState(state)
      const r = await handleImportAsset({ filePath: '/tmp/test.png' })
      expect(getJSON(r).error).toContain('未打开项目')
    })
  })
})

// ══════════════════════════════════════════════
// AI tools — schema tests only (actual API call requires key)
// ══════════════════════════════════════════════
import { GenerateScriptSchema } from '../tools/aiTools'

describe('MCP ai tools (schema validation)', () => {
  it('GenerateScriptSchema 接受合法参数', () => {
    const r = GenerateScriptSchema.safeParse({ type: 'dialog', prompt: '小樱和主角在走廊相遇' })
    expect(r.success).toBe(true)
  })

  it('GenerateScriptSchema 拒绝非法 type', () => {
    const r = GenerateScriptSchema.safeParse({ type: 'invalid', prompt: 'test' })
    expect(r.success).toBe(false)
  })

  it('GenerateScriptSchema 默认值正确', () => {
    const r = GenerateScriptSchema.safeParse({ type: 'dialog', prompt: 'test' })
    if (r.success) {
      expect(r.data.language).toBe('zh')
      expect(r.data.stream).toBe(false)
      expect(r.data.includeContext).toBe(true)
    }
  })

  it('GenerateScriptSchema 全部 6 种类型有效', () => {
    const types = ['dialog', 'branch', 'translate', 'continue', 'character', 'fix']
    for (const t of types) {
      expect(GenerateScriptSchema.safeParse({ type: t, prompt: 'test' }).success).toBe(true)
    }
  })

  it('GenerateScriptSchema 三个语言选项有效', () => {
    const langs = ['zh', 'en', 'ja']
    for (const l of langs) {
      expect(GenerateScriptSchema.safeParse({ type: 'translate', prompt: 'test', language: l }).success).toBe(true)
    }
  })
})
