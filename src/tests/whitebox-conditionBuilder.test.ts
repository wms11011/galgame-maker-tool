import { describe, it, expect } from 'vitest'
import {
  defaultClause, getOperators, detectSourceType,
  parseCondition, buildCondition
} from '../renderer/src/utils/conditionBuilder'
import type { ConditionClause, ParsedCondition } from '../renderer/src/utils/conditionBuilder'

describe('白盒: conditionBuilder 分支补全', () => {
  describe('defaultClause', () => {
    it('返回默认子句', () => {
      const c = defaultClause()
      expect(c.source).toBe('')
      expect(c.sourceType).toBe('variable')
      expect(c.operator).toBe('>=')
      expect(c.value).toBe(0)
    })
  })

  describe('getOperators', () => {
    it('variable 类型返回6个操作符', () => {
      const ops = getOperators('variable')
      expect(ops).toEqual(['>=', '<=', '>', '<', '==', '!='])
    })

    it('flag 类型仅返回 == 和 !=', () => {
      const ops = getOperators('flag')
      expect(ops).toEqual(['==', '!='])
    })
  })

  describe('detectSourceType', () => {
    it('在 flag 列表中的返回 flag', () => {
      expect(detectSourceType('seen_intro', [], ['seen_intro', 'met_hero'])).toBe('flag')
    })

    it('不在 flag 列表中返回 variable（默认）', () => {
      expect(detectSourceType('score', ['score'], [])).toBe('variable')
    })

    it('未知名称返回 variable', () => {
      expect(detectSourceType('unknown', [], [])).toBe('variable')
    })
  })

  describe('parseCondition', () => {
    it('空表达式返回空结构', () => {
      const r = parseCondition('', [], [])
      expect(r.clauses).toHaveLength(0)
      expect(r.connectors).toHaveLength(0)
    })

    it('纯空白返回空结构', () => {
      const r = parseCondition('   ', [], [])
      expect(r.clauses).toHaveLength(0)
    })

    it('简单变量比较', () => {
      const r = parseCondition('score >= 50', ['score'], [])
      expect(r.clauses).toHaveLength(1)
      expect(r.clauses[0].source).toBe('score')
      expect(r.clauses[0].operator).toBe('>=')
      expect(r.clauses[0].value).toBe(50)
      expect(r.clauses[0].sourceType).toBe('variable')
    })

    it('flag 布尔比较', () => {
      const r = parseCondition('seen_intro == true', [], ['seen_intro'])
      expect(r.clauses[0].sourceType).toBe('flag')
      expect(r.clauses[0].value).toBe(true)
    })

    it('flag 比较 false', () => {
      const r = parseCondition('seen_intro == false', [], ['seen_intro'])
      expect(r.clauses[0].value).toBe(false)
    })

    it('AND 连接两个子句', () => {
      const r = parseCondition('score >= 10 && hp <= 100', ['score', 'hp'], [])
      expect(r.clauses).toHaveLength(2)
      expect(r.connectors).toEqual(['&&'])
    })

    it('OR 连接两个子句', () => {
      const r = parseCondition('score >= 10 || hp <= 100', ['score', 'hp'], [])
      expect(r.clauses).toHaveLength(2)
      expect(r.connectors).toEqual(['||'])
    })

    it('混合 AND/OR', () => {
      const r = parseCondition('a >= 1 && b >= 2 || c >= 3', ['a', 'b', 'c'], [])
      expect(r.clauses).toHaveLength(3)
      expect(r.connectors.length).toBeGreaterThanOrEqual(1)
    })

    it('无法解析的子句被跳过', () => {
      const r = parseCondition('score >= 50 && garbage', ['score'], [])
      // 'garbage' doesn't match the pattern, so only one clause
      expect(r.clauses).toHaveLength(1)
    })

    it('数值解析失败时设为 0', () => {
      const r = parseCondition('score >= abc', ['score'], [])
      expect(r.clauses[0].value).toBe(0)
    })

    it('connectors 数量不超过 clauses-1', () => {
      // 如果 connectors 多于需要的，会被裁剪
      const r = parseCondition('a >= 1 && b >= 2 && c >= 3', ['a', 'b', 'c'], [])
      expect(r.connectors.length).toBe(2)
      expect(r.clauses.length).toBe(3)
    })

    it('前后空白不影响解析', () => {
      const r = parseCondition('  score >= 50  ', ['score'], [])
      expect(r.clauses).toHaveLength(1)
      expect(r.clauses[0].source).toBe('score')
    })
  })

  describe('buildCondition', () => {
    it('空 clauses 返回空字符串', () => {
      expect(buildCondition([], [])).toBe('')
    })

    it('所有 clauses source 为空返回空字符串', () => {
      expect(buildCondition([{ source: '', sourceType: 'variable', operator: '>=', value: 0 }], [])).toBe('')
    })

    it('单个子句构建', () => {
      const r = buildCondition([{ source: 'x', sourceType: 'variable', operator: '>=', value: 10 }], [])
      expect(r).toBe('x >= 10')
    })

    it('多个子句带 AND', () => {
      const r = buildCondition(
        [
          { source: 'a', sourceType: 'variable', operator: '>=', value: 1 },
          { source: 'b', sourceType: 'variable', operator: '<=', value: 10 }
        ],
        ['&&']
      )
      expect(r).toBe('a >= 1 && b <= 10')
    })

    it('connector 不足时填充 &&', () => {
      const r = buildCondition(
        [
          { source: 'a', sourceType: 'variable', operator: '>=', value: 1 },
          { source: 'b', sourceType: 'variable', operator: '<=', value: 10 }
        ],
        []
      )
      expect(r).toBe('a >= 1 && b <= 10')
    })

    it('过滤空 source 子句', () => {
      const clauses: ConditionClause[] = [
        { source: '', sourceType: 'variable', operator: '>=', value: 0 },
        { source: 'x', sourceType: 'variable', operator: '==', value: 5 }
      ]
      expect(buildCondition(clauses, [])).toBe('x == 5')
    })
  })
})
