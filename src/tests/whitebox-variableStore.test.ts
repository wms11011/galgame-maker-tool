import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVariableStore } from '../renderer/src/stores/variableStore'

describe('白盒: variableStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('loadVariables', () => {
    it('加载变量并深拷贝', () => {
      const store = useVariableStore()
      const vars = [{ name: 'score', type: 'number' as const, initialValue: 10 }]
      store.loadVariables(vars)
      vars[0].initialValue = 999
      expect(store.variables[0].initialValue).toBe(10)
    })

    it('无 type 时默认 number', () => {
      const store = useVariableStore()
      store.loadVariables([{ name: 'x', initialValue: 5 }] as any)
      expect(store.variables[0].type).toBe('number')
    })

    it('加载后重置 runtime', () => {
      const store = useVariableStore()
      store.loadVariables([
        { name: 'hp', type: 'number' as const, initialValue: 100 },
        { name: 'items', type: 'array' as const, initialValue: ['a', 'b'] }
      ])
      expect(store.runtime['hp']).toBe(100)
      expect(store.runtime['items']).toEqual(['a', 'b'])
    })

    it('array 类型非数组 initialValue 时初始化为空数组', () => {
      const store = useVariableStore()
      store.loadVariables([{ name: 'bad', type: 'array' as const, initialValue: 'not-array' as any }])
      expect(store.runtime['bad']).toEqual([])
    })

    it('array 类型复制值不共享引用', () => {
      const store = useVariableStore()
      const arr = ['x', 'y']
      store.loadVariables([{ name: 'tags', type: 'array' as const, initialValue: arr }])
      arr.push('z')
      expect(store.runtime['tags']).toEqual(['x', 'y'])
    })
  })

  describe('loadGlobalFlags', () => {
    it('加载并复制全局标记', () => {
      const store = useVariableStore()
      const flags = { seen_intro: true, met_hero: false }
      store.loadGlobalFlags(flags)
      expect(store.globalFlags).toEqual(flags)
      flags.seen_intro = false // 修改原对象不影响 store
      expect(store.globalFlags['seen_intro']).toBe(true)
    })
  })

  describe('addVariable', () => {
    it('添加新变量', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'newVar', type: 'number', initialValue: 42 })
      expect(store.variables).toHaveLength(1)
      expect(store.runtime['newVar']).toBe(42)
    })

    it('重复名称不添加', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'v', type: 'number', initialValue: 1 })
      store.addVariable({ name: 'v', type: 'string', initialValue: 2 })
      expect(store.variables).toHaveLength(1)
      expect(store.variables[0].initialValue).toBe(1)
    })
  })

  describe('removeVariable', () => {
    it('删除变量及其 runtime', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'v', type: 'number', initialValue: 1 })
      store.removeVariable('v')
      expect(store.variables).toHaveLength(0)
      expect(store.runtime['v']).toBeUndefined()
    })
  })

  describe('updateVariable', () => {
    it('更新已存在变量', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'v', type: 'number', initialValue: 1 })
      store.updateVariable('v', { initialValue: 100 })
      expect(store.variables[0].initialValue).toBe(100)
    })

    it('不存在的变量无操作', () => {
      const store = useVariableStore()
      store.updateVariable('nonexist', { initialValue: 999 })
      expect(store.variables).toHaveLength(0)
    })
  })

  describe('setRuntime / getRuntime', () => {
    it('设置和获取 runtime 值', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'hp', type: 'number', initialValue: 50 })
      store.setRuntime('hp', 75)
      expect(store.getRuntime('hp')).toBe(75)
    })

    it('不存在的变量 getRuntime 返回 0', () => {
      const store = useVariableStore()
      expect(store.getRuntime('nonexist')).toBe(0)
    })
  })

  describe('applyOp', () => {
    it('= 赋值', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'x', type: 'number', initialValue: 0 })
      store.applyOp('x', '=', 42)
      expect(store.runtime['x']).toBe(42)
    })

    it('+= 累加', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'x', type: 'number', initialValue: 10 })
      store.applyOp('x', '+=', 5)
      expect(store.runtime['x']).toBe(15)
    })

    it('-= 累减', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'x', type: 'number', initialValue: 10 })
      store.applyOp('x', '-=', 3)
      expect(store.runtime['x']).toBe(7)
    })

    it('*= 乘法', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'x', type: 'number', initialValue: 5 })
      store.applyOp('x', '*=', 3)
      expect(store.runtime['x']).toBe(15)
    })

    it('/= 除法', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'x', type: 'number', initialValue: 10 })
      store.applyOp('x', '/=', 2)
      expect(store.runtime['x']).toBe(5)
    })

    it('/= 除以零保持不变', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'x', type: 'number', initialValue: 10 })
      store.applyOp('x', '/=', 0)
      expect(store.runtime['x']).toBe(10)
    })

    it('不存在的变量从 0 开始', () => {
      const store = useVariableStore()
      store.applyOp('y', '=', 3)
      expect(store.runtime['y']).toBe(3)
    })
  })

  describe('globalFlags 操作', () => {
    it('setGlobalFlag 设置标记', () => {
      const store = useVariableStore()
      store.setGlobalFlag('flag1', true)
      expect(store.getGlobalFlag('flag1')).toBe(true)
      store.setGlobalFlag('flag1', false)
      expect(store.getGlobalFlag('flag1')).toBe(false)
    })

    it('getGlobalFlag 不存在返回 false', () => {
      const store = useVariableStore()
      expect(store.getGlobalFlag('notExist')).toBe(false)
    })

    it('toggleGlobalFlag 切换', () => {
      const store = useVariableStore()
      expect(store.getGlobalFlag('toggleTest')).toBe(false)
      store.toggleGlobalFlag('toggleTest')
      expect(store.getGlobalFlag('toggleTest')).toBe(true)
      store.toggleGlobalFlag('toggleTest')
      expect(store.getGlobalFlag('toggleTest')).toBe(false)
    })

    it('globalFlagNames 计算属性', () => {
      const store = useVariableStore()
      store.setGlobalFlag('a', true)
      store.setGlobalFlag('b', false)
      expect(store.globalFlagNames).toContain('a')
      expect(store.globalFlagNames).toContain('b')
      expect(store.globalFlagNames).toHaveLength(2)
    })
  })

  describe('flagAliases 操作', () => {
    it('setFlagAlias / removeFlagAlias', () => {
      const store = useVariableStore()
      store.setFlagAlias('flag1', '标记1')
      expect(store.flagAliases['flag1']).toBe('标记1')
      store.removeFlagAlias('flag1')
      expect(store.flagAliases['flag1']).toBeUndefined()
    })

    it('loadFlagAliases 深拷贝', () => {
      const store = useVariableStore()
      const aliases = { a: 'A', b: 'B' }
      store.loadFlagAliases(aliases)
      aliases.c = 'C'
      expect(Object.keys(store.flagAliases)).toHaveLength(2)
    })
  })

  describe('variableNames 计算属性', () => {
    it('返回所有变量名', () => {
      const store = useVariableStore()
      store.addVariable({ name: 'a', type: 'number', initialValue: 1 })
      store.addVariable({ name: 'b', type: 'number', initialValue: 2 })
      expect(store.variableNames).toEqual(['a', 'b'])
    })
  })
})
