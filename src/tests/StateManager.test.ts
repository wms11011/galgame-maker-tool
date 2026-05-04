import { describe, it, expect, beforeEach } from 'vitest'
import { StateManager } from '../renderer/src/preview/StateManager'

describe('StateManager', () => {
  let sm: StateManager

  beforeEach(() => {
    sm = new StateManager()
    sm.reset()
  })

  describe('变量初始化', () => {
    it('从项目变量加载数值变量', () => {
      sm.loadFromProject(
        [{ name: 'score', type: 'number', initialValue: 10 }],
        {}, {}, []
      )
      expect(sm.variables['score']).toBe(10)
    })

    it('从项目变量加载字符串变量', () => {
      sm.loadFromProject(
        [{ name: 'name', type: 'string', initialValue: 'Alice' }],
        {}, {}, []
      )
      expect(sm.variables['name']).toBe('Alice')
    })

    it('从项目变量加载布尔变量', () => {
      sm.loadFromProject(
        [{ name: 'seen', type: 'boolean', initialValue: true }],
        {}, {}, []
      )
      expect(sm.variables['seen']).toBe(true)
    })

    it('从项目变量加载数组变量（复制值而非引用）', () => {
      const arr = ['a', 'b']
      sm.loadFromProject(
        [{ name: 'items', type: 'array', initialValue: arr }],
        {}, {}, []
      )
      expect(sm.variables['items']).toEqual(['a', 'b'])
      expect(sm.variables['items']).not.toBe(arr)
    })

    it('loadFromProject 直接赋值类型不做转换', () => {
      sm.loadFromProject(
        [{ name: 'x', type: 'number', initialValue: 0 }],
        {}, {}, []
      )
      expect(sm.variables['x']).toBe(0)
    })
  })

  describe('标记操作', () => {
    it('加载全局标记', () => {
      sm.loadFromProject([], { flag1: true, flag2: false }, {}, [])
      expect(sm.globalFlags['flag1']).toBe(true)
      expect(sm.globalFlags['flag2']).toBe(false)
    })

    it('通过 setFlag 设置标记', () => {
      sm.setFlag('custom', true)
      expect(sm.globalFlags['custom']).toBe(true)
    })

    it('通过 setFlag 删除标记', () => {
      sm.globalFlags['temp'] = true
      sm.setFlag('temp', false)
      expect(sm.globalFlags['temp']).toBe(false)
    })
  })

  describe('表达式求值', () => {
    beforeEach(() => {
      sm.loadFromProject(
        [
          { name: '好感度', type: 'number', initialValue: 50 },
          { name: 'score', type: 'number', initialValue: 0 },
          { name: 'items', type: 'array', initialValue: ['钥匙', '地图'] },
          { name: 'name', type: 'string', initialValue: 'Alice' }
        ],
        { ch2_unlocked: true, ch3_unlocked: false },
        {}, []
      )
    })

    it('支持 >= 比较', () => {
      expect(sm.evaluateExpression('好感度 >= 50')).toBe(true)
      expect(sm.evaluateExpression('好感度 >= 100')).toBe(false)
    })

    it('支持 <= 比较', () => {
      expect(sm.evaluateExpression('score <= 10')).toBe(true)
    })

    it('支持 == 比较', () => {
      expect(sm.evaluateExpression('好感度 == 50')).toBe(true)
      expect(sm.evaluateExpression('好感度 == 30')).toBe(false)
    })

    it('支持 AND 组合', () => {
      expect(sm.evaluateExpression('好感度 >= 30 && score <= 10')).toBe(true)
      expect(sm.evaluateExpression('好感度 >= 30 && score > 10')).toBe(false)
    })

    it('支持 OR 组合', () => {
      expect(sm.evaluateExpression('好感度 >= 100 || score == 0')).toBe(true)
    })

    it('支持标记名作为布尔变量', () => {
      expect(sm.evaluateExpression('ch2_unlocked')).toBe(true)
      expect(sm.evaluateExpression('ch3_unlocked')).toBe(false)
    })

    it('支持 hasItem 函数', () => {
      expect(sm.evaluateExpression("hasItem('items', '钥匙')")).toBe(true)
      expect(sm.evaluateExpression("hasItem('items', '宝石')")).toBe(false)
    })

    it('支持 strEquals 函数', () => {
      expect(sm.evaluateExpression("strEquals('name', 'Alice')")).toBe(true)
      expect(sm.evaluateExpression("strEquals('name', 'Bob')")).toBe(false)
    })

    it('空表达式返回 true', () => {
      expect(sm.evaluateExpression('')).toBe(true)
    })

    it('支持 != 比较', () => {
      expect(sm.evaluateExpression('好感度 != 30')).toBe(true)
      expect(sm.evaluateExpression('好感度 != 50')).toBe(false)
    })

    it('支持 > 和 < 比较', () => {
      expect(sm.evaluateExpression('好感度 > 30')).toBe(true)
      expect(sm.evaluateExpression('好感度 < 100')).toBe(true)
      expect(sm.evaluateExpression('好感度 < 50')).toBe(false)
    })

    it('三元 AND 组合', () => {
      sm.variables['a'] = 1; sm.variables['b'] = 2; sm.variables['c'] = 3
      expect(sm.evaluateExpression('a >= 1 && b >= 2 && c >= 3')).toBe(true)
      expect(sm.evaluateExpression('a >= 1 && b >= 2 && c >= 4')).toBe(false)
    })

    it('混合 AND/OR 优先级按左到右', () => {
      sm.variables['x'] = 1; sm.variables['y'] = 0
      expect(sm.evaluateExpression('x >= 1 || y >= 1 && x >= 0')).toBe(true)
    })

    it('未知变量按 0 处理，比较失败', () => {
      expect(sm.evaluateExpression('unknownVar >= 0')).toBe(true)
      expect(sm.evaluateExpression('unknownVar > 0')).toBe(false)
    })

    it('值恰好为零时正确比较', () => {
      expect(sm.evaluateExpression('score >= 0')).toBe(true)
      expect(sm.evaluateExpression('score == 0')).toBe(true)
    })

    it('带前后空白也能正确求值', () => {
      expect(sm.evaluateExpression('  好感度 >= 50  ')).toBe(true)
    })

    it('仅空白字符串返回 true', () => {
      expect(sm.evaluateExpression('   ')).toBe(true)
    })

    it('hasItem 变量不存在时返回 false', () => {
      expect(sm.evaluateExpression("hasItem('notExist', 'x')")).toBe(false)
    })

    it('strEquals 变量不存在时返回 false', () => {
      expect(sm.evaluateExpression("strEquals('notExist', 'Alice')")).toBe(false)
    })
  })

  describe('快照与恢复', () => {
    beforeEach(() => {
      sm.loadFromProject(
        [
          { name: 'x', type: 'number', initialValue: 42 },
          { name: 'items', type: 'array', initialValue: ['a'] }
        ],
        { seen: true },
        {},
        [
          { id: 'ach1', name: 'Test', description: '', icon: '', unlocked: false, autoCheck: true, unlockCondition: 'x >= 50' }
        ]
      )
      sm.recordVisit({ id: 'node1', type: 'dialog', data: { label: '对话1' } })
      sm.recordVisit({ id: 'node2', type: 'choice', data: { label: '选择' } })
    })

    it('快照保留当前状态', () => {
      const snap = sm.snapshot('node2')
      expect(snap.currentNodeId).toBe('node2')
      expect(snap.variables).toEqual({ x: 42, items: ['a'] })
      expect(snap.globalFlags).toEqual({ seen: true })
    })

    it('恢复快照后变量一致', () => {
      sm.variables['x'] = 99
      const snap = sm.snapshot('node1')
      sm.variables['x'] = 999
      sm.restore(snap)
      expect(sm.variables['x']).toBe(99)
    })

    it('恢复快照后标记一致', () => {
      const snap = sm.snapshot('node1')
      sm.globalFlags['seen'] = false
      sm.restore(snap)
      expect(sm.globalFlags['seen']).toBe(true)
    })
  })

  describe('成就自动检测', () => {
    it('条件满足时解锁成就', () => {
      sm.loadFromProject(
        [{ name: 'x', type: 'number', initialValue: 100 }],
        {}, {},
        [
          { id: 'a1', name: '高分', description: '', icon: '', unlocked: false, autoCheck: true, unlockCondition: 'x >= 50' }
        ]
      )
      const unlocked = sm.checkAutoAchievements()
      expect(unlocked.length).toBe(1)
      expect(unlocked[0].id).toBe('a1')
      expect(unlocked[0].unlocked).toBe(true)
    })

    it('条件不满足时不误触发', () => {
      sm.loadFromProject(
        [{ name: 'x', type: 'number', initialValue: 10 }],
        {}, {},
        [
          { id: 'a1', name: '高分', description: '', icon: '', unlocked: false, autoCheck: true, unlockCondition: 'x >= 50' }
        ]
      )
      const unlocked = sm.checkAutoAchievements()
      expect(unlocked.length).toBe(0)
    })

    it('已解锁的成就重新加载后重置为未解锁', () => {
      sm.loadFromProject(
        [{ name: 'x', type: 'number', initialValue: 100 }],
        {}, {},
        [
          { id: 'a1', name: '高分', description: '', icon: '', unlocked: true, autoCheck: true, unlockCondition: 'x >= 50' }
        ]
      )
      // loadFromProject 重置所有成就为 unlocked: false
      const unlocked = sm.checkAutoAchievements()
      expect(unlocked.length).toBe(1) // 条件满足，首次触发
    })

    it('autoCheck 为 false 的成就不会被自动检测', () => {
      sm.loadFromProject(
        [{ name: 'x', type: 'number', initialValue: 100 }],
        {}, {},
        [
          { id: 'a1', name: '高分', description: '', icon: '', unlocked: false, autoCheck: false, unlockCondition: 'x >= 50' }
        ]
      )
      expect(sm.checkAutoAchievements().length).toBe(0)
    })
  })

  describe('访问记录', () => {
    it('recordVisit 追加访问记录', () => {
      sm.recordVisit({ id: 'n1', type: 'dialog', data: { label: '测试' } })
      expect(sm.visitedNodes.length).toBe(1)
      expect(sm.visitedNodes[0].id).toBe('n1')
      expect(sm.stepCount).toBe(1)
    })

    it('reset 清空所有状态', () => {
      sm.recordVisit({ id: 'n1', type: 'dialog', data: { label: 'T' } })
      sm.globalFlags['any'] = true
      sm.variables['x'] = 100
      sm.reset()
      expect(sm.visitedNodes.length).toBe(0)
      expect(sm.globalFlags).toEqual({})
      expect(sm.variables).toEqual({})
      expect(sm.stepCount).toBe(0)
    })
  })
})
