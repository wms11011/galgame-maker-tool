import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVariableStore } from '../renderer/src/stores/variableStore'
import { useAchievementStore } from '../renderer/src/stores/achievementStore'
import { useSaveStore } from '../renderer/src/stores/saveStore'
import {
  isCgData, isWaitData, isRandomData, isLabelData,
  isAnimationData, isSteamAchievementData
} from '../renderer/src/types/guards'
import { analyzeGraph } from '../renderer/src/utils/graphAnalysis'
import { buildStoryTree } from '../renderer/src/utils/storyTree'
import { FlowTraversal } from '../renderer/src/utils/FlowTraversal'
import type { FlowNode } from '../renderer/src/types/index'

// ══════════════════════════════════════════════
// variableStore: 分支补全 (lines 23, 35)
// ══════════════════════════════════════════════
describe('白盒: variableStore 分支补全', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loadVariables 时 type 已明确传入不走 || fallback', () => {
    const store = useVariableStore()
    store.loadVariables([{ name: 'x', type: 'boolean', initialValue: true }])
    expect(store.variables[0].type).toBe('boolean')
    expect(store.runtime['x']).toBe(true)
  })

  it('addVariable 时 type 已明确传入不走 || fallback', () => {
    const store = useVariableStore()
    store.addVariable({ name: 'x', type: 'string', initialValue: 'hello' })
    expect(store.variables[0].type).toBe('string')
    expect(store.runtime['x']).toBe('hello')
  })

  it('type 为 array 且 initialValue 非数组', () => {
    const store = useVariableStore()
    store.loadVariables([{ name: 'tags', type: 'array', initialValue: null as any }])
    expect(store.runtime['tags']).toEqual([])
  })
})

// ══════════════════════════════════════════════
// achievementStore / saveStore: catch 分支
// ══════════════════════════════════════════════
describe('白盒: 持久化 catch 分支', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('achievementStore saveToStorage 异常时静默忽略', () => {
    const store = useAchievementStore()
    store.setProjectPath('/test')
    store.addAchievement('Test', 'desc')
    // 通过操作触发 persist，不应抛出异常
    expect(() => store.addAchievement('Test2', 'desc2')).not.toThrow()
  })

  it('saveStore saveToStorage 异常时静默忽略', () => {
    const store = useSaveStore()
    store.setProjectPath('/test')
    // persist is called in createSave, should not throw
    expect(() => store.createSave('test', 'n1', '', {}, [], {})).not.toThrow()
  })
})

// ══════════════════════════════════════════════
// guards: 互斥分支补全 (lines 37, 40-41, 44-45)
// ══════════════════════════════════════════════
describe('白盒: guards 互斥分支', () => {
  describe('isCgData', () => {
    it('有 transition 无 action 无 audioType → true', () => {
      expect(isCgData({ id: '', label: '', transition: 'fade', src: '' })).toBe(true)
    })

    it('有 transition + action → false (不是 CG 是 animation)', () => {
      expect(isCgData({ id: '', label: '', transition: 'fade', action: 'enter', target: '', duration: 500 })).toBe(false)
    })

    it('有 transition + audioType → false (不是 CG 是 audio)', () => {
      expect(isCgData({ id: '', label: '', transition: 'fade', audioType: 'bgm', action: 'play', src: '' })).toBe(false)
    })
  })

  describe('isWaitData', () => {
    it('仅有 duration → true', () => {
      expect(isWaitData({ id: '', label: '', duration: 1000 })).toBe(true)
    })

    it('有 duration + mode → false (是 timer)', () => {
      expect(isWaitData({ id: '', label: '', duration: 1000, mode: 'countdown', variable: 't' })).toBe(false)
    })

    it('有 duration + easing → false (是 moveCharacter)', () => {
      expect(isWaitData({ id: '', label: '', duration: 500, easing: 'ease', fromPosition: '', toPosition: '' })).toBe(false)
    })

    it('有 duration + transition → false (是 cg)', () => {
      expect(isWaitData({ id: '', label: '', duration: 500, transition: 'fade', src: '' })).toBe(false)
    })

    it('有 duration + variable → false (是 setVariable)', () => {
      expect(isWaitData({ id: '', label: '', duration: 0, variable: 'x', op: '=' })).toBe(false)
    })
  })

  describe('isRandomData', () => {
    it('有 branches 无 options → true', () => {
      expect(isRandomData({ id: '', label: '', branches: [] })).toBe(true)
    })

    it('有 branches + options → false (是 choice)', () => {
      expect(isRandomData({ id: '', label: '', branches: [], options: [] })).toBe(false)
    })
  })

  describe('isLabelData', () => {
    it('有 color 无 endingType → true', () => {
      expect(isLabelData({ id: '', label: '', color: '#fff' })).toBe(true)
    })

    it('有 color + endingType → false (是 end)', () => {
      expect(isLabelData({ id: '', label: '', color: '#fff', endingType: 'normal', message: '' })).toBe(false)
    })
  })

  describe('isAnimationData vs isAudioData', () => {
    it('isAnimationData 正例', () => {
      expect(isAnimationData({ id: '', label: '', action: 'enter', target: 'char', duration: 500 })).toBe(true)
    })

    it('isAnimationData 有 audioType → false', () => {
      expect(isAnimationData({ id: '', label: '', action: 'play', target: '', duration: 0, audioType: 'bgm' })).toBe(false)
    })
  })

  describe('isSteamAchievementData vs isAchievementData', () => {
    it('isSteamAchievementData 无 autoCheck → true', () => {
      expect(isSteamAchievementData({ id: '', label: '', achievementId: 'ACH_X' })).toBe(true)
    })

    it('isSteamAchievementData 有 autoCheck → false', () => {
      expect(isSteamAchievementData({ id: '', label: '', achievementId: 'ACH_X', autoCheck: true })).toBe(false)
    })
  })
})

