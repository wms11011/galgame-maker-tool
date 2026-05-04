import { describe, it, expect } from 'vitest'
import {
  isSavePointData, isAchievementData, isSteamAchievementData,
  isLive2DData, isItemData, isParticleData, isDialogData,
  getTypedData
} from '../renderer/src/types/guards'
import type { FlowNode, NodeData } from '../renderer/src/types/index'

function makeNode(type: string, data: Partial<NodeData>): FlowNode {
  return { id: 'test', type, position: { x: 0, y: 0 }, data: { id: 'test', label: 'test', ...data } as NodeData }
}

describe('白盒: guards 额外分支补全', () => {
  describe('isSavePointData', () => {
    it('正例: 有 slotLabel', () => {
      expect(isSavePointData({ id: '', label: '', slotLabel: '快速存档' })).toBe(true)
    })

    it('反例: 无 slotLabel', () => {
      expect(isSavePointData({ id: '', label: '' })).toBe(false)
    })

    it('反例: null', () => {
      expect(isSavePointData(null as any)).toBe(false)
    })
  })

  describe('isAchievementData', () => {
    it('正例: 有 achievementId 和 autoCheck', () => {
      expect(isAchievementData({ id: '', label: '', achievementId: 'ach_1', autoCheck: true })).toBe(true)
    })

    it('正例: 仅有 achievementId', () => {
      expect(isAchievementData({ id: '', label: '', achievementId: 'ach_1' })).toBe(true)
    })

    it('反例: 无 achievementId', () => {
      expect(isAchievementData({ id: '', label: '' })).toBe(false)
    })

    it('反例: null', () => {
      expect(isAchievementData(null as any)).toBe(false)
    })
  })

  describe('isSteamAchievementData', () => {
    it('正例: 有 achievementId 无 autoCheck', () => {
      expect(isSteamAchievementData({ id: '', label: '', achievementId: 'STEAM_ACH_1' })).toBe(true)
    })

    it('反例: 有 achievementId 且有 autoCheck (是 achievement)', () => {
      expect(isSteamAchievementData({ id: '', label: '', achievementId: 'x', autoCheck: true })).toBe(false)
    })

    it('反例: null', () => {
      expect(isSteamAchievementData(null as any)).toBe(false)
    })
  })

  describe('isLive2DData 与 isParticleData 互斥', () => {
    it('有 model 有 preset → isParticle 优先，isLive2D 返回 false', () => {
      const data = { id: '', label: '', model: 'sakura', preset: 'snow' }
      expect(isParticleData(data)).toBe(true)
      expect(isLive2DData(data)).toBe(false)
    })

    it('有 model 无 preset → isLive2D 返回 true', () => {
      expect(isLive2DData({ id: '', label: '', model: 'sakura' })).toBe(true)
    })
  })

  describe('isItemData', () => {
    it('正例: 有 action 和 itemName', () => {
      expect(isItemData({ id: '', label: '', action: 'get', itemName: '钥匙' })).toBe(true)
    })

    it('反例: 仅有 action', () => {
      expect(isItemData({ id: '', label: '', action: 'get' })).toBe(false)
    })

    it('反例: 仅有 itemName', () => {
      expect(isItemData({ id: '', label: '', itemName: '钥匙' })).toBe(false)
    })
  })

  describe('getTypedData 额外', () => {
    it('guard 返回 true 时返回 data', () => {
      const node = makeNode('dialog', { content: 'hello', character: 'A' })
      const result = getTypedData(node, isDialogData)
      expect(result).not.toBeNull()
    })

    it('guard 抛出异常时返回 null', () => {
      const badGuard = (d: NodeData): d is any => { throw new Error('boom') }
      const node = makeNode('dialog', { content: 'hello', character: 'A' })
      const result = getTypedData(node, badGuard)
      expect(result).toBeNull()
    })
  })
})
