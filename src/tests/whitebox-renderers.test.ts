import { describe, it, expect, vi, beforeEach } from 'vitest'

// ══════════════════════════════════════════════════════════
// Shared mock engine factory
// ══════════════════════════════════════════════════════════
function makeMockEngine(overrides: any = {}) {
  return {
    app: {
      screen: { width: 1280, height: 720 },
      ticker: { add: vi.fn(), remove: vi.fn() },
      stage: {},
    },
    traversal: {
      getNext: vi.fn().mockReturnValue('next_node'),
      getChoiceTargets: vi.fn().mockReturnValue([]),
      getConditionTargets: vi.fn().mockReturnValue({ trueTarget: null, falseTarget: null }),
      getRandomBranches: vi.fn().mockReturnValue([]),
    },
    state: {
      globalFlags: {} as Record<string, boolean>,
      variables: {} as Record<string, unknown>,
    },
    audioManager: {
      playBgm: vi.fn(),
      playSe: vi.fn(),
      stopBgm: vi.fn(),
      stopAllSe: vi.fn(),
    },
    projectData: {
      meta: { projectPath: '/test/proj' }
    },
    dialogLayer: { removeChildren: vi.fn(), children: [] },
    choiceLayer: { removeChildren: vi.fn() },
    transLayer: {
      children: [] as any[],
      addChild: vi.fn(function(this: any, c: any) { this.children.push(c) }),
      removeChild: vi.fn(),
      removeChildren: vi.fn(),
    },
    hideDialogBox: vi.fn(),
    renderNode: vi.fn().mockResolvedValue(undefined),
    emitDebug: vi.fn(),
    showDialogBox: vi.fn(),
    endCallback: null as (() => void) | null,
    debugCallback: null as ((info: any) => void) | null,
    getDebugInfo: vi.fn().mockReturnValue({}),
    ...overrides,
  }
}

// ══════════════════════════════════════════════════════════
// Import renderers
// ══════════════════════════════════════════════════════════
import { BaseNodeRenderer } from '../renderer/src/preview/renderers/BaseRenderer'
import { GotoRenderer } from '../renderer/src/preview/renderers/GotoRenderer'
import { WaitRenderer } from '../renderer/src/preview/renderers/WaitRenderer'
import { AudioRenderer } from '../renderer/src/preview/renderers/AudioRenderer'
import { ItemRenderer } from '../renderer/src/preview/renderers/ItemRenderer'
import { CgRenderer } from '../renderer/src/preview/renderers/CgRenderer'
import { DialogRenderer } from '../renderer/src/preview/renderers/DialogRenderer'
import { ChoiceRenderer } from '../renderer/src/preview/renderers/ChoiceRenderer'
import { ConditionRenderer } from '../renderer/src/preview/renderers/ConditionRenderer'
import { EndRenderer } from '../renderer/src/preview/renderers/EndRenderer'
import { LabelRenderer } from '../renderer/src/preview/renderers/LabelRenderer'
import { RandomRenderer } from '../renderer/src/preview/renderers/RandomRenderer'
import { AchievementRenderer } from '../renderer/src/preview/renderers/AchievementRenderer'
import { SavePointRenderer } from '../renderer/src/preview/renderers/SavePointRenderer'
import { TimerRenderer } from '../renderer/src/preview/renderers/TimerRenderer'
import { Live2DRenderer } from '../renderer/src/preview/renderers/Live2DRenderer'
import { ParticleRenderer } from '../renderer/src/preview/renderers/ParticleRenderer'
import { MoveCharacterRenderer } from '../renderer/src/preview/renderers/MoveCharacterRenderer'
import { SteamAchievementRenderer } from '../renderer/src/preview/renderers/SteamAchievementRenderer'

import type { FlowNode } from '../renderer/src/types/index'

