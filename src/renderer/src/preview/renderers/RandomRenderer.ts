import type { FlowNode, RandomNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class RandomRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    const data = node.data as RandomNodeData
    const branches = data.branches || []

    if (branches.length === 0) {
      this.engine.endCallback?.()
      return
    }

    const totalWeight = branches.reduce((sum, b) => sum + (b.weight || 0), 0)
    if (totalWeight <= 0) {
      const pick = branches[Math.floor(Math.random() * branches.length)]
      if (pick?.targetNodeId) await this.engine.renderNode(pick.targetNodeId)
      else this.engine.endCallback?.()
      return
    }

    let r = Math.random() * totalWeight
    for (const branch of branches) {
      r -= (branch.weight || 0)
      if (r <= 0) {
        if (branch.targetNodeId) {
          await this.engine.renderNode(branch.targetNodeId)
        } else {
          this.engine.endCallback?.()
        }
        return
      }
    }
    const last = branches[branches.length - 1]
    if (last?.targetNodeId) await this.engine.renderNode(last.targetNodeId)
    else this.engine.endCallback?.()
  }
}
