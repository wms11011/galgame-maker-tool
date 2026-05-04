import type { FlowNode } from '../../types/index'
import type { GotoNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class GotoRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    this.engine.hideDialogBox()
    this.engine.choiceLayer.removeChildren()
    this.engine.transLayer.removeChildren()

    const data = node.data as GotoNodeData
    const targetId = data.targetNodeId
    if (targetId) {
      await this.engine.renderNode(targetId)
    } else {
      this.engine.endCallback?.()
    }
  }
}
