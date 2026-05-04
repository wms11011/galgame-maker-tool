import type { FlowNode, MoveCharacterNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class MoveCharacterRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    if (!this.engine.app) return

    const data = node.data as MoveCharacterNodeData
    const targetName = data.target
    const sprite = this.engine.charSprites.get(targetName)

    if (!sprite) {
      const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
      if (nextId) await this.engine.renderNode(nextId)
      else this.engine.endCallback?.()
      return
    }

    const { width } = this.engine.app.screen
    const posMap: Record<string, number> = {
      left: width * 0.2,
      center: width * 0.5,
      right: width * 0.8
    }
    const fromX = posMap[data.fromPosition] ?? sprite.x
    const toX = posMap[data.toPosition] ?? sprite.x
    const duration = data.duration || 500
    const easing = data.easing || 'ease'

    sprite.x = fromX
    const start = performance.now()

    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const elapsed = now - start
        const t = Math.min(elapsed / duration, 1)
        let factor: number
        switch (easing) {
          case 'linear': factor = t; break
          case 'ease-in': factor = t * t; break
          case 'ease-out': factor = 1 - Math.pow(1 - t, 3); break
          default: factor = t; break
        }
        sprite.x = fromX + (toX - fromX) * factor
        if (t >= 1) {
          sprite.x = toX
          resolve()
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })

    const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
    if (nextId) {
      await this.engine.renderNode(nextId)
    } else {
      this.engine.endCallback?.()
    }
  }
}
