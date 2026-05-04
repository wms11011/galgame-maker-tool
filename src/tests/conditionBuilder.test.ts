import { describe, it, expect } from 'vitest'
import {
  parseCondition,
  buildCondition,
  detectSourceType,
  getOperators,
  defaultClause,
  type ConditionClause
} from '@renderer/utils/conditionBuilder'

const variables = ['affection', 'score', 'hp', 'mp', 'level']
const flags = ['seen_ending_a', 'unlocked_gallery', 'met_boss']

// ============================================================
// detectSourceType
// ============================================================
describe('detectSourceType', () => {
  it('returns flag when name is in flagNames', () => {
    expect(detectSourceType('seen_ending_a', variables, flags)).toBe('flag')
    expect(detectSourceType('unlocked_gallery', variables, flags)).toBe('flag')
  })

  it('returns variable when name is only in variableNames', () => {
    expect(detectSourceType('affection', variables, flags)).toBe('variable')
    expect(detectSourceType('score', variables, flags)).toBe('variable')
  })

  it('returns variable for unknown names (default)', () => {
    expect(detectSourceType('unknown_var', variables, flags)).toBe('variable')
  })

  it('prefers flag over variable when name is in both', () => {
    expect(detectSourceType('met_boss', variables, flags)).toBe('flag')
  })
})

// ============================================================
// getOperators
// ============================================================
describe('getOperators', () => {
  it('returns comparison operators for variables', () => {
    expect(getOperators('variable')).toEqual(['>=', '<=', '>', '<', '==', '!='])
  })

  it('returns equality operators for flags', () => {
    expect(getOperators('flag')).toEqual(['==', '!='])
  })
})

// ============================================================
// defaultClause
// ============================================================
describe('defaultClause', () => {
  it('returns a variable-type clause with >= 0', () => {
    const c = defaultClause()
    expect(c.source).toBe('')
    expect(c.sourceType).toBe('variable')
    expect(c.operator).toBe('>=')
    expect(c.value).toBe(0)
  })
})

