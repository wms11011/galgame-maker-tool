import * as PIXI from 'pixi.js'
import type { FlowNode, Live2DNodeData } from '../../types/index'
import { getAssetUrl } from '../../utils/assetUrl'
import { BaseNodeRenderer } from './BaseRenderer'

// Live2D SDK 动态加载状态
let Live2DModelClass: any = null
let sdkTried = false
let sdkAvailable = false

async function ensureLive2DSDK(): Promise<boolean> {
  if (sdkTried) return sdkAvailable
  sdkTried = true
  try {
    if (typeof window === 'undefined') { sdkAvailable = false; return false }

    // 必须设置 window.PIXI，Live2D 插件依赖它
    if (!(window as any).PIXI) (window as any).PIXI = PIXI

    // SDK 通过 <script> 标签加载到全局 window 对象
    const win = window as any
    const mod = win.Live2DModule || win.__Live2DModule__
    if (mod?.Live2DModel) {
      Live2DModelClass = mod.Live2DModel
      if (Live2DModelClass.registerTicker) Live2DModelClass.registerTicker(PIXI.Ticker)
      sdkAvailable = true; console.log('[Live2D] SDK 加载成功')
      return true
    }
  } catch (e) { console.warn('[Live2D] SDK 加载失败:', e) }
  sdkAvailable = false
  return false
}

export class Live2DRenderer extends BaseNodeRenderer {
  private activeModel: any = null
  private activeContainer: PIXI.Container | null = null
  private tickerCleanup: (() => void) | null = null

  async render(node: FlowNode): Promise<void> {
    if (!this.engine.app) return

    const data = node.data as Live2DNodeData
    this.engine.hideDialogBox()
    this.engine.choiceLayer.removeChildren()
    this.destroyModel()

    if (!data.model) { this.advance(node, data); return }

    const projectPath = this.engine.projectData!.meta.projectPath
    const url = getAssetUrl(projectPath, data.model)
    const { width, height } = this.engine.app.screen
    const isMoc3 = url.endsWith('.moc3') || url.endsWith('.model3.json') || url.endsWith('.model.json')

    const container = new PIXI.Container()
    container.x = data.position === 'left' ? width * 0.25
      : data.position === 'right' ? width * 0.75 : width * 0.5
    container.y = height
    container.alpha = 0
    this.engine.transLayer.addChild(container)
    this.activeContainer = container

    if (isMoc3 && await ensureLive2DSDK()) {
      await this.renderLive2D(container, url, data)
    } else {
      await this.renderSprite(container, url, data)
    }

    this.advance(node, data)
  }

  /** 真实 Live2D 模型渲染 */
  private async renderLive2D(container: PIXI.Container, url: string, data: Live2DNodeData): Promise<void> {
    try {
      const model = await Live2DModelClass.from(url)
      model.anchor?.set?.(0.5, 1)
      model.scale?.set?.(0.08)
      model.x = 0; model.y = -20
      container.addChild(model)
      this.activeModel = model

      // 表情：按名称或索引
      const expr = data.expression || 'neutral'
      try {
        const mgr = model.internalModel?.motionManager?.expressionManager
        if (mgr) {
          // 尝试按名称查找，失败则按索引
          const idx = mgr.definitions?.findIndex((d: any) => d.name === expr)
          model.expression(idx >= 0 ? idx : undefined)
        } else {
          model.expression?.()
        }
      } catch { /* 模型无表情 */ }

      // 动作
      const motion = data.motion || 'idle'
      try { await model.motion?.(motion) } catch { /* 模型无此动作 */ }

      // 点击交互 → 播放 tap 动作
      container.interactive = true
      container.eventMode = 'static'
      container.cursor = 'pointer'
      container.on('pointertap', async () => {
        try { await model.motion?.('tap_body', undefined, 3) } catch { /* no tap */ }
      })

      await this.engine.fadeIn(container, 500)
    } catch (err) {
      console.warn('[Live2D] 模型渲染失败，降级精灵:', err)
      await this.renderSprite(container, url, data)
    }
  }

  /** PIXI 精灵降级渲染 */
  private async renderSprite(container: PIXI.Container, url: string, data: Live2DNodeData): Promise<void> {
    const texture = await this.engine.loadTexture(url)
    if (!texture) return

    const sprite = new PIXI.Sprite(texture)
    sprite.anchor.set(0.5, 1); sprite.scale.set(0.95)
    container.addChild(sprite)
    await this.engine.fadeIn(container, 500)

    // 6 维动画系统
    const ticker = this.engine.app!.ticker
    const baseX = container.x, baseY = container.y
    let elapsed = 0, blinkT = 0, blinking = false, microT = 0, tilt = 0

    const eyes = new PIXI.Graphics(); eyes.alpha = 0; container.addChild(eyes)

    const params: Record<string, { s: number; b: number }> = {
      neutral:{s:1,b:.8}, happy:{s:1.8,b:1.5}, sad:{s:.4,b:.3},
      surprised:{s:.6,b:2}, angry:{s:1.2,b:.5}, shy:{s:1.5,b:.4}
    }
    const p = params[data.expression || 'neutral'] || params.neutral

    const onTick = (dt: number) => {
      const ms = dt * (1000 / 60); elapsed += ms; blinkT += ms; microT += ms
      container.y = baseY + Math.sin(elapsed * .025) * 2.5 * p.s
      sprite.scale.set(.95 + Math.sin(elapsed * .035) * .015 * p.b)
      tilt += (Math.sin(elapsed * .018) * .015 - tilt) * .05; sprite.rotation = tilt
      if (microT > 2000 + Math.random() * 3000) { microT = 0; container.x = baseX + (Math.random() - .5) * 4 }
      else container.x += (baseX - container.x) * .02
      if (!blinking && blinkT > 3000 + Math.random() * 2000) { blinking = true; blinkT = 0 }
      if (blinking) {
        eyes.alpha = blinkT < 80 ? blinkT / 80 : blinkT < 160 ? 1 - (blinkT - 80) / 80 : 0
        if (blinkT > 200) { blinking = false; blinkT = 0; eyes.alpha = 0 }
      }
    }
    ticker.add(onTick)
    this.tickerCleanup = () => ticker.remove(onTick)
  }

  private destroyModel(): void {
    this.tickerCleanup?.()
    this.tickerCleanup = null
    try { this.activeModel?.destroy?.() } catch { /* ignore */ }
    this.activeModel = null
    if (this.activeContainer) {
      this.engine.transLayer.removeChild(this.activeContainer)
      this.activeContainer.destroy({ children: true })
      this.activeContainer = null
    }
  }

  private advance(node: FlowNode, data: Live2DNodeData): void {
    const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
    if (nextId) this.engine.renderNode(nextId)
    else this.engine.endCallback?.()
  }
}
