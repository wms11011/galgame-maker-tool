import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ConditionRenderer } from '../../renderer/src/preview/renderers/ConditionRenderer'
import { GotoRenderer } from '../../renderer/src/preview/renderers/GotoRenderer'
import { SetVariableRenderer } from '../../renderer/src/preview/renderers/SetVariableRenderer'
import { LabelRenderer } from '../../renderer/src/preview/renderers/LabelRenderer'
import { SavePointRenderer } from '../../renderer/src/preview/renderers/SavePointRenderer'
import { WaitRenderer } from '../../renderer/src/preview/renderers/WaitRenderer'
import { RandomRenderer } from '../../renderer/src/preview/renderers/RandomRenderer'

function makeMockEngine(overrides: any = {}) {
  return {
    app: {},
    projectData: { meta: { projectPath: '/test' }, flow: { nodes: [], edges: [] }, groups: [] },
    state: {
      variables: {} as Record<string, any>,
      globalFlags: {} as Record<string, boolean>,
      achievements: [] as any[],
      visitedNodes: [] as any[],
      variableHistory: [] as any[],
      stepCount: 0,
      enteredGroups: new Set<string>()
    },
    traversal: {
      getNext: vi.fn().mockReturnValue(null),
      getOutgoing: vi.fn().mockReturnValue([]),
      getChoiceTargets: vi.fn().mockReturnValue([]),
      getConditionTargets: vi.fn().mockReturnValue({ trueTarget: null, falseTarget: null }),
      getRandomBranches: vi.fn().mockReturnValue([])
    },
    anim: {},
    renderNode: vi.fn(),
    endCallback: null as (() => void) | null,
    choiceCallback: null as any,
    saveCallback: null as any,
    emitDebug: vi.fn(),
    evaluateExpression: vi.fn().mockReturnValue(true),
    showChapterTitleCard: vi.fn(),
    startSceneParticles: vi.fn(),
    stopSceneParticles: vi.fn(),
    hideDialogBox: vi.fn(),
    choiceLayer: { removeChildren: vi.fn() },
    transLayer: { removeChildren: vi.fn() },
    dialogLayer: { children: [] },
    audioManager: null as any,
    getGroupDefaultBg: vi.fn().mockReturnValue(undefined),
    ...overrides
  } as any
}

function makeNode(type: string, data: any): any {
  return { id: `node_${type}`, type, data: { label: `${type} node`, ...data } }
}

