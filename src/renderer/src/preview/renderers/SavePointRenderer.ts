import type { FlowNode, SavePointNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class SavePointRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    const data = node.data as SavePointNodeData
    if (this.engine.saveCallback) {
      this.engine.saveCallback({
        nodeId: node.id,
        slotLabel: data.slotLabel || '存档点',
        variables: { ...this.engine.state.variables },
        visitedNodeIds: this.engine.state.visitedNodes.map(n => n.id)
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
