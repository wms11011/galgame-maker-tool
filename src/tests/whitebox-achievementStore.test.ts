import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAchievementStore } from '../renderer/src/stores/achievementStore'

describe('白盒: achievementStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('setProjectPath', () => {
    it('加载已持久化成就', () => {
      const key = 'galgame_achievements_/proj'
      localStorage.setItem(key, JSON.stringify([
        { id: 'a1', name: '初来乍到', description: '开始游戏', icon: '🎉', color: '#f00', unlocked: true, unlockedAt: '2025-01-01' }
      ]))
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      expect(store.achievements).toHaveLength(1)
      expect(store.achievements[0].name).toBe('初来乍到')
      expect(store.achievements[0].unlocked).toBe(true)
    })

    it('localStorage 损坏时返回空数组', () => {
      localStorage.setItem('galgame_achievements_/proj', 'bad-json')
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      expect(store.achievements).toHaveLength(0)
    })
  })

  describe('addAchievement', () => {
    it('创建成就并返回唯一 ID', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      const id = store.addAchievement('冠军', '通关游戏', '🏆', '#ff0')
      expect(id).toMatch(/^ach_/)
      expect(store.achievements).toHaveLength(1)
      const a = store.achievements[0]
      expect(a.name).toBe('冠军')
      expect(a.description).toBe('通关游戏')
      expect(a.icon).toBe('🏆')
      expect(a.color).toBe('#ff0')
      expect(a.unlocked).toBe(false)
    })

    it('默认值正确', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      store.addAchievement('Test', 'desc')
      expect(store.achievements[0].icon).toBe('🏆')
      expect(store.achievements[0].color).toBe('#f59e0b')
    })

    it('自动 trim 名称和描述', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      store.addAchievement('  Test  ', '  desc  ')
      expect(store.achievements[0].name).toBe('Test')
      expect(store.achievements[0].description).toBe('desc')
    })
  })

  describe('removeAchievement', () => {
    it('删除存在的成就', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      const id = store.addAchievement('A', '')
      store.addAchievement('B', '')
      store.removeAchievement(id)
      expect(store.achievements).toHaveLength(1)
      expect(store.achievements[0].name).toBe('B')
    })

    it('删除不存在的成就无影响', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      store.addAchievement('A', '')
      store.removeAchievement('not-exist')
      expect(store.achievements).toHaveLength(1)
    })
  })

  describe('unlockAchievement', () => {
    it('解锁未解锁成就返回 true', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      const id = store.addAchievement('A', '')
      const result = store.unlockAchievement(id)
      expect(result).toBe(true)
      expect(store.achievements[0].unlocked).toBe(true)
      expect(store.achievements[0].unlockedAt).toBeTruthy()
    })

    it('已解锁成就返回 false', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      const id = store.addAchievement('A', '')
      store.unlockAchievement(id)
      const result = store.unlockAchievement(id)
      expect(result).toBe(false)
    })

    it('不存在的成就返回 false', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      expect(store.unlockAchievement('no-id')).toBe(false)
    })
  })

  describe('lockAchievement', () => {
    it('重置成就为未解锁状态', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      const id = store.addAchievement('A', '')
      store.unlockAchievement(id)
      expect(store.achievements[0].unlocked).toBe(true)
      store.lockAchievement(id)
      expect(store.achievements[0].unlocked).toBe(false)
      expect(store.achievements[0].unlockedAt).toBeUndefined()
    })

    it('不存在的成就无操作', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      store.addAchievement('A', '')
      store.lockAchievement('no-id')
      expect(store.achievements[0].unlocked).toBe(false)
    })
  })

  describe('resetAll', () => {
    it('将所有成就设为未解锁', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      const id1 = store.addAchievement('A', '')
      const id2 = store.addAchievement('B', '')
      store.unlockAchievement(id1)
      store.unlockAchievement(id2)
      store.resetAll()
      expect(store.achievements[0].unlocked).toBe(false)
      expect(store.achievements[0].unlockedAt).toBeUndefined()
      expect(store.achievements[1].unlocked).toBe(false)
    })
  })

  describe('loadDefinitions', () => {
    it('深拷贝加载成就定义', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      const defs = [
        { id: 'a1', name: 'A', description: '', icon: '', color: '', unlocked: true }
      ]
      store.loadDefinitions(defs)
      defs[0].name = 'Changed'
      expect(store.achievements[0].name).toBe('A')
    })
  })

  describe('updateAchievement', () => {
    it('更新已存在成就的部分字段', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      const id = store.addAchievement('Old', 'old desc', '🏅', '#000')
      store.updateAchievement(id, { name: 'New', description: 'new desc' })
      expect(store.achievements[0].name).toBe('New')
      expect(store.achievements[0].description).toBe('new desc')
      expect(store.achievements[0].icon).toBe('🏅') // 未修改的保持不变
    })

    it('不存在的成就无操作', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      store.addAchievement('A', '')
      store.updateAchievement('no-id', { name: 'X' })
      expect(store.achievements[0].name).toBe('A')
    })
  })

  describe('getById', () => {
    it('返回存在的成就', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      const id = store.addAchievement('Test', 'desc')
      const found = store.getById(id)
      expect(found).toBeDefined()
      expect(found!.name).toBe('Test')
    })

    it('返回 undefined 对不存在的 ID', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      expect(store.getById('nonexistent')).toBeUndefined()
    })
  })

  describe('计算属性', () => {
    it('totalCount / unlockedCount / progressPct', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      expect(store.totalCount).toBe(0)
      expect(store.progressPct).toBe(0)
      const id1 = store.addAchievement('A', '')
      const id2 = store.addAchievement('B', '')
      expect(store.totalCount).toBe(2)
      expect(store.unlockedCount).toBe(0)
      expect(store.progressPct).toBe(0)
      store.unlockAchievement(id1)
      expect(store.unlockedCount).toBe(1)
      expect(store.progressPct).toBe(50)
    })
  })

  describe('持久化', () => {
    it('所有写操作都调用 persist', () => {
      const store = useAchievementStore()
      store.setProjectPath('/proj')
      const id = store.addAchievement('A', '')
      let raw = localStorage.getItem('galgame_achievements_/proj')
      expect(JSON.parse(raw!)).toHaveLength(1)

      store.unlockAchievement(id)
      raw = localStorage.getItem('galgame_achievements_/proj')
      expect(JSON.parse(raw!)[0].unlocked).toBe(true)

      store.removeAchievement(id)
      raw = localStorage.getItem('galgame_achievements_/proj')
      expect(JSON.parse(raw!)).toHaveLength(0)
    })
  })
})
