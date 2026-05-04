import { describe, it, expect } from 'vitest'
import { isParticleData, isLive2DData, isItemData, getTypedData, NODE_TYPE_GUARDS } from '../renderer/src/types/guards'
import type { NodeData } from '../renderer/src/types'

describe('白盒: guards 补充覆盖', () => {
  describe('isParticleData', () => {
    it('正例: 有 preset 字段', () => {
      expect(isParticleData({ preset: 'sakura', id: 'p1' } as any)).toBe(true)
    })
    it('反例: 无 preset', () => {
      expect(isParticleData({ id: 'p1' } as any)).toBe(false)
    })
    it('反例: null', () => {
      expect(isParticleData(null as any)).toBe(false)
    })
    it('反例: 非 object', () => {
      expect(isParticleData('string' as any)).toBe(false)
    })
  })

  describe('isLive2DData', () => {
    it('正例: 有 model 无 preset', () => {
      expect(isLive2DData({ model: 'sakura.moc3', id: 'l1' } as any)).toBe(true)
    })
    it('反例: 有 model 且有 preset (是 particle)', () => {
      // 确保 Particle 不会被误判为 Live2D
      expect(isLive2DData({ model: 'x', preset: 'snow', id: 'p1' } as any)).toBe(false)
    })
    it('反例: 无 model', () => {
      expect(isLive2DData({ id: 'l1' } as any)).toBe(false)
    })
    it('反例: null', () => {
      expect(isLive2DData(null as any)).toBe(false)
    })
  })

  describe('isItemData', () => {
    it('正例: 有 action 和 itemName', () => {
      expect(isItemData({ action: 'get', itemName: '钥匙', id: 'i1' } as any)).toBe(true)
    })
    it('反例: 仅有 action', () => {
      expect(isItemData({ action: 'get', id: 'i1' } as any)).toBe(false)
    })
    it('反例: null', () => {
      expect(isItemData(null as any)).toBe(false)
    })
  })

  describe('getTypedData', () => {
    it('匹配类型返回 data', () => {
      const node = { id: 'n', type: 'dialog', position: { x: 0, y: 0 }, data: { character: 'A', content: 'B' } as NodeData }
      const result = getTypedData(node, isParticleData as any)
      expect(result).toBeNull() // dialog data is not particle
    })
    it('null node 返回 null', () => {
      expect(getTypedData(null as any, isParticleData)).toBeNull()
    })
  })
})
