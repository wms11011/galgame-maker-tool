import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockCreateBackup } = vi.hoisted(() => ({
  mockCreateBackup: vi.fn().mockResolvedValue('/tmp/backup.json')
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-backups')
  }
}))

vi.mock('fs-extra', () => {
  const mockFs: any = {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    writeJson: vi.fn().mockResolvedValue(undefined),
    readJson: vi.fn().mockResolvedValue({}),
    pathExists: vi.fn().mockResolvedValue(true),
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({ mtime: new Date() })
  }
  return {
    default: mockFs,
    ...mockFs
  }
})

import { startAutoBackup, stopAutoBackup, createBackup } from '../main/services/backupService'

describe('白盒: backupService autoBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    stopAutoBackup()
  })

  afterEach(() => {
    stopAutoBackup()
    vi.useRealTimers()
  })

  describe('startAutoBackup', () => {
    const validData = {
      meta: { name: 'Test', version: '1.0.0', createdAt: '', updatedAt: '', projectPath: '/test', resolution: '1280x720' as const },
      flow: { nodes: [], edges: [] },
      script: '',
      assets: []
    }

    it('启动自动备份定时器', () => {
      const getData = vi.fn(() => validData)
      startAutoBackup(5000, getData)
      // 定时器应已设置
      expect(vi.getTimerCount()).toBe(1)
    })

    it('interval <= 0 时抛出错误', () => {
      const getData = vi.fn(() => validData)
      expect(() => startAutoBackup(0, getData)).toThrow('备份间隔必须大于 0')
      expect(() => startAutoBackup(-100, getData)).toThrow('备份间隔必须大于 0')
    })

    it('getData 返回 null 时不备份', () => {
      const getData = vi.fn(() => null)
      startAutoBackup(5000, getData)
      // 前进一个间隔
      vi.advanceTimersByTime(5000)
      // getData 被调用了但 createBackup 不应被调用
      expect(getData).toHaveBeenCalled()
    })

    it('getData 返回有效数据时触发备份', () => {
      const getData = vi.fn(() => validData)
      startAutoBackup(5000, getData)
      vi.advanceTimersByTime(5000)
      // 定时器回调被触发
      expect(getData).toHaveBeenCalled()
    })

    it('getData 抛异常时不崩溃', () => {
      const getData = vi.fn(() => { throw new Error('getData error') })
      startAutoBackup(5000, getData)
      // 不应抛出错误
      expect(() => vi.advanceTimersByTime(5000)).not.toThrow()
    })

    it('新定时器自动停止旧定时器', () => {
      const getData = vi.fn(() => validData)
      startAutoBackup(5000, getData)
      startAutoBackup(10000, getData)
      expect(vi.getTimerCount()).toBe(1) // 只有一个定时器
    })
  })

  describe('stopAutoBackup', () => {
    it('停止已启动的定时器', () => {
      const getData = vi.fn(() => ({
        meta: { name: 'Test', version: '1.0.0', createdAt: '', updatedAt: '', projectPath: '/test', resolution: '1280x720' as const },
        flow: { nodes: [], edges: [] },
        script: '',
        assets: []
      }))
      startAutoBackup(5000, getData)
      expect(vi.getTimerCount()).toBe(1)
      stopAutoBackup()
      expect(vi.getTimerCount()).toBe(0)
    })

    it('无定时器时调用不报错', () => {
      expect(() => stopAutoBackup()).not.toThrow()
    })

    it('重复 stop 不报错', () => {
      stopAutoBackup()
      stopAutoBackup()
      expect(() => {}).not.toThrow()
    })
  })
})
