import { describe, it, expect, beforeEach } from 'vitest'
import { handleCreateProject, handleLoadProject, handleSaveProject, handleGetProjectInfo } from '../tools/projectTools'
import { setState, createEmptyState } from '../shared/projectState'
import * as fs from 'fs-extra'
import { resolve, join } from 'path'
import { tmpdir } from 'os'

function getJSON(r: any): any { return JSON.parse(r.content[0].text) }

describe('MCP project tools', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = resolve(tmpdir(), `mcp-proj-${Date.now()}`)
    setState(createEmptyState())
  })

  describe('create_project', () => {
    it('创建新项目', async () => {
      const r = await handleCreateProject({ name: '测试项目', projectPath: tmpDir })
      expect(getJSON(r).success).toBe(true)
      expect(getJSON(r).name).toBe('测试项目')
      expect(fs.existsSync(join(tmpDir, 'data.json'))).toBe(true)
      expect(fs.existsSync(join(tmpDir, 'assets'))).toBe(true)
      expect(fs.existsSync(join(tmpDir, 'script'))).toBe(true)
    })

    it('自定义分辨率', async () => {
      const r = await handleCreateProject({ name: '4K项目', projectPath: tmpDir, resolution: '1920x1080' })
      expect(getJSON(r).resolution).toBe('1920x1080')
    })
  })

  describe('load_project', () => {
    it('加载已有项目', async () => {
      await handleCreateProject({ name: 'Load Test', projectPath: tmpDir })
      setState(createEmptyState())
      const r = await handleLoadProject({ projectPath: tmpDir })
      expect(getJSON(r).success).toBe(true)
      expect(getJSON(r).name).toBe('Load Test')
    })

    it('不存在的项目返回错误', async () => {
      const r = await handleLoadProject({ projectPath: '/nonexistent' })
      expect(getJSON(r).error).toBeTruthy()
    })
  })

  describe('save_project', () => {
    it('保存项目', async () => {
      await handleCreateProject({ name: 'Save Test', projectPath: tmpDir })
      const r = await handleSaveProject({})
      expect(getJSON(r).success).toBe(true)
    })

    it('未打开项目时保存失败', async () => {
      const r = await handleSaveProject({})
      expect(getJSON(r).error).toBeTruthy()
    })
  })

  describe('get_project_info', () => {
    it('返回项目信息', async () => {
      await handleCreateProject({ name: 'Info Test', projectPath: tmpDir })
      const r = await handleGetProjectInfo({})
      const data = getJSON(r)
      expect(data.name).toBe('Info Test')
      expect(data.nodes).toBe(0)
      expect(data.characters).toEqual([])
    })

    it('未打开项目返回错误', async () => {
      setState(createEmptyState())
      const r = await handleGetProjectInfo({})
      expect(getJSON(r).error).toContain('未打开')
    })
  })
})
