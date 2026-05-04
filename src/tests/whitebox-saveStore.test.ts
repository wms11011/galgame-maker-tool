import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSaveStore } from '../renderer/src/stores/saveStore'

describe('白盒: saveStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  function makeSaveData(overrides: any = {}) {
    return {
      projectName: 'test',
      currentNodeId: 'n1',
      currentNodeLabel: '开始',
      variables: { x: 10 },
      visitedNodeIds: ['n1'],
      globalFlags: { seen: true },
      slotLabel: '存档1',
      screenshot: 'data:...',
      ...overrides
    }
  }

  describe('setProjectPath', () => {
    it('设置路径后从 localStorage 加载存档', () => {
      const key = 'galgame_saves_/test/proj'
      localStorage.setItem(key, JSON.stringify([
        { id: 's1', slotLabel: '旧存档', timestamp: '2025-01-01', projectName: 'test', currentNodeId: 'n1', currentNodeLabel: '', variables: {}, visitedNodeIds: [], globalFlags: {} }
      ]))
      const store = useSaveStore()
      store.setProjectPath('/test/proj')
      expect(store.saves).toHaveLength(1)
      expect(store.saves[0].id).toBe('s1')
      expect(store.activeSaveId).toBeNull()
    })

    it('localStorage 无数据时为空数组', () => {
      const store = useSaveStore()
      store.setProjectPath('/nonexistent')
      expect(store.saves).toHaveLength(0)
      expect(store.activeSaveId).toBeNull()
    })

    it('localStorage 非法 JSON 时返回空数组', () => {
      localStorage.setItem('galgame_saves_/test/proj', '{invalid')
      const store = useSaveStore()
      store.setProjectPath('/test/proj')
      expect(store.saves).toHaveLength(0)
    })

    it('localStorage 非数组 JSON 时返回空数组', () => {
      localStorage.setItem('galgame_saves_/test/proj', '"not an array"')
      const store = useSaveStore()
      store.setProjectPath('/test/proj')
      expect(store.saves).toHaveLength(0)
    })
  })

  describe('createSave', () => {
    it('创建存档并持久化到 localStorage', () => {
      const store = useSaveStore()
      store.setProjectPath('/proj')
      const save = store.createSave('我的游戏', 'node5', '对话', { hp: 100 }, ['n1', 'n5'], {}, '快存1')
      expect(store.saves).toHaveLength(1)
      expect(save.projectName).toBe('我的游戏')
      expect(save.currentNodeId).toBe('node5')
      expect(save.variables).toEqual({ hp: 100 })
      expect(save.visitedNodeIds).toEqual(['n1', 'n5'])
      expect(save.globalFlags).toEqual({})
      expect(save.slotLabel).toBe('快存1')
      expect(save.screenshot).toBeUndefined()

      const raw = localStorage.getItem('galgame_saves_/proj')
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw!)
      expect(parsed).toHaveLength(1)
    })

    it('未指定 slotLabel 时自动生成', () => {
      const store = useSaveStore()
      store.setProjectPath('/proj')
      const save = store.createSave('test', 'n1', '', {}, [], {})
      expect(save.slotLabel).toBe('存档 1')
      const save2 = store.createSave('test', 'n2', '', {}, [], {})
      expect(save2.slotLabel).toBe('存档 2')
    })

    it('projectPath 为空时仍创建但不持久化（persist 空值跳过）', () => {
      const store = useSaveStore()
      const save = store.createSave('test', 'n1', '', {}, [], {})
      expect(store.saves).toHaveLength(1)
      expect(save.id).toBeTruthy()
    })

    it('传入 screenshot 数据持久化', () => {
      const store = useSaveStore()
      store.setProjectPath('/proj')
      store.createSave('test', 'n1', '', {}, [], {}, '快存', 'data:image/png;base64,abc')
      expect(store.saves[0].screenshot).toBe('data:image/png;base64,abc')
    })
  })

  describe('loadSave', () => {
    it('加载存在的存档并设置 activeSaveId', () => {
      const store = useSaveStore()
      store.setProjectPath('/proj')
      const save = store.createSave('test', 'n1', '', {}, [], {})
      const result = store.loadSave(save.id)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(save.id)
      expect(store.activeSaveId).toBe(save.id)
    })

    it('加载不存在的存档返回 null', () => {
      const store = useSaveStore()
      store.setProjectPath('/proj2')
      const s = store.createSave('test', 'n1', '', {}, [], {})
      store.loadSave(s.id)
      const result = store.loadSave('nonexistent')
      expect(result).toBeNull()
      expect(store.activeSaveId).toBe(s.id) // 保持不变
    })
  })

  describe('deleteSave', () => {
    it('删除存在的存档', () => {
      const store = useSaveStore()
      store.setProjectPath('/proj3')
      // 手动推入两个不同ID的存档以绕过 Date.now() 可能重复的问题
      store.saves = [
        { id: 's1', slotLabel: '存档1', timestamp: '', projectName: 't', currentNodeId: 'n1', currentNodeLabel: '', variables: {}, visitedNodeIds: [], globalFlags: {} },
        { id: 's2', slotLabel: '存档2', timestamp: '', projectName: 't', currentNodeId: 'n2', currentNodeLabel: '', variables: {}, visitedNodeIds: [], globalFlags: {} }
      ]
      store.deleteSave('s1')
      expect(store.saves).toHaveLength(1)
      expect(store.saves[0].currentNodeId).toBe('n2')
    })

    it('删除 activeSave 时清空 activeSaveId', () => {
      const store = useSaveStore()
      store.setProjectPath('/proj4')
      store.saves = [
        { id: 's1', slotLabel: '存档1', timestamp: '', projectName: 't', currentNodeId: 'n1', currentNodeLabel: '', variables: {}, visitedNodeIds: [], globalFlags: {} }
      ]
      store.loadSave('s1')
      expect(store.activeSaveId).toBe('s1')
      store.deleteSave('s1')
      expect(store.activeSaveId).toBeNull()
    })
  })

  describe('clearAll', () => {
    it('清空所有存档和 activeSaveId', () => {
      const store = useSaveStore()
      store.setProjectPath('/proj')
      store.createSave('test', 'n1', '', {}, [], {})
      store.createSave('test', 'n2', '', {}, [], {})
      store.loadSave(store.saves[0].id)
      store.clearAll()
      expect(store.saves).toHaveLength(0)
      expect(store.activeSaveId).toBeNull()
    })
  })

  describe('getMostRecent', () => {
    it('有存档时返回最后一个', () => {
      const store = useSaveStore()
      store.setProjectPath('/proj')
      store.createSave('test', 'n1', '', {}, [], {})
      const s2 = store.createSave('test', 'n2', '', {}, [], {})
      const recent = store.getMostRecent()
      expect(recent).not.toBeNull()
      expect(recent!.id).toBe(s2.id)
    })

    it('无存档时返回 null', () => {
      const store = useSaveStore()
      store.setProjectPath('/proj')
      expect(store.getMostRecent()).toBeNull()
    })
  })

  describe('saveCount', () => {
    it('计算存档数量', () => {
      const store = useSaveStore()
      store.setProjectPath('/proj')
      expect(store.saveCount).toBe(0)
      store.createSave('test', 'n1', '', {}, [], {})
      expect(store.saveCount).toBe(1)
    })
  })

  describe('persist 内部', () => {
    it('projectPath 为空时不调用 localStorage.setItem', () => {
      const store = useSaveStore()
      store.createSave('test', 'n1', '', {}, [], {})
      // 没有 projectPath，persist 跳过
      const saved = localStorage.getItem('galgame_saves_')
      expect(saved).toBeNull()
    })
  })
})
