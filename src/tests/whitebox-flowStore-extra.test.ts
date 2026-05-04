import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowStore } from '../renderer/src/stores/flowStore'

describe('白盒: flowStore 分组方法补全', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function makeGroup(overrides: any = {}) {
    return {
      id: 'g1', name: '第一章', color: '#ff0000', nodeIds: [],
      bgmLoop: false, defaultBackground: '', transition: 'fade' as const,
      ...overrides
    }
  }

  describe('setGroupBackground', () => {
    it('设置分组背景', () => {
      const store = useFlowStore()
      store.groups = [makeGroup()]
      store.setGroupBackground('g1', 'assets/bg/sky.png')
      expect(store.groups[0].background).toBe('assets/bg/sky.png')
    })

    it('不存在的分组无操作', () => {
      const store = useFlowStore()
      store.setGroupBackground('no-exist', 'assets/bg/x.png')
      expect(store.groups).toHaveLength(0)
    })
  })

  describe('setGroupTitleCard', () => {
    it('启用标题卡', () => {
      const store = useFlowStore()
      store.groups = [makeGroup()]
      store.setGroupTitleCard('g1', true)
      expect(store.groups[0].titleCard).toBe(true)
    })

    it('禁用标题卡', () => {
      const store = useFlowStore()
      store.groups = [makeGroup({ titleCard: true })]
      store.setGroupTitleCard('g1', false)
      expect(store.groups[0].titleCard).toBe(false)
    })
  })

  describe('setGroupColor', () => {
    it('设置分组颜色', () => {
      const store = useFlowStore()
      store.groups = [makeGroup()]
      store.setGroupColor('g1', '#00ff00')
      expect(store.groups[0].color).toBe('#00ff00')
    })
  })
})
