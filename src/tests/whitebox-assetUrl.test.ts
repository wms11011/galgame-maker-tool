import { describe, it, expect } from 'vitest'
import { getAssetUrl, urlToRelativePath } from '../renderer/src/utils/assetUrl'

describe('白盒: assetUrl', () => {
  describe('getAssetUrl', () => {
    it('空路径返回空字符串', () => {
      expect(getAssetUrl('', 'assets/bg.png')).toBe('')
      expect(getAssetUrl('/proj', '')).toBe('')
      expect(getAssetUrl('', '')).toBe('')
    })

    it('基本路径拼接', () => {
      const result = getAssetUrl('/home/user/project', 'assets/bg/forest.png')
      expect(result).toContain('file://')
      expect(result).toContain('home/user/project/assets/bg/forest.png')
    })

    it('项目路径末尾无斜杠时自动补齐', () => {
      const result = getAssetUrl('/proj', 'assets/img.png')
      expect(result).toContain('file://')
      expect(result).toContain('/proj/assets/img.png')
    })

    it('项目路径末尾有斜杠时不去重', () => {
      const result = getAssetUrl('/proj/', 'assets/img.png')
      expect(result).toContain('file://')
      expect(result).toContain('/proj/assets/img.png')
    })

    it('Windows 反斜杠自动转换为正斜杠', () => {
      const result = getAssetUrl('C:\\Users\\test\\project', 'assets\\bg\\forest.png')
      expect(result).toBe('file:///C:/Users/test/project/assets/bg/forest.png')
    })

    it('移除相对路径开头的 ./', () => {
      const result = getAssetUrl('/proj', './assets/img.png')
      expect(result).toContain('file://')
      expect(result).toContain('/proj/assets/img.png')
    })

    it('移除相对路径开头的 /', () => {
      const result = getAssetUrl('/proj', '/assets/img.png')
      expect(result).toContain('file://')
      expect(result).toContain('/proj/assets/img.png')
    })
  })

  describe('urlToRelativePath', () => {
    it('非 file:// 直接返回原值', () => {
      expect(urlToRelativePath('/proj', 'https://example.com/img.png')).toBe('https://example.com/img.png')
      expect(urlToRelativePath('/proj', 'assets/img.png')).toBe('assets/img.png')
    })

    it('file:// URL 匹配项目路径时返回相对路径', () => {
      const result = urlToRelativePath('C:\\Users\\test\\project', 'file:///C:/Users/test/project/assets/bg.png')
      expect(result).toBe('assets/bg.png')
    })

    it('file:// URL 不匹配项目路径时返回原值', () => {
      const result = urlToRelativePath('/myproject', 'file:///otherproject/assets/img.png')
      expect(result).toBe('file:///otherproject/assets/img.png')
    })

    it('处理 file:/// 三重斜杠', () => {
      const result = urlToRelativePath('/root/proj', 'file:///root/proj/assets/test.png')
      expect(result).toBe('assets/test.png')
    })

    it('处理 file:// 双重斜杠', () => {
      const result = urlToRelativePath('/root/proj', 'file://root/proj/assets/test.png')
      expect(result).toBe('assets/test.png')
    })
  })
})
