import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as PIXI from 'pixi.js'
import type { FlowNode } from '../renderer/src/types/index'

// ══════════════════════════════════════════════════════════
// Rich engine mock — supports all renderer APIs
// ══════════════════════════════════════════════════════════
function makeEngine() {
  const state = {
    variables: {} as Record<string, unknown>,
    globalFlags: {} as Record<string, boolean>,
    achievements: [] as any[],
    flagAliases: {} as Record<string, string>,
    evaluateExpression: vi.fn((expr: string) => {
      if (expr === 'true') return true
      if (expr === 'false') return false
      const parts = expr.split(/\s*&&\s*|\s*\|\|\s*/)
      for (const p of parts) {
        const trimmed = p.trim()
        if (trimmed in state.globalFlags) return state.globalFlags[trimmed]
        if (trimmed in state.variables) return !!state.variables[trimmed]
        if (trimmed === 'true') return true
        if (trimmed === 'false') return false
      }
      return false
    }),
  }

  return {
    app: { screen: { width: 1280, height: 720 }, ticker: { add: vi.fn(), remove: vi.fn() } },
    state,
    transLayer: new PIXI.Container(),
    dialogLayer: new PIXI.Container(),
    choiceLayer: new PIXI.Container(),
    projectData: { meta: { projectPath: '/test' } },
    traversal: {
      getNext: vi.fn().mockReturnValue('next_node'),
      getChoiceTargets: vi.fn().mockReturnValue([]),
      getConditionTargets: vi.fn().mockReturnValue({ trueTarget: null, falseTarget: null }),
      getRandomBranches: vi.fn().mockReturnValue([]),
      isAutoAdvancing: vi.fn().mockReturnValue(false),
      isInteractive: vi.fn().mockReturnValue(false),
    },
    audioManager: {
      playBgm: vi.fn(), playSe: vi.fn(),
      stopBgm: vi.fn(), stopAllSe: vi.fn(),
    },
    hideDialogBox: vi.fn(),
    showDialogBox: vi.fn(),
    renderNode: vi.fn().mockResolvedValue(undefined),
    emitDebug: vi.fn(),
    endCallback: null as any,
    debugCallback: null as any,
    achievementCallback: null as any,
    getDebugInfo: vi.fn().mockReturnValue({}),
    showAchievementToast: vi.fn().mockResolvedValue(undefined),
    loadTexture: vi.fn().mockResolvedValue(null),
    showChapterTitle: vi.fn().mockResolvedValue(undefined),
    startSceneParticles: vi.fn(),
    stopSceneParticles: vi.fn(),
    evaluateExpression: vi.fn((expr: string) => {
      const s = state
      if (expr === 'true') return true
      if (expr === 'false') return false
      if (expr in s.globalFlags) return s.globalFlags[expr]
      if (expr in s.variables) return !!s.variables[expr]
      return false
    }),
  }
}

// ══════════════════════════════════════════════════════════
// All renderers (real PIXI, no vi.mock)
// ══════════════════════════════════════════════════════════
import { AchievementRenderer } from '../renderer/src/preview/renderers/AchievementRenderer'
import { SavePointRenderer } from '../renderer/src/preview/renderers/SavePointRenderer'
import { AudioRenderer } from '../renderer/src/preview/renderers/AudioRenderer'
import { GotoRenderer } from '../renderer/src/preview/renderers/GotoRenderer'
import { LabelRenderer } from '../renderer/src/preview/renderers/LabelRenderer'
import { WaitRenderer } from '../renderer/src/preview/renderers/WaitRenderer'
import { TimerRenderer } from '../renderer/src/preview/renderers/TimerRenderer'
import { ItemRenderer } from '../renderer/src/preview/renderers/ItemRenderer'
import { CgRenderer } from '../renderer/src/preview/renderers/CgRenderer'
import { ConditionRenderer } from '../renderer/src/preview/renderers/ConditionRenderer'
import { RandomRenderer } from '../renderer/src/preview/renderers/RandomRenderer'
import { MoveCharacterRenderer } from '../renderer/src/preview/renderers/MoveCharacterRenderer'
import { SteamAchievementRenderer } from '../renderer/src/preview/renderers/SteamAchievementRenderer'
import { ParticleRenderer } from '../renderer/src/preview/renderers/ParticleRenderer'
import { Live2DRenderer } from '../renderer/src/preview/renderers/Live2DRenderer'

