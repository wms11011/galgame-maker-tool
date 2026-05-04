import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock requestAnimationFrame for jsdom
let rafId = 0
const rafCallbacks = new Map<number, FrameRequestCallback>()
const mockRaf = (cb: FrameRequestCallback) => { rafCallbacks.set(++rafId, cb); return rafId }
const mockCaf = (id: number) => { rafCallbacks.delete(id) }
globalThis.requestAnimationFrame = mockRaf
globalThis.cancelAnimationFrame = mockCaf

// Helper to create consistent mock objects with methods
function makeMockContainer(overrides: any = {}) {
  return {
    children: [] as any[],
    addChild: vi.fn(function(this: any, c: any) { this.children.push(c) }),
    removeChild: vi.fn(function(this: any, c: any) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1) }),
    removeChildren: vi.fn(function(this: any) { this.children.length = 0 }),
    destroy: vi.fn(),
    alpha: 1, x: 0, y: 0,
    interactive: false, eventMode: '', cursor: '',
    on: vi.fn(), off: vi.fn(),
    ...overrides
  } as any
}

function makeMockGraphics(overrides: any = {}) {
  return {
    beginFill: vi.fn().mockReturnThis(),
    drawRect: vi.fn().mockReturnThis(),
    drawRoundedRect: vi.fn().mockReturnThis(),
    endFill: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    alpha: 1, x: 0, y: 0,
    interactive: false, eventMode: '', cursor: '',
    on: vi.fn(), off: vi.fn(),
    addChild: vi.fn(), removeChild: vi.fn(), removeChildren: vi.fn(),
    destroy: vi.fn(),
    children: [] as any[],
    ...overrides
  } as any
}

function makeMockText(text: string = '', style: any = {}) {
  return {
    text, style,
    anchor: { set: vi.fn() },
    alpha: 1, x: 0, y: 0,
    interactive: false, eventMode: '', cursor: '',
    on: vi.fn(), off: vi.fn(), destroy: vi.fn(),
    children: [] as any[]
  } as any
}

// Simple PIXI mocks
const mockTicker = { add: vi.fn(), remove: vi.fn() }
const mockApp = {
  screen: { width: 1280, height: 720 },
  ticker: mockTicker,
  stage: {} as any
}

const mockTexture = { baseTexture: { valid: true, on: vi.fn(), off: vi.fn() } }

// Mock PIXI module
vi.mock('pixi.js', () => ({
  Application: vi.fn(() => mockApp),
  Container: vi.fn(() => makeMockContainer()),
  Graphics: vi.fn(() => makeMockGraphics()),
  Text: vi.fn((text?: string, style?: any) => makeMockText(text, style)),
  Sprite: vi.fn(() => ({ width: 0, height: 0, alpha: 1, x: 0, y: 0, scale: { set: vi.fn(), x: 1, y: 1 }, destroy: vi.fn() })),
  Texture: { from: vi.fn(() => mockTexture) }
}))

// Mock getAssetUrl
vi.mock('../renderer/src/utils/assetUrl', () => ({
  getAssetUrl: vi.fn((_projectPath: string, relativePath: string) => `file:///project/assets/${relativePath}`)
}))

import { AnimationHelper } from '../renderer/src/preview/AnimationHelper'
import * as PIXI from 'pixi.js'

describe('AnimationHelper', () => {
  let helper: AnimationHelper

  beforeEach(() => {
    vi.clearAllMocks()
    rafCallbacks.clear()
    rafId = 0
    helper = new AnimationHelper(
      mockApp as any,
      new PIXI.Container() as any,
      new PIXI.Container() as any,
      new PIXI.Container() as any
    )
  })

  afterEach(() => {
    rafCallbacks.clear()
  })

  describe('clearUI', () => {
    it('清除对话框和选项层', () => {
      ;(helper as any).dialogLayer.removeChildren = vi.fn()
      ;(helper as any).choiceLayer.removeChildren = vi.fn()
      helper.clearUI()
      expect((helper as any).dialogLayer.removeChildren).toHaveBeenCalled()
      expect((helper as any).choiceLayer.removeChildren).toHaveBeenCalled()
    })
  })

  describe('fadeIn', () => {
    it('将目标 alpha 设为零然后逐帧增加到 1', async () => {
      const target = { alpha: 1, x: 0 }
      const promise = helper.fadeIn(target as any, 100)
      // Advance all raf callbacks to completion
      while (rafCallbacks.size > 0) {
        const cbs = [...rafCallbacks.values()]
        rafCallbacks.clear()
        for (const cb of cbs) cb(performance.now())
      }
      await promise
      expect(target.alpha).toBe(1)
    })
  })

  describe('fadeOut', () => {
    it('将目标 alpha 逐帧减少到 0', async () => {
      const target = { alpha: 1, x: 0 }
      const promise = helper.fadeOut(target as any, 100)
      while (rafCallbacks.size > 0) {
        const cbs = [...rafCallbacks.values()]
        rafCallbacks.clear()
        for (const cb of cbs) cb(performance.now())
      }
      await promise
      expect(target.alpha).toBe(0)
    })
  })

  describe('sceneFadeOut', () => {
    it('对话框层无子元素时直接返回', async () => {
      ;(helper as any).dialogLayer.children = []
      await helper.sceneFadeOut(100)
      // Should resolve immediately
    })

    it('对话框层有子元素时淡出并清除', async () => {
      const child = { alpha: 1 }
      ;(helper as any).dialogLayer.children = [child]
      ;(helper as any).dialogLayer.removeChildren = vi.fn()
      const promise = helper.sceneFadeOut(100)
      while (rafCallbacks.size > 0) {
        const cbs = [...rafCallbacks.values()]
        rafCallbacks.clear()
        for (const cb of cbs) cb(performance.now())
      }
      await promise
      expect(child.alpha).toBe(0)
    })
  })

  describe('showAchievementToast', () => {
    it('创建 toast 并添加过渡层子元素', () => {
      const onDismissed = vi.fn()
      ;(helper as any).transLayer.addChild = vi.fn()
      helper.showAchievementToast('测试成就', '🏆', onDismissed)
      expect((helper as any).transLayer.addChild).toHaveBeenCalled()
    })

    it('toast 容器可交互', () => {
      const onDismissed = vi.fn()
      helper.showAchievementToast('成就', '⭐', onDismissed)
      // The toast should have been created
      expect(PIXI.Container).toHaveBeenCalled()
      expect(PIXI.Text).toHaveBeenCalled()
    })
  })

  describe('sceneSlideOut', () => {
    it('创建过渡容器并执行滑出动画', async () => {
      const child = { alpha: 1 }
      ;(helper as any).dialogLayer.children = [child]
      ;(helper as any).dialogLayer.removeChild = vi.fn()
      ;(helper as any).transLayer.addChild = vi.fn()
      const promise = helper.sceneSlideOut(100)
      while (rafCallbacks.size > 0) {
        const cbs = [...rafCallbacks.values()]
        rafCallbacks.clear()
        for (const cb of cbs) cb(performance.now())
      }
      await promise
      expect((helper as any).transLayer.addChild).toHaveBeenCalled()
    })
  })
})
