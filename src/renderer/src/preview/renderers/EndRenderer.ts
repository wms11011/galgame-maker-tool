import * as PIXI from 'pixi.js'
import type { FlowNode } from '../../types/index'
import type { EndNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class EndRenderer extends BaseNodeRenderer {
  render(node: FlowNode): void {
    if (!this.engine.app) return

    const data = node.data as EndNodeData
    this.engine.hideDialogBox()
    this.engine.choiceLayer.removeChildren()

    const endingFlagMap: Record<string, string> = {
      normal: 'seen_normal_ending',
      good: 'seen_good_ending',
      bad: 'seen_bad_ending',
      true: 'seen_true_ending'
    }
    const flagKey = endingFlagMap[data.endingType]
    if (flagKey) {
      this.engine.state.globalFlags[flagKey] = true
    }
    this.engine.state.globalFlags['completed_once'] = true

    const { width, height } = this.engine.app.screen

    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0.85)
    overlay.drawRect(0, 0, width, height)
    overlay.endFill()
    overlay.interactive = true
    overlay.eventMode = 'static'
    overlay.cursor = 'pointer'
    overlay.on('pointertap', () => {
      this.engine.endCallback?.()
    })
    this.engine.transLayer.addChild(overlay)

    if (this.engine.debugCallback) {
      this.engine.debugCallback({
        ...this.engine.getDebugInfo(),
        isEnded: true,
        isRunning: false
      })
    }

    const endingTypeLabels: Record<string, string> = {
      normal: '— 普通结局 —',
      good: '— 好结局 —',
      bad: '— 坏结局 —',
      true: '— 真结局 —'
    }
    const typeLabel = endingTypeLabels[data.endingType] || data.endingType
    const typeText = new PIXI.Text(typeLabel, {
      fill: '#f87171',
      fontSize: 28,
      fontWeight: 'bold'
    })
    typeText.anchor.set(0.5)
    typeText.x = width / 2
    typeText.y = height / 2 - 40
    this.engine.transLayer.addChild(typeText)

    if (data.message) {
      const msgText = new PIXI.Text(data.message, {
        fill: '#e2e8f0',
        fontSize: 18,
        wordWrap: true,
        wordWrapWidth: width * 0.6
      })
      msgText.anchor.set(0.5, 0)
      msgText.x = width / 2
      msgText.y = height / 2 + 10
      this.engine.transLayer.addChild(msgText)
    }

    const hint = new PIXI.Text('点击任意位置退出', {
      fill: '#64748b',
      fontSize: 14
    })
    hint.anchor.set(0.5)
    hint.x = width / 2
    hint.y = height - 60
    this.engine.transLayer.addChild(hint)
  }
}
