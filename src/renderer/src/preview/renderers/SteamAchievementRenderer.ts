import type { FlowNode, SteamAchievementNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class SteamAchievementRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    const data = node.data as SteamAchievementNodeData
    if (data.achievementId) {
      const ach = this.engine.state.achievements.find(a => a.id === data.achievementId)
      if (ach && !ach.unlocked) {
        ach.unlocked = true
        ach.unlockedAt = new Date().toISOString()
        await this.engine.showAchievementToast(ach.name, ach.icon)
        this.engine.achievementCallback?.(ach.id, ach.name)
      }
    }
    const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
    if (nextId) {
      await this.engine.renderNode(nextId)
    } else {
      this.engine.endCallback?.()
    }
  }
}
