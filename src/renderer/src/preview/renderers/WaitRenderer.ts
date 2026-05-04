import type { FlowNode, WaitNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class WaitRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    const data = node.data as WaitNodeData
    const duration = data.duration || 1000
    await new Promise((resolve) => setTimeout(resolve, duration))
    const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
    if (nextId) {
      await this.engine.renderNode(nextId)
    } else {
      this.engine.endCallback?.()
    }
  }
}
