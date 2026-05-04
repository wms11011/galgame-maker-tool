import * as PIXI from 'pixi.js'
import type { FlowNode } from '../../types/index'
import type { CgNodeData } from '../../types/index'
import { getAssetUrl } from '../../utils/assetUrl'
import { BaseNodeRenderer } from './BaseRenderer'

export class CgRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    if (!this.engine.app) return

    const data = node.data as CgNodeData
    const projectPath = this.engine.projectData!.meta.projectPath

    this.engine.hideDialogBox()
    this.engine.choiceLayer.removeChildren()

    if (data.src) {
      const cgUrl = getAssetUrl(projectPath, data.src)
      const texture = await this.engine.loadTexture(cgUrl)
      if (texture) {
        const cgSprite = new PIXI.Sprite(texture)
        const { width, height } = this.engine.app.screen
        cgSprite.width = width
        cgSprite.height = height
        cgSprite.alpha = 0

        this.engine.transLayer.addChild(cgSprite)

        if (data.transition === 'fade') {
          await this.engine.fadeIn(cgSprite, data.duration)
        } else if (data.transition === 'zoom') {
          cgSprite.alpha = 1
          cgSprite.scale.set(0.8)
          const start = performance.now()
          await new Promise<void>((resolve) => {
            const tick = (now: number) => {
              const t = Math.min((now - start) / data.duration, 1)
              const s = 0.8 + 0.2 * t
              cgSprite.scale.set(s)
              cgSprite.alpha = t
              if (t < 1) {
                requestAnimationFrame(tick)
              } else {
                resolve()
              }
            }
            requestAnimationFrame(tick)
          })
        } else {
          cgSprite.alpha = 1
        }
      }
    }

    this.engine.transLayer.removeChildren()

    const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
    if (nextId) {
      await this.engine.renderNode(nextId)
    }
  }
}
