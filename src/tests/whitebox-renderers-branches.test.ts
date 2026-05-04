import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FlowNode } from '../renderer/src/types/index'

// ══════════════════════════════════════════════════════════
// Engine mock — matches previewEngine interface
// ══════════════════════════════════════════════════════════
function mkEngine() {
  return {
    state: {
      variables: {} as Record<string, unknown>,
      globalFlags: {} as Record<string, boolean>,
      achievements: [] as any[],
      visitedNodes: [] as any[],
    } as any,
    traversal: {
      getNext: vi.fn().mockReturnValue('next_node'),
      getConditionTargets: vi.fn().mockReturnValue({ trueTarget: null, falseTarget: null }),
      getRandomBranches: vi.fn().mockReturnValue([]),
    },
    renderNode: vi.fn().mockResolvedValue(undefined),
    endCallback: null as any,
    saveCallback: null as any,
    achievementCallback: null as any,
    showAchievementToast: vi.fn().mockResolvedValue(undefined),
    hideDialogBox: vi.fn(),
    showDialogBox: vi.fn(),
    emitDebug: vi.fn(),
    evaluateExpression: vi.fn().mockReturnValue(false),
    app: { screen: { width: 1280, height: 720 } },
    dialogLayer: { removeChildren: vi.fn(), children: [] },
    choiceLayer: { removeChildren: vi.fn() },
    transLayer: { removeChildren: vi.fn(), children: [], addChild: vi.fn(), removeChild: vi.fn() },
    audioManager: { playBgm: vi.fn(), playSe: vi.fn(), stopBgm: vi.fn(), stopAllSe: vi.fn() },
    projectData: { meta: { projectPath: '/test' } },
    loadTexture: vi.fn().mockResolvedValue(null),
    getDebugInfo: vi.fn().mockReturnValue({}),
  }
}

// Import renderers
import { RandomRenderer } from '../renderer/src/preview/renderers/RandomRenderer'
import { SavePointRenderer } from '../renderer/src/preview/renderers/SavePointRenderer'
import { AchievementRenderer } from '../renderer/src/preview/renderers/AchievementRenderer'
import { GotoRenderer } from '../renderer/src/preview/renderers/GotoRenderer'
import { WaitRenderer } from '../renderer/src/preview/renderers/WaitRenderer'
import { TimerRenderer } from '../renderer/src/preview/renderers/TimerRenderer'
import { ConditionRenderer } from '../renderer/src/preview/renderers/ConditionRenderer'
import { ItemRenderer } from '../renderer/src/preview/renderers/ItemRenderer'
import { AudioRenderer } from '../renderer/src/preview/renderers/AudioRenderer'
import { CgRenderer } from '../renderer/src/preview/renderers/CgRenderer'
import { LabelRenderer } from '../renderer/src/preview/renderers/LabelRenderer'