// ============================================================
// parseCondition
// ============================================================
describe('parseCondition', () => {
  it('returns empty arrays for null/empty/whitespace', () => {
    expect(parseCondition('', variables, flags)).toEqual({ clauses: [], connectors: [] })
    expect(parseCondition('   ', variables, flags)).toEqual({ clauses: [], connectors: [] })
    expect(parseCondition(null!, variables, flags)).toEqual({ clauses: [], connectors: [] })
    expect(parseCondition(undefined!, variables, flags)).toEqual({ clauses: [], connectors: [] })
  })

  // --- single clause ---

  it('parses simple variable >= condition', () => {
    const r = parseCondition('affection >= 100', variables, flags)
    expect(r.clauses).toHaveLength(1)
    expect(r.clauses[0]).toMatchObject({ source: 'affection', sourceType: 'variable', operator: '>=', value: 100 })
    expect(r.connectors).toEqual([])
  })

  it('parses simple variable <= condition', () => {
    const r = parseCondition('score <= 50', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'score', sourceType: 'variable', operator: '<=', value: 50 })
  })

  it('parses variable > condition', () => {
    const r = parseCondition('level > 5', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'level', sourceType: 'variable', operator: '>', value: 5 })
  })

  it('parses variable < condition', () => {
    const r = parseCondition('hp < 10', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'hp', sourceType: 'variable', operator: '<', value: 10 })
  })

  it('parses variable == condition', () => {
    const r = parseCondition('mp == 100', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'mp', sourceType: 'variable', operator: '==', value: 100 })
  })

  it('parses variable != condition', () => {
    const r = parseCondition('score != 0', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'score', sourceType: 'variable', operator: '!=', value: 0 })
  })

  it('parses negative number value', () => {
    const r = parseCondition('score >= -5', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'score', sourceType: 'variable', operator: '>=', value: -5 })
  })

  it('parses decimal number value', () => {
    const r = parseCondition('affection >= 0.5', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'affection', sourceType: 'variable', operator: '>=', value: 0.5 })
  })

  it('parses flag == true', () => {
    const r = parseCondition('seen_ending_a == true', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'seen_ending_a', sourceType: 'flag', operator: '==', value: true })
  })

  it('parses flag == false', () => {
    const r = parseCondition('unlocked_gallery == false', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'unlocked_gallery', sourceType: 'flag', operator: '==', value: false })
  })

  it('parses flag != true', () => {
    const r = parseCondition('met_boss != true', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'met_boss', sourceType: 'flag', operator: '!=', value: true })
  })

  it('parses flag != false', () => {
    const r = parseCondition('met_boss != false', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'met_boss', sourceType: 'flag', operator: '!=', value: false })
  })

  it('detects flag as sourceType even with == operator', () => {
    const r = parseCondition('seen_ending_a == true', variables, flags)
    expect(r.clauses[0].sourceType).toBe('flag')
  })

  it('treats unknown source as variable', () => {
    const r = parseCondition('custom_stat >= 42', variables, flags)
    expect(r.clauses[0].sourceType).toBe('variable')
    expect(r.clauses[0].value).toBe(42)
  })

  it('trims whitespace around the expression', () => {
    const r = parseCondition('  affection  >=  100  ', variables, flags)
    expect(r.clauses[0]).toMatchObject({ source: 'affection', operator: '>=', value: 100 })
  })

  // --- multiple clauses with AND ---

  it('parses two clauses joined by &&', () => {
    const r = parseCondition('affection >= 100 && seen_ending_a == true', variables, flags)
    expect(r.clauses).toHaveLength(2)
    expect(r.clauses[0]).toMatchObject({ source: 'affection', sourceType: 'variable', operator: '>=', value: 100 })
    expect(r.clauses[1]).toMatchObject({ source: 'seen_ending_a', sourceType: 'flag', operator: '==', value: true })
    expect(r.connectors).toEqual(['&&'])
  })

  it('parses two clauses joined by ||', () => {
    const r = parseCondition('score >= 80 || level >= 10', variables, flags)
    expect(r.clauses).toHaveLength(2)
    expect(r.clauses[0]).toMatchObject({ source: 'score', sourceType: 'variable', operator: '>=', value: 80 })
    expect(r.clauses[1]).toMatchObject({ source: 'level', sourceType: 'variable', operator: '>=', value: 10 })
    expect(r.connectors).toEqual(['||'])
  })

  it('parses three clauses with mixed connectors', () => {
    const r = parseCondition('affection >= 100 && score >= 50 || seen_ending_a == true', variables, flags)
    expect(r.clauses).toHaveLength(3)
    expect(r.connectors).toEqual(['&&', '||'])
    expect(r.clauses[0].source).toBe('affection')
    expect(r.clauses[1].source).toBe('score')
    expect(r.clauses[2].source).toBe('seen_ending_a')
  })

  it('parses four clauses with all AND', () => {
    const r = parseCondition('affection >= 100 && score >= 50 && hp >= 10 && mp >= 5', variables, flags)
    expect(r.clauses).toHaveLength(4)
    expect(r.connectors).toEqual(['&&', '&&', '&&'])
  })

  it('parses four clauses with all OR', () => {
    const r = parseCondition('affection >= 100 || score >= 50 || hp >= 10 || mp >= 5', variables, flags)
    expect(r.clauses).toHaveLength(4)
    expect(r.connectors).toEqual(['||', '||', '||'])
  })

  // --- edge cases ---

  it('returns empty on unparseable garbage string', () => {
    const r = parseCondition('not a valid expression', variables, flags)
    expect(r.clauses).toEqual([])
    expect(r.connectors).toEqual([])
  })

  it('skips unparseable parts but keeps valid ones', () => {
    const r = parseCondition('affection >= 100 && garbage_here && score >= 50', variables, flags)
    expect(r.clauses).toHaveLength(2)
    expect(r.clauses[0].source).toBe('affection')
    expect(r.clauses[1].source).toBe('score')
    expect(r.connectors).toHaveLength(1) // only one connector between 2 valid clauses
  })

  it('handles expression with only connectors and no valid clauses', () => {
    const r = parseCondition('&& || &&', variables, flags)
    expect(r.clauses).toEqual([])
    expect(r.connectors).toEqual([])
  })

  it('parses number value 0 correctly (not falsy)', () => {
    const r = parseCondition('score == 0', variables, flags)
    expect(r.clauses[0].value).toBe(0)
  })

  it('treats non-numeric value for variable as 0', () => {
    const r = parseCondition('affection >= hello', variables, flags)
    expect(r.clauses[0].value).toBe(0)
  })

  it('parses multiple flag conditions', () => {
    const r = parseCondition('seen_ending_a == true && unlocked_gallery == true', variables, flags)
    expect(r.clauses).toHaveLength(2)
    expect(r.clauses[0].sourceType).toBe('flag')
    expect(r.clauses[1].sourceType).toBe('flag')
    expect(r.clauses[0].value).toBe(true)
    expect(r.clauses[1].value).toBe(true)
  })
})

