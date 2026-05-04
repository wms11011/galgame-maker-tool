import * as PIXI from 'pixi.js'

/**
 * 逐字打印控制器
 * 管理打字机效果：逐字符显示文本，支持加速/跳过
 */
export class TypewriterController {
  private target: PIXI.Text | null = null
  private fullText = ''
  private charIndex = 0
  private speed = 45
  private active = false
  private timer: ReturnType<typeof setTimeout> | null = null

  get isActive(): boolean { return this.active }
  get currentText(): string { return this.target?.text ?? '' }

  /** 开始逐字打印 */
  start(target: PIXI.Text, text: string, speed?: number): void {
    this.stop()
    this.target = target
    this.fullText = text
    this.charIndex = 0
    this.speed = speed ?? 45
    this.active = true
    this.tick()
  }

  /** 立即完成打印（显示全文） */
  complete(): void {
    this.stop()
    if (this.target && this.fullText) {
      this.target.text = this.fullText
      this.charIndex = this.fullText.length
    }
  }

  /** 停止打字效果 */
  stop(): void {
    this.active = false
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
  }

  /** 销毁控制器 */
  destroy(): void {
    this.stop()
    this.target = null
  }

  private tick(): void {
    if (!this.active || !this.target) {
      this.active = false
      return
    }
    if (this.charIndex >= this.fullText.length) {
      this.active = false
      return
    }
    this.charIndex++
    this.target.text = this.fullText.slice(0, this.charIndex)
    this.timer = setTimeout(() => this.tick(), this.speed)
  }
}
