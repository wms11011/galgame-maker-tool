// ============================================================
// 任务 2.2 - FlowStore 属性测试
// 属性 3：addNode 后 nodes.length 恰好增加 1
//         removeNode 后 nodes.length 恰好减少 1（状态一致性）
// ============================================================

import { describe, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import * as fc from 'fast-check'
import { useFlowStore } from '../renderer/src/stores/flowStore'
import type { NodeType, FlowNode } from '../renderer/src/types/index'

const NODE_TYPES: NodeType[] = ['dialog', 'choice', 'condition']

// Arbitrary：随机节点类型
const arbNodeType = fc.constantFrom(...NODE_TYPES)

// Arbitrary：随机位置
const arbPosition = fc.record({
  x: fc.integer({ min: 0, max: 2000 }),
  y: fc.integer({ min: 0, max: 2000 })
})

describe('FlowStore 属性测试（属性 3：状态一致性）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('addNode 后 nodes.length 恰好增加 1', () => {
    fc.assert(
      fc.property(
        arbNodeType,
        arbPosition,
        fc.array(fc.record({ type: arbNodeType, pos: arbPosition }), { minLength: 0, maxLength: 10 }),
        (type, position, existing) => {
          const store = useFlowStore()
          store.loadFlow([], [])

          // 先添加若干节点作为初始状态
          for (const e of existing) {
            store.addNode(e.type, e.pos)
          }

          const before = store.nodes.length
          store.addNode(type, position)
          const after = store.nodes.length

          return after === before + 1
        }
      ),
      { numRuns: 100 }
    )
  })

  it('removeNode 后 nodes.length 恰好减少 1', () => {
    fc.assert(
      fc.property(
        arbNodeType,
        arbPosition,
        fc.array(fc.record({ type: arbNodeType, pos: arbPosition }), { minLength: 0, maxLength: 9 }),
        (type, position, extra) => {
          const store = useFlowStore()

          // 直接用 loadFlow 构造初始状态，确保 ID 唯一
          const targetId = 'target_node'
          const extraNodes = extra.map((e, i) => ({
            id: `extra_${i}`,
            type: e.type,
            position: e.pos,
            data: { id: `extra_${i}`, label: '', character: '', content: '', title: '', options: [], expression: '', trueNextId: '', falseNextId: '' }
          })) as FlowNode[]

          const targetNode: FlowNode = {
            id: targetId,
            type,
            position,
            data: type === 'dialog'
              ? { id: targetId, label: '', character: '', content: '' }
              : type === 'choice'
              ? { id: targetId, label: '', title: '', options: [] }
              : { id: targetId, label: '', expression: '', trueNextId: '', falseNextId: '' }
          }

          store.loadFlow([targetNode, ...extraNodes], [])

          const before = store.nodes.length
          store.removeNode(targetId)
          const after = store.nodes.length

          return after === before - 1
        }
      ),
      { numRuns: 100 }
    )
  })

  it('removeNode 不存在的 ID 时 nodes.length 不变', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ type: arbNodeType, pos: arbPosition }), { minLength: 0, maxLength: 10 }),
        (existing) => {
          const store = useFlowStore()
          store.loadFlow([], [])

          for (const e of existing) {
            store.addNode(e.type, e.pos)
          }

          const before = store.nodes.length
          store.removeNode('non_existent_id_xyz')
          const after = store.nodes.length

          return after === before
        }
      ),
      { numRuns: 50 }
    )
  })

  it('连续 addNode N 次后 nodes.length 恰好增加 N', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (n) => {
          const store = useFlowStore()
          store.loadFlow([], [])

          const before = store.nodes.length // 0
          for (let i = 0; i < n; i++) {
            store.addNode('dialog', { x: i * 10, y: 0 })
          }
          const after = store.nodes.length

          return after === before + n
        }
      ),
      { numRuns: 50 }
    )
  })

  it('addNode 后 removeNode 同一节点，nodes.length 恢复原值', () => {
    fc.assert(
      fc.property(
        arbNodeType,
        arbPosition,
        (type, position) => {
          const store = useFlowStore()
          store.loadFlow([], [])

          const before = store.nodes.length
          store.addNode(type, position)
          const newId = store.nodes[store.nodes.length - 1].id
          store.removeNode(newId)
          const after = store.nodes.length

          return after === before
        }
      ),
      { numRuns: 100 }
    )
  })
})
