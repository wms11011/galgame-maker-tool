import { describe, it, expect, vi, beforeEach } from 'vitest'
import { join } from 'path'

const MOCK_TEMP_DIR = '/tmp'
const MOCK_BACKUP_DIR = join(MOCK_TEMP_DIR, 'galgame-backups')

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => MOCK_TEMP_DIR),
    getVersion: vi.fn(() => '1.0.0')
  }
}))

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {},
  ensureDir: vi.fn(),
  writeJson: vi.fn(),
  pathExists: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  readJson: vi.fn()
}))

import * as fs from 'fs-extra'
import { createBackup, listBackups, restoreBackup } from '../main/services/backupService'

const validProjectData = {
  meta: {
    name: '测试项目',
    version: '1.0.0',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    projectPath: '/some/path',
    resolution: '1280x720' as const
  },
  flow: { nodes: [], edges: [] },
  script: '',
  assets: []
}

describe('backupService - createBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined)
    vi.mocked(fs.writeJson).mockResolvedValue(undefined)
  })

  it('有效数据应成功创建备份并返回路径', async () => {
    const result = await createBackup(validProjectData)
    expect(result).toContain('galgame-backups')
    expect(result).toContain('测试项目')
    expect(result).toMatch(/\.json$/)
  })

  it('应调用 ensureDir 确保备份目录存在', async () => {
    await createBackup(validProjectData)
    expect(fs.ensureDir).toHaveBeenCalledWith(MOCK_BACKUP_DIR)
  })

  it('应调用 writeJson 写入备份文件', async () => {
    await createBackup(validProjectData)
    expect(fs.writeJson).toHaveBeenCalledTimes(1)
  })

  it('null 数据应抛出错误', async () => {
    await expect(createBackup(null)).rejects.toThrow('备份数据无效')
  })

  it('缺少 meta 字段应抛出错误', async () => {
    await expect(createBackup({ flow: {}, script: '', assets: [] })).rejects.toThrow('备份数据缺少 meta 字段')
  })

  it('meta 缺少 name 字段应抛出错误', async () => {
    await expect(createBackup({ meta: { version: '1.0.0' } })).rejects.toThrow('备份数据 meta 缺少 name 字段')
  })

  it('项目名称中的特殊字符应被替换为下划线', async () => {
    const dataWithSpecialName = {
      ...validProjectData,
      meta: { ...validProjectData.meta, name: 'test<>:"/\\|?*name' }
    }
    const result = await createBackup(dataWithSpecialName)
    // 提取文件名部分（去掉路径分隔符的影响）
    const fileName = result.split(/[/\\]/).pop() ?? result
    expect(fileName).not.toMatch(/[<>:"|?*]/)
  })
})

describe('backupService - listBackups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('备份目录不存在时应返回空数组', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false as never)
    const result = await listBackups()
    expect(result).toEqual([])
  })

  it('备份目录为空时应返回空数组', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true as never)
    vi.mocked(fs.readdir).mockResolvedValue([] as never)
    const result = await listBackups()
    expect(result).toEqual([])
  })

  it('应返回按时间降序排列的备份列表', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true as never)
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: '项目A_2024-01-01T00-00-00-000Z.json', isFile: () => true },
      { name: '项目A_2024-01-02T00-00-00-000Z.json', isFile: () => true }
    ] as never)
    const olderDate = new Date('2024-01-01T00:00:00.000Z')
    const newerDate = new Date('2024-01-02T00:00:00.000Z')
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ mtime: olderDate } as never)
      .mockResolvedValueOnce({ mtime: newerDate } as never)

    const result = await listBackups()
    expect(result).toHaveLength(2)
    // 最新的在前
    expect(new Date(result[0].createdAt).getTime()).toBeGreaterThan(
      new Date(result[1].createdAt).getTime()
    )
  })

  it('非 json 文件应被忽略', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true as never)
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'readme.txt', isFile: () => true },
      { name: 'backup.json', isFile: () => true }
    ] as never)
    vi.mocked(fs.stat).mockResolvedValue({ mtime: new Date() } as never)

    const result = await listBackups()
    expect(result).toHaveLength(1)
  })
})

describe('backupService - restoreBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空路径应抛出错误', async () => {
    await expect(restoreBackup('')).rejects.toThrow('路径不能为空')
  })

  it('非备份目录路径应抛出安全错误', async () => {
    await expect(restoreBackup('/etc/passwd')).rejects.toThrow('非法路径')
  })

  it('备份文件不存在应抛出错误', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false as never)
    const validPath = join(MOCK_BACKUP_DIR, 'test.json')
    await expect(restoreBackup(validPath)).rejects.toThrow('备份文件不存在')
  })

  it('有效备份文件应成功恢复数据', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true as never)
    vi.mocked(fs.readJson).mockResolvedValue(validProjectData as never)

    const validPath = join(MOCK_BACKUP_DIR, 'test.json')
    const result = await restoreBackup(validPath)
    expect(result).toEqual(validProjectData)
  })

  it('备份文件数据无效应抛出错误', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true as never)
    vi.mocked(fs.readJson).mockResolvedValue({ invalid: 'data' } as never)

    const validPath = join(MOCK_BACKUP_DIR, 'test.json')
    await expect(restoreBackup(validPath)).rejects.toThrow()
  })
})
