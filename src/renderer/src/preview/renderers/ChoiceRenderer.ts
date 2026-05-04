import type { FlowNode, ChoiceNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class ChoiceRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    const data = node.data as ChoiceNodeData
    this.engine.hideDialogBox()
    this.engine.showChoiceBox(data.options || [])
    this.engine.choiceCallback?.(data.options || [])
  }
}
