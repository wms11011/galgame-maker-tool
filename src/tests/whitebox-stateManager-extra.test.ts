import { describe, it, expect, beforeEach } from 'vitest'
import { StateManager } from '../renderer/src/preview/StateManager'

describe('白盒: StateManager catch 分支', () => {
  let sm: StateManager

  beforeEach(() => {
    sm = new StateManager()
    sm.reset()
  })

  describe('evaluateExpression 边缘', () => {
    it('unknown operator 不会匹配', () => {
      sm.variables['x'] = 5
      // 未知操作符 ~= 不会被 cmpMatch 匹配
      expect(sm.evaluateExpression('x ~= 3')).toBe(false)
    })

    it('flag 名称中有数字', () => {
      sm.globalFlags['flag123'] = true
      expect(sm.evaluateExpression('flag123')).toBe(true)
    })

    it('flag 名称中有下划线', () => {
      sm.globalFlags['my_flag_test'] = true
      expect(sm.evaluateExpression('my_flag_test')).toBe(true)
    })

    it('标记值恰好为 false', () => {
      sm.globalFlags['rareFlag'] = false
      expect(sm.evaluateExpression('rareFlag')).toBe(false)
    })
  })

  describe('checkAutoAchievements catch', () => {
    it('evaluateExpression 中 isNaN 导致异常', () => {
      sm.loadFromProject(
        [{ name: 'x', type: 'number', initialValue: 10 }],
        {}, {},
        [
          { id: 'a1', name: 'Test', description: '', icon: '', unlocked: false, autoCheck: true, unlockCondition: 'x >= abc' }
        ]
      )
      // evaluateExpression('x >= abc') → parseFloat('abc') → NaN → isNaN(NaN) → true → return false
      // This doesn't throw, but lastAutoCheckInfo records the result
      sm.checkAutoAchievements()
      expect(sm.lastAutoCheckInfo).not.toBeNull()
      expect(sm.lastAutoCheckInfo!.results).toHaveLength(1)
      expect(sm.lastAutoCheckInfo!.results[0].result).toBe(false)
    })

    it('多个候选成就同时检测', () => {
      sm.loadFromProject(
        [
          { name: 'a', type: 'number', initialValue: 100 },
          { name: 'b', type: 'number', initialValue: 200 }
        ],
        {}, {},
        [
          { id: 'ach1', name: 'A高分', description: '', icon: '', unlocked: false, autoCheck: true, unlockCondition: 'a >= 50' },
          { id: 'ach2', name: 'B高分', description: '', icon: '', unlocked: false, autoCheck: true, unlockCondition: 'b >= 50' }
        ]
      )
      const unlocked = sm.checkAutoAchievements()
      expect(unlocked).toHaveLength(2)
      expect(unlocked[0].unlocked).toBe(true)
      expect(unlocked[1].unlocked).toBe(true)
      expect(sm.lastAutoCheckInfo!.candidateCount).toBe(2)
    })

    it('一个成功一个失败', () => {
      sm.loadFromProject(
        [
          { name: 'a', type: 'number', initialValue: 100 },
          { name: 'b', type: 'number', initialValue: 0 }
        ],
        {}, {},
        [
          { id: 'ach1', name: 'A高分', description: '', icon: '', unlocked: false, autoCheck: true, unlockCondition: 'a >= 50' },
          { id: 'ach2', name: 'B高分', description: '', icon: '', unlocked: false, autoCheck: true, unlockCondition: 'b >= 50' }
        ]
      )
      const unlocked = sm.checkAutoAchievements()
      expect(unlocked).toHaveLength(1)
      expect(unlocked[0].name).toBe('A高分')
    })
  })

  describe('applyVariableOp 边缘', () => {
    it('parseFloat("") 返回 NaN → 0', () => {
      sm.variables['x'] = 5
      sm.applyVariableOp('x', '+=', '')
      // parseFloat('') = NaN, NaN || 0 = 0, so x stays 5
      expect(sm.variables['x']).toBe(5)
    })
  })

  describe('evaluateExpression 额外覆盖', () => {
    it('strEquals 变量值非字符串', () => {
      sm.variables['num'] = 42
      expect(sm.evaluateExpression("strEquals('num', '42')")).toBe(true)
    })

    it('strEquals 变量不存在', () => {
      expect(sm.evaluateExpression("strEquals('ghost', 'x')")).toBe(false)
    })

    it('hasItem 变量不是数组', () => {
      sm.variables['notArr'] = 'string'
      expect(sm.evaluateExpression("hasItem('notArr', 'x')")).toBe(false)
    })
  })
})
