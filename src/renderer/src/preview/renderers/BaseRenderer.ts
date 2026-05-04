import type { FlowNode } from '../../types/index'
import type { PreviewEngine } from '../previewEngine'

/**
 * 节点渲染器抽象基类
 * 每个节点类型对应一个渲染器，负责该类型节点的 UI 展示与跳过逻辑。
 * 通过 protected engine 引用访问共享的预览引擎服务。
 */
export abstract class BaseNodeRenderer {
  protected engine: PreviewEngine

  constructor(engine: PreviewEngine) {
    this.engine = engine
  }

  /** 渲染节点，返回 Promise 在节点完成其可视任务后 resolve */
  abstract render(node: FlowNode): Promise<void>

  /** 跳过节点：默认从 FlowTraversal 获取下一节点并递进 */
  skip(node: FlowNode): void {
    const nextId = this.engine.traversal?.getNext(node.id) ?? null
    if (nextId) {
      this.engine.renderNode(nextId)
    } else {
      this.engine.endCallback?.()
    }
  }
}