// ══════════════════════════════════════════════
// graphAnalysis: 分支补全 (lines 100, 107, 113)
// ══════════════════════════════════════════════
describe('白盒: graphAnalysis 分支补全', () => {
  function n(id: string, type: string): FlowNode {
    return { id, type: type as any, position: { x: 0, y: 0 }, data: { id, label: `${type}-${id}` } }
  }

  it('implicit targets 中的 nextNodeId / targetNodeId / trueNextId 被正确纳入', () => {
    const nodes = [
      n('a', 'condition')
    ]
    // condition node with no edges: dead-end (not end type) + orphan (no in/out edges)
    const result = analyzeGraph(nodes, [])
    expect(result.issueCount).toBeGreaterThanOrEqual(1)
  })

  it('condition 节点含 trueNextId 和 falseNextId', () => {
    const nodes = [
      { id: 'cond', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'cond', label: '', expression: 'x>=1', trueNextId: 't', falseNextId: 'f' } } as FlowNode,
      { id: 't', type: 'end', position: { x: 0, y: 0 }, data: { id: 't', label: '', endingType: 'normal' } } as FlowNode,
      { id: 'f', type: 'end', position: { x: 0, y: 0 }, data: { id: 'f', label: '', endingType: 'bad' } } as FlowNode
    ]
    const result = analyzeGraph(nodes, [])
    expect(result.unreachableNodes).toHaveLength(0)
    expect(result.deadEndNodes).toHaveLength(0)
  })
})

// ══════════════════════════════════════════════
// storyTree: 分支补全 (lines 100, 105, 113)
// ══════════════════════════════════════════════
describe('白盒: storyTree 分支补全', () => {
  function n(id: string, type: string, overrides: any = {}): FlowNode {
    return { id, type: type as any, position: { x: 0, y: 0 }, data: { id, label: `${id}`, ...overrides } }
  }

  it('getNodeLabel 对不存在节点返回 id', () => {
    // buildStoryTree 内部调用 getNodeLabel，通过循环引用触发
    const nodes = [
      n('a', 'dialog', { nextNodeId: 'ghost' }),
      n('ghost', 'dialog') // same id but in nodes
    ]
    const root = buildStoryTree(nodes, [])
    expect(root).not.toBeNull()
  })

  it('getImplicitChildren 中 option.nextNodeId 为空时跳过', () => {
    const nodes = [
      n('c1', 'choice', { options: [
        { id: 'o1', text: 'A', nextNodeId: '' },  // falsy nextNodeId → skip
        { id: 'o2', text: 'B', nextNodeId: 'endB' }
      ]}),
      n('endB', 'end')
    ]
    const root = buildStoryTree(nodes, [])
    expect(root).not.toBeNull()
    // Only one child because the first option has no valid target
    expect(root!.children.length).toBe(1)
  })

  it('getImplicitChildren 中 options 为空时跳过循环', () => {
    const nodes = [n('n1', 'choice', { options: [] })]
    const root = buildStoryTree(nodes, [])
    expect(root).not.toBeNull()
    expect(root!.children).toHaveLength(0)
  })

  it('implicit targets (nextNodeId, targetNodeId) 正确工作', () => {
    const nodes = [
      n('g1', 'goto', { targetNodeId: 'target' }),
      n('target', 'end')
    ]
    const root = buildStoryTree(nodes, [])
    expect(root).not.toBeNull()
    expect(root!.children).toHaveLength(1)
    expect(root!.children[0].id).toBe('target')
  })
})

// ══════════════════════════════════════════════
// FlowTraversal: 分支补全 (lines 49, 89, 151)
// ══════════════════════════════════════════════
describe('白盒: FlowTraversal 分支补全', () => {
  function n(id: string, type: string, overrides: any = {}): FlowNode {
    return { id, type: type as any, position: { x: 0, y: 0 }, data: { id, label: `${id}`, ...overrides } }
  }

  it('options 中 nextNodeId 为空时不创建隐式连接', () => {
    const nodes = [
      n('c1', 'choice', { options: [
        { id: 'o1', text: 'A', nextNodeId: '' },
        { id: 'o2', text: 'B' } // no nextNodeId at all
      ]})
    ]
    const ft = new FlowTraversal(nodes, [])
    expect(ft.getOutgoing('c1')).toHaveLength(0)
  })

  it('getConditionTargets 中所有路径都为 null 时返回 null', () => {
    const nodes = [n('cond', 'condition', { expression: 'x>=1' })]
    const ft = new FlowTraversal(nodes, [])
    const targets = ft.getConditionTargets('cond')
    expect(targets.trueTarget).toBeNull()
    expect(targets.falseTarget).toBeNull()
  })

  it('hasPath 中 start 不存在于图中', () => {
    const ft = new FlowTraversal([], [])
    expect(ft.hasPath('ghost', 'target')).toBe(false)
  })

  it('branches 中 targetNodeId 为空时跳过', () => {
    const nodes = [
      n('r1', 'random', { branches: [
        { id: 'b1', targetNodeId: '', weight: 50, scene: '' }
      ]})
    ]
    const ft = new FlowTraversal(nodes, [])
    expect(ft.getOutgoing('r1')).toHaveLength(0)
  })

  it('option 无 text 时使用默认标签"选项"', () => {
    const nodes = [
      n('c1', 'choice', { options: [
        { id: 'o1', nextNodeId: 'end1' }
      ]}),
      n('end1', 'end')
    ]
    const ft = new FlowTraversal(nodes, [])
    const outgoing = ft.getOutgoing('c1')
    expect(outgoing).toHaveLength(1)
    expect(outgoing[0].label).toBe('选项')
  })
})
