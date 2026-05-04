import * as PIXI from 'pixi.js'
import type { PreviewEngine } from './previewEngine'
import type { AutoCheckResult, LastAutoCheckInfo } from './previewEngine'

export class AutoAchievementChecker {
  private engine: PreviewEngine
  private _logCount = 0
  private indicator: PIXI.Text | null = null

  constructor(engine: PreviewEngine) {
    this.engine = engine
  }

  get logCount(): number { return this._logCount }

  get lastCheckInfo(): LastAutoCheckInfo | null {
    return this.engine.lastAutoCheckInfo
  }

  check(): void {
    const candidates = this.engine.state.achievements.filter(
      a => !a.unlocked && a.autoCheck && a.unlockCondition
    )
    const autoCheckResults: AutoCheckResult[] = []
    const newlyUnlocked: string[] = []
    let checkError: string | undefined

    this._logCount++
    const firstRun = this._logCount <= 4

    if (candidates.length === 0) {
      if (firstRun) {
        console.log(`[预览] 自动检测 #${this._logCount}: 无候选成就, 总成就=${this.engine.state.achievements.length}, 变量:`, { ...this.engine.state.variables })
        for (const a of this.engine.state.achievements) {
          const reasons: string[] = []
          if (a.unlocked) reasons.push('已解锁')
          if (!a.autoCheck) reasons.push('autoCheck未开启')
          if (!a.unlockCondition) reasons.push('无条件')
          console.log(`[预览]   "${a.name}" → 跳过: ${reasons.join(', ')}, autoCheck=${a.autoCheck}, condition="${a.unlockCondition}", unlocked=${a.unlocked}`)
        }
      }
    } else {
      this.showIndicator(candidates.length)

      if (firstRun || this._logCount <= 10) {
        console.log(`[预览] 自动检测 #${this._logCount}: ${candidates.length} 个待检成就, 当前变量:`, { ...this.engine.state.variables }, '全局标记:', { ...this.engine.state.globalFlags })
      }

      for (const ach of candidates) {
        try {
          const resolvedCondition = this.resolveCondition(ach.unlockCondition)
          const result = this.engine.evaluateExpression(ach.unlockCondition)
          autoCheckResults.push({ name: ach.name, condition: ach.unlockCondition, resolvedCondition, result })
          if (firstRun || this._logCount <= 10) {
            console.log(`[预览] 自动检测 成就"${ach.name}" 条件="${ach.unlockCondition}" 解析="${resolvedCondition}" 结果=${result}`)
          }
          if (result) {
            ach.unlocked = true
            ach.unlockedAt = new Date().toISOString()
            this.engine.showAchievementToast(ach.name, ach.icon)
            this.engine.achievementCallback?.(ach.id, ach.name)
            newlyUnlocked.push(ach.name)
            console.log('[预览] 自动检测成就已解锁:', ach.name, ach.id)
          }
        } catch (e) {
          checkError = String(e)
          console.error('[预览] 自动检测成就条件求值失败:', ach.name, e)
        }
      }
    }

    this.engine.lastAutoCheckInfo = {
      timestamp: Date.now(),
      step: this.engine.state.stepCount,
      candidateCount: candidates.length,
      variables: { ...this.engine.state.variables },
      globalFlags: { ...this.engine.state.globalFlags },
      results: autoCheckResults,
      newlyUnlocked,
      error: checkError
    }

    this.engine.emitDebug()
  }

  private resolveCondition(expr: string): string {
    let resolved = expr
    for (const [name, val] of Object.entries(this.engine.state.variables)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$|\\)|,|\\+|-|\\*|/|=|!|<|>)`, 'g')
      resolved = resolved.replace(regex, `$1${val}`)
    }
    for (const [name, val] of Object.entries(this.engine.state.globalFlags)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$|\\)|,|\\+|-|\\*|/|=|!|<|>)`, 'g')
      resolved = resolved.replace(regex, `$1${val ? 'true' : 'false'}`)
    }
    return resolved
  }

  private showIndicator(candidateCount: number): void {
    try {
      if (!this.engine.app) return

      if (this.indicator) {
        this.engine.transLayer.removeChild(this.indicator)
        this.indicator.destroy()
        this.indicator = null
      }

      const { width, height } = this.engine.app.screen
      const indicator = new PIXI.Text(`🔍 检测中... (${candidateCount})`, {
        fill: '#94a3b8',
        fontSize: 11,
        fontFamily: 'monospace'
      })
      indicator.anchor.set(1, 1)
      indicator.x = width - 10
      indicator.y = height - 10
      indicator.alpha = 0.85
      this.engine.transLayer.addChild(indicator)
      this.indicator = indicator

      setTimeout(() => {
        if (this.indicator === indicator) {
          this.engine.transLayer.removeChild(indicator)
          indicator.destroy()
          this.indicator = null
        }
      }, 1200)
    } catch {
      // 静默忽略指示器错误
    }
  }
}