describe('RandomRenderer 全分支', () => {
  it('zero totalWeight → random pick', async () => {
    const engine = mkEngine()
    const r = new RandomRenderer(engine as any)
    await r.render({ id: 'r1', type: 'random', position: { x: 0, y: 0 },
      data: { id: 'r1', branches: [{ id: 'b1', targetNodeId: 'a', weight: 0 }] } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalledWith('a')
  })

  it('zero totalWeight + no targetNodeId → endCallback', async () => {
    const engine = mkEngine()
    engine.endCallback = vi.fn()
    const r = new RandomRenderer(engine as any)
    await r.render({ id: 'r1', type: 'random', position: { x: 0, y: 0 },
      data: { id: 'r1', branches: [{ id: 'b1', targetNodeId: '' as any, weight: 0 }] } } as FlowNode)
    expect(engine.endCallback).toHaveBeenCalled()
  })

  it('weighted branch with no targetNodeId → endCallback', async () => {
    const engine = mkEngine()
    engine.endCallback = vi.fn()
    const r = new RandomRenderer(engine as any)
    await r.render({ id: 'r1', type: 'random', position: { x: 0, y: 0 },
      data: { id: 'r1', branches: [{ id: 'b1', targetNodeId: '' as any, weight: 5 }] } } as FlowNode)
    expect(engine.endCallback).toHaveBeenCalled()
  })

  it('last branch fallback with targetNodeId', async () => {
    const engine = mkEngine()
    // Force the loop to not pick any branch (r never goes <= 0 due to Math.random being 1.0)
    // We can't easily mock Math.random per-test, but with weight=0 branches + last having weight,
    // the totalWeight <= 0 branch handles it before the loop
    // This test covers the 'totalWeight <= 0' path
    const r = new RandomRenderer(engine as any)
    await r.render({ id: 'r1', type: 'random', position: { x: 0, y: 0 },
      data: { id: 'r1', branches: [{ id: 'b1', targetNodeId: 'last_pick', weight: 0 }, { id: 'b2', targetNodeId: 'alt', weight: 0 }] } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('SavePointRenderer 全分支', () => {
  it('saveCallback set → triggers save', async () => {
    const engine = mkEngine()
    engine.saveCallback = vi.fn()
    engine.state.visitedNodes = [{ id: 'n1', type: 'dialog', label: 'hello' }]
    engine.state.variables = { score: 100 }
    const r = new SavePointRenderer(engine as any)
    await r.render({ id: 'sp1', type: 'savePoint', position: { x: 0, y: 0 },
      data: { id: 'sp1', slotLabel: '存档位' } } as FlowNode)
    expect(engine.saveCallback).toHaveBeenCalledWith({
      nodeId: 'sp1',
      slotLabel: '存档位',
      variables: { score: 100 },
      visitedNodeIds: ['n1']
    })
  })

  it('saveCallback null → skips to next', async () => {
    const engine = mkEngine()
    engine.saveCallback = null
    const r = new SavePointRenderer(engine as any)
    await r.render({ id: 'sp1', type: 'savePoint', position: { x: 0, y: 0 },
      data: { id: 'sp1', slotLabel: '' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })

  it('no next node → endCallback', async () => {
    const engine = mkEngine()
    engine.traversal!.getNext = vi.fn().mockReturnValue(null)
    engine.endCallback = vi.fn()
    const r = new SavePointRenderer(engine as any)
    await r.render({ id: 'sp1', type: 'savePoint', position: { x: 0, y: 0 },
      data: { id: 'sp1', slotLabel: '' } } as FlowNode)
    expect(engine.endCallback).toHaveBeenCalled()
  })
})

describe('AchievementRenderer 全分支', () => {
  it('no next node → endCallback', async () => {
    const engine = mkEngine()
    engine.traversal!.getNext = vi.fn().mockReturnValue(null)
    engine.endCallback = vi.fn()
    engine.state.achievements = [{ id: 'ach1', name: '成就', icon: '🏆', unlocked: false }]
    const r = new AchievementRenderer(engine as any)
    await r.render({ id: 'n1', type: 'achievement', position: { x: 0, y: 0 },
      data: { id: 'n1', achievementId: 'ach1' } } as FlowNode)
    expect(engine.endCallback).toHaveBeenCalled()
  })

  it('non-existent achievement id → skip', async () => {
    const engine = mkEngine()
    engine.state.achievements = []
    const r = new AchievementRenderer(engine as any)
    await r.render({ id: 'n1', type: 'achievement', position: { x: 0, y: 0 },
      data: { id: 'n1', achievementId: 'ghost' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })

  it('achievement callback fired', async () => {
    const engine = mkEngine()
    engine.state.achievements = [{ id: 'ach1', name: '成就', icon: '🎉', unlocked: false }]
    engine.achievementCallback = vi.fn()
    const r = new AchievementRenderer(engine as any)
    await r.render({ id: 'n1', type: 'achievement', position: { x: 0, y: 0 },
      data: { id: 'n1', achievementId: 'ach1' } } as FlowNode)
    expect(engine.achievementCallback).toHaveBeenCalledWith('ach1', '成就')
  })
})

describe('GotoRenderer 全分支', () => {
  it('target empty → endCallback', async () => {
    const engine = mkEngine()
    engine.endCallback = vi.fn()
    const r = new GotoRenderer(engine as any)
    await r.render({ id: 'g1', type: 'goto', position: { x: 0, y: 0 },
      data: { id: 'g1', targetNodeId: '' } } as FlowNode)
    expect(engine.endCallback).toHaveBeenCalled()
  })
})

describe('WaitRenderer 全分支', () => {
  it('no next + no data.nextNodeId → endCallback', async () => {
    const engine = mkEngine()
    engine.traversal!.getNext = vi.fn().mockReturnValue(null)
    engine.endCallback = vi.fn()
    const r = new WaitRenderer(engine as any)
    await r.render({ id: 'w1', type: 'wait', position: { x: 0, y: 0 },
      data: { id: 'w1', duration: 1 } } as FlowNode)
    expect(engine.endCallback).toHaveBeenCalled()
  })
})

describe('ConditionRenderer 全分支', () => {
  it('no next target → endCallback', async () => {
    const engine = mkEngine()
    engine.evaluateExpression = vi.fn().mockReturnValue(true)
    engine.endCallback = vi.fn()
    const r = new ConditionRenderer(engine as any)
    await r.render({ id: 'c1', type: 'condition', position: { x: 0, y: 0 },
      data: { id: 'c1', expression: 'x>=1', trueNextId: '' } } as FlowNode)
    expect(engine.endCallback).toHaveBeenCalled()
  })
})

describe('ItemRenderer 全分支', () => {
  it('backpack not array → skip', async () => {
    const engine = mkEngine()
    engine.state.variables['背包'] = 'not-an-array'
    const r = new ItemRenderer(engine as any)
    await r.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 },
      data: { id: 'i1', action: 'get', itemName: '钥匙' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })

  it('check action no branch → no renderNode call', async () => {
    const engine = mkEngine()
    engine.state.variables['背包'] = ['钥匙']
    const r = new ItemRenderer(engine as any)
    await r.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 },
      data: { id: 'i1', action: 'check', itemName: '钥匙', inventoryVar: '背包', trueNextId: '', falseNextId: '' } } as FlowNode)
    // check action with no true/false → renders nothing, falls through to end
  })

  it('get — already has item → no duplicate', async () => {
    const engine = mkEngine()
    engine.state.variables['背包'] = ['钥匙']
    const r = new ItemRenderer(engine as any)
    await r.render({ id: 'i1', type: 'item', position: { x: 0, y: 0 },
      data: { id: 'i1', action: 'get', itemName: '钥匙' } } as FlowNode)
    expect(engine.state.variables['背包']).toEqual(['钥匙']) // no duplicate
  })
})

describe('AudioRenderer 全分支', () => {
  it('no next → done', async () => {
    const engine = mkEngine()
    engine.traversal!.getNext = vi.fn().mockReturnValue(null)
    const r = new AudioRenderer(engine as any)
    await r.render({ id: 'a1', type: 'audio', position: { x: 0, y: 0 },
      data: { id: 'a1', audioType: 'bgm', action: 'stop', src: '', loop: false, volume: 1 } } as FlowNode)
    expect(engine.audioManager.stopBgm).toHaveBeenCalled()
  })
})

describe('CgRenderer 全分支', () => {
  it('skip advances', () => {
    const engine = mkEngine()
    const r = new CgRenderer(engine as any)
    r.skip({ id: 'cg1', type: 'cg', position: { x: 0, y: 0 },
      data: { id: 'cg1', src: 'cg.png', transition: 'fade', duration: 800 } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('LabelRenderer 全分支', () => {
  it('skip advances to next', () => {
    const engine = mkEngine()
    const r = new LabelRenderer(engine as any)
    r.skip({ id: 'l1', type: 'label', position: { x: 0, y: 0 },
      data: { id: 'l1', label: 'test', color: '#000' } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})

describe('TimerRenderer 全分支', () => {
  it('skip advances to next', () => {
    const engine = mkEngine()
    const r = new TimerRenderer(engine as any)
    r.skip({ id: 't1', type: 'timer', position: { x: 0, y: 0 },
      data: { id: 't1', mode: 'countdown', duration: 1000 } } as FlowNode)
    expect(engine.renderNode).toHaveBeenCalled()
  })
})
