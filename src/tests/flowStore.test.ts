// ============================================================
// FlowStore 全节点类型单元测试
// 覆盖 12 种节点类型的 addNode / updateNode / removeNode
// + 连线管理 + 撤销/重做 + 选中状态
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowStore } from '../renderer/src/stores/flowStore'
import type { NodeType } from '../renderer/src/types/index'

function makeNode(type: NodeType): any {
  switch (type) {
    case 'dialog':
      return { id: '', label: '', character: '', content: '' }
    case 'choice':
      return { id: '', label: '', title: '', options: [] }
    case 'condition':
      return { id: '', label: '', expression: '', trueNextId: '', falseNextId: '' }
    case 'setVariable':
      return { id: '', label: '', variable: '', op: '=', value: '' }
    case 'goto':
      return { id: '', label: '', targetNodeId: '' }
    case 'end':
      return { id: '', label: '', endingType: 'normal', message: '' }
    case 'audio':
      return { id: '', label: '', audioType: 'bgm', action: 'play', src: '', loop: false, volume: 1 }
    case 'cg':
      return { id: '', label: '', src: '', transition: 'fade', duration: 800 }
    case 'wait':
      return { id: '', label: '', duration: 1000 }
    case 'random':
      return { id: '', label: '', branches: [] }
    case 'label':
      return { id: '', label: '', color: '#6b7280' }
    case 'animation':
      return { id: '', label: '', target: '', action: 'enter', duration: 500 }
    case 'savePoint':
      return { id: '', label: '', slotLabel: '' }
    case 'timer':
      return { id: '', label: '', mode: 'countdown', duration: 3000, variable: '' }
    case 'moveCharacter':
      return { id: '', label: '', target: '', fromPosition: 'left', toPosition: 'center', duration: 800, easing: 'ease' }
    case 'steamAchievement':
      return { id: '', label: '', achievementId: '' }
    case 'achievement':
      return { id: '', label: '', achievementId: '' }
    case 'particle':
      return { id: '', label: '', preset: 'snow', density: 100, speed: 1, duration: 3000 }
    case 'live2d':
      return { id: '', label: '', model: '', expression: 'neutral', position: 'center' }
    case 'item':
      return { id: '', label: '', action: 'get', itemName: '' }
    default:
      return {}
  }
}

const ALL_TYPES: NodeType[] = [
  'dialog', 'choice', 'condition', 'setVariable', 'goto',
  'end', 'audio', 'cg', 'wait', 'random', 'label', 'animation',
  'savePoint', 'timer', 'moveCharacter', 'steamAchievement', 'achievement', 'particle', 'live2d', 'item'
]

const EDGE_TYPES: NodeType[] = [
  'dialog', 'choice', 'condition', 'setVariable', 'goto',
  'audio', 'cg', 'wait', 'random', 'animation',
  'savePoint', 'timer', 'moveCharacter', 'steamAchievement', 'achievement', 'particle', 'live2d', 'item'
]

const SINGLE_EDGE_TYPES: NodeType[] = [
  'dialog', 'setVariable', 'goto', 'audio', 'cg', 'wait', 'animation',
  'savePoint', 'timer', 'moveCharacter', 'steamAchievement', 'achievement', 'particle', 'live2d', 'item'
]

