import { describe, it, expect, beforeEach } from 'vitest'
import { StateManager } from '../renderer/src/preview/StateManager'

describe('白盒: StateManager 补全', () => {
  let sm: StateManager

  beforeEach(() => {
    sm = new StateManager()
    sm.reset()
  })

  describe('recordVariableChange', () => {
    it('记录变量变更到 history', () => {
      sm.loadFromProject(
        [{ name: 'x', type: 'number', initialValue: 0 }],
        {}, {}, []
      )
      sm.recordVisit({ id: 'n1', type: 'dialog', label: '开始' })
      sm.recordVariableChange('n1', 'x', 0, 100, '+=')

      expect(sm.variableHistory).toHaveLength(1)
      expect(sm.variableHistory[0].varName).toBe('x')
      expect(sm.variableHistory[0].oldValue).toBe(0)
      expect(sm.variableHistory[0].newValue).toBe(100)
      expect(sm.variableHistory[0].op).toBe('+=')
      expect(sm.variableHistory[0].nodeId).toBe('n1')
    })

    it('valueStr 格式化正确', () => {
      sm.recordVisit({ id: 'n1', type: 'dialog', label: '' })
      sm.recordVariableChange('n1', 'hp', 50, 25, '-=')
      expect(sm.variableHistory[0].valueStr).toContain('50')
      expect(sm.variableHistory[0].valueStr).toContain('25')
    })
  })

  describe('applyVariableOp', () => {
    it('= 操作符', () => {
      sm.variables['x'] = 0
      sm.applyVariableOp('x', '=', '42')
      expect(sm.variables['x']).toBe(42)
    })

    it('+= 操作符', () => {
      sm.variables['x'] = 10
      sm.applyVariableOp('x', '+=', '5')
      expect(sm.variables['x']).toBe(15)
    })

    it('-= 操作符', () => {
      sm.variables['x'] = 10
      sm.applyVariableOp('x', '-=', '3')
      expect(sm.variables['x']).toBe(7)
    })

    it('*= 操作符', () => {
      sm.variables['x'] = 5
      sm.applyVariableOp('x', '*=', '4')
      expect(sm.variables['x']).toBe(20)
    })

    it('/= 正常除法', () => {
      sm.variables['x'] = 10
      sm.applyVariableOp('x', '/=', '2')
      expect(sm.variables['x']).toBe(5)
    })

    it('/= 除以零保持原值', () => {
      sm.variables['x'] = 10
      sm.applyVariableOp('x', '/=', '0')
      expect(sm.variables['x']).toBe(10)
    })

    it('变量不存在时默认从 0 开始', () => {
      sm.applyVariableOp('y', '=', '99')
      expect(sm.variables['y']).toBe(99)
    })

    it('rawValue 非数字时 parseFloat 返回 NaN (falsy) 用 0', () => {
      sm.variables['x'] = 5
      sm.applyVariableOp('x', '+=', 'not-a-number')
      expect(sm.variables['x']).toBe(5) // parseFloat("not-a-number") is NaN, NaN || 0 = 0
    })
  })

  describe('evaluateExpression 额外覆盖', () => {
    beforeEach(() => {
      sm.loadFromProject(
        [{ name: 'score', type: 'number', initialValue: 0 }],
        { flagA: true }, {}, []
      )
    })

    it('isNaN 的比较值返回 false', () => {
      // expression like "score >= abc" where abc is NaN
      sm.variables['score'] = 0
      expect(sm.evaluateExpression('score >= abc')).toBe(false)
    })

    it('不匹配任何模式的表达式返回 false', () => {
      expect(sm.evaluateExpression('@#$%^')).toBe(false)
    })

    it('混合 AND/OR 表达式正确解析', () => {
      sm.variables['a'] = 1; sm.variables['b'] = 0
      // "a >= 1 || b >= 1" — OR splits first
      expect(sm.evaluateExpression('a >= 1 || b >= 1')).toBe(true)
      // "a >= 1 && b >= 1" — AND splits then evaluates
      expect(sm.evaluateExpression('a >= 1 && b >= 1')).toBe(false)
    })

    it('多个 OR 中有一个为 true 即可', () => {
      sm.variables['x'] = 0
      expect(sm.evaluateExpression('x > 1 || x >= 0 || x < -1')).toBe(true)
    })

    it('多个 AND 中有一个为 false 即 false', () => {
      sm.variables['x'] = 5
      expect(sm.evaluateExpression('x >= 0 && x <= 10 && x > 10')).toBe(false)
    })
  })

  describe('checkAutoAchievements', () => {
    it('条件表达式错误时 lastAutoCheckInfo 记录 error', () => {
      sm.loadFromProject(
        [{ name: 'x', type: 'number', initialValue: 10 }],
        {}, {},
        [
          { id: 'a1', name: 'Bad', description: '', icon: '', unlocked: false, autoCheck: true, unlockCondition: 'x >= abc' }
        ]
      )
      const unlocked = sm.checkAutoAchievements()
      expect(unlocked).toHaveLength(0)
      expect(sm.lastAutoCheckInfo).not.toBeNull()
      expect(sm.lastAutoCheckInfo!.candidateCount).toBe(1)
      expect(sm.lastAutoCheckInfo!.results).toHaveLength(1)
    })

    it('无候选成就时 lastAutoCheckInfo 记录 0', () => {
      sm.loadFromProject([], {}, {}, [])
      sm.checkAutoAchievements()
      expect(sm.lastAutoCheckInfo!.candidateCount).toBe(0)
    })

    it('已解锁成就不会被重复检测', () => {
      sm.loadFromProject(
        [{ name: 'x', type: 'number', initialValue: 100 }],
        {}, {},
        [
          { id: 'a1', name: 'Done', description: '', icon: '', unlocked: false, autoCheck: true, unlockCondition: 'x >= 50' }
        ]
      )
      // 手动解锁
      sm.achievements[0].unlocked = true
      const unlocked = sm.checkAutoAchievements()
      // 已解锁的不会重新触发
      expect(unlocked).toHaveLength(0)
    })
  })

  describe('buildDebugInfo', () => {
    it('构建完整调试信息', () => {
      sm.loadFromProject(
        [{ name: 'hp', type: 'number', initialValue: 100 }],
        { intro_seen: true },
        { myFlag: '别名' },
        [
          { id: 'a1', name: '成就1', description: '', icon: '', unlocked: true, autoCheck: true, unlockCondition: '' }
        ]
      )
      sm.recordVisit({ id: 'n1', type: 'dialog', label: '对话' })
      sm.lastAutoCheckInfo = {
        timestamp: Date.now(),
        step: 1,
        candidateCount: 1,
        results: [{ name: '成就1', condition: '', resolvedCondition: '', result: true }],
        newlyUnlocked: ['成就1'],
        variables: { hp: 100 },
        globalFlags: { intro_seen: true },
        error: undefined
      }

      const debug = sm.buildDebugInfo(
        'n1', 'dialog', '对话',
        true, false, 3,
        [{ nodeId: 'bad', error: 'test error', timestamp: Date.now() }]
      )

      expect(debug.currentNodeId).toBe('n1')
      expect(debug.currentNodeType).toBe('dialog')
      expect(debug.isRunning).toBe(true)
      expect(debug.isBreakpointPaused).toBe(false)
      expect(debug.speed).toBe(3)
      expect(debug.variables).toEqual({ hp: 100 })
      expect(debug.flagAliases).toEqual({ myFlag: '别名' })
      expect(debug.achievements).toHaveLength(1)
      expect(debug.achievements[0].name).toBe('成就1')
      expect(debug.visitedNodes).toHaveLength(1)
      expect(debug.stepCount).toBe(1)
      expect(debug.errorNodes).toHaveLength(1)
      expect(debug.lastAutoCheck).not.toBeNull()
    })
  })

  describe('snapshot/restore 额外覆盖', () => {
    it('snapshot 包含 enteredGroups', () => {
      sm.enteredGroups = new Set(['g1', 'g2'])
      const snap = sm.snapshot('node1')
      expect(snap.enteredGroups).toEqual(['g1', 'g2'])
    })

    it('restore 恢复 enteredGroups', () => {
      const snap = sm.snapshot('node1')
      snap.enteredGroups = ['g3']
      sm.restore(snap)
      expect([...sm.enteredGroups]).toEqual(['g3'])
    })

    it('snapshot 复制 flagAliases', () => {
      sm.flagAliases = { a: 'A' }
      const snap = sm.snapshot(null)
      expect(snap.flagAliases).toEqual({ a: 'A' })
    })
  })

  describe('reset', () => {
    it('reset 清空 lastAutoCheckInfo', () => {
      sm.lastAutoCheckInfo = { timestamp: 1, step: 1, candidateCount: 0, results: [], newlyUnlocked: [], variables: {}, globalFlags: {} }
      sm.reset()
      expect(sm.lastAutoCheckInfo).toBeNull()
    })

    it('reset 清空 enteredGroups', () => {
      sm.enteredGroups = new Set(['g1'])
      sm.reset()
      expect(sm.enteredGroups.size).toBe(0)
    })
  })

  describe('loadFromProject 变量类型处理', () => {
    it('未知类型按 number 处理', () => {
      sm.loadFromProject(
        [{ name: 'x', type: undefined as any, initialValue: 'hello' }],
        {}, {}, []
      )
      expect(sm.variables['x']).toBe('hello')
    })

    it('array 类型 non-array 值初始化为空数组', () => {
      sm.loadFromProject(
        [{ name: 'tags', type: 'array', initialValue: 'not-array' as any }],
        {}, {}, []
      )
      expect(sm.variables['tags']).toEqual([])
    })
  })
})
