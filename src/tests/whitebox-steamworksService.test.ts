import { describe, it, expect } from 'vitest'
import {
  generateSteamConfig,
  generateSteamAppId,
  generateAchievementJson,
  generateSteamRuntimeJs
} from '../main/services/steamworksService'

describe('白盒: steamworksService', () => {
  describe('generateSteamConfig', () => {
    it('生成基础 Steam 配置', () => {
      const result = generateSteamConfig([
        { id: 'ach_1', name: '初来乍到', description: '开始游戏', icon: '🎉' }
      ])
      expect(result.achievements).toHaveLength(1)
      expect(result.achievements[0].statName).toBe('ACH_ACH_1')
      expect(result.achievements[0].defaultValue).toBe(0)
    })

    it('空成就列表', () => {
      const result = generateSteamConfig([])
      expect(result.achievements).toHaveLength(0)
    })

    it('默认描述和图标回退', () => {
      const result = generateSteamConfig([
        { id: 'ach_2', name: '测试', description: '', icon: '' }
      ])
      expect(result.achievements[0].description).toBe('测试') // 回退到 name
      expect(result.achievements[0].icon).toBe('🏆') // 默认图标
    })

    it('自定义 appId', () => {
      const result = generateSteamConfig([], '1234567')
      expect(result.appId).toBe('1234567')
    })

    it('多个成就排序正确', () => {
      const result = generateSteamConfig([
        { id: 'ach_c', name: 'C', description: '', icon: '' },
        { id: 'ach_a', name: 'A', description: '', icon: '' },
        { id: 'ach_b', name: 'B', description: '', icon: '' }
      ])
      expect(result.achievements).toHaveLength(3)
    })
  })

  describe('generateSteamAppId', () => {
    it('生成 appId 文件内容', () => {
      expect(generateSteamAppId('480')).toBe('480\n')
      expect(generateSteamAppId('1234567')).toBe('1234567\n')
    })
  })

  describe('generateAchievementJson', () => {
    it('生成成就 JSON 配置', () => {
      const config = generateSteamConfig([
        { id: 'ach_1', name: '测试成就', description: '描述', icon: '🎯' }
      ])
      const result = generateAchievementJson(config)
      expect(result).toContain('ach_1')
      expect(result).toContain('测试成就')
    })

    it('空列表返回空对象', () => {
      const config = generateSteamConfig([])
      const result = generateAchievementJson(config)
      expect(result).toContain('{}')
    })
  })

  describe('generateSteamRuntimeJs', () => {
    it('生成运行时 JS 脚本', () => {
      const js = generateSteamRuntimeJs()
      expect(js).toContain('steamAPI')
      expect(js).toContain('setAchievement')
      expect(js).toContain('isAchieved')
      expect(js).toContain('getAllAchievements')
    })
  })
})
