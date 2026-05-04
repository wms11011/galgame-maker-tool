import type { FlowNode, ItemNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class ItemRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    const data = node.data as ItemNodeData
    const invVar = data.inventoryVar || '背包'
    const itemName = data.itemName

    if (!itemName) { this.skip(node); return }

    // 确保背包变量存在
    if (!(invVar in this.engine.state.variables)) {
      this.engine.state.variables[invVar] = []
    }
    const backpack = this.engine.state.variables[invVar]
    if (!Array.isArray(backpack)) { this.skip(node); return }

    switch (data.action) {
      case 'get':
        if (!backpack.includes(itemName)) backpack.push(itemName)
        break
      case 'lose':
        this.engine.state.variables[invVar] = backpack.filter((i: string) => i !== itemName)
        break
      case 'use':
        this.engine.state.variables[invVar] = backpack.filter((i: string) => i !== itemName)
        // 触发道具效果（如果定义了 effects）
        break
      case 'check': {
        const has = backpack.includes(itemName)
        const nextId = has ? data.trueNextId : data.falseNextId
        if (nextId) { await this.engine.renderNode(nextId); return }
        break
      }
    }

    this.engine.emitDebug()
    const nextId = data.action !== 'check'
      ? (this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? '')
      : ''
    if (nextId) await this.engine.renderNode(nextId)
    else if (data.action !== 'check') this.engine.endCallback?.()
  }
}
