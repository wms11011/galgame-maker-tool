import * as PIXI from 'pixi.js'
import type { FlowNode, ParticleNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

interface Particle {
  sprite: PIXI.Graphics
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  rotation: number
  rotSpeed: number
}

export class ParticleRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    if (!this.engine.app) return

    const data = node.data as ParticleNodeData
    const preset = data.preset || 'snow'
    const density = data.density ?? 100
    const speed = data.speed ?? 1
    const duration = data.duration ?? 3000

    const { width, height } = this.engine.app.screen
    const particles: Particle[] = []
    const container = new PIXI.Container()
    this.engine.transLayer.addChild(container)

    // 创建粒子
    for (let i = 0; i < density; i++) {
      const p = this.createParticle(preset, width, height, speed)
      particles.push(p)
      container.addChild(p.sprite)
    }

    // 动画循环
    const startTime = performance.now()
    const ticker = (dt: number) => {
      const elapsed = performance.now() - startTime
      if (elapsed >= duration) {
        this.engine.app!.ticker.remove(ticker)
        container.destroy({ children: true })
        this.advance(node)
        return
      }

      for (const p of particles) {
        p.x += p.vx * dt * (60 / 1000)
        p.y += p.vy * dt * (60 / 1000)
        p.rotation += p.rotSpeed * dt * (60 / 1000)

        // 循环粒子
        if (p.y > height + 20) { p.y = -20; p.x = Math.random() * width }
        if (p.x > width + 20) { p.x = -20 }
        if (p.x < -20) { p.x = width + 20 }

        p.sprite.x = p.x
        p.sprite.y = p.y
        p.sprite.alpha = p.alpha
        p.sprite.rotation = p.rotation
      }
    }

    this.engine.app.ticker.add(ticker)
  }

  private createParticle(preset: string, width: number, height: number, speed: number): Particle {
    const g = new PIXI.Graphics()
    const size = 2 + Math.random() * 4

    switch (preset) {
      case 'rain': {
        g.beginFill(0x8899cc, 0.3 + Math.random() * 0.4)
        g.drawRect(0, 0, 1, 6 + Math.random() * 8)
        g.endFill()
        return {
          sprite: g, size,
          x: Math.random() * width,
          y: Math.random() * -height,
          vx: -0.5 + Math.random(),
          vy: 4 + Math.random() * 6 * speed,
          alpha: g.alpha, rotation: 0.1, rotSpeed: 0
        }
      }
      case 'snow': {
        g.beginFill(0xffffff, 0.4 + Math.random() * 0.5)
        g.drawCircle(0, 0, size)
        g.endFill()
        return {
          sprite: g, size,
          x: Math.random() * width,
          y: Math.random() * -height,
          vx: -1 + Math.random() * 2,
          vy: 0.5 + Math.random() * 2 * speed,
          alpha: g.alpha, rotation: 0, rotSpeed: -0.02 + Math.random() * 0.04
        }
      }
      case 'sakura': {
        const pink = [0xffb7c5, 0xffd1dc, 0xffc0cb, 0xffaabb][Math.floor(Math.random() * 4)]
        g.beginFill(pink, 0.6 + Math.random() * 0.3)
        g.drawEllipse(0, 0, size, size * 0.6)
        g.endFill()
        return {
          sprite: g, size,
          x: Math.random() * width,
          y: Math.random() * -height,
          vx: -1.5 + Math.random() * 3,
          vy: 0.8 + Math.random() * 1.5 * speed,
          alpha: g.alpha, rotation: Math.random() * Math.PI * 2,
          rotSpeed: -0.03 + Math.random() * 0.06
        }
      }
      case 'leaf': {
        const leafColors = [0xd4a574, 0xc4956a, 0xb8865a, 0xe8c878, 0xa07040]
        const color = leafColors[Math.floor(Math.random() * leafColors.length)]
        g.beginFill(color, 0.5 + Math.random() * 0.4)
        g.drawEllipse(0, 0, size * 1.5, size * 0.5)
        g.endFill()
        return {
          sprite: g, size,
          x: Math.random() * width,
          y: Math.random() * -height,
          vx: -2 + Math.random() * 4,
          vy: 1 + Math.random() * 2.5 * speed,
          alpha: g.alpha, rotation: Math.random() * Math.PI * 2,
          rotSpeed: -0.05 + Math.random() * 0.1
        }
      }
      case 'star': {
        g.beginFill(0xffffcc, 0.3 + Math.random() * 0.5)
        g.drawStar!(0, 0, 3, size, size * 0.4)
        g.endFill()
        return {
          sprite: g, size,
          x: Math.random() * width,
          y: Math.random() * -height,
          vx: -0.3 + Math.random() * 0.6,
          vy: 0.2 + Math.random() * 0.8 * speed,
          alpha: g.alpha, rotation: 0,
          rotSpeed: -0.01 + Math.random() * 0.02
        }
      }
      default: {
        g.beginFill(0xffffff, 0.5)
        g.drawCircle(0, 0, size)
        g.endFill()
        return {
          sprite: g, size,
          x: Math.random() * width,
          y: Math.random() * -height,
          vx: Math.random() - 0.5,
          vy: 1 + Math.random() * 2,
          alpha: g.alpha, rotation: 0, rotSpeed: 0
        }
      }
    }
  }

  private advance(node: FlowNode): void {
    const nextId = this.engine.traversal?.getNext(node.id) ?? (node.data as ParticleNodeData).nextNodeId ?? ''
    if (nextId) {
      this.engine.renderNode(nextId)
    } else {
      this.engine.endCallback?.()
    }
  }
}
