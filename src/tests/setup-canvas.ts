/**
 * jsdom Canvas polyfill using @napi-rs/canvas
 * Provides real Canvas API for PixiJS in vitest environment
 */
import { createCanvas, CanvasRenderingContext2D } from '@napi-rs/canvas'
import { Path2D } from '@napi-rs/canvas'

// Polyfill global canvas API for jsdom
if (typeof globalThis.HTMLCanvasElement === 'undefined') {
  // Create a minimal HTMLCanvasElement-like class
  class HTMLCanvasElementPolyfill {
    private _canvas: ReturnType<typeof createCanvas>
    private _width: number
    private _height: number

    constructor(width = 300, height = 150) {
      this._width = width
      this._height = height
      this._canvas = createCanvas(width, height)
    }

    get width() { return this._width }
    set width(v: number) {
      this._width = v
      this._canvas = createCanvas(v, this._height)
    }
    get height() { return this._height }
    set height(v: number) {
      this._height = v
      this._canvas = createCanvas(this._width, v)
    }

    getContext(contextType: string, _options?: any): any {
      if (contextType === '2d') {
        const ctx = this._canvas.getContext('2d')
        if (ctx) {
          // Wrap to match browser CanvasRenderingContext2D
          return ctx
        }
      }
      if (contextType === 'webgl' || contextType === 'webgl2') {
        // PixiJS v7 uses WebGL — return null to trigger canvas fallback
        return null
      }
      return null
    }

    toDataURL(type?: string, quality?: any): string {
      return this._canvas.toDataURL(type || 'image/png', quality)
    }

    toBlob(callback: (blob: any) => void, type?: string, quality?: any): void {
      // Minimal implementation
      callback(null)
    }
  }

  ;(globalThis as any).HTMLCanvasElement = HTMLCanvasElementPolyfill
  ;(globalThis as any).CanvasRenderingContext2D = CanvasRenderingContext2D
  ;(globalThis as any).Path2D = Path2D

  // Image polyfill (needed by PixiJS for texture loading)
  const OriginalImage = (globalThis as any).Image
  if (!OriginalImage || typeof OriginalImage !== 'function') {
    ;(globalThis as any).Image = class {
      src: string = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width: number = 0
      height: number = 0
      complete: boolean = false
      constructor() {
        setTimeout(() => {
          this.width = 100
          this.height = 100
          this.complete = true
          if (this.onload) this.onload()
        }, 0)
      }
    }
  }
}

// Provide createCanvas as a global for PixiJS internal use
;(globalThis as any).__canvasCreate = createCanvas

export {}
