export interface ConditionClause {
  source: string
  sourceType: 'variable' | 'flag'
  operator: string
  value: number | boolean
}

export interface ParsedCondition {
  clauses: ConditionClause[]
  connectors: ('&&' | '||')[]
}

export function defaultClause(): ConditionClause {
  return { source: '', sourceType: 'variable', operator: '>=', value: 0 }
}

export function getOperators(sourceType: 'variable' | 'flag'): string[] {
  return sourceType === 'variable'
    ? ['>=', '<=', '>', '<', '==', '!=']
    : ['==', '!=']
}

export function detectSourceType(
  name: string,
  variableNames: string[],
  flagNames: string[]
): 'variable' | 'flag' {
  if (flagNames.includes(name)) return 'flag'
  return 'variable'
}

export function parseCondition(
  expr: string,
  variableNames: string[],
  flagNames: string[]
): ParsedCondition {
  const clauses: ConditionClause[] = []
  const connectors: ('&&' | '||')[] = []

  if (!expr || !expr.trim()) return { clauses, connectors }

  const trimmed = expr.trim()

  // Split by && or ||, keeping delimiters
  const parts = trimmed.split(/\s*(&&|\|\|)\s*/)
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]?.trim()
    if (part === '&&' || part === '||') {
      if (i % 2 === 1) {
        connectors.push(part as '&&' | '||')
      }
      continue
    }
    if (!part) continue

    // Parse clause: name op value  (value may be a number, true/false, or identifier)
    const match = part.match(/^([^>=<!=\s]+)\s*(>=|<=|>|<|==|!=)\s*(.+)$/)
    if (match) {
      const [, name, op, val] = match
      const sourceType = detectSourceType(name, variableNames, flagNames)
      let value: number | boolean
      if (sourceType === 'flag') {
        value = val.trim().toLowerCase() === 'true'
      } else {
        const num = Number(val.trim())
        value = isNaN(num) ? 0 : num
      }
      clauses.push({ source: name, sourceType, operator: op, value })
    } else {
      console.warn(`[conditionBuilder] 无法解析条件片段: "${part}"`)
    }
  }

  // Trim connectors to match valid clauses (clauses.length - 1, min 0)
  const maxConnectors = Math.max(0, clauses.length - 1)
  connectors.length = Math.min(connectors.length, maxConnectors)

  return { clauses, connectors }
}

export function buildCondition(clauses: ConditionClause[], connectors: ('&&' | '||')[]): string {
  const valid = clauses.filter(c => c.source.trim())
  if (valid.length === 0) return ''

  const parts: string[] = []
  for (let i = 0; i < valid.length; i++) {
    const c = valid[i]
    parts.push(`${c.source} ${c.operator} ${c.value}`)
    if (i < valid.length - 1) {
      parts.push(` ${connectors[i] || '&&'} `)
    }
  }
  return parts.join('')
}
