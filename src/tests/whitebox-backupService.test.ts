import { describe, it, expect, vi, beforeEach } from 'vitest'
import { join } from 'path'

const { mockEnsureDir, mockWriteJson, mockReadJson, mockPathExists, mockReaddir, mockStat } = vi.hoisted(() => ({
  mockEnsureDir: vi.fn().mockResolvedValue(undefined),
  mockWriteJson: vi.fn().mockResolvedValue(undefined),
  mockReadJson: vi.fn().mockResolvedValue({}),
  mockPathExists: vi.fn().mockResolvedValue(true),
  mockReaddir: vi.fn().mockResolvedValue([]),
  mockStat: vi.fn().mockResolvedValue({ mtime: new Date() })
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-backups')
  }
}))

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: mockEnsureDir,
    writeJson: mockWriteJson,
    readJson: mockReadJson,
    pathExists: mockPathExists,
    readdir: mockReaddir,
    stat: mockStat
  },
  ensureDir: mockEnsureDir,
  writeJson: mockWriteJson,
  readJson: mockReadJson,
  pathExists: mockPathExists,
  readdir: mockReaddir,
  stat: mockStat
}))

import { createBackup, restoreBackup } from '../main/services/backupService'

describe('白盒: backupService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createBackup', () => {
    const validData = {
      meta: { name: 'TestProject', version: '1.0.0', createdAt: '', updatedAt: '', projectPath: '/test', resolution: '1280x720' as const },
      flow: { nodes: [], edges: [] },
      script: '',
      assets: []
    }

    it('有效数据创建备份成功', async () => {
      const path = await createBackup(validData)
      expect(path).toContain('TestProject')
      expect(path).toContain('.json')
    })

    it('null 数据抛出错误', async () => {
      await expect(createBackup(null)).rejects.toThrow('备份数据无效')
    })

    it('undefined 数据抛出错误', async () => {
      await expect(createBackup(undefined)).rejects.toThrow('备份数据无效')
    })

    it('非对象数据抛出错误', async () => {
      await expect(createBackup('string')).rejects.toThrow('备份数据无效')
    })

    it('缺少 meta 字段', async () => {
      await expect(createBackup({ data: 'no-meta' })).rejects.toThrow('备份数据缺少 meta 字段')
    })

    it('meta 缺少 name 字段', async () => {
      await expect(createBackup({ meta: { version: '1.0' } })).rejects.toThrow('备份数据 meta 缺少 name 字段')
    })

    it('meta.name 不是字符串', async () => {
      await expect(createBackup({ meta: { name: 123 } })).rejects.toThrow('备份数据 meta 缺少 name 字段')
    })

    it('文件名中的特殊字符被替换', async () => {
      const dataWithSpecialName = {
        ...validData,
        meta: { ...validData.meta, name: 'Test<Project>:*?' }
      }
      const path = await createBackup(dataWithSpecialName)
      expect(path).not.toContain('<')
      expect(path).not.toContain(':')
      expect(path).not.toContain('*')
      expect(path).not.toContain('?')
    })
  })

  describe('restoreBackup', () => {
    it('路径为空时抛出错误', async () => {
      await expect(restoreBackup('')).rejects.toThrow('路径不能为空')
    })

    it('路径为空白字符串时抛出错误', async () => {
      await expect(restoreBackup('   ')).rejects.toThrow('路径不能为空')
    })

    it('非法路径（不在备份目录内）抛出错误', async () => {
      await expect(restoreBackup('/etc/passwd')).rejects.toThrow('非法路径')
    })

    it('备份目录内的路径可以恢复', async () => {
      mockReadJson.mockResolvedValue({
        meta: { name: 'Test', version: '1.0.0', createdAt: '', updatedAt: '', projectPath: '/test', resolution: '1280x720' },
        flow: { nodes: [], edges: [] },
        script: '',
        assets: []
      })
      const backupDir = join('/tmp/test-backups', 'galgame-backups')
      const result = await restoreBackup(join(backupDir, 'test_backup.json'))
      expect(result.meta.name).toBe('Test')
    })
  })
})
