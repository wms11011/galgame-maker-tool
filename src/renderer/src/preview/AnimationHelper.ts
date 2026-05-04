import * as PIXI from 'pixi.js'
import { getAssetUrl } from '../utils/assetUrl'

export class AnimationHelper {
  constructor(
    private app: PIXI.Application,
    private transLayer: PIXI.Container,
    private dialogLayer: PIXI.Container,
    private choiceLayer: PIXI.Container
  ) {}

  /** 淡入效果 */
  async fadeIn(target: PIXI.DisplayObject, duration = 600): Promise<void> {
    target.alpha = 0
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        target.alpha = t
        if (t >= 1) { resolve(); return }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  /** 淡出效果 */
  async fadeOut(target: PIXI.DisplayObject, duration = 400): Promise<void> {
    const startAlpha = target.alpha
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        target.alpha = startAlpha * (1 - t)
        if (t >= 1) { resolve(); return }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  /** 场景淡出 */
  async sceneFadeOut(duration = 400): Promise<void> {
    const children = [...this.dialogLayer.children]
    if (children.length === 0) return
    await this.fadeOutContainer(children, duration)
    this.dialogLayer.removeChildren()
  }

  /** 场景滑出 */
  async sceneSlideOut(duration = 400): Promise<void> {
    const container = new PIXI.Container()
    for (const child of [...this.dialogLayer.children]) {
      this.dialogLayer.removeChild(child)
      container.addChild(child)
    }
    const { width } = this.app.screen
    this.transLayer.addChild(container)
    container.x = 0
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        container.x = -width * t * t
        if (t >= 1) {
          this.transLayer.removeChild(container)
          container.destroy({ children: true })
          resolve()
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  /** 成就解锁提示 */
  showAchievementToast(name: string, icon: string, onDismissed: () => void): void {
    const { width, height } = this.app.screen
    const toastY = height - 240
    const container = new PIXI.Container()
    container.x = width / 2
    let dismissed = false
    let autoTimer: ReturnType<typeof setTimeout> | null = null

    const bg = new PIXI.Graphics()
    bg.beginFill(0x1a1020, 0.92)
    bg.drawRoundedRect(-190, -32, 380, 74, 14)
    bg.endFill()
    bg.lineStyle(2, 0xf0c860, 0.5)
    bg.drawRoundedRect(-190, -32, 380, 74, 14)
    container.addChild(bg)

    const iconText = new PIXI.Text(icon, { fontSize: 28 })
    iconText.anchor.set(0.5)
    iconText.x = -135
    iconText.y = 5
    container.addChild(iconText)

    const label = new PIXI.Text('🏆 成就解锁!', { fill: '#f0c860', fontSize: 13, fontWeight: 'bold' })
    label.x = -95
    label.y = -8
    container.addChild(label)

    const nameText = new PIXI.Text(name, { fill: '#ffffff', fontSize: 16, fontWeight: '700' })
    nameText.x = -95
    nameText.y = 14
    container.addChild(nameText)

    const hintText = new PIXI.Text('点击关闭 ✕', { fill: '#777777', fontSize: 10 })
    hintText.x = 100
    hintText.y = 20
    container.addChild(hintText)

    container.alpha = 0
    container.y = toastY + 60
    this.transLayer.addChild(container)

    const dismiss = () => {
      if (dismissed) return
      dismissed = true
      if (autoTimer) clearTimeout(autoTimer)
      const ticker = this.app.ticker
      let fe = 0
      const fd = 300
      const onFade = (dt: number) => {
        fe += dt * (1000 / 60)
        const t = Math.min(fe / fd, 1)
        container.alpha = 1 - t
        if (t >= 1) {
          this.transLayer.removeChild(container)
          container.destroy({ children: true })
          ticker.remove(onFade)
          onDismissed()
        }
      }
      ticker.add(onFade)
    }

    container.interactive = true
    container.eventMode = 'static'
    container.cursor = 'pointer'
    container.on('pointertap', dismiss)
    autoTimer = setTimeout(dismiss, 6000)

    const ticker = this.app.ticker
    let elapsed = 0
    const slideInDuration = 400
    const onTick = (dt: number) => {
      elapsed += dt * (1000 / 60)
      if (elapsed < slideInDuration) {
        const t = elapsed / slideInDuration
        const eased = 1 - Math.pow(1 - t, 3)
        container.y = toastY + 60 - 60 * eased
        container.alpha = t
      } else {
        container.y = toastY
        container.alpha = 1
      }
    }
    ticker.add(onTick)

    // Auto-remove tick after dismiss
    const removeTicker = () => { ticker.remove(onTick) }
    const origDismiss = dismiss
    const wrappedDismiss = () => { removeTicker(); origDismiss() }
    container.off('pointertap')
    container.on('pointertap', wrappedDismiss)
    if (autoTimer) clearTimeout(autoTimer)
    autoTimer = setTimeout(wrappedDismiss, 6000)
  }

  /** 章节标题卡 */
  async showChapterTitleCard(
    group: { name: string; color: string; background?: string },
    projectPath: string,
    loadTexture: (url: string) => Promise<PIXI.Texture | null>,
    isAutoPlay: boolean
  ): Promise<void> {
    const { width, height } = this.app.screen
    const container = new PIXI.Container()
    this.transLayer.addChild(container)

    if (group.background) {
      const texture = await loadTexture(getAssetUrl(projectPath, group.background))
      if (texture) {
        const bg = new PIXI.Sprite(texture)
        bg.width = width
        bg.height = height
        bg.alpha = 0.85
        container.addChild(bg)
      }
    }

    const overlay = new PIXI.Graphics()
    const hexColor = parseInt(group.color.replace('#', ''), 16)
    overlay.beginFill(isNaN(hexColor) ? 0x1a1020 : hexColor, 0.45)
    overlay.drawRect(0, 0, width, height)
    overlay.endFill()
    container.addChild(overlay)

    const lineGraphics = new PIXI.Graphics()
    const lineColor = parseInt(group.color.replace('#', ''), 16) || 0xf0c860
    lineGraphics.lineStyle(3, lineColor, 0.8)
    lineGraphics.moveTo(width / 2 - 160, height / 2 + 15)
    lineGraphics.lineTo(width / 2 + 160, height / 2 + 15)
    container.addChild(lineGraphics)

    const title = new PIXI.Text(group.name, {
      fill: '#ffffff', fontSize: 48, fontWeight: '700',
      fontFamily: 'serif',
      dropShadow: true, dropShadowColor: '#000000',
      dropShadowDistance: 3, dropShadowBlur: 6
    })
    title.anchor.set(0.5)
    title.x = width / 2
    title.y = height / 2 - 20
    title.alpha = 0
    container.addChild(title)

    const hintText = isAutoPlay ? '即将进入章节…' : '点击任意位置继续'
    const hint = new PIXI.Text(hintText, { fill: '#cccccc', fontSize: 16 })
    hint.anchor.set(0.5)
    hint.x = width / 2
    hint.y = height / 2 + 50
    hint.alpha = 0
    container.addChild(hint)

    const start = performance.now()
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min((now - start) / 600, 1)
        title.alpha = t
        hint.alpha = t
        if (t >= 1) {
          container.interactive = true
          container.eventMode = 'static'
          container.cursor = 'pointer'
          let autoTimer: ReturnType<typeof setTimeout> | null = null
          const doResolve = () => {
            if (autoTimer) clearTimeout(autoTimer)
            container.off('pointertap')
            resolve()
          }
          container.on('pointertap', doResolve)
          if (isAutoPlay) autoTimer = setTimeout(doResolve, 2500)
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })

    const fadeStart = performance.now()
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min((now - fadeStart) / 400, 1)
        container.alpha = 1 - t
        if (t >= 1) { resolve(); return }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })

    this.transLayer.removeChild(container)
    container.destroy({ children: true })
  }

  /** 隐藏对话框/选项（用于过渡前清理） */
  clearUI(): void {
    this.dialogLayer.removeChildren()
    this.choiceLayer.removeChildren()
  }

  private async fadeOutContainer(children: PIXI.DisplayObject[], duration: number): Promise<void> {
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        for (const child of children) child.alpha = 1 - t
        if (t >= 1) { resolve(); return }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }
}
