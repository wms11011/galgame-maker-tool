import type { PreviewEngine } from './previewEngine'

/**
 * 自动播放控制器
 * 管理自动推进计时器，在交互节点（choice）暂停，选择后恢复
 */
export class AutoPlayController {
  private engine: PreviewEngine
  private timer: ReturnType<typeof setTimeout> | null = null
  private speed = 800
  private running = false
  private wasPaused = false

  constructor(engine: PreviewEngine) {
    this.engine = engine
  }

  get isRunning(): boolean { return this.running }
  get currentSpeed(): number { return this.speed }

  start(speed?: number): void {
    if (speed !== undefined) this.speed = speed
    this.running = true
    this.wasPaused = false
    this.tick()
  }

  stop(): void {
    this.running = false
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
  }

  pause(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
    this.wasPaused = true
  }

  resume(): void {
    if (this.wasPaused && this.running) {
      this.wasPaused = false
      this.tick()
    }
  }

  setSpeed(speed: number): void {
    this.speed = speed
  }

  private tick(): void {
    if (!this.running) return
    this.timer = setTimeout(() => {
      if (!this.running) return
      // Navigate to next node or end
      const nodeId = this.engine.currentNodeId
      if (nodeId && this.engine.traversal) {
        const node = this.engine.traversal.getNode(nodeId)
        if (node && this.engine.traversal.isInteractive(node.id)) {
          this.pause()
          return
        }
      }
      this.engine.next?.()
      if (this.running) this.tick()
    }, this.speed)
  }
}
