import { describe, it, expect } from 'vitest'
import { validateConfig } from '../main/services/exportService'
import type { ExportConfig } from '../renderer/src/types/index'

describe('白盒: exportService', () => {
  describe('validateConfig', () => {
    it('有效 web 配置', () => {
      const config: ExportConfig = {
        type: 'web',
        outputPath: '/output/web',
        resolution: '1280x720'
      }
      expect(validateConfig(config).valid).toBe(true)
    })

    it('有效 desktop 配置', () => {
      const config: ExportConfig = {
        type: 'desktop',
        outputPath: '/output/desktop',
        resolution: '1920x1080'
      }
      expect(validateConfig(config).valid).toBe(true)
    })

    it('缺少 outputPath', () => {
      const config: ExportConfig = {
        type: 'web',
        outputPath: '',
        resolution: '1280x720'
      }
      const r = validateConfig(config)
      expect(r.valid).toBe(false)
      expect(r.errors).toContain('输出路径不能为空')
    })

    it('无效导出类型', () => {
      const config = {
        type: 'mobile',
        outputPath: '/out',
        resolution: '1280x720'
      } as any
      const r = validateConfig(config)
      expect(r.valid).toBe(false)
      expect(r.errors.some((e: string) => e.includes('导出类型'))).toBe(true)
    })

    it('无效分辨率', () => {
      const config: ExportConfig = {
        type: 'web',
        outputPath: '/out',
        resolution: '800x600' as any
      }
      const r = validateConfig(config)
      expect(r.valid).toBe(false)
      expect(r.errors.some((e) => e.includes('分辨率'))).toBe(true)
    })

    it('多个错误同时返回', () => {
      const config = {
        type: 'mobile',
        outputPath: '',
        resolution: '800x600'
      } as any
      const r = validateConfig(config)
      expect(r.valid).toBe(false)
      expect(r.errors.length).toBeGreaterThanOrEqual(2)
    })
  })
})