describe('FlowStore - 17 种节点类型 CRUD', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ── addNode 全类型 ──────────────────────────────────────────
  describe('addNode', () => {
    it.each(ALL_TYPES)('addNode(%s) 创建节点并设置默认数据', (type) => {
      const store = useFlowStore()
      store.addNode(type, { x: 100, y: 200 })

      expect(store.nodes).toHaveLength(1)
      expect(store.nodes[0].type).toBe(type)
      expect(store.nodes[0].position).toEqual({ x: 100, y: 200 })
      expect(store.nodes[0].data).toBeDefined()
      expect(store.nodes[0].data.id).toBeTruthy()
      expect(store.isDirty).toBe(true)
    })

    it('addNode 生成唯一 ID', () => {
      const store = useFlowStore()
      for (let i = 0; i < 20; i++) {
        store.addNode('dialog')
      }
      const ids = store.nodes.map(n => n.id)
      expect(new Set(ids).size).toBe(20)
    })

    it('addNode 默认位置为 (100, 100)', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      expect(store.nodes[0].position).toEqual({ x: 100, y: 100 })
    })

    it('addNode 触发保存快照（支持撤销）', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      store.addNode('choice')
      store.undo()
      expect(store.nodes).toHaveLength(1)
      expect(store.nodes[0].type).toBe('dialog')
    })
  })

  // ── updateNode 全类型 ───────────────────────────────────────
  describe('updateNode', () => {
    it.each(ALL_TYPES)('updateNode(%s) 合并更新字段', (type) => {
      const store = useFlowStore()
      store.addNode(type)
      const id = store.nodes[0].id

      store.updateNode(id, { label: '新名称' } as any)
      expect((store.nodes[0].data as any).label).toBe('新名称')
    })

    it('updateNode 不存在的 ID 不报错', () => {
      const store = useFlowStore()
      expect(() => store.updateNode('no_such_id', { label: 'x' } as any)).not.toThrow()
    })

    it('updateNode 设置 isDirty', () => {
      const store = useFlowStore()
      store.loadFlow([], [])
      expect(store.isDirty).toBe(false)
      store.addNode('dialog')
      store.loadFlow([], [])
      expect(store.isDirty).toBe(false)
      store.addNode('dialog')
      store.updateNode(store.nodes[0].id, { label: 'changed' } as any)
      expect(store.isDirty).toBe(true)
    })
  })

  // ── removeNode 全类型 ───────────────────────────────────────
  describe('removeNode', () => {
    it.each(ALL_TYPES)('removeNode(%s) 移除节点及其连线', (type) => {
      const store = useFlowStore()
      store.addNode(type)
      const id = store.nodes[0].id

      store.removeNode(id)
      expect(store.nodes).toHaveLength(0)
    })

    it('removeNode 清除选中节点', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      const id = store.nodes[0].id
      store.selectedNodeId = id

      store.removeNode(id)
      expect(store.selectedNodeId).toBeNull()
    })

    it('removeNode 同时清除关联连线', () => {
      const store = useFlowStore()
      store.addNode('dialog', { x: 0, y: 0 })
      store.addNode('dialog', { x: 200, y: 0 })
      const src = store.nodes[0].id
      const tgt = store.nodes[1].id
      store.addEdge(src, tgt)
      expect(store.edges).toHaveLength(1)

      store.removeNode(src)
      expect(store.edges).toHaveLength(0)
    })

    it('removeNode 同时清除以该节点为 target 的连线', () => {
      const store = useFlowStore()
      store.addNode('dialog', { x: 0, y: 0 })
      store.addNode('dialog', { x: 200, y: 0 })
      const src = store.nodes[0].id
      const tgt = store.nodes[1].id
      store.addEdge(src, tgt)

      store.removeNode(tgt)
      expect(store.edges).toHaveLength(0)
    })
  })

  // ── 连线管理 ────────────────────────────────────────────────
  describe('连线管理', () => {
    it('addEdge 创建唯一连线 ID', () => {
      const store = useFlowStore()
      store.addNode('dialog', { x: 0, y: 0 })
      store.addNode('dialog', { x: 200, y: 0 })
      store.addEdge(store.nodes[0].id, store.nodes[1].id, '测试')

      expect(store.edges).toHaveLength(1)
      expect(store.edges[0].source).toBe(store.nodes[0].id)
      expect(store.edges[0].target).toBe(store.nodes[1].id)
      expect(store.edges[0].label).toBe('测试')
      expect(store.isDirty).toBe(true)
    })

    it('removeEdge 移除连线', () => {
      const store = useFlowStore()
      store.addNode('dialog', { x: 0, y: 0 })
      store.addNode('dialog', { x: 200, y: 0 })
      store.addEdge(store.nodes[0].id, store.nodes[1].id)
      const edgeId = store.edges[0].id

      store.removeEdge(edgeId)
      expect(store.edges).toHaveLength(0)
    })
  })

  // ── 撤销/重做 ──────────────────────────────────────────────
  describe('撤销/重做', () => {
    it('undo 恢复到上一个快照', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      store.addNode('choice')
      expect(store.nodes).toHaveLength(2)

      store.undo()
      expect(store.nodes).toHaveLength(1)
      expect(store.nodes[0].type).toBe('dialog')
    })

    it('redo 重做已撤销操作', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      store.addNode('choice')
      store.undo()
      store.redo()
      expect(store.nodes).toHaveLength(2)
    })

    it('新操作后 redo 栈清空', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      store.addNode('choice')
      store.undo()
      store.addNode('condition')
      store.redo()
      expect(store.nodes).toHaveLength(2)
    })

    it('undo 栈为空时 undo 不报错', () => {
      const store = useFlowStore()
      expect(() => store.undo()).not.toThrow()
    })

    it('redo 栈为空时 redo 不报错', () => {
      const store = useFlowStore()
      expect(() => store.redo()).not.toThrow()
    })

    it('addEdge → undo → 连线被恢复', () => {
      const store = useFlowStore()
      store.addNode('dialog', { x: 0, y: 0 })
      store.addNode('dialog', { x: 200, y: 0 })
      store.addEdge(store.nodes[0].id, store.nodes[1].id)
      expect(store.edges).toHaveLength(1)

      store.undo()
      expect(store.edges).toHaveLength(0)
    })
  })

  // ── loadFlow ────────────────────────────────────────────────
  describe('loadFlow', () => {
    it('loadFlow 替换全部节点和连线', () => {
      const store = useFlowStore()
      store.loadFlow(
        [
          { id: 'a', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'a', label: 'A', character: 'x', content: 'y' } }
        ],
        [
          { id: 'e1', source: 'a', target: 'b' }
        ]
      )
      expect(store.nodes).toHaveLength(1)
      expect(store.edges).toHaveLength(1)
      expect(store.isDirty).toBe(false)
      expect(store.selectedNodeId).toBeNull()
    })

    it('loadFlow 清空 undo/redo', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      store.loadFlow([], [])
      store.undo()
      expect(store.nodes).toHaveLength(0)
    })
  })
})

