import type { AchievementDef, VariableChange, LastAutoCheckInfo } from '../../types'
import type { DebugInfo } from './previewEngine'

export interface DialogueEntry {
  character: string
  text: string
  nodeId: string
  timestamp: number
}

export interface VisitedNode {
  id: string
  type: string
  label: string
}

export interface GameStateSnapshot {
  currentNodeId: string | null
  variables: Record<string, number>
  globalFlags: Record<string, boolean>
  flagAliases: Record<string, string>
  achievements: AchievementDef[]
  visitedNodes: VisitedNode[]
  variableHistory: VariableChange[]
  stepCount: number
  enteredGroups: string[]
}

export class StateManager {
  variables: Record<string, number | string | boolean | string[]> = {}
  globalFlags: Record<string, boolean> = {}
  flagAliases: Record<string, string> = {}
  achievements: AchievementDef[] = []
  visitedNodes: VisitedNode[] = []
  variableHistory: VariableChange[] = []
  stepCount = 0
  enteredGroups: Set<string> = new Set()
  lastAutoCheckInfo: LastAutoCheckInfo | null = null

  private autoCheckLogCount = 0

  reset(): void {
    this.variables = {}
    this.globalFlags = {}
    this.flagAliases = {}
    this.achievements = []
    this.visitedNodes = []
    this.variableHistory = []
    this.stepCount = 0
    this.enteredGroups = new Set()
    this.lastAutoCheckInfo = null
  }

  loadFromProject(variables: { name: string; type?: string; initialValue: number | string | boolean | string[] }[], flags: Record<string, boolean>, aliases: Record<string, string>, achievements: AchievementDef[]): void {
    this.variables = {}
    for (const v of variables) {
      const t = v.type || 'number'
      if (t === 'array') {
        this.variables[v.name] = Array.isArray(v.initialValue) ? [...v.initialValue as string[]] : []
      } else {
        this.variables[v.name] = v.initialValue
      }
    }
    this.globalFlags = { ...flags }
    this.flagAliases = { ...aliases }
    this.achievements = achievements.map(a => ({ ...a, unlocked: false }))
  }

  recordVisit(node: { id: string; type: string; label: string }): void {
    this.visitedNodes.push({ ...node })
    this.stepCount++
  }

  recordVariableChange(nodeId: string, varName: string, oldValue: number, newValue: number, op: string): void {
    this.variableHistory.push({
      step: this.stepCount,
      nodeId,
      varName,
      oldValue,
      newValue,
      op,
      valueStr: `${oldValue} ${op} ${oldValue} → ${newValue}`
    })
  }

  applyVariableOp(varName: string, op: string, rawValue: string): void {
    const val = parseFloat(rawValue) || 0
    const cur = this.variables[varName] ?? 0
    switch (op) {
      case '=': this.variables[varName] = val; break
      case '+=': this.variables[varName] = cur + val; break
      case '-=': this.variables[varName] = cur - val; break
      case '*=': this.variables[varName] = cur * val; break
      case '/=': this.variables[varName] = val !== 0 ? cur / val : cur; break
    }
  }

  setFlag(key: string, value: boolean): void {
    this.globalFlags[key] = value
  }

  /**
   * 表达式求值：支持变量比较 + 标记判断 + AND/OR
   */
  evaluateExpression(expr: string): boolean {
    if (!expr || !expr.trim()) return true
    expr = expr.trim()

    // 处理 OR
    if (expr.includes('||')) {
      return expr.split('||').some(part => this.evaluateExpression(part))
    }
    // 处理 AND
    if (expr.includes('&&')) {
      return expr.split('&&').every(part => this.evaluateExpression(part))
    }

    // 变量比较: var >= value
    const cmpMatch = expr.match(/^(.+?)\s*(>=|<=|>|<|==|!=)\s*(.+)$/)
    if (cmpMatch) {
      const [, varName, op, rawVal] = cmpMatch
      const varValue = this.variables[varName.trim()] ?? 0
      const cmpValue = parseFloat(rawVal.trim())
      if (isNaN(cmpValue)) return false
      switch (op) {
        case '>=': return varValue >= cmpValue
        case '<=': return varValue <= cmpValue
        case '>': return varValue > cmpValue
        case '<': return varValue < cmpValue
        case '==': return varValue === cmpValue
        case '!=': return varValue !== cmpValue
      }
    }

    // 标记判断: flagName (true/false)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
      return this.globalFlags[expr] === true
    }