// ============================================================
// buildCondition
// ============================================================
describe('buildCondition', () => {
  it('returns empty string for empty clauses', () => {
    expect(buildCondition([], [])).toBe('')
  })

  it('returns empty string when all clauses have empty source', () => {
    expect(buildCondition([defaultClause()], [])).toBe('')
  })

  it('builds a single variable clause', () => {
    const clauses: ConditionClause[] = [
      { source: 'affection', sourceType: 'variable', operator: '>=', value: 100 }
    ]
    expect(buildCondition(clauses, [])).toBe('affection >= 100')
  })

  it('builds a single flag clause', () => {
    const clauses: ConditionClause[] = [
      { source: 'seen_ending_a', sourceType: 'flag', operator: '==', value: true }
    ]
    expect(buildCondition(clauses, [])).toBe('seen_ending_a == true')
  })

  it('builds a single flag != false clause', () => {
    const clauses: ConditionClause[] = [
      { source: 'met_boss', sourceType: 'flag', operator: '!=', value: false }
    ]
    expect(buildCondition(clauses, [])).toBe('met_boss != false')
  })

  it('builds two clauses with AND', () => {
    const clauses: ConditionClause[] = [
      { source: 'affection', sourceType: 'variable', operator: '>=', value: 100 },
      { source: 'seen_ending_a', sourceType: 'flag', operator: '==', value: true }
    ]
    expect(buildCondition(clauses, ['&&'])).toBe('affection >= 100 && seen_ending_a == true')
  })

  it('builds two clauses with OR', () => {
    const clauses: ConditionClause[] = [
      { source: 'score', sourceType: 'variable', operator: '>=', value: 80 },
      { source: 'level', sourceType: 'variable', operator: '>=', value: 10 }
    ]
    expect(buildCondition(clauses, ['||'])).toBe('score >= 80 || level >= 10')
  })

  it('builds three clauses with mixed connectors', () => {
    const clauses: ConditionClause[] = [
      { source: 'affection', sourceType: 'variable', operator: '>=', value: 100 },
      { source: 'score', sourceType: 'variable', operator: '>=', value: 50 },
      { source: 'seen_ending_a', sourceType: 'flag', operator: '==', value: true }
    ]
    expect(buildCondition(clauses, ['&&', '||']))
      .toBe('affection >= 100 && score >= 50 || seen_ending_a == true')
  })

  it('filters out clauses with empty source', () => {
    const clauses: ConditionClause[] = [
      { source: 'affection', sourceType: 'variable', operator: '>=', value: 100 },
      { source: '', sourceType: 'variable', operator: '>=', value: 0 },
      { source: 'score', sourceType: 'variable', operator: '>=', value: 50 }
    ]
    expect(buildCondition(clauses, ['&&', '||'])).toBe('affection >= 100 && score >= 50')
  })

  it('defaults connector to AND when connectors array is too short', () => {
    const clauses: ConditionClause[] = [
      { source: 'a', sourceType: 'variable', operator: '>=', value: 1 },
      { source: 'b', sourceType: 'variable', operator: '>=', value: 2 }
    ]
    expect(buildCondition(clauses, [])).toBe('a >= 1 && b >= 2')
  })

  it('handles negative and decimal values', () => {
    const clauses: ConditionClause[] = [
      { source: 'score', sourceType: 'variable', operator: '>=', value: -10 }
    ]
    expect(buildCondition(clauses, [])).toBe('score >= -10')

    const clauses2: ConditionClause[] = [
      { source: 'affection', sourceType: 'variable', operator: '>=', value: 0.5 }
    ]
    expect(buildCondition(clauses2, [])).toBe('affection >= 0.5')
  })
})

// ============================================================
// Roundtrip: parse → build should be idempotent
// ============================================================
describe('parseCondition → buildCondition roundtrip', () => {
  it('roundtrips a simple variable condition', () => {
    const original = 'affection >= 100'
    const parsed = parseCondition(original, variables, flags)
    const rebuilt = buildCondition(parsed.clauses, parsed.connectors)
    expect(rebuilt).toBe(original)
  })

  it('roundtrips a simple flag condition', () => {
    const original = 'seen_ending_a == true'
    const parsed = parseCondition(original, variables, flags)
    const rebuilt = buildCondition(parsed.clauses, parsed.connectors)
    expect(rebuilt).toBe(original)
  })

  it('roundtrips two clauses with AND', () => {
    const original = 'affection >= 100 && seen_ending_a == true'
    const parsed = parseCondition(original, variables, flags)
    const rebuilt = buildCondition(parsed.clauses, parsed.connectors)
    expect(rebuilt).toBe(original)
  })

  it('roundtrips two clauses with OR', () => {
    const original = 'score >= 80 || level >= 10'
    const parsed = parseCondition(original, variables, flags)
    const rebuilt = buildCondition(parsed.clauses, parsed.connectors)
    expect(rebuilt).toBe(original)
  })

  it('roundtrips three clauses with mixed connectors', () => {
    const original = 'affection >= 100 && score >= 50 || seen_ending_a == true'
    const parsed = parseCondition(original, variables, flags)
    const rebuilt = buildCondition(parsed.clauses, parsed.connectors)
    expect(rebuilt).toBe(original)
  })

  it('roundtrips flag != false', () => {
    const original = 'met_boss != false'
    const parsed = parseCondition(original, variables, flags)
    const rebuilt = buildCondition(parsed.clauses, parsed.connectors)
    expect(rebuilt).toBe(original)
  })

  it('roundtrips negative number', () => {
    const original = 'score >= -10'
    const parsed = parseCondition(original, variables, flags)
    const rebuilt = buildCondition(parsed.clauses, parsed.connectors)
    expect(rebuilt).toBe(original)
  })

  it('roundtrips decimal number', () => {
    const original = 'affection >= 0.5'
    const parsed = parseCondition(original, variables, flags)
    const rebuilt = buildCondition(parsed.clauses, parsed.connectors)
    expect(rebuilt).toBe(original)
  })

  it('roundtrips complex multi-condition expression', () => {
    const original = 'affection >= 100 && level >= 10 || seen_ending_a == true && unlocked_gallery == false'
    const parsed = parseCondition(original, variables, flags)
    const rebuilt = buildCondition(parsed.clauses, parsed.connectors)
    expect(rebuilt).toBe(original)
  })
})
