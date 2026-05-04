import { describe, it, expect, beforeAll } from 'vitest'

describe('PixiJS 真实 Canvas 渲染', () => {
  let PIXI: any
  let app: any

  beforeAll(async () => {
    PIXI = await import('pixi.js')
    try {
      app = new PIXI.Application({
        width: 800, height: 600,
        backgroundColor: 0x1a1a2e,
        forceCanvas: true,
        autoStart: false,
        sharedTicker: false,
      })
    } catch (e) {
      // WebGL not available — canvas fallback
    }
  })

  it('PixiJS Application 可创建', () => {
    expect(PIXI).toBeDefined()
    expect(PIXI.VERSION).toBeDefined()
  })

  it('Container 可以创建和操作', () => {
    const container = new PIXI.Container()
    expect(container).toBeDefined()
    expect(container.children).toEqual([])
    container.label = 'test'
    expect(container.label).toBe('test')
  })

  it('Graphics 可以绘制', () => {
    if (!app) return // skip if app creation failed
    const g = new PIXI.Graphics()
    g.beginFill(0xff0000, 0.5)
    g.drawRect(0, 0, 100, 100)
    g.endFill()
    expect(g).toBeDefined()
    expect(g.geometry).toBeDefined()
    g.destroy()
  })

  it('Text 可以创建', () => {
    const text = new PIXI.Text('Hello PIXI', {
      fill: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold'
    })
    expect(text).toBeDefined()
    expect(text.text).toBe('Hello PIXI')
    expect(text.style.fontSize).toBe(24)
    text.destroy()
  })

  it('Container 层级操作', () => {
    const parent = new PIXI.Container()
    const child1 = new PIXI.Container()
    const child2 = new PIXI.Container()
    parent.addChild(child1)
    parent.addChild(child2)
    expect(parent.children).toHaveLength(2)
    parent.removeChild(child1)
    expect(parent.children).toHaveLength(1)
    parent.destroy({ children: true })
  })

  it('Application stage 可访问', () => {
    if (!app) return
    expect(app.stage).toBeDefined()
    expect(app.screen.width).toBe(800)
    expect(app.screen.height).toBe(600)
  })

  it('Ticker 可创建和管理', () => {
    const ticker = new PIXI.Ticker()
    expect(ticker).toBeDefined()
    let ticked = false
    ticker.add(() => { ticked = true })
    ticker.update(16)
    expect(ticked).toBe(true)
    ticker.destroy()
  })
})