// ══════════════════════════════════════════════════════════
describe('渲染器测试', () => {
  describe('BaseRenderer', () => {
    it('skip() — 有 next 时调用 renderNode', () => {
      const engine = makeMockEngine()
      const renderer = { engine } as BaseNodeRenderer
      renderer.skip = BaseNodeRenderer.prototype.skip
      renderer.skip({ id: 'n1', type: 'dialog', position: { x: 0, y: 0 }, data: {} } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalledWith('next_node')
    })

    it('skip() — 无 next 时调用 endCallback', () => {
      const engine = makeMockEngine()
      engine.traversal!.getNext = vi.fn().mockReturnValue(null)
      engine.endCallback = vi.fn()
      const renderer = { engine } as BaseNodeRenderer
      renderer.skip = BaseNodeRenderer.prototype.skip
      renderer.skip({ id: 'last', type: 'dialog', position: { x: 0, y: 0 }, data: {} } as FlowNode)
      expect(engine.endCallback).toHaveBeenCalled()
    })
  })

  describe('GotoRenderer', () => {
    it('有 target → 跳转', async () => {
      const engine = makeMockEngine()
      const renderer = new GotoRenderer(engine as any)
      await renderer.render({ id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', targetNodeId: 'target' } } as FlowNode)
      expect(engine.hideDialogBox).toHaveBeenCalled()
      expect(engine.renderNode).toHaveBeenCalledWith('target')
    })

    it('无 target → endCallback', async () => {
      const engine = makeMockEngine()
      engine.endCallback = vi.fn()
      const renderer = new GotoRenderer(engine as any)
      await renderer.render({ id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', targetNodeId: '' } } as FlowNode)
      expect(engine.endCallback).toHaveBeenCalled()
    })
  })

  describe('WaitRenderer', () => {
    it('有 duration + next → 等待后跳转', async () => {
      const engine = makeMockEngine()
      const renderer = new WaitRenderer(engine as any)
      await renderer.render({ id: 'w1', type: 'wait', position: { x: 0, y: 0 }, data: { id: 'w1', duration: 10 } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })

    it('无 duration → 默认 1000ms', async () => {
      const engine = makeMockEngine()
      const renderer = new WaitRenderer(engine as any)
      await renderer.render({ id: 'w1', type: 'wait', position: { x: 0, y: 0 }, data: { id: 'w1', duration: 0 } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })

    it('无 next → endCallback', async () => {
      const engine = makeMockEngine()
      engine.traversal!.getNext = vi.fn().mockReturnValue(null)
      engine.endCallback = vi.fn()
      const renderer = new WaitRenderer(engine as any)
      await renderer.render({ id: 'w1', type: 'wait', position: { x: 0, y: 0 }, data: { id: 'w1', duration: 1 } } as FlowNode)
      expect(engine.endCallback).toHaveBeenCalled()
    })
  })

  describe('AudioRenderer', () => {
    it('audioManager 不存在 → 直接跳过', async () => {
      const engine = makeMockEngine()
      engine.audioManager = null
      const renderer = new AudioRenderer(engine as any)
      await renderer.render({ id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', audioType: 'bgm', action: 'play', src: 'bgm.mp3', loop: false, volume: 1 } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalledWith('next_node')
    })

    it('stop bgm', async () => {
      const engine = makeMockEngine()
      const renderer = new AudioRenderer(engine as any)
      await renderer.render({ id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', audioType: 'bgm', action: 'stop', src: '', loop: false, volume: 1 } } as FlowNode)
      expect(engine.audioManager!.stopBgm).toHaveBeenCalled()
    })

    it('stop se', async () => {
      const engine = makeMockEngine()
      const renderer = new AudioRenderer(engine as any)
      await renderer.render({ id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', audioType: 'se', action: 'stop', src: '', loop: false, volume: 1 } } as FlowNode)
      expect(engine.audioManager!.stopAllSe).toHaveBeenCalled()
    })

    it('play bgm', async () => {
      const engine = makeMockEngine()
      const renderer = new AudioRenderer(engine as any)
      await renderer.render({ id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', audioType: 'bgm', action: 'play', src: 'bgm.mp3', loop: true, volume: 0.8 } } as FlowNode)
      expect(engine.audioManager!.playBgm).toHaveBeenCalled()
    })

    it('play se', async () => {
      const engine = makeMockEngine()
      const renderer = new AudioRenderer(engine as any)
      await renderer.render({ id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', audioType: 'se', action: 'play', src: 'sfx.wav', loop: false, volume: 1 } } as FlowNode)
      expect(engine.audioManager!.playSe).toHaveBeenCalled()
    })
  })

  describe('ItemRenderer', () => {
    it('get action — 添加道具到背包', async () => {
      const engine = makeMockEngine()
      engine.state.variables['背包'] = []
      const renderer = new ItemRenderer(engine as any)
      await renderer.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 }, data: { id: 'i1', action: 'get', itemName: '钥匙' } } as FlowNode)
      expect(engine.state.variables['背包']).toContain('钥匙')
    })

    it('lose action — 从背包移除', async () => {
      const engine = makeMockEngine()
      engine.state.variables['背包'] = ['钥匙', '地图']
      const renderer = new ItemRenderer(engine as any)
      await renderer.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 }, data: { id: 'i1', action: 'lose', itemName: '钥匙', inventoryVar: '背包' } } as FlowNode)
      expect(engine.state.variables['背包']).not.toContain('钥匙')
    })

    it('check action — 拥有道具时走 true 分支', async () => {
      const engine = makeMockEngine()
      engine.state.variables['背包'] = ['钥匙']
      const renderer = new ItemRenderer(engine as any)
      await renderer.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 }, data: { id: 'i1', action: 'check', itemName: '钥匙', inventoryVar: '背包', trueNextId: 'has', falseNextId: 'no' } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalledWith('has')
    })

    it('check action — 没有道具时走 false 分支', async () => {
      const engine = makeMockEngine()
      engine.state.variables['背包'] = []
      const renderer = new ItemRenderer(engine as any)
      await renderer.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 }, data: { id: 'i1', action: 'check', itemName: '钥匙', inventoryVar: '背包', trueNextId: 'has', falseNextId: 'no' } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalledWith('no')
    })
  })

  describe('DialogRenderer', () => {
    it('skip to next', () => {
      const engine = makeMockEngine()
      const renderer = new DialogRenderer(engine as any)
      renderer.skip({ id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', character: 'Alice', content: 'hello' } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })
  })

  describe('LabelRenderer', () => {
    it('skip to next', () => {
      const engine = makeMockEngine()
      const renderer = new LabelRenderer(engine as any)
      renderer.skip({ id: 'l1', type: 'label', position: { x: 0, y: 0 }, data: { id: 'l1', label: 'ch1', color: '#f00' } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })
  })

  describe('AchievementRenderer', () => {
    it('skip to next', () => {
      const engine = makeMockEngine()
      const renderer = new AchievementRenderer(engine as any)
      renderer.skip({ id: 'ach1', type: 'achievement', position: { x: 0, y: 0 }, data: { id: 'ach1', achievementId: 'ach_test' } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })
  })

  describe('SavePointRenderer', () => {
    it('skip to next', () => {
      const engine = makeMockEngine()
      const renderer = new SavePointRenderer(engine as any)
      renderer.skip({ id: 's1', type: 'savePoint', position: { x: 0, y: 0 }, data: { id: 's1', slotLabel: '存档' } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })
  })

  describe('TimerRenderer', () => {
    it('skip to next', () => {
      const engine = makeMockEngine()
      const renderer = new TimerRenderer(engine as any)
      renderer.skip({ id: 't1', type: 'timer', position: { x: 0, y: 0 }, data: { id: 't1', mode: 'countdown', duration: 1000 } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })
  })

  describe('MoveCharacterRenderer', () => {
    it('skip to next', () => {
      const engine = makeMockEngine()
      const renderer = new MoveCharacterRenderer(engine as any)
      renderer.skip({ id: 'm1', type: 'moveCharacter', position: { x: 0, y: 0 }, data: { id: 'm1', target: 'c', fromPosition: 'left', toPosition: 'center', duration: 500, easing: 'ease' } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })
  })

  describe('SteamAchievementRenderer', () => {
    it('skip to next', () => {
      const engine = makeMockEngine()
      const renderer = new SteamAchievementRenderer(engine as any)
      renderer.skip({ id: 's1', type: 'steamAchievement', position: { x: 0, y: 0 }, data: { id: 's1', achievementId: 'ACH_X' } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })
  })

  describe('ConditionRenderer', () => {
    it('skip evaluates condition and routes', () => {
      const engine = makeMockEngine()
      engine.state.globalFlags = { flag: true }
      engine.traversal!.getConditionTargets = vi.fn().mockReturnValue({ trueTarget: 'yes', falseTarget: 'no' })
      const renderer = new ConditionRenderer(engine as any)
      renderer.skip({ id: 'c1', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'c1', expression: 'flag' } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })
  })

  describe('RandomRenderer', () => {
    it('skip picks weighted branch', () => {
      const engine = makeMockEngine()
      engine.traversal!.getRandomBranches = vi.fn().mockReturnValue([
        { id: 'b1', targetNodeId: 'a', weight: 1, scene: '' }
      ])
      const renderer = new RandomRenderer(engine as any)
      renderer.skip({ id: 'r1', type: 'random', position: { x: 0, y: 0 }, data: { id: 'r1', branches: [] } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })
  })

  describe('ChoiceRenderer', () => {
    it('skip picks first option', () => {
      const engine = makeMockEngine()
      engine.traversal!.getChoiceTargets = vi.fn().mockReturnValue([
        { target: 'a', label: 'A' },
        { target: 'b', label: 'B' }
      ])
      const renderer = new ChoiceRenderer(engine as any)
      renderer.skip({ id: 'c1', type: 'choice', position: { x: 0, y: 0 }, data: { id: 'c1', title: '', options: [] } } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })
  })

  // skip() 全覆盖 — 所有渲染器继承 BaseRenderer.skip
  const skipTestCases: Array<{ name: string; Renderer: new (e: any) => BaseNodeRenderer }> = [
    { name: 'CgRenderer', Renderer: CgRenderer },
    { name: 'EndRenderer', Renderer: EndRenderer as any },
    { name: 'Live2DRenderer', Renderer: Live2DRenderer },
    { name: 'ParticleRenderer', Renderer: ParticleRenderer },
    { name: 'MoveCharacterRenderer', Renderer: MoveCharacterRenderer },
    { name: 'SteamAchievementRenderer', Renderer: SteamAchievementRenderer },
  ]

  for (const { name, Renderer } of skipTestCases) {
    it(`${name} — skip to next`, () => {
      const engine = makeMockEngine()
      const renderer = new Renderer(engine as any)
      renderer.skip({ id: 'n1', type: 'dialog' as any, position: { x: 0, y: 0 }, data: {} } as FlowNode)
      expect(engine.renderNode).toHaveBeenCalled()
    })
  }
})
