import type { FlowNode } from '../../types/index'
import type { ConditionNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class ConditionRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    const data = node.data as ConditionNodeData
    const result = this.engine.evaluateExpression(data.expression)
    const nextId = result ? data.trueNextId : data.falseNextId
    if (nextId) {
      await this.engine.renderNode(nextId)
    } else {
      this.engine.endCallback?.()
    }
  }
}
