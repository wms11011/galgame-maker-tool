import * as PIXI from 'pixi.js'
import type { FlowNode } from '../../types/index'
import type { AnimationNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class AnimationRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    if (!this.engine.app) return

    const data = node.data as AnimationNodeData
    const { width, height } = this.engine.app.screen
    const duration = data.duration || 500

    if (data.action === 'shake') {
      const stage = this.engine.app.stage
      const amplitude = 8
      const start = performance.now()
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          const elapsed = now - start
          if (elapsed >= duration) {
            stage.x = 0
            resolve()
            return
          }
          const decay = 1 - elapsed / duration
          stage.x = Math.sin(elapsed * 0.05) * amplitude * decay
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
    } else if (data.action === 'flash') {
      const flash = new PIXI.Graphics()
      flash.beginFill(0xffffff, 1)
      flash.drawRect(0, 0, width, height)
      flash.endFill()
      flash.alpha = 0
      this.engine.transLayer.addChild(flash)

      const start = performance.now()
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          const elapsed = now - start
          if (elapsed >= duration) {
            this.engine.transLayer.removeChild(flash)
            flash.destroy()
            resolve()
            return
          }
          const halfDur = duration / 2
          if (elapsed < halfDur) {
            flash.alpha = elapsed / halfDur
          } else {
            flash.alpha = 1 - (elapsed - halfDur) / halfDur
          }
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
    } else {
      // enter/exit: brief emoji overlay
      const emojiMap: Record<string, string> = {
        enter: '🚶', exit: '👋', shake: '', flash: ''
      }
      const emoji = emojiMap[data.action] || '✨'
      if (!this.engine.app) return
      const label = new PIXI.Text(`${emoji} ${data.target || ''} ${data.action}`, {
        fill: '#e2e8f0',
        fontSize: 20
      })
      label.anchor.set(0.5)
      label.x = width / 2
      label.y = height / 2
      label.alpha = 0
      this.engine.transLayer.addChild(label)

      const start = performance.now()
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          const elapsed = now - start
          if (elapsed >= duration) {
            this.engine.transLayer.removeChild(label)
            label.destroy()
            resolve()
            return
          }
          const halfDur = duration / 2
          label.alpha = elapsed < halfDur ? elapsed / halfDur : 1 - (elapsed - halfDur) / halfDur
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
    }

    const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
    if (nextId) {
      await this.engine.renderNode(nextId)
    } else {
      this.engine.endCallback?.()
    }
  }
}