describe('AchievementRenderer', () => {
  let engine: ReturnType<typeof makeEngine>

  beforeEach(() => {
    engine = makeEngine()
    engine.state.achievements = [
      { id: 'ach1', name: '初来乍到', icon: '🏆', unlocked: false },
      { id: 'ach2', name: '已解锁', icon: '🎉', unlocked: true },
    ]
  })

  it('unlocks achievement and shows toast', async () => {
    const r = new AchievementRenderer(engine as any)
    await r.render({ id: 'n1', type: 'achievement', position: { x: 0, y: 0 }, data: { id: 'n1', achievementId: 'ach1' } } as FlowNode)
    expect(engine.state.achievements[0].unlocked).toBe(true)
    expect(engine.state.achievements[0].unlockedAt).toBeTruthy()
    expect(engine.showAchievementToast).toHaveBeenCalledWith('初来乍到', '🏆')
  })

  it('already unlocked achievement — no action', async () => {
    const r = new AchievementRenderer(engine as any)
    await r.render({ id: 'n1', type: 'achievement', position: { x: 0, y: 0 }, data: { id: 'n1', achievementId: 'ach2' } } as FlowNode)
    expect(engine.showAchievementToast).not.toHaveBeenCalled()
  })

  it('missing achievementId — skips to next', async () => {
    const r = new AchievementRenderer(engine as any)
    await r.render({ id: 'n1', type: 'achievement', position: { x: 0, y: 0 }, data: { id: 'n1', achievementId: '' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })

  it('skips to next node', () => {
    const r = new AchievementRenderer(engine as any)
    r.skip({ id: 'n1', type: 'achievement', position: { x: 0, y: 0 }, data: { id: 'n1', achievementId: 'ach1' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('SavePointRenderer', () => {
  it('skip advances', () => {
    const engine = makeEngine()
    const r = new SavePointRenderer(engine as any)
    r.skip({ id: 'sp1', type: 'savePoint', position: { x: 0, y: 0 }, data: { id: 'sp1', slotLabel: 'x' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('LabelRenderer', () => {
  let engine: ReturnType<typeof makeEngine>
  beforeEach(() => { engine = makeEngine() })

  it('render chapter label with PIXI text', async () => {
    const r = new LabelRenderer(engine as any)
    await r.render({ id: 'l1', type: 'label', position: { x: 0, y: 0 }, data: { id: 'l1', label: '第一章', color: '#ff6600' } } as FlowNode)
  })

  it('skip advances', () => {
    const r = new LabelRenderer(engine as any)
    r.skip({ id: 'l1', type: 'label', position: { x: 0, y: 0 }, data: { id: 'l1', label: 'x', color: '#000' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('CgRenderer', () => {
  let engine: ReturnType<typeof makeEngine>
  beforeEach(() => { engine = makeEngine() })

  it('null app — early return', async () => {
    engine.app = null
    const r = new CgRenderer(engine as any)
    await expect(r.render({ id: 'cg1', type: 'cg', position: { x: 0, y: 0 }, data: { id: 'cg1', src: 'cg.png', transition: 'fade', duration: 800 } } as FlowNode)).resolves.not.toThrow()
  })

  it('skip advances', () => {
    const r = new CgRenderer(engine as any)
    r.skip({ id: 'cg1', type: 'cg', position: { x: 0, y: 0 }, data: { id: 'cg1', src: 'cg.png', transition: 'fade', duration: 800 } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('WaitRenderer', () => {
  it('skips to next after waiting', async () => {
    const engine = makeEngine()
    const r = new WaitRenderer(engine as any)
    await r.render({ id: 'w1', type: 'wait', position: { x: 0, y: 0 }, data: { id: 'w1', duration: 1 } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })

  it('no next id → endCallback', async () => {
    const engine = makeEngine()
    engine.traversal!.getNext = vi.fn().mockReturnValue(null)
    engine.endCallback = vi.fn()
    const r = new WaitRenderer(engine as any)
    await r.render({ id: 'w1', type: 'wait', position: { x: 0, y: 0 }, data: { id: 'w1', duration: 0 } } as FlowNode)
    expect(engine.endCallback).toHaveBeenCalled()
  })
})

describe('TimerRenderer', () => {
  it('skip advances', () => {
    const engine = makeEngine()
    const r = new TimerRenderer(engine as any)
    r.skip({ id: 't1', type: 'timer', position: { x: 0, y: 0 }, data: { id: 't1', mode: 'countdown', duration: 1000 } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('MoveCharacterRenderer', () => {
  it('skip advances', () => {
    const engine = makeEngine()
    const r = new MoveCharacterRenderer(engine as any)
    r.skip({ id: 'm1', type: 'moveCharacter', position: { x: 0, y: 0 }, data: { id: 'm1', target: 'c', fromPosition: 'left', toPosition: 'center', duration: 500, easing: 'ease' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('SteamAchievementRenderer', () => {
  it('skip advances', () => {
    const engine = makeEngine()
    const r = new SteamAchievementRenderer(engine as any)
    r.skip({ id: 's1', type: 'steamAchievement', position: { x: 0, y: 0 }, data: { id: 's1', achievementId: 'ACH_X' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('ParticleRenderer', () => {
  it('skip advances', () => {
    const engine = makeEngine()
    const r = new ParticleRenderer(engine as any)
    r.skip({ id: 'p1', type: 'particle', position: { x: 0, y: 0 }, data: { id: 'p1', preset: 'snow' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('Live2DRenderer', () => {
  it('skip advances', () => {
    const engine = makeEngine()
    const r = new Live2DRenderer(engine as any)
    r.skip({ id: 'l1', type: 'live2d', position: { x: 0, y: 0 }, data: { id: 'l1', model: 'm.moc3' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('AudioRenderer full', () => {
  it('play bgm', async () => {
    const engine = makeEngine()
    const r = new AudioRenderer(engine as any)
    await r.render({ id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', audioType: 'bgm', action: 'play', src: 'bgm.mp3', loop: true, volume: 0.8 } } as FlowNode)
    expect(engine.audioManager.playBgm).toHaveBeenCalled()
  })

  it('play se', async () => {
    const engine = makeEngine()
    const r = new AudioRenderer(engine as any)
    await r.render({ id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', audioType: 'se', action: 'play', src: 'sfx.wav', loop: false, volume: 1 } } as FlowNode)
    expect(engine.audioManager.playSe).toHaveBeenCalled()
  })

  it('stop se', async () => {
    const engine = makeEngine()
    const r = new AudioRenderer(engine as any)
    await r.render({ id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', audioType: 'se', action: 'stop', src: '', loop: false, volume: 1 } } as FlowNode)
    expect(engine.audioManager.stopAllSe).toHaveBeenCalled()
  })
})

describe('ItemRenderer full', () => {
  let engine: ReturnType<typeof makeEngine>
  beforeEach(() => { engine = makeEngine() })

  it('get — adds to inventory', async () => {
    engine.state.variables['背包'] = []
    const r = new ItemRenderer(engine as any)
    await r.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 }, data: { id: 'i1', action: 'get', itemName: '钥匙' } } as FlowNode)
    expect(engine.state.variables['背包']).toContain('钥匙')
  })

  it('use — removes from inventory', async () => {
    engine.state.variables['背包'] = ['钥匙', '地图']
    const r = new ItemRenderer(engine as any)
    await r.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 }, data: { id: 'i1', action: 'use', itemName: '钥匙', inventoryVar: '背包' } } as FlowNode)
    expect(engine.state.variables['背包']).not.toContain('钥匙')
    expect(engine.state.variables['背包']).toContain('地图')
  })

  it('lose — removes from inventory', async () => {
    engine.state.variables['背包'] = ['钥匙']
    const r = new ItemRenderer(engine as any)
    await r.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 }, data: { id: 'i1', action: 'lose', itemName: '钥匙', inventoryVar: '背包' } } as FlowNode)
    expect(engine.state.variables['背包']).toEqual([])
  })

  it('check — has item → true branch', async () => {
    engine.state.variables['背包'] = ['钥匙']
    const r = new ItemRenderer(engine as any)
    await r.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 }, data: { id: 'i1', action: 'check', itemName: '钥匙', inventoryVar: '背包', trueNextId: 'has', falseNextId: 'no' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalledWith('has')
  })

  it('check — no item → false branch', async () => {
    engine.state.variables['背包'] = []
    const r = new ItemRenderer(engine as any)
    await r.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 }, data: { id: 'i1', action: 'check', itemName: '钥匙', inventoryVar: '背包', trueNextId: 'has', falseNextId: 'no' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalledWith('no')
  })

  it('no itemName → skip', async () => {
    const r = new ItemRenderer(engine as any)
    await r.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 }, data: { id: 'i1', action: 'get', itemName: '' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('ConditionRenderer full', () => {
  it('true expression → true branch', async () => {
    const engine = makeEngine()
    engine.evaluateExpression = vi.fn().mockReturnValue(true)
    const r = new ConditionRenderer(engine as any)
    await r.render({ id: 'c1', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'c1', expression: 'x >= 1', trueNextId: 'good', falseNextId: 'bad' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalledWith('good')
  })

  it('false expression → false branch', async () => {
    const engine = makeEngine()
    engine.evaluateExpression = vi.fn().mockReturnValue(false)
    const r = new ConditionRenderer(engine as any)
    await r.render({ id: 'c1', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'c1', expression: 'x < 0', trueNextId: 'good', falseNextId: 'bad' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalledWith('bad')
  })
})

describe('RandomRenderer full', () => {
  it('weighted pick — calls renderNode', async () => {
    const engine = makeEngine()
    const r = new RandomRenderer(engine as any)
    await r.render({ id: 'r1', type: 'random', position: { x: 0, y: 0 }, data: { id: 'r1', branches: [{ id: 'b1', targetNodeId: 'a', weight: 100 }] } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalledWith('a')
  })

  it('empty branches — endCallback', async () => {
    const engine = makeEngine()
    engine.endCallback = vi.fn()
    const r = new RandomRenderer(engine as any)
    await r.render({ id: 'r1', type: 'random', position: { x: 0, y: 0 }, data: { id: 'r1', branches: [] } } as FlowNode)
    expect(engine.endCallback).toHaveBeenCalled()
  })
})

describe('GotoRenderer full', () => {
  it('target found → jumps', async () => {
    const engine = makeEngine()
    const r = new GotoRenderer(engine as any)
    await r.render({ id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', targetNodeId: 'target' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalledWith('target')
  })

  it('target empty → endCallback', async () => {
    const engine = makeEngine()
    engine.endCallback = vi.fn()
    const r = new GotoRenderer(engine as any)
    await r.render({ id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', targetNodeId: '' } } as FlowNode)
    expect(engine.endCallback).toHaveBeenCalled()
  })
})