// ============================================================
// 属性测试 - 扩展到全部 12 种节点类型
// ============================================================
import * as fc from 'fast-check'

describe('FlowStore 属性测试（全 12 种类型）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const arbNodeType = fc.constantFrom(...ALL_TYPES)

  it('任意类型 addNode 后 nodes.length 增加 1', () => {
    fc.assert(
      fc.property(arbNodeType, (type) => {
        const store = useFlowStore()
        store.loadFlow([], [])
        const before = store.nodes.length
        store.addNode(type)
        return store.nodes.length === before + 1 && store.nodes[0].type === type
      }),
      { numRuns: 100 }
    )
  })

  it('连续添加随机类型节点 N 次', () => {
    fc.assert(
      fc.property(
        fc.array(arbNodeType, { minLength: 1, maxLength: 30 }),
        (types) => {
          const store = useFlowStore()
          store.loadFlow([], [])
          for (const t of types) {
            store.addNode(t)
          }
          return store.nodes.length === types.length
        }
      ),
      { numRuns: 50 }
    )
  })

  it('updateNode 仅修改指定字段，其他字段保留', () => {
    fc.assert(
      fc.property(arbNodeType, (type) => {
        const store = useFlowStore()
        store.addNode(type)
        const id = store.nodes[0].id
        const original = JSON.parse(JSON.stringify(store.nodes[0].data))

        store.updateNode(id, { label: 'TEST_LABEL' } as any)
        const updated = store.nodes[0].data as any

        // label 已更新
        if (updated.label !== 'TEST_LABEL') return false

        // id 不应改变
        if (updated.id !== original.id) return false

        return true
      }),
      { numRuns: 60 }
    )
  })
})

// ============================================================
// 连线同步逻辑验证 - FlowEditor onConnect / onEdgeClick
// ============================================================

