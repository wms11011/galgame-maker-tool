import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowStore } from '../renderer/src/stores/flowStore'

describe('白盒: flowStore 分组操作', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('setGroupUnlockCondition', () => {
    it('设置分组的解锁条件', () => {
      const store = useFlowStore()
      store.groups = [
        { id: 'g1', name: '第一章', color: '#ff0000', nodeIds: [], bgmLoop: false, defaultBackground: '', transition: 'fade' as const }
      ]
      store.setGroupUnlockCondition('g1', 'score >= 50')
      expect(store.groups[0].unlockCondition).toBe('score >= 50')
    })

    it('不存在的分组无操作', () => {
      const store = useFlowStore()
      store.setGroupUnlockCondition('no-exist', 'x >= 1')
      expect(store.groups).toHaveLength(0)
    })
  })

  describe('setGroupTransition', () => {
    it('设置分组过渡效果', () => {
      const store = useFlowStore()
      store.groups = [
        { id: 'g1', name: '第一章', color: '#ff0000', nodeIds: [], bgmLoop: false, defaultBackground: '', transition: 'fade' as const }
      ]
      store.setGroupTransition('g1', 'slide')
      expect(store.groups[0].transition).toBe('slide')
    })

    it('支持所有8种过渡值', () => {
      const store = useFlowStore()
      store.groups = [
        { id: 'g1', name: '第一章', color: '#ff0000', nodeIds: [], bgmLoop: false, defaultBackground: '', transition: 'fade' as const }
      ]
      const transitions = ['fade', 'slide', 'blinds', 'mosaic', 'wind', 'iris', 'dissolve', 'none'] as const
      for (const t of transitions) {
        store.setGroupTransition('g1', t)
        expect(store.groups[0].transition).toBe(t)
      }
    })
  })

  describe('addNodeToGroup', () => {
    it('添加节点到分组', () => {
      const store = useFlowStore()
      store.groups = [
        { id: 'g1', name: '第一章', color: '#ff0000', nodeIds: [], bgmLoop: false, defaultBackground: '', transition: 'fade' as const },
        { id: 'g2', name: '第二章', color: '#00ff00', nodeIds: [], bgmLoop: false, defaultBackground: '', transition: 'fade' as const }
      ]
      store.addNodeToGroup('g1', 'n1')
      expect(store.groups[0].nodeIds).toContain('n1')
      expect(store.groups[1].nodeIds).toHaveLength(0)
    })

    it('节点从旧分组移动到新分组', () => {
      const store = useFlowStore()
      store.groups = [
        { id: 'g1', name: '第一章', color: '#ff0000', nodeIds: ['n1'], bgmLoop: false, defaultBackground: '', transition: 'fade' as const },
        { id: 'g2', name: '第二章', color: '#00ff00', nodeIds: [], bgmLoop: false, defaultBackground: '', transition: 'fade' as const }
      ]
      store.addNodeToGroup('g2', 'n1')
      expect(store.groups[0].nodeIds).not.toContain('n1')
      expect(store.groups[1].nodeIds).toContain('n1')
    })

    it('不重复添加同一节点到同一分组', () => {
      const store = useFlowStore()
      store.groups = [
        { id: 'g1', name: '第一章', color: '#ff0000', nodeIds: ['n1'], bgmLoop: false, defaultBackground: '', transition: 'fade' as const }
      ]
      store.addNodeToGroup('g1', 'n1')
      expect(store.groups[0].nodeIds).toEqual(['n1'])
    })

    it('不存在的分组无操作', () => {
      const store = useFlowStore()
      store.addNodeToGroup('no-exist', 'n1')
      expect(store.groups).toHaveLength(0)
    })
  })

  describe('setGroupBgmLoop / setGroupDefaultBg', () => {
    it('setGroupBgmLoop 设置 BGM 循环', () => {
      const store = useFlowStore()
      store.groups = [
        { id: 'g1', name: '第一章', color: '#ff0000', nodeIds: [], bgmLoop: false, defaultBackground: '', transition: 'fade' as const }
      ]
      store.setGroupBgmLoop('g1', true)
      expect(store.groups[0].bgmLoop).toBe(true)
      store.setGroupBgmLoop('g1', false)
      expect(store.groups[0].bgmLoop).toBe(false)
    })

    it('setGroupDefaultBg 设置默认背景', () => {
      const store = useFlowStore()
      store.groups = [
        { id: 'g1', name: '第一章', color: '#ff0000', nodeIds: [], bgmLoop: false, defaultBackground: '', transition: 'fade' as const }
      ]
      store.setGroupDefaultBg('g1', 'assets/bg/forest.png')
      expect(store.groups[0].defaultBackground).toBe('assets/bg/forest.png')
    })
  })

  describe('setGroupBgm / setGroupBgmVolume', () => {
    it('setGroupBgm 设置分组 BGM', () => {
      const store = useFlowStore()
      store.groups = [
        { id: 'g1', name: '第一章', color: '#ff0000', nodeIds: [], bgmLoop: false, defaultBackground: '', transition: 'fade' as const }
      ]
      store.setGroupBgm('g1', 'assets/audio/bgm01.mp3')
      expect(store.groups[0].bgm).toBe('assets/audio/bgm01.mp3')
    })

    it('setGroupBgmVolume 设置 BGM 音量', () => {
      const store = useFlowStore()
      store.groups = [
        { id: 'g1', name: '第一章', color: '#ff0000', nodeIds: [], bgmLoop: false, defaultBackground: '', transition: 'fade' as const }
      ]
      store.setGroupBgmVolume('g1', 0.75)
      expect(store.groups[0].bgmVolume).toBe(0.75)
    })
  })
})
