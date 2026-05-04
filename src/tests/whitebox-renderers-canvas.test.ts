import { describe, it, expect, vi } from 'vitest'
import * as PIXI from 'pixi.js'

function makeEngine(overrides: any = {}) {
  return {
    app: { screen: { width: 1280, height: 720 }, ticker: { add: vi.fn(), remove: vi.fn() } },
    transLayer: new PIXI.Container(),
    dialogLayer: new PIXI.Container(),
    choiceLayer: new PIXI.Container(),
    state: { globalFlags: {} as Record<string, boolean>, variables: {} as Record<string, unknown> },
    projectData: { meta: { projectPath: '/test' } },
    traversal: { getNext: vi.fn().mockReturnValue('next_node'), getChoiceTargets: vi.fn().mockReturnValue([]), getConditionTargets: vi.fn().mockReturnValue({ trueTarget: null, falseTarget: null }), getRandomBranches: vi.fn().mockReturnValue([]) },
    audioManager: { playBgm: vi.fn(), stopBgm: vi.fn(), playSe: vi.fn(), stopAllSe: vi.fn() },
    hideDialogBox: vi.fn(), showDialogBox: vi.fn(), renderNode: vi.fn().mockResolvedValue(undefined), emitDebug: vi.fn(),
    endCallback: null as any, debugCallback: null as any, getDebugInfo: vi.fn().mockReturnValue({}),
    startSceneParticles: vi.fn(), stopSceneParticles: vi.fn(),
    achievementToast: null as any,
    ...overrides,
  }
}
import type { FlowNode } from '../renderer/src/types/index'

// Renderers that work with real PIXI
import { EndRenderer } from '../renderer/src/preview/renderers/EndRenderer'
import { GotoRenderer } from '../renderer/src/preview/renderers/GotoRenderer'
import { LabelRenderer } from '../renderer/src/preview/renderers/LabelRenderer'
import { AudioRenderer } from '../renderer/src/preview/renderers/AudioRenderer'
import { SavePointRenderer } from '../renderer/src/preview/renderers/SavePointRenderer'

describe('真实 Canvas 渲染器', () => {
  it('EndRenderer — null app returns early', () => {
    const engine = makeEngine()
    engine.app = null
    const r = new EndRenderer(engine as any)
    expect(() => r.render({ id: 'e1', type: 'end', position: { x: 0, y: 0 }, data: { id: 'e1', endingType: 'normal', message: '' } } as FlowNode)).not.toThrow()
  })

  it('LabelRenderer — skip advances', () => {
    const engine = makeEngine()
    const r = new LabelRenderer(engine as any)
    r.skip({ id: 'l1', type: 'label', position: { x: 0, y: 0 }, data: { id: 'l1', label: 'ch1', color: '#f00' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })

  it('LabelRenderer — real PIXI text on transLayer', async () => {
    const engine = makeEngine()
    const r = new LabelRenderer(engine as any)
    await r.render({ id: 'l1', type: 'label', position: { x: 0, y: 0 }, data: { id: 'l1', label: '第一章', color: '#ff6600' } } as FlowNode)
    // Label should add text + graphics to transLayer
  })

  it('AudioRenderer — stop bgm', async () => {
    const engine = makeEngine()
    const r = new AudioRenderer(engine as any)
    await r.render({ id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', audioType: 'bgm', action: 'stop', src: '', loop: false, volume: 1 } } as FlowNode)
    expect(engine.audioManager.stopBgm).toHaveBeenCalled()
  })

  it('AudioRenderer — no audioManager skips', async () => {
    const engine = makeEngine()
    engine.audioManager = null
    const r = new AudioRenderer(engine as any)
    await r.render({ id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', audioType: 'bgm', action: 'play', src: 'bgm.mp3', loop: false, volume: 1 } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalledWith('next_node')
  })

  it('GotoRenderer — jumps to target', async () => {
    const engine = makeEngine()
    const r = new GotoRenderer(engine as any)
    await r.render({ id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', targetNodeId: 'target' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalledWith('target')
  })

  it('SavePointRenderer — skip advances', () => {
    const engine = makeEngine()
    const r = new SavePointRenderer(engine as any)
    r.skip({ id: 'sp1', type: 'savePoint', position: { x: 0, y: 0 }, data: { id: 'sp1', slotLabel: '存档' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})