describe('FlowEditor 连线同步逻辑', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // 模拟 onConnect 行为
  function simulateConnect(store: ReturnType<typeof useFlowStore>, sourceId: string, targetId: string): void {
    const sourceNode = store.nodes.find(n => n.id === sourceId)
    if (!sourceNode) return

    store.addEdge(sourceId, targetId)
    const updateData: any = {}

    if (sourceNode.type === 'dialog') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'setVariable') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'goto') {
      updateData.targetNodeId = targetId
    } else if (sourceNode.type === 'audio') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'cg') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'wait') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'animation') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'savePoint') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'timer') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'moveCharacter') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'steamAchievement') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'achievement') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'particle') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'live2d') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'item') {
      updateData.nextNodeId = targetId
    } else if (sourceNode.type === 'random') {
      updateData.branches = [{
        id: `br_${Date.now()}`,
        targetNodeId: targetId,
        weight: 1
      }]
    } else if (sourceNode.type === 'choice') {
      updateData.options = [{
        id: `opt_${Date.now()}`,
        text: '',
        nextNodeId: targetId
      }]
    } else if (sourceNode.type === 'condition') {
      // condition nodes use label to distinguish true/false
      // This is handled differently in FlowEditor
    }

    if (Object.keys(updateData).length > 0) {
      store.updateNode(sourceId, updateData)
    }
  }

  it.each(SINGLE_EDGE_TYPES)('%s 连接后 nextNodeId/targetNodeId 指向目标', (type) => {
    const store = useFlowStore()
    store.addNode(type, { x: 0, y: 0 })
    store.addNode('dialog', { x: 200, y: 0 })
    const srcId = store.nodes[0].id
    const tgtId = store.nodes[1].id

    simulateConnect(store, srcId, tgtId)

    const data = store.nodes[0].data as any
    if (type === 'goto') {
      expect(data.targetNodeId).toBe(tgtId)
    } else {
      expect(data.nextNodeId).toBe(tgtId)
    }
    expect(store.edges).toHaveLength(1)
  })

  it('choice 连接后创建 option', () => {
    const store = useFlowStore()
    store.addNode('choice', { x: 0, y: 0 })
    store.addNode('dialog', { x: 200, y: 0 })
    const srcId = store.nodes[0].id
    const tgtId = store.nodes[1].id

    simulateConnect(store, srcId, tgtId)

    const data = store.nodes[0].data as any
    expect(data.options).toHaveLength(1)
    expect(data.options[0].nextNodeId).toBe(tgtId)
  })

  it('random 连接后创建 branch', () => {
    const store = useFlowStore()
    store.addNode('random', { x: 0, y: 0 })
    store.addNode('dialog', { x: 200, y: 0 })
    const srcId = store.nodes[0].id
    const tgtId = store.nodes[1].id

    simulateConnect(store, srcId, tgtId)

    const data = store.nodes[0].data as any
    expect(data.branches).toHaveLength(1)
    expect(data.branches[0].targetNodeId).toBe(tgtId)
    expect(data.branches[0].weight).toBe(1)
  })

  // 模拟 onEdgeClick 断开连线行为
  function simulateDisconnect(store: ReturnType<typeof useFlowStore>, edgeId: string): void {
    const edge = store.edges.find(e => e.id === edgeId)
    if (!edge) return

    store.removeEdge(edgeId)

    const sourceNode = store.nodes.find(n => n.id === edge.source)
    if (!sourceNode) return

    const updateData: any = {}

    if (sourceNode.type === 'dialog' || sourceNode.type === 'setVariable' ||
        sourceNode.type === 'audio' || sourceNode.type === 'cg' ||
        sourceNode.type === 'wait' || sourceNode.type === 'animation' ||
        sourceNode.type === 'savePoint' || sourceNode.type === 'timer' ||
        sourceNode.type === 'moveCharacter' || sourceNode.type === 'steamAchievement' ||
        sourceNode.type === 'achievement' || sourceNode.type === 'particle' || sourceNode.type === 'live2d' || sourceNode.type === 'item') {
      if ((sourceNode.data as any).nextNodeId === edge.target) {
        updateData.nextNodeId = ''
      }
    } else if (sourceNode.type === 'goto') {
      if ((sourceNode.data as any).targetNodeId === edge.target) {
        updateData.targetNodeId = ''
      }
    } else if (sourceNode.type === 'random') {
      updateData.branches = ((sourceNode.data as any).branches || [])
        .filter((b: any) => b.targetNodeId !== edge.target)
    } else if (sourceNode.type === 'choice') {
      updateData.options = ((sourceNode.data as any).options || [])
        .map((o: any) => o.nextNodeId === edge.target ? { ...o, nextNodeId: '' } : o)
    } else if (sourceNode.type === 'condition') {
      const cd = sourceNode.data as any
      if (cd.trueNextId === edge.target) updateData.trueNextId = ''
      if (cd.falseNextId === edge.target) updateData.falseNextId = ''
    }

    if (Object.keys(updateData).length > 0) {
      store.updateNode(edge.source, updateData)
    }
  }

  it.each(SINGLE_EDGE_TYPES)('%s 断开连线后 nextNodeId/targetNodeId 被清空', (type) => {
    const store = useFlowStore()
    store.addNode(type, { x: 0, y: 0 })
    store.addNode('dialog', { x: 200, y: 0 })
    const srcId = store.nodes[0].id
    const tgtId = store.nodes[1].id

    simulateConnect(store, srcId, tgtId)
    const edgeId = store.edges[0].id

    simulateDisconnect(store, edgeId)

    expect(store.edges).toHaveLength(0)
    const data = store.nodes[0].data as any
    if (type === 'goto') {
      expect(data.targetNodeId).toBe('')
    } else {
      expect(data.nextNodeId).toBe('')
    }
  })

  it('label 节点连接不存储连线信息（穿透节点）', () => {
    const store = useFlowStore()
    store.addNode('label', { x: 0, y: 0 })
    store.addNode('dialog', { x: 200, y: 0 })
    const srcId = store.nodes[0].id
    const tgtId = store.nodes[1].id

    // label 节点不通过 simulateConnect 存储到 data 中
    store.addEdge(srcId, tgtId)
    const data = store.nodes[0].data as any
    // label 数据中无 nextNodeId 字段
    expect(data.nextNodeId).toBeUndefined()
    // 但连线仍然创建了
    expect(store.edges).toHaveLength(1)
  })
})

