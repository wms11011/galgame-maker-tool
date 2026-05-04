import type { FlowNode } from '../../types/index'
import type { AudioNodeData } from '../../types/index'
import { getAssetUrl } from '../../utils/assetUrl'
import { BaseNodeRenderer } from './BaseRenderer'

export class AudioRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    const data = node.data as AudioNodeData

    if (!this.engine.audioManager) {
      const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
      if (nextId) await this.engine.renderNode(nextId)
      return
    }

    if (data.action === 'stop') {
      if (data.audioType === 'bgm') {
        this.engine.audioManager.stopBgm()
      } else {
        this.engine.audioManager.stopAllSe()
      }
    } else if (data.action === 'play' && data.src) {
      const projectPath = this.engine.projectData!.meta.projectPath
      const url = getAssetUrl(projectPath, data.src)
      if (data.audioType === 'bgm') {
        this.engine.audioManager.playBgm(url, data.loop, data.volume)
      } else {
        this.engine.audioManager.playSe(url, data.volume)
      }
    }

    const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
    if (nextId) {
      await this.engine.renderNode(nextId)
    }
  }
}
