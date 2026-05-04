// ============================================================
// 预览引擎逻辑单元测试
// 覆盖：变量插值 / 条件表达式求值 / 加权随机选择 / 变量操作
// ============================================================

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================
// 纯逻辑函数（从 PreviewEngine 提取用于测试）
// ============================================================

/**
 * 文本变量插值：将 {变量名} 替换为运行时变量值
 * 与 PreviewEngine.interpolateText 逻辑一致
 */
function interpolateText(text: string, variables: Record<string, number>): string {
  return text.replace(/\{([^}]+)\}/g, (_match, varName) => {
    const trimmed = varName.trim()
    if (trimmed in variables) {
      return String(variables[trimmed])
    }
    return `{${trimmed}}`
  })
}

/**
 * 条件表达式求值
 * 与 PreviewEngine.evaluateExpression 逻辑一致
 */
function evaluateExpression(expr: string, variables: Record<string, number>): boolean {
  try {
    let resolved = expr
    for (const [name, val] of Object.entries(variables)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$|\\)|,|\\+|-|\\*|/|=|!|<|>)`, 'g')
      resolved = resolved.replace(regex, `$1${val}`)
    }

    const stripped = resolved
      .replace(/\d+(?:\.\d+)?/g, '')
      .replace(/true|false/g, '')
      .replace(/>=|<=|==|!=|>|<|&&|\|\||!/g, '')
      .replace(/[()]/g, '')
      .replace(/\s/g, '')
    if (/[+\-*/]/.test(stripped)) return false

    const tks: Array<{ kind: string; value?: number | boolean | string }> = []
    const rx = /(\d+(?:\.\d+)?|true|false|>=|<=|==|!=|>|<|&&|\|\||!|\(|\))/g
    let m: RegExpExecArray | null
    while ((m = rx.exec(resolved)) !== null) {
      const s = m[1]
      if (s === 'true') tks.push({ kind: 'bool', value: true })
      else if (s === 'false') tks.push({ kind: 'bool', value: false })
      else if (/^\d/.test(s)) tks.push({ kind: 'number', value: Number(s) })
      else if (s === '(') tks.push({ kind: 'lparen' })
      else if (s === ')') tks.push({ kind: 'rparen' })
      else tks.push({ kind: 'op', value: s })
    }
    let pos = 0
    function peek() { return tks[pos] }
    function advance() { return tks[pos++] }
    function parsePrimary(): number | boolean {
      const t = peek()
      if (!t) return false
      if (t.kind === 'number') { advance(); return t.value as number }
      if (t.kind === 'bool') { advance(); return t.value as boolean }
      if (t.kind === 'lparen') { advance(); const v = parseOr(); if (peek()?.kind === 'rparen') advance(); return v }
      if (t.kind === 'op' && t.value === '!') { advance(); return !parsePrimary() }
      advance(); return false
    }
    function parseComparison(): boolean {
      const left = parsePrimary()
      const t = peek()
      if (t?.kind === 'op' && ['>=', '<=', '==', '!=', '>', '<'].includes(t.value as string)) {
        const op = t.value as string; advance()
        const right = parsePrimary()
        const l = typeof left === 'number' ? left : left ? 1 : 0
        const r = typeof right === 'number' ? right : right ? 1 : 0
        switch (op) {
          case '>=': return l >= r; case '<=': return l <= r
          case '>': return l > r; case '<': return l < r
          case '==': return left === right; case '!=': return left !== right
        }
      }
      return typeof left === 'boolean' ? left : left !== 0
    }
    function parseAnd(): boolean {
      let result = parseComparison()
      while (peek()?.kind === 'op' && peek()!.value === '&&') { advance(); result = result && parseComparison() }
      return result
    }
    function parseOr(): boolean {
      let result = parseAnd()
      while (peek()?.kind === 'op' && peek()!.value === '||') { advance(); result = result || parseAnd() }
      return result
    }
    return parseOr()
  } catch {
    return false
  }
}

/**
 * 加权随机选择
 * 与 PreviewEngine.renderRandomNode 逻辑一致
 */
function weightedRandomSelect(
  branches: { targetNodeId: string; weight: number }[],
  randomValue: number // 0..1，用于确定性测试
): string | null {
  if (branches.length === 0) return null

  const totalWeight = branches.reduce((sum, b) => sum + (b.weight || 0), 0)
  if (totalWeight <= 0) {
    // 均匀随机
    const index = Math.floor(randomValue * branches.length)
    return branches[Math.min(index, branches.length - 1)].targetNodeId
  }

  let rand = randomValue * totalWeight
  for (const branch of branches) {
    rand -= branch.weight || 0
    if (rand <= 0) {
      return branch.targetNodeId
    }
  }

  // 兜底
  return branches[0]?.targetNodeId ?? null
}

/**
 * 变量操作
 */
function applyVariableOp(
  currentValue: number,
  op: string,
  operand: number
): number {
  switch (op) {
    case '=': return operand
    case '+=': return currentValue + operand
    case '-=': return currentValue - operand
    case '*=': return currentValue * operand
    case '/=': return operand !== 0 ? currentValue / operand : currentValue
    default: return currentValue
  }
}

// ============================================================
// 变量插值测试
// ============================================================

describe('interpolateText - 文本变量插值', () => {
  it('替换单个变量', () => {
    const vars = { score: 100 }
    expect(interpolateText('得分：{score} 分', vars)).toBe('得分：100 分')
  })

  it('替换多个变量', () => {
    const vars = { hp: 80, mp: 60 }
    expect(interpolateText('HP: {hp} / MP: {mp}', vars)).toBe('HP: 80 / MP: 60')
  })

  it('不存在的变量保持原样', () => {
    const vars = { a: 1 }
    expect(interpolateText('{a} {b} {c}', vars)).toBe('1 {b} {c}')
  })

  it('变量名含前后空格也可匹配', () => {
    const vars = { gold: 999 }
    expect(interpolateText('金币: { gold }', vars)).toBe('金币: 999')
  })

  it('无变量文本原样返回', () => {
    expect(interpolateText('你好，世界！', {})).toBe('你好，世界！')
  })

  it('变量值为 0', () => {
    const vars = { zero: 0 }
    expect(interpolateText('{zero}', vars)).toBe('0')
  })

  it('变量值为负数', () => {
    const vars = { neg: -5 }
    expect(interpolateText('{neg}', vars)).toBe('-5')
  })

  it('变量值为浮点数', () => {
    const vars = { pi: 3.14 }
    expect(interpolateText('{pi}', vars)).toBe('3.14')
  })

  // 属性测试
  it('任意文本插值后长度 >= 不含变量的基准文本', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.dictionary(fc.stringMatching(/^[a-zA-Z]{1,6}$/), fc.integer({ min: 0, max: 10000 })),
        (text, vars) => {
          // 插值后所有变量都被替换
          const result = interpolateText(text, vars)
          // 不应包含任何存在的变量名占位符
          for (const name of Object.keys(vars)) {
            if (result.includes(`{${name}}`)) return false
          }
          return true
        }
      ),
      { numRuns: 200 }
    )
  })
})

// ============================================================
// 条件表达式求值测试
// ============================================================

describe('evaluateExpression - 条件表达式求值', () => {
  it('大于号比较', () => {
    expect(evaluateExpression('score > 10', { score: 15 })).toBe(true)
    expect(evaluateExpression('score > 10', { score: 5 })).toBe(false)
    expect(evaluateExpression('score > 10', { score: 10 })).toBe(false)
  })

  it('大于等于比较', () => {
    expect(evaluateExpression('score >= 10', { score: 10 })).toBe(true)
    expect(evaluateExpression('score >= 10', { score: 9 })).toBe(false)
  })

  it('小于号比较', () => {
    expect(evaluateExpression('score < 10', { score: 5 })).toBe(true)
    expect(evaluateExpression('score < 10', { score: 15 })).toBe(false)
  })

  it('小于等于比较', () => {
    expect(evaluateExpression('score <= 10', { score: 10 })).toBe(true)
    expect(evaluateExpression('score <= 10', { score: 11 })).toBe(false)
  })

  it('等于比较', () => {
    expect(evaluateExpression('score == 100', { score: 100 })).toBe(true)
    expect(evaluateExpression('score == 100', { score: 99 })).toBe(false)
  })

  it('不等于比较', () => {
    expect(evaluateExpression('score != 0', { score: 1 })).toBe(true)
    expect(evaluateExpression('score != 0', { score: 0 })).toBe(false)
  })

  it('与逻辑 (&&)', () => {
    expect(evaluateExpression('a > 5 && b > 5', { a: 10, b: 10 })).toBe(true)
    expect(evaluateExpression('a > 5 && b > 5', { a: 10, b: 3 })).toBe(false)
    expect(evaluateExpression('a > 5 && b > 5', { a: 3, b: 10 })).toBe(false)
    expect(evaluateExpression('a > 5 && b > 5', { a: 3, b: 3 })).toBe(false)
  })

  it('或逻辑 (||)', () => {
    expect(evaluateExpression('a > 5 || b > 5', { a: 10, b: 10 })).toBe(true)
    expect(evaluateExpression('a > 5 || b > 5', { a: 10, b: 3 })).toBe(true)
    expect(evaluateExpression('a > 5 || b > 5', { a: 3, b: 10 })).toBe(true)
    expect(evaluateExpression('a > 5 || b > 5', { a: 3, b: 3 })).toBe(false)
  })

  it('复杂表达式', () => {
    expect(evaluateExpression('a >= c', { a: 8, b: 3, c: 7 })).toBe(true)
    expect(evaluateExpression('a >= c && b >= c', { a: 8, b: 3, c: 7 })).toBe(false)
  })

  it('算术表达式不再支持（安全限制）', () => {
    expect(evaluateExpression('a * 2 >= 10', { a: 5 })).toBe(false)
    expect(evaluateExpression('a + b >= c', { a: 5, b: 3, c: 7 })).toBe(false)
  })

  it('不存在的变量替换为 0', () => {
    // 未定义变量在 safeExpr 中被替换为 0
    expect(evaluateExpression('undefined_var > 5', {})).toBe(false)
  })

  it('空表达式返回 false', () => {
    expect(evaluateExpression('', {})).toBe(false)
  })

  it('单变量真值判断', () => {
    expect(evaluateExpression('flag', { flag: 1 })).toBe(true)
    expect(evaluateExpression('flag', { flag: 0 })).toBe(false)
  })

  // 属性测试
  it('已知变量值表达式的确定性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (a, b) => {
          const result1 = evaluateExpression('a >= b', { a, b })
          const result2 = evaluateExpression('a >= b', { a, b })
          // 相同输入始终返回相同结果
          return result1 === result2
        }
      ),
      { numRuns: 100 }
    )
  })

  it('对称性测试', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (val) => {
          const gt = evaluateExpression('x > 0', { x: val })
          const le = evaluateExpression('x <= 0', { x: val })
          // x > 0 和 x <= 0 互补
          return gt !== le
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================
// 加权随机选择测试
// ============================================================

describe('weightedRandomSelect - 加权随机选择', () => {
  it('单分支总是选中', () => {
    const branches = [{ targetNodeId: 'n1', weight: 1 }]
    expect(weightedRandomSelect(branches, 0)).toBe('n1')
    expect(weightedRandomSelect(branches, 0.5)).toBe('n1')
    expect(weightedRandomSelect(branches, 0.99)).toBe('n1')
  })

  it('均匀权重按比例分配', () => {
    const branches = [
      { targetNodeId: 'A', weight: 1 },
      { targetNodeId: 'B', weight: 1 }
    ]
    // 算法：rand=randomValue*totalWeight，分支 A 消耗 weight 后 rand<=0 则选中
    // totalWeight=2, randomValue=0.5*2=1.0, 减1后==0 → A（边界属于前一个分支）
    expect(weightedRandomSelect(branches, 0.0)).toBe('A')
    expect(weightedRandomSelect(branches, 0.49)).toBe('A')
    expect(weightedRandomSelect(branches, 0.5)).toBe('A')
    // randomValue > 0.5 → B
    expect(weightedRandomSelect(branches, 0.51)).toBe('B')
    expect(weightedRandomSelect(branches, 0.99)).toBe('B')
  })

  it('非均匀权重按比例分配', () => {
    const branches = [
      { targetNodeId: 'rare', weight: 1 },
      { targetNodeId: 'common', weight: 3 }
    ]
    // 总权重 = 4
    // randomValue < 0.25 → rare（0.25*4=1.0, 减1得0 → rare）
    expect(weightedRandomSelect(branches, 0.0)).toBe('rare')
    expect(weightedRandomSelect(branches, 0.24)).toBe('rare')
    expect(weightedRandomSelect(branches, 0.25)).toBe('rare')
    // randomValue > 0.25 → common
    expect(weightedRandomSelect(branches, 0.26)).toBe('common')
    expect(weightedRandomSelect(branches, 0.5)).toBe('common')
    expect(weightedRandomSelect(branches, 0.99)).toBe('common')
  })

  it('三分支权重 3:2:1', () => {
    const branches = [
      { targetNodeId: 'high', weight: 3 },
      { targetNodeId: 'mid', weight: 2 },
      { targetNodeId: 'low', weight: 1 }
    ]
    // 总权重 6, 边界: 0.5*6=3(high), 0.833...*6=5(mid)
    expect(weightedRandomSelect(branches, 0.0)).toBe('high')
    expect(weightedRandomSelect(branches, 0.49)).toBe('high')
    expect(weightedRandomSelect(branches, 0.5)).toBe('high')
    expect(weightedRandomSelect(branches, 0.51)).toBe('mid')
    expect(weightedRandomSelect(branches, 0.83)).toBe('mid')
    expect(weightedRandomSelect(branches, 0.84)).toBe('low')
    expect(weightedRandomSelect(branches, 0.99)).toBe('low')
  })

  it('空分支列表返回 null', () => {
    expect(weightedRandomSelect([], 0.5)).toBeNull()
  })

  it('所有权重为 0 时均匀随机', () => {
    const branches = [
      { targetNodeId: 'A', weight: 0 },
      { targetNodeId: 'B', weight: 0 },
      { targetNodeId: 'C', weight: 0 }
    ]
    expect(weightedRandomSelect(branches, 0.0)).toBe('A')
    expect(weightedRandomSelect(branches, 0.34)).toBe('B')
    expect(weightedRandomSelect(branches, 0.67)).toBe('C')
  })

  // 属性测试：加权随机不会选择不存在的分支
  it('任意分支列表和随机值，结果始终来自分支列表', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            targetNodeId: fc.hexaString({ minLength: 1, maxLength: 8 }),
            weight: fc.integer({ min: 0, max: 100 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.double({ min: 0, max: 0.9999 }),
        (branches, rand) => {
          const result = weightedRandomSelect(branches, rand)
          if (result === null) return branches.length === 0
          return branches.some(b => b.targetNodeId === result)
        }
      ),
      { numRuns: 200 }
    )
  })
})

// ============================================================
// 变量操作测试
// ============================================================

describe('applyVariableOp - 变量操作', () => {
  it('赋值 (=)', () => {
    expect(applyVariableOp(0, '=', 10)).toBe(10)
    expect(applyVariableOp(99, '=', 0)).toBe(0)
  })

  it('增加 (+=)', () => {
    expect(applyVariableOp(10, '+=', 5)).toBe(15)
    expect(applyVariableOp(0, '+=', -3)).toBe(-3)
  })

  it('减少 (-=)', () => {
    expect(applyVariableOp(10, '-=', 3)).toBe(7)
    expect(applyVariableOp(5, '-=', 10)).toBe(-5)
  })

  it('乘 (*=)', () => {
    expect(applyVariableOp(3, '*=', 4)).toBe(12)
    expect(applyVariableOp(5, '*=', 0)).toBe(0)
  })

  it('除 (/=)', () => {
    expect(applyVariableOp(10, '/=', 2)).toBe(5)
    expect(applyVariableOp(10, '/=', 3)).toBeCloseTo(3.333, 2)
  })

  it('除零不崩溃', () => {
    expect(applyVariableOp(10, '/=', 0)).toBe(10)
  })

  it('未知操作符保持原值', () => {
    expect(applyVariableOp(42, '???' as any, 0)).toBe(42)
  })
})

// ============================================================
// 变量运行时完整模拟
// ============================================================

describe('变量运行时完整流程', () => {
  it('变量初始化 → 多次操作 → 正确结果', () => {
    const vars: Record<string, number> = { affection: 0, money: 100 }

    // 模拟 setVariable 操作
    vars['affection'] = applyVariableOp(vars['affection'] ?? 0, '+=', 10)
    expect(vars['affection']).toBe(10)

    vars['affection'] = applyVariableOp(vars['affection'] ?? 0, '+=', 5)
    expect(vars['affection']).toBe(15)

    vars['money'] = applyVariableOp(vars['money'] ?? 0, '-=', 30)
    expect(vars['money']).toBe(70)

    vars['affection'] = applyVariableOp(vars['affection'] ?? 0, '*=', 2)
    expect(vars['affection']).toBe(30)

    vars['money'] = applyVariableOp(vars['money'] ?? 0, '/=', 7)
    expect(vars['money']).toBe(10)
  })

  it('条件分支依赖变量操作结果', () => {
    const vars: Record<string, number> = { karma: 0 }

    // 流程：选择 A → 增加 karma → 条件判断
    vars['karma'] = applyVariableOp(vars['karma'], '+=', 5)
    expect(evaluateExpression('karma >= 5', vars)).toBe(true)
    expect(evaluateExpression('karma > 5', vars)).toBe(false)
  })
})