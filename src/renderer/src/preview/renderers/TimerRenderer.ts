import * as PIXI from 'pixi.js'
import type { FlowNode } from '../../types/index'
import type { TimerNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class TimerRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    if (!this.engine.app) return

    const data = node.data as TimerNodeData
    const duration = data.duration || 3000
    const varName = data.variable
    const mode = data.mode || 'countdown'
    const { width, height } = this.engine.app.screen

    // Build timer UI
    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0.45)
    overlay.drawRect(0, 0, width, height)
    overlay.endFill()
    overlay.alpha = 0
    this.engine.transLayer.addChild(overlay)

    const icon = mode === 'stopwatch' ? '⏱' : '⏰'
    const iconText = new PIXI.Text(icon, { fontSize: 48 })
    iconText.anchor.set(0.5)
    iconText.x = width / 2
    iconText.y = height / 2 - 50
    iconText.alpha = 0
    this.engine.transLayer.addChild(iconText)

    const numberText = new PIXI.Text(mode === 'countdown' ? String(Math.ceil(duration / 1000)) : '0.0', {
      fill: '#ffffff',
      fontSize: 72,
      fontWeight: 'bold'
    })
    numberText.anchor.set(0.5)
    numberText.x = width / 2
    numberText.y = height / 2 + 20
    numberText.alpha = 0
    this.engine.transLayer.addChild(numberText)

    const labelText = new PIXI.Text(mode === 'countdown' ? '倒计时' : '计时', {
      fill: '#94a3b8',
      fontSize: 16
    })
    labelText.anchor.set(0.5)
    labelText.x = width / 2
    labelText.y = height / 2 + 70
    labelText.alpha = 0
    this.engine.transLayer.addChild(labelText)

    // Fade in UI quickly
    await new Promise<void>(resolve => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min((now - start) / 300, 1)
        overlay.alpha = 0.45 * t
        iconText.alpha = t
        numberText.alpha = t
        labelText.alpha = t
        if (t < 1) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    })

    // Tick loop
    const startTime = performance.now()
    await new Promise<void>(resolve => {
      const tick = () => {
        const elapsed = performance.now() - startTime
        const remaining = Math.max(0, duration - elapsed)

        if (mode === 'countdown') {
          const secs = Math.ceil(remaining / 1000)
          numberText.text = String(secs)
          if (secs <= 3) numberText.style.fill = '#ef4444'
          if (varName) this.engine.state.variables[varName] = remaining
        } else {
          numberText.text = (elapsed / 1000).toFixed(1)
          if (varName) this.engine.state.variables[varName] = Math.round(elapsed)
        }

        if (remaining <= 0) {
          numberText.text = '0'
          labelText.text = "Time's up!"
          setTimeout(() => {
            this.engine.transLayer.removeChildren()
            resolve()
          }, 400)
          return
        }
        setTimeout(tick, 100)
      }
      setTimeout(tick, 100)
    })

    this.engine.emitDebug()

    const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
    if (nextId) {
      await this.engine.renderNode(nextId)
    } else {
      this.engine.endCallback?.()
    }
  }
}