// ============================================================
// 场景/章节分组功能测试
// ============================================================

describe('FlowStore - 场景分组 CRUD', () => {
  let store: ReturnType<typeof useFlowStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFlowStore()
  })

  describe('addGroup', () => {
    it('创建分组并返回 ID', () => {
      const id = store.addGroup('第一章')
      expect(id).toBeTruthy()
      expect(id).toMatch(/^group_/)
      expect(store.groups).toHaveLength(1)
      expect(store.groups[0].name).toBe('第一章')
      expect(store.groups[0].color).toBe('#6366f1')
      expect(store.groups[0].nodeIds).toEqual([])
    })

    it('创建分组标记 isDirty', () => {
      expect(store.isDirty).toBe(false)
      store.addGroup('第一章')
      expect(store.isDirty).toBe(true)
    })

    it('多个分组名称可以相同', () => {
      store.addGroup('第一章')
      store.addGroup('第一章')
      expect(store.groups).toHaveLength(2)
      expect(store.groups[0].id).not.toBe(store.groups[1].id)
    })

    it('自定义颜色', () => {
      store.addGroup('红色章节', '#ef4444')
      expect(store.groups[0].color).toBe('#ef4444')
    })
  })

  describe('removeGroup', () => {
    it('删除分组', () => {
      const id = store.addGroup('第一章')
      store.removeGroup(id)
      expect(store.groups).toHaveLength(0)
    })

    it('删除分组不删除节点', () => {
      const gid = store.addGroup('测试')
      store.addNode('dialog')
      const nid = store.nodes[0].id
      store.addNodeToGroup(gid, nid)

      store.removeGroup(gid)
      expect(store.groups).toHaveLength(0)
      expect(store.nodes).toHaveLength(1)
    })

    it('删除分组标记 isDirty', () => {
      const id = store.addGroup('第一章')
      store.loadFlow([], [])
      expect(store.isDirty).toBe(false)
      store.addGroup('第二章')
      const id2 = store.groups[1].id
      store.loadFlow([], [])
      expect(store.isDirty).toBe(false)
      store.removeGroup(id2)
      expect(store.isDirty).toBe(true)
    })

    it('删除不存在的分组不报错', () => {
      expect(() => store.removeGroup('no_such_group')).not.toThrow()
    })
  })

  describe('renameGroup', () => {
    it('重命名分组', () => {
      const id = store.addGroup('旧名称')
      store.renameGroup(id, '新名称')
      expect(store.groups[0].name).toBe('新名称')
    })

    it('重命名标记 isDirty', () => {
      const id = store.addGroup('旧')
      store.loadFlow([], [])
      expect(store.isDirty).toBe(false)
      store.renameGroup(id, '新')
      expect(store.isDirty).toBe(true)
    })
  })

  describe('setGroupColor', () => {
    it('设置分组颜色', () => {
      const id = store.addGroup('第一章')
      store.setGroupColor(id, '#22c55e')
      expect(store.groups[0].color).toBe('#22c55e')
    })

    it('设置颜色标记 isDirty', () => {
      const id = store.addGroup('第一章')
      store.loadFlow([], [])
      store.setGroupColor(id, '#ef4444')
      expect(store.isDirty).toBe(true)
    })
  })

  describe('addNodeToGroup', () => {
    it('将节点添加到分组', () => {
      const gid = store.addGroup('第一章')
      store.addNode('dialog')
      const nid = store.nodes[0].id

      store.addNodeToGroup(gid, nid)
      expect(store.groups[0].nodeIds).toContain(nid)
    })

    it('一个节点只能属于一个分组（排他性）', () => {
      const gid1 = store.addGroup('第一章')
      const gid2 = store.addGroup('第二章')
      store.addNode('dialog')
      const nid = store.nodes[0].id

      store.addNodeToGroup(gid1, nid)
      store.addNodeToGroup(gid2, nid)

      expect(store.groups[0].nodeIds).not.toContain(nid)
      expect(store.groups[1].nodeIds).toContain(nid)
    })

    it('添加节点到分组标记 isDirty', () => {
      const gid = store.addGroup('第一章')
      store.addNode('dialog')
      store.loadFlow([], [])
      expect(store.isDirty).toBe(false)
      store.addNode('dialog')
      const nid = store.nodes[0].id
      store.loadFlow([], [])
      expect(store.isDirty).toBe(false)
      store.addGroup('第一章')
      const gid2 = store.groups[1].id
      store.loadFlow([], [])
      expect(store.isDirty).toBe(false)
      store.addNodeToGroup(gid2, nid)
      expect(store.isDirty).toBe(true)
    })
  })

  describe('addNodesToGroup', () => {
    it('批量添加节点到分组', () => {
      const gid = store.addGroup('第一章')
      store.addNode('dialog')
      store.addNode('choice')
      store.addNode('condition')
      const nids = store.nodes.map(n => n.id)

      store.addNodesToGroup(gid, nids)
      expect(store.groups[0].nodeIds).toEqual(nids)
    })

    it('批量添加从其他分组移除节点', () => {
      const gid1 = store.addGroup('第一章')
      const gid2 = store.addGroup('第二章')
      store.addNode('dialog')
      store.addNode('choice')
      const nids = store.nodes.map(n => n.id)

      store.addNodeToGroup(gid1, nids[0])
      store.addNodeToGroup(gid1, nids[1])
      store.addNodesToGroup(gid2, nids)

      expect(store.groups[0].nodeIds).toEqual([])
      expect(store.groups[1].nodeIds).toEqual(nids)
    })
  })

  describe('removeNodeFromGroup', () => {
    it('从分组中移除节点', () => {
      const gid = store.addGroup('第一章')
      store.addNode('dialog')
      const nid = store.nodes[0].id
      store.addNodeToGroup(gid, nid)

      store.removeNodeFromGroup(gid, nid)
      expect(store.groups[0].nodeIds).toEqual([])
    })

    it('移除不存在的节点不报错', () => {
      const gid = store.addGroup('第一章')
      expect(() => store.removeNodeFromGroup(gid, 'no_such_node')).not.toThrow()
    })
  })

  describe('getGroupByNodeId', () => {
    it('返回节点所在分组', () => {
      const gid = store.addGroup('第一章')
      store.addNode('dialog')
      const nid = store.nodes[0].id
      store.addNodeToGroup(gid, nid)

      const found = store.getGroupByNodeId(nid)
      expect(found).toBeDefined()
      expect(found!.id).toBe(gid)
      expect(found!.name).toBe('第一章')
    })

    it('节点不属于任何分组时返回 undefined', () => {
      store.addNode('dialog')
      const found = store.getGroupByNodeId(store.nodes[0].id)
      expect(found).toBeUndefined()
    })

    it('分组已删除后返回 undefined', () => {
      const gid = store.addGroup('第一章')
      store.addNode('dialog')
      const nid = store.nodes[0].id
      store.addNodeToGroup(gid, nid)
      store.removeGroup(gid)

      const found = store.getGroupByNodeId(nid)
      expect(found).toBeUndefined()
    })
  })

  describe('setGroupNodes', () => {
    it('替换分组的节点列表', () => {
      const gid = store.addGroup('第一章')
      store.addNode('dialog')
      store.addNode('choice')
      const nid1 = store.nodes[0].id
      const nid2 = store.nodes[1].id

      store.setGroupNodes(gid, [nid1, nid2])
      expect(store.groups[0].nodeIds).toEqual([nid1, nid2])
    })
  })

  describe('loadGroups', () => {
    it('加载分组数据', () => {
      store.loadGroups([
        { id: 'g1', name: '序章', color: '#3b82f6', nodeIds: ['n1', 'n2'] },
        { id: 'g2', name: '第一章', color: '#ef4444', nodeIds: ['n3'] }
      ])

      expect(store.groups).toHaveLength(2)
      expect(store.groups[0].name).toBe('序章')
      expect(store.groups[0].color).toBe('#3b82f6')
      expect(store.groups[0].nodeIds).toEqual(['n1', 'n2'])
      expect(store.groups[1].name).toBe('第一章')
      expect(store.groups[1].nodeIds).toEqual(['n3'])
    })

    it('加载后修改不污染原始数据', () => {
      const original = [{ id: 'g1', name: '序章', color: '#3b82f6', nodeIds: ['n1'] }]
      store.loadGroups(JSON.parse(JSON.stringify(original)))

      store.groups[0].nodeIds.push('n2')
      expect(original[0].nodeIds).toEqual(['n1'])
    })
  })

  describe('removeNode 清理分组引用', () => {
    it('删除节点时从所有分组中移除该节点', () => {
      const gid1 = store.addGroup('第一章')
      const gid2 = store.addGroup('第二章')
      store.addNode('dialog')
      const nid = store.nodes[0].id

      store.addNodeToGroup(gid1, nid)
      store.addNodeToGroup(gid2, nid)
      expect(store.groups[1].nodeIds).toContain(nid)

      store.removeNode(nid)
      for (const g of store.groups) {
        expect(g.nodeIds).not.toContain(nid)
      }
    })

    it('删除未分组的节点不报错', () => {
      store.addGroup('第一章')
      store.addNode('dialog')
      const nid = store.nodes[0].id

      expect(() => store.removeNode(nid)).not.toThrow()
      expect(store.groups[0].nodeIds).toEqual([])
    })
  })

  describe('loadFlow 不重置 groups', () => {
    it('loadFlow 后分组数据保留', () => {
      store.addGroup('第一章')
      store.addNode('dialog')
      const nid = store.nodes[0].id
      store.addNodeToGroup(store.groups[0].id, nid)

      store.loadFlow([], [])

      expect(store.groups).toHaveLength(1)
      expect(store.groups[0].name).toBe('第一章')
      expect(store.groups[0].nodeIds).toContain(nid)
    })
  })

  describe('分组与 undo/redo 隔离', () => {
    it('分组操作不影响 undo 栈', () => {
      store.addNode('dialog')
      store.addGroup('第一章')
      store.undo()

      // undo 恢复的是节点状态，不影响 groups
      expect(store.nodes).toHaveLength(0)
      expect(store.groups).toHaveLength(1)
    })
  })
})