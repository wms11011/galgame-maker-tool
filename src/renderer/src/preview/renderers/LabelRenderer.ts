import type { FlowNode } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'
import { getAssetUrl } from '../../utils/assetUrl'

export class LabelRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    const groups = this.engine.projectData?.groups || []
    const group = groups.find(g => g.nodeIds.includes(node.id))

    if (group && !this.engine.state.enteredGroups.has(group.id) && this.engine.app) {
      this.engine.state.enteredGroups.add(group.id)

      // 章节解锁条件检查
      if (group.unlockCondition && group.unlockCondition.trim()) {
        if (!this.engine.evaluateExpression(group.unlockCondition)) {
          const nextId = this.engine.traversal?.getNext(node.id) ?? null
          if (nextId) { await this.engine.renderNode(nextId) }
          else { this.engine.endCallback?.() }
          return
        }
      }

      // 章节 BGM 切换
      if (group.bgm && this.engine.audioManager) {
        const projectPath = this.engine.projectData?.meta.projectPath
        if (projectPath) {
          const url = getAssetUrl(projectPath, group.bgm)
          this.engine.audioManager.playBgm(url, group.bgmLoop ?? true, group.bgmVolume ?? 0.7)
        }
      }

      // 章节转场效果
      const transition = group.transition || 'none'
      if (transition !== 'none') {
        await this.engine.applySceneTransition(transition, 400)
      }

      // 章节标题卡
      if (group.titleCard) {
        await this.engine.showChapterTitleCard(group)
      }

      // 场景粒子特效：进入场景时自动开启，关闭之前的场景粒子
      if ((group as any).particlePreset) {
        this.engine.startSceneParticles(
          (group as any).particlePreset,
          (group as any).particleDensity ?? 100,
          (group as any).particleSpeed ?? 1
        )
      } else {
        this.engine.stopSceneParticles()
      }
    } else if (!group) {
      // 节点不在任何分组中 → 关闭场景粒子
      this.engine.stopSceneParticles()
    }

    // 优先从 FlowTraversal 获取显式/隐式出边
    let nextId = this.engine.traversal?.getNext(node.id) ?? null
    // 回退：按项目节点顺序找到紧跟在后面的第一个节点
    if (!nextId && this.engine.projectData) {
      const allNodes = this.engine.projectData.flow.nodes
      const idx = allNodes.findIndex(n => n.id === node.id)
      if (idx >= 0 && idx < allNodes.length - 1) {
        nextId = allNodes[idx + 1].id
      }
    }
    if (nextId) {
      await this.engine.renderNode(nextId)
    } else {
      this.engine.endCallback?.()
    }
  }
}
