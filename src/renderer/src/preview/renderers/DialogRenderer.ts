import type { FlowNode, DialogNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class DialogRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    const data = node.data as DialogNodeData

    // 附赠道具：对话时自动操作道具，无需单独 @item 节点
    if (data.bonusItem) {
      const invVar = '背包'
      if (!(invVar in this.engine.state.variables)) {
        this.engine.state.variables[invVar] = []
      }
      const backpack = this.engine.state.variables[invVar] as string[]
      const action = data.bonusAction || 'get'
      if (action === 'get' && !backpack.includes(data.bonusItem)) {
        backpack.push(data.bonusItem)
      } else if (action === 'lose') {
        this.engine.state.variables[invVar] = backpack.filter(i => i !== data.bonusItem)
      } else if (action === 'use') {
        this.engine.state.variables[invVar] = backpack.filter(i => i !== data.bonusItem)
      }
    }

    if (data.transition && data.transition !== 'none' && this.engine.dialogLayer.children.length > 0) {
      if (data.transition === 'fade') {
        await this.engine.sceneFadeOut(data.transitionDuration)
      } else if (data.transition === 'slide') {
        await this.engine.sceneSlideOut(data.transitionDuration)
      }
    }

    const bgUrl = data.background || this.engine.getGroupDefaultBg(node.id)
    if (bgUrl) {
      await this.engine.fadeBackground(bgUrl)
    } else {
      this.engine.clearBackground()
    }

    // Live2D 优先：检查角色是否配置了 Live2D 模型
    const charConfig = this.engine.projectData?.characters?.find(
      (c: any) => c.name === data.character
    )
    if (charConfig?.live2dModel) {
      await this.engine.showLive2DCharacter?.(data.character, charConfig.live2dModel, charConfig.live2dExpression || 'neutral')
    } else if (data.characterSprite) {
      await this.engine.showCharacter(data.character, data.characterSprite)
    } else {
      this.engine.clearCharacters()
    }

    this.engine.showDialogBox(data.character, data.content, {
      typingSpeed: data.typingSpeed,
      textColor: data.textColor,
      fontSize: data.fontSize
    })
  }
}