describe('控制流渲染器', () => {
  describe('ConditionRenderer', () => {
    it('条件为真时跳转到 trueNextId', async () => {
      const e = makeMockEngine()
      e.evaluateExpression.mockReturnValue(true)
      const renderer = new ConditionRenderer(e)
      const node = makeNode('condition', { expression: 'x > 0', trueNextId: 'trueNode', falseNextId: 'falseNode' })
      await renderer.render(node)
      expect(e.renderNode).toHaveBeenCalledWith('trueNode')
    })

    it('条件为假时跳转到 falseNextId', async () => {
      const e = makeMockEngine()
      e.evaluateExpression.mockReturnValue(false)
      const renderer = new ConditionRenderer(e)
      const node = makeNode('condition', { expression: 'x > 0', trueNextId: 'trueNode', falseNextId: 'falseNode' })
      await renderer.render(node)
      expect(e.renderNode).toHaveBeenCalledWith('falseNode')
    })

    it('无下一节点时调用 endCallback', async () => {
      const e = makeMockEngine()
      e.evaluateExpression.mockReturnValue(true)
      const endCb = vi.fn()
      e.endCallback = endCb
      const renderer = new ConditionRenderer(e)
      const node = makeNode('condition', { expression: 'x > 0', trueNextId: '', falseNextId: '' })
      await renderer.render(node)
      expect(endCb).toHaveBeenCalled()
    })

    it('条件为假且无 falseNextId 时调用 endCallback', async () => {
      const e = makeMockEngine()
      e.evaluateExpression.mockReturnValue(false)
      const endCb = vi.fn()
      e.endCallback = endCb
      const renderer = new ConditionRenderer(e)
      const node = makeNode('condition', { expression: 'x > 0', trueNextId: 't', falseNextId: '' })
      await renderer.render(node)
      expect(endCb).toHaveBeenCalled()
    })
  })

  describe('GotoRenderer', () => {
    it('清除 UI 层并跳转到目标节点', async () => {
      const e = makeMockEngine()
      const renderer = new GotoRenderer(e)
      const node = makeNode('goto', { targetNodeId: 'target1' })
      await renderer.render(node)
      expect(e.hideDialogBox).toHaveBeenCalled()
      expect(e.choiceLayer.removeChildren).toHaveBeenCalled()
      expect(e.renderNode).toHaveBeenCalledWith('target1')
    })

    it('无目标节点时调用 endCallback', async () => {
      const e = makeMockEngine()
      const endCb = vi.fn()
      e.endCallback = endCb
      const renderer = new GotoRenderer(e)
      await renderer.render(makeNode('goto', { targetNodeId: '' }))
      expect(endCb).toHaveBeenCalled()
    })
  })

  describe('SetVariableRenderer', () => {
    it('变量赋值操作 (=)', async () => {
      const e = makeMockEngine()
      e.state.variables = { score: 0 }
      e.state.variableHistory = []
      const renderer = new SetVariableRenderer(e)
      const node = makeNode('setVariable', { variable: 'score', op: '=', value: '42' })
      await renderer.render(node)
      expect(e.state.variables['score']).toBe(42)
    })

    it('变量增加操作 (+=)', async () => {
      const e = makeMockEngine()
      e.state.variables = { score: 10 }
      const renderer = new SetVariableRenderer(e)
      const node = makeNode('setVariable', { variable: 'score', op: '+=', value: '5' })
      await renderer.render(node)
      expect(e.state.variables['score']).toBe(15)
    })

    it('数组 push 操作', async () => {
      const e = makeMockEngine()
      e.state.variables = { items: ['a', 'b'] }
      const renderer = new SetVariableRenderer(e)
      const node = makeNode('setVariable', { variable: 'items', op: 'push', value: 'c' })
      await renderer.render(node)
      expect(e.state.variables['items']).toEqual(['a', 'b', 'c'])
    })

    it('数组 pop 操作', async () => {
      const e = makeMockEngine()
      e.state.variables = { items: ['a', 'b', 'c'] }
      const renderer = new SetVariableRenderer(e)
      const node = makeNode('setVariable', { variable: 'items', op: 'pop', value: '' })
      await renderer.render(node)
      expect(e.state.variables['items']).toEqual(['a', 'b'])
    })

    it('数组 clear 操作', async () => {
      const e = makeMockEngine()
      e.state.variables = { items: ['a', 'b', 'c'] }
      const renderer = new SetVariableRenderer(e)
      const node = makeNode('setVariable', { variable: 'items', op: 'clear', value: '' })
      await renderer.render(node)
      expect(e.state.variables['items']).toEqual([])
    })

    it('字符串 += 拼接', async () => {
      const e = makeMockEngine()
      e.state.variables = { name: 'Hello' }
      const renderer = new SetVariableRenderer(e)
      const node = makeNode('setVariable', { variable: 'name', op: '+=', value: ' World' })
      await renderer.render(node)
      expect(e.state.variables['name']).toBe('Hello World')
    })

    it('bool 赋值', async () => {
      const e = makeMockEngine()
      e.state.variables = { flag: false }
      const renderer = new SetVariableRenderer(e)
      const node = makeNode('setVariable', { variable: 'flag', op: '=', value: 'true' })
      await renderer.render(node)
      expect(e.state.variables['flag']).toBe(true)
    })

    it('无变量名时直接穿透', async () => {
      const e = makeMockEngine()
      e.traversal.getNext.mockReturnValue('next1')
      const renderer = new SetVariableRenderer(e)
      await renderer.render(makeNode('setVariable', { variable: '', op: '=', value: '5' }))
      expect(e.renderNode).toHaveBeenCalledWith('next1')
    })

    it('数组默认操作转为逗号分割', async () => {
      const e = makeMockEngine()
      e.state.variables = { items: ['a'] }
      const renderer = new SetVariableRenderer(e)
      await renderer.render(makeNode('setVariable', { variable: 'items', op: '=', value: 'x,y,z' }))
      expect(e.state.variables['items']).toEqual(['x', 'y', 'z'])
    })

    it('boolean false 赋值', async () => {
      const e = makeMockEngine()
      e.state.variables = { flag: true }
      const renderer = new SetVariableRenderer(e)
      await renderer.render(makeNode('setVariable', { variable: 'flag', op: '=', value: '0' }))
      expect(e.state.variables['flag']).toBe(false)
    })
  })

  describe('LabelRenderer', () => {
    it('穿透到下一节点', async () => {
      const e = makeMockEngine()
      e.traversal.getNext.mockReturnValue('next1')
      const renderer = new LabelRenderer(e)
      await renderer.render(makeNode('label', {}))
      expect(e.renderNode).toHaveBeenCalledWith('next1')
    })

    it('无下一节点时调用 endCallback', async () => {
      const e = makeMockEngine()
      const endCb = vi.fn()
      e.endCallback = endCb
      e.traversal.getNext.mockReturnValue(null)
      const renderer = new LabelRenderer(e)
      await renderer.render(makeNode('label', {}))
      expect(endCb).toHaveBeenCalled()
    })

    it('有分组但无标题卡时穿透', async () => {
      const e = makeMockEngine()
      e.traversal.getNext.mockReturnValue('next1')
      e.projectData.groups = [{ id: 'g1', name: 'test', color: '#fff', nodeIds: ['node_label'], titleCard: false }]
      const renderer = new LabelRenderer(e)
      await renderer.render(makeNode('label', {}))
      expect(e.renderNode).toHaveBeenCalledWith('next1')
    })

    it('分组解锁条件不满足时跳到下一节点', async () => {
      const e = makeMockEngine()
      e.evaluateExpression.mockReturnValue(false)
      e.traversal.getNext.mockReturnValue('next1')
      e.projectData.groups = [{ id: 'g1', name: 'test', color: '#fff', nodeIds: ['node_label'], titleCard: true, unlockCondition: 'x>10' }]
      const renderer = new LabelRenderer(e)
      await renderer.render(makeNode('label', {}))
      expect(e.renderNode).toHaveBeenCalledWith('next1')
    })

    it('分组有标题卡时调用 showChapterTitleCard', async () => {
      const e = makeMockEngine()
      e.evaluateExpression.mockReturnValue(true)
      e.traversal.getNext.mockReturnValue('next1')
      e.projectData.groups = [{ id: 'g1', name: 'Ch1', color: '#8b5cf6', nodeIds: ['node_label'], titleCard: true }]
      const renderer = new LabelRenderer(e)
      await renderer.render(makeNode('label', {}))
      expect(e.showChapterTitleCard).toHaveBeenCalled()
      expect(e.renderNode).toHaveBeenCalledWith('next1')
    })
  })

  describe('SavePointRenderer', () => {
    it('触发 saveCallback 并穿透到下一节点', async () => {
      const e = makeMockEngine()
      const saveCb = vi.fn()
      e.saveCallback = saveCb
      e.state.variables = { x: 1 }
      e.state.visitedNodes = [{ id: 'n1' }, { id: 'n2' }]
      e.traversal.getNext.mockReturnValue('next1')
      const renderer = new SavePointRenderer(e)
      await renderer.render(makeNode('savePoint', { slotLabel: '存档1' }))
      expect(saveCb).toHaveBeenCalled()
      expect(saveCb.mock.calls[0][0].slotLabel).toBe('存档1')
      expect(saveCb.mock.calls[0][0].variables).toEqual({ x: 1 })
      expect(e.renderNode).toHaveBeenCalledWith('next1')
    })

    it('无 saveCallback 时穿透到下一节点', async () => {
      const e = makeMockEngine()
      e.traversal.getNext.mockReturnValue('next1')
      const renderer = new SavePointRenderer(e)
      await renderer.render(makeNode('savePoint', { slotLabel: '' }))
      expect(e.renderNode).toHaveBeenCalledWith('next1')
    })

    it('无下一节点时调用 endCallback', async () => {
      const e = makeMockEngine()
      const endCb = vi.fn()
      e.endCallback = endCb
      const renderer = new SavePointRenderer(e)
      await renderer.render(makeNode('savePoint', { slotLabel: '', nextNodeId: '' }))
      expect(endCb).toHaveBeenCalled()
    })
  })

  describe('WaitRenderer', () => {
    it('等待后跳转到下一节点', async () => {
      vi.useFakeTimers()
      const e = makeMockEngine()
      e.traversal.getNext.mockReturnValue('next1')
      const renderer = new WaitRenderer(e)
      const promise = renderer.render(makeNode('wait', { duration: 500 }))
      vi.advanceTimersByTime(500)
      await promise
      expect(e.renderNode).toHaveBeenCalledWith('next1')
      vi.useRealTimers()
    })

    it('无下一节点时调用 endCallback', async () => {
      vi.useFakeTimers()
      const e = makeMockEngine()
      const endCb = vi.fn()
      e.endCallback = endCb
      const renderer = new WaitRenderer(e)
      const promise = renderer.render(makeNode('wait', { duration: 100 }))
      vi.advanceTimersByTime(100)
      await promise
      expect(endCb).toHaveBeenCalled()
      vi.useRealTimers()
    })
  })

  describe('RandomRenderer', () => {
    it('按权重随机选择分支', async () => {
      const e = makeMockEngine()
      const branches = [
        { targetNodeId: 'b1', weight: 1 },
        { targetNodeId: 'b2', weight: 1 }
      ]
      const renderer = new RandomRenderer(e)
      await renderer.render(makeNode('random', { branches }))
      expect(e.renderNode).toHaveBeenCalled()
    })

    it('无分支时调用 endCallback', async () => {
      const e = makeMockEngine()
      const endCb = vi.fn()
      e.endCallback = endCb
      const renderer = new RandomRenderer(e)
      await renderer.render(makeNode('random', { branches: [] }))
      expect(endCb).toHaveBeenCalled()
    })

    it('所有权重为零时均匀随机', async () => {
      const e = makeMockEngine()
      const renderer = new RandomRenderer(e)
      await renderer.render(makeNode('random', {
        branches: [
          { targetNodeId: 'b1', weight: 0 },
          { targetNodeId: 'b2', weight: 0 }
        ]
      }))
      expect(e.renderNode).toHaveBeenCalled()
    })
  })

  describe('BaseRenderer skip', () => {
    it('skip 有下一节点时 renderNode', () => {
      const e = makeMockEngine()
      e.traversal.getNext.mockReturnValue('next1')
      const renderer = new ConditionRenderer(e)
      renderer.skip(makeNode('condition', {}))
      expect(e.renderNode).toHaveBeenCalledWith('next1')
    })

    it('skip 无下一节点时调用 endCallback', () => {
      const e = makeMockEngine()
      const endCb = vi.fn()
      e.endCallback = endCb
      const renderer = new ConditionRenderer(e)
      renderer.skip(makeNode('condition', {}))
      expect(endCb).toHaveBeenCalled()
    })
  })
})