    // hasItem('arrayVar', 'item') — 数组包含检查
    const hasItemMatch = expr.match(/^hasItem\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)$/)
    if (hasItemMatch) {
      const arr = this.variables[hasItemMatch[1]]
      return Array.isArray(arr) && arr.includes(hasItemMatch[2])
    }

    // strEquals('varName', 'expected') — 字符串变量值比较
    const strEqMatch = expr.match(/^strEquals\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)$/)
    if (strEqMatch) {
      const varValue = this.variables[strEqMatch[1]]
      return String(varValue ?? '') === strEqMatch[2]
    }

    return false
  }

  /**
   * 自动检测成就
   */
  checkAutoAchievements(): AchievementDef[] {
    const newlyUnlocked: AchievementDef[] = []
    const results: LastAutoCheckInfo['results'] = []
    const candidates = this.achievements.filter(a => !a.unlocked && a.autoCheck && a.unlockCondition)

    let checkError: string | undefined
    for (const ach of candidates) {
      try {
        const resolvedCondition = ach.unlockCondition!
        const result = this.evaluateExpression(resolvedCondition)
        results.push({ name: ach.name, condition: ach.unlockCondition!, resolvedCondition, result })
        if (result) {
          ach.unlocked = true
          ach.unlockedAt = new Date().toISOString()
          newlyUnlocked.push(ach)
        }
      } catch (e) {
        checkError = String(e)
      }
    }

    this.lastAutoCheckInfo = {
      timestamp: Date.now(),
      step: this.stepCount,
      candidateCount: candidates.length,
      results,
      newlyUnlocked: newlyUnlocked.map(a => a.name),
      variables: { ...this.variables },
      globalFlags: { ...this.globalFlags },
      error: checkError
    }

    return newlyUnlocked
  }

  /**
   * 存档快照
   */
  snapshot(currentNodeId: string | null): GameStateSnapshot {
    return {
      currentNodeId,
      variables: { ...this.variables },
      globalFlags: { ...this.globalFlags },
      flagAliases: { ...this.flagAliases },
      achievements: this.achievements.map(a => ({ ...a })),
      visitedNodes: [...this.visitedNodes],
      variableHistory: [...this.variableHistory],
      stepCount: this.stepCount,
      enteredGroups: [...this.enteredGroups]
    }
  }

  /**
   * 读档恢复
   */
  restore(snap: GameStateSnapshot): void {
    this.variables = { ...snap.variables }
    this.globalFlags = { ...snap.globalFlags }
    this.flagAliases = { ...snap.flagAliases }
    this.achievements = snap.achievements.map(a => ({ ...a }))
    this.visitedNodes = [...snap.visitedNodes]
    this.variableHistory = [...snap.variableHistory]
    this.stepCount = snap.stepCount
    this.enteredGroups = new Set(snap.enteredGroups)
  }

  /**
   * 构建调试信息
   */
  buildDebugInfo(currentNodeId: string | null, currentNodeType: string | null, currentNodeLabel: string | null, isRunning: boolean, isBreakpointPaused: boolean, autoPlaySpeed: number, errorNodes: { nodeId: string; error: string; timestamp: number }[]): DebugInfo {
    return {
      currentNodeId,
      currentNodeType,
      currentNodeLabel,
      visitedNodes: [...this.visitedNodes],
      variables: { ...this.variables },
      variableHistory: [...this.variableHistory],
      stepCount: this.stepCount,
      isEnded: false,
      isRunning,
      isBreakpointPaused,
      speed: autoPlaySpeed,
      achievements: this.achievements.map(a => ({
        id: a.id,
        name: a.name,
        unlocked: a.unlocked,
        autoCheck: a.autoCheck || false,
        condition: a.unlockCondition || ''
      })),
      lastAutoCheck: this.lastAutoCheckInfo,
      flagAliases: { ...this.flagAliases },
      errorNodes: [...errorNodes]
    }
  }
}
