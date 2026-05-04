import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron before importing the service
vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn()
  },
  app: {
    getVersion: vi.fn(() => '1.0.0'),
    getPath: vi.fn(() => '/tmp')
  }
}))

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    ensureDir: vi.fn(),
    writeJson: vi.fn(),
    writeFile: vi.fn(),
    readJson: vi.fn()
  },
  pathExists: vi.fn(),
  ensureDir: vi.fn(),
  writeJson: vi.fn(),
  writeFile: vi.fn(),
  readJson: vi.fn()
}))

import * as fs from 'fs-extra'
import { createProject } from '../main/services/fileSystemService'

describe('fileSystemService - validateProjectName (via createProject)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.pathExists).mockResolvedValue(false as never)
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined)
    vi.mocked(fs.writeJson).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
  })

  it('空名称应抛出错误', async () => {
    await expect(createProject('', '/some/path')).rejects.toThrow('项目名称不能为空')
  })

  it('纯空白名称应抛出错误', async () => {
    await expect(createProject('   ', '/some/path')).rejects.toThrow('项目名称不能为空白字符')
  })

  it('包含 < 字符应抛出错误', async () => {
    await expect(createProject('test<name', '/some/path')).rejects.toThrow('项目名称包含非法字符')
  })

  it('包含 > 字符应抛出错误', async () => {
    await expect(createProject('test>name', '/some/path')).rejects.toThrow('项目名称包含非法字符')
  })

  it('包含 : 字符应抛出错误', async () => {
    await expect(createProject('test:name', '/some/path')).rejects.toThrow('项目名称包含非法字符')
  })

  it('包含 / 字符应抛出错误', async () => {
    await expect(createProject('test/name', '/some/path')).rejects.toThrow('项目名称包含非法字符')
  })

  it('包含 \\ 字符应抛出错误', async () => {
    await expect(createProject('test\\name', '/some/path')).rejects.toThrow('项目名称包含非法字符')
  })

  it('包含 * 字符应抛出错误', async () => {
    await expect(createProject('test*name', '/some/path')).rejects.toThrow('项目名称包含非法字符')
  })

  it('包含 ? 字符应抛出错误', async () => {
    await expect(createProject('test?name', '/some/path')).rejects.toThrow('项目名称包含非法字符')
  })

  it('超过 100 个字符应抛出错误', async () => {
    const longName = 'a'.repeat(101)
    await expect(createProject(longName, '/some/path')).rejects.toThrow('项目名称不能超过 100 个字符')
  })

  it('恰好 100 个字符应通过验证', async () => {
    const name = 'a'.repeat(100)
    await expect(createProject(name, '/some/path')).resolves.toBeDefined()
  })

  it('合法名称（中文）应通过验证', async () => {
    await expect(createProject('我的游戏项目', '/some/path')).resolves.toBeDefined()
  })

  it('合法名称（字母数字下划线）应通过验证', async () => {
    await expect(createProject('my_game_01', '/some/path')).resolves.toBeDefined()
  })

  it('路径为空应抛出错误', async () => {
    await expect(createProject('valid-name', '')).rejects.toThrow('路径不能为空')
  })
})
