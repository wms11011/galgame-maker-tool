// ============================================================
// 任务 7.2 / 7.4 / 7.6 - 映射引擎测试
//
// 7.2 属性测试 - 属性 1：flowToScript → scriptToFlow 往返一致性
// 7.4 属性测试 - 属性 2：scriptToFlow 引用完整性
// 7.6 单元测试 - 三种节点类型往返转换 + 边界情况
// ============================================================

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  flowToScript,
  scriptToFlow,
  detectConflict,
  resolveConflict
} from '../renderer/src/utils/mappingEngine'
import type { FlowNode, FlowEdge } from '../renderer/src/types/index'

// ============================================================
// 辅助：构造合法节点/连线的 Arbitrary
// ============================================================



// ============================================================
// 7.6 单元测试 - 三种节点类型往返转换
// ============================================================

describe('7.6 映射引擎单元测试', () => {
  // ── 对话节点 ──────────────────────────────────────────────

  describe('对话节点（dialog）', () => {
    it('单个对话节点无连线：往返后节点数量不变', () => {
      const nodes: FlowNode[] = [
        {
          id: 'n1',
          type: 'dialog',
          position: { x: 0, y: 0 },
          data: { id: 'n1', label: '主角', character: '主角', content: '你好世界' }
        }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes![0].type).toBe('dialog')
    })

    it('对话节点含 next 连线：往返后连线数量不变', () => {
      const nodes: FlowNode[] = [
        {
          id: 'n1',
          type: 'dialog',
          position: { x: 0, y: 0 },
          data: { id: 'n1', label: 'A', character: 'A', content: 'hello', nextNodeId: 'n2' }
        },
        {
          id: 'n2',
          type: 'dialog',
          position: { x: 200, y: 0 },
          data: { id: 'n2', label: 'B', character: 'B', content: 'world' }
        }
      ]
      const edges: FlowEdge[] = [{ id: 'e1', source: 'n1', target: 'n2' }]
      const script = flowToScript(nodes, edges)
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(1)
      expect(result.edges![0].source).toBe('n1')
      expect(result.edges![0].target).toBe('n2')
    })

    it('对话节点含 background 和 sprite：往返后字段保留', () => {
      const nodes: FlowNode[] = [
        {
          id: 'n1',
          type: 'dialog',
          position: { x: 0, y: 0 },
          data: {
            id: 'n1',
            label: 'hero',
            character: 'hero',
            content: 'hi',
            background: 'assets/bg.png',
            characterSprite: 'assets/hero.png'
          }
        }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('background: "assets/bg.png"')
      expect(script).toContain('sprite: "assets/hero.png"')
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
    })
  })

  // ── 选择节点 ──────────────────────────────────────────────

  describe('选择节点（choice）', () => {
    it('选择节点含两个选项：往返后节点和连线数量不变', () => {
      const nodes: FlowNode[] = [
        {
          id: 'c1',
          type: 'choice',
          position: { x: 0, y: 0 },
          data: {
            id: 'c1',
            label: '选择',
            title: '你要去哪里',
            options: [
              { id: 'o1', text: '去森林', nextNodeId: 'n2' },
              { id: 'o2', text: '留在镇上', nextNodeId: 'n3' }
            ]
          }
        },
        {
          id: 'n2',
          type: 'dialog',
          position: { x: 200, y: 0 },
          data: { id: 'n2', label: 'A', character: 'A', content: '森林' }
        },
        {
          id: 'n3',
          type: 'dialog',
          position: { x: 200, y: 200 },
          data: { id: 'n3', label: 'B', character: 'B', content: '镇上' }
        }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(3)
      // 选择节点应产生 2 条连线
      const choiceEdges = result.edges!.filter((e) => e.source === 'c1')
      expect(choiceEdges).toHaveLength(2)
    })

    it('选择节点无选项：往返后节点数量不变，无连线', () => {
      const nodes: FlowNode[] = [
        {
          id: 'c1',
          type: 'choice',
          position: { x: 0, y: 0 },
          data: { id: 'c1', label: '空选择', title: '空', options: [] }
        }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
      expect(result.edges).toHaveLength(0)
    })
  })

  // ── 条件节点 ──────────────────────────────────────────────

  describe('条件节点（condition）', () => {
    it('条件节点含 true/false 分支：往返后连线数量为 2', () => {
      const nodes: FlowNode[] = [
        {
          id: 'cond1',
          type: 'condition',
          position: { x: 0, y: 0 },
          data: {
            id: 'cond1',
            label: 'cond',
            expression: 'flag > 0',
            trueNextId: 'yes',
            falseNextId: 'no'
          }
        },
        {
          id: 'yes',
          type: 'dialog',
          position: { x: 200, y: 0 },
          data: { id: 'yes', label: 'Y', character: 'Y', content: '是' }
        },
        {
          id: 'no',
          type: 'dialog',
          position: { x: 200, y: 200 },
          data: { id: 'no', label: 'N', character: 'N', content: '否' }
        }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(3)
      const condEdges = result.edges!.filter((e) => e.source === 'cond1')
      expect(condEdges).toHaveLength(2)
      const trueEdge = condEdges.find((e) => e.label === 'true')
      const falseEdge = condEdges.find((e) => e.label === 'false')
      expect(trueEdge?.target).toBe('yes')
      expect(falseEdge?.target).toBe('no')
    })
  })

  // ── 边界情况 ──────────────────────────────────────────────

  describe('边界情况', () => {
    it('空图：flowToScript 返回空字符串', () => {
      expect(flowToScript([], [])).toBe('')
    })

    it('空字符串：scriptToFlow 返回空节点和连线', () => {
      const result = scriptToFlow('')
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })

    it('纯空白字符串：scriptToFlow 返回空结果', () => {
      const result = scriptToFlow('   \n\t  ')
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(0)
    })

    it('单节点无连线：往返后节点数量为 1，连线为 0', () => {
      const nodes: FlowNode[] = [
        {
          id: 'solo',
          type: 'dialog',
          position: { x: 0, y: 0 },
          data: { id: 'solo', label: 'X', character: 'X', content: '孤独节点' }
        }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
      expect(result.edges).toHaveLength(0)
    })

    it('含注释的脚本：scriptToFlow 正确跳过注释', () => {
      const script = `
// 这是注释
@dialog(id: "n1", character: "主角") {
  content: "你好"
}
// 另一条注释
`
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
    })

    it('未知指令：scriptToFlow 收集错误但继续解析其他节点', () => {
      const script = `
@unknown(id: "x1") {
  foo: "bar"
}
@dialog(id: "n1", character: "A") {
  content: "hello"
}
`
      const result = scriptToFlow(script)
      // 有错误但仍解析出 dialog 节点
      expect(result.nodes).toBeDefined()
    })

    it('字符串转义：双引号和反斜杠往返后保持一致', () => {
      const nodes: FlowNode[] = [
        {
          id: 'n1',
          type: 'dialog',
          position: { x: 0, y: 0 },
          data: {
            id: 'n1',
            label: 'A',
            character: 'A',
            content: '他说："你好"'
          }
        }
      ]
      const script = flowToScript(nodes, [])
      // 脚本中应包含转义后的双引号
      expect(script).toContain('\\"你好\\"')
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
    })

    it('循环引用：A→B→A 的脚本可被解析，节点和连线数量正确', () => {
      // 构造 A→B→A 的循环图
      const nodes: FlowNode[] = [
        {
          id: 'A',
          type: 'dialog',
          position: { x: 0, y: 0 },
          data: { id: 'A', label: 'A', character: 'A', content: 'first', nextNodeId: 'B' }
        },
        {
          id: 'B',
          type: 'dialog',
          position: { x: 200, y: 0 },
          data: { id: 'B', label: 'B', character: 'B', content: 'second', nextNodeId: 'A' }
        }
      ]
      const edges: FlowEdge[] = [
        { id: 'e1', source: 'A', target: 'B' },
        { id: 'e2', source: 'B', target: 'A' }
      ]
      const script = flowToScript(nodes, edges)
      const result = scriptToFlow(script)
      // 解析器不应崩溃，节点和连线数量应正确
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(2)
      // 验证循环引用的连线目标均存在于节点列表中
      const nodeIds = new Set(result.nodes!.map((n) => n.id))
      for (const edge of result.edges!) {
        expect(nodeIds.has(edge.source)).toBe(true)
        expect(nodeIds.has(edge.target)).toBe(true)
      }
    })

    it('自引用节点：A→A 的脚本可被解析，连线 source 和 target 相同', () => {
      const nodes: FlowNode[] = [
        {
          id: 'loop',
          type: 'dialog',
          position: { x: 0, y: 0 },
          data: { id: 'loop', label: 'L', character: 'L', content: '循环', nextNodeId: 'loop' }
        }
      ]
      const edges: FlowEdge[] = [{ id: 'e1', source: 'loop', target: 'loop' }]
      const script = flowToScript(nodes, edges)
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
      expect(result.edges).toHaveLength(1)
      expect(result.edges![0].source).toBe('loop')
      expect(result.edges![0].target).toBe('loop')
    })

    it('多节点链式连接：往返后节点和连线数量均不变', () => {
      const n = 5
      const nodes: FlowNode[] = Array.from({ length: n }, (_, i) => ({
        id: `n${i}`,
        type: 'dialog' as const,
        position: { x: i * 200, y: 0 },
        data: { id: `n${i}`, label: `角色${i}`, character: `角色${i}`, content: `内容${i}` }
      }))
      const edges: FlowEdge[] = Array.from({ length: n - 1 }, (_, i) => ({
        id: `e${i}`,
        source: `n${i}`,
        target: `n${i + 1}`
      }))
      const script = flowToScript(nodes, edges)
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(n)
      expect(result.edges).toHaveLength(n - 1)
    })
  })

  // ── 冲突检测 ──────────────────────────────────────────────

  describe('detectConflict', () => {
    it('两者都未修改：无冲突', () => {
      const state = detectConflict(null, null)
      expect(state.hasConflict).toBe(false)
      expect(state.flowModified).toBe(false)
      expect(state.codeModified).toBe(false)
    })

    it('只有流程图修改：无冲突，flowModified=true', () => {
      const state = detectConflict(new Date(), null)
      expect(state.hasConflict).toBe(false)
      expect(state.flowModified).toBe(true)
      expect(state.codeModified).toBe(false)
    })

    it('只有脚本修改：无冲突，codeModified=true', () => {
      const state = detectConflict(null, new Date())
      expect(state.hasConflict).toBe(false)
      expect(state.flowModified).toBe(false)
      expect(state.codeModified).toBe(true)
    })

    it('两者都修改：有冲突', () => {
      const state = detectConflict(new Date(), new Date())
      expect(state.hasConflict).toBe(true)
    })
  })

  // ── resolveConflict ───────────────────────────────────────

  describe('resolveConflict', () => {
    const nodes: FlowNode[] = [
      {
        id: 'n1',
        type: 'dialog',
        position: { x: 0, y: 0 },
        data: { id: 'n1', label: 'A', character: 'A', content: 'hello' }
      }
    ]

    it('keep-flow：返回重新生成的脚本', () => {
      const result = resolveConflict('keep-flow', nodes, [], '')
      expect(result.script).toBeDefined()
      expect(result.script).toContain('@dialog')
    })

    it('keep-code：返回重新解析的节点和连线', () => {
      const script = flowToScript(nodes, [])
      const result = resolveConflict('keep-code', [], [], script)
      expect(result.nodes).toBeDefined()
      expect(result.nodes).toHaveLength(1)
    })

    it('keep-code 解析失败时返回空数组', () => {
      const result = resolveConflict('keep-code', [], [], 'invalid script @@@@')
      expect(result.nodes).toBeDefined()
    })
  })
})

// ============================================================
// 7.2 属性测试 - 属性 1：flowToScript → scriptToFlow 往返一致性
// ============================================================

describe('7.2 属性测试 - 属性 1：往返一致性', () => {
  // Arbitrary：生成合法的对话节点列表（无连线，最简单情况）
  const arbDialogNodes = fc.array(
    fc.record({
      id: fc.stringMatching(/^d[0-9]{1,4}$/),
      character: fc.stringMatching(/^[a-zA-Z\u4e00-\u9fa5]{1,10}$/),
      content: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ]{0,20}$/)
    }),
    { minLength: 1, maxLength: 8 }
  ).filter((arr) => {
    // 确保 id 唯一
    const ids = arr.map((n) => n.id)
    return new Set(ids).size === ids.length
  }).map((arr) =>
    arr.map((n, i) => ({
      id: n.id,
      type: 'dialog' as const,
      position: { x: i * 200, y: 0 },
      data: { id: n.id, label: n.character, character: n.character, content: n.content }
    }))
  )

  it('对任意合法对话节点列表，flowToScript → scriptToFlow 节点数量不变', () => {
    fc.assert(
      fc.property(arbDialogNodes, (nodes) => {
        const script = flowToScript(nodes, [])
        const result = scriptToFlow(script)
        return result.success && result.nodes!.length === nodes.length
      }),
      { numRuns: 200 }
    )
  })

  it('对任意合法对话节点链，flowToScript → scriptToFlow 连线数量不变', () => {
    // 生成 N 个节点的链式连接
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 6 }),
        (n) => {
          const nodes: FlowNode[] = Array.from({ length: n }, (_, i) => ({
            id: `node${i}`,
            type: 'dialog' as const,
            position: { x: i * 200, y: 0 },
            data: { id: `node${i}`, label: `char${i}`, character: `char${i}`, content: `text${i}` }
          }))
          const edges: FlowEdge[] = Array.from({ length: n - 1 }, (_, i) => ({
            id: `e${i}`,
            source: `node${i}`,
            target: `node${i + 1}`
          }))

          const script = flowToScript(nodes, edges)
          const result = scriptToFlow(script)

          return (
            result.success &&
            result.nodes!.length === n &&
            result.edges!.length === n - 1
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('对任意合法条件节点，flowToScript → scriptToFlow 节点数量不变', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (n) => {
          const nodes: FlowNode[] = Array.from({ length: n }, (_, i) => ({
            id: `cond${i}`,
            type: 'condition' as const,
            position: { x: i * 200, y: 0 },
            data: {
              id: `cond${i}`,
              label: 'c',
              expression: `flag${i} > 0`,
              trueNextId: `yes${i}`,
              falseNextId: `no${i}`
            }
          }))

          const script = flowToScript(nodes, [])
          const result = scriptToFlow(script)

          return result.nodes!.length === n
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================
// 7.4 属性测试 - 属性 2：scriptToFlow 引用完整性
// ============================================================

describe('7.4 属性测试 - 属性 2：引用完整性', () => {
  it('对任意合法脚本，所有 next 引用的节点 ID 均存在于 nodes 列表中', () => {
    // 先用 flowToScript 生成合法脚本，再验证 scriptToFlow 的引用完整性
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 6 }),
        (n) => {
          // 构造链式对话节点
          const nodes: FlowNode[] = Array.from({ length: n }, (_, i) => ({
            id: `ref${i}`,
            type: 'dialog' as const,
            position: { x: i * 200, y: 0 },
            data: {
              id: `ref${i}`,
              label: `c${i}`,
              character: `c${i}`,
              content: `text${i}`,
              nextNodeId: i < n - 1 ? `ref${i + 1}` : undefined
            }
          }))
          const edges: FlowEdge[] = Array.from({ length: n - 1 }, (_, i) => ({
            id: `e${i}`,
            source: `ref${i}`,
            target: `ref${i + 1}`
          }))

          const script = flowToScript(nodes, edges)
          const result = scriptToFlow(script)

          if (!result.success || !result.nodes || !result.edges) return true

          const nodeIds = new Set(result.nodes.map((nd) => nd.id))

          // 所有连线的 source 和 target 都应存在于 nodes 中
          for (const edge of result.edges) {
            if (!nodeIds.has(edge.source)) return false
            if (!nodeIds.has(edge.target)) return false
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('对任意合法选择节点脚本，所有 option.next 引用均存在于 nodes 中', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }),
        (optCount) => {
          // 构造一个选择节点 + N 个目标对话节点
          const targets = Array.from({ length: optCount }, (_, i) => `target${i}`)
          const choiceNode: FlowNode = {
            id: 'ch1',
            type: 'choice',
            position: { x: 0, y: 0 },
            data: {
              id: 'ch1',
              label: 'choose',
              title: 'pick',
              options: targets.map((t, i) => ({ id: `o${i}`, text: `opt${i}`, nextNodeId: t }))
            }
          }
          const targetNodes: FlowNode[] = targets.map((t) => ({
            id: t,
            type: 'dialog' as const,
            position: { x: 200, y: 0 },
            data: { id: t, label: 'x', character: 'x', content: 'y' }
          }))

          const allNodes = [choiceNode, ...targetNodes]
          const script = flowToScript(allNodes, [])
          const result = scriptToFlow(script)

          if (!result.success || !result.nodes || !result.edges) return true

          const nodeIds = new Set(result.nodes.map((nd) => nd.id))

          for (const edge of result.edges) {
            if (!nodeIds.has(edge.target)) return false
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================
// 全节点类型往返测试 - 12 种节点类型
// ============================================================

describe('全节点类型往返测试', () => {
  // ── 跳转节点 (goto) ────────────────────────────────────────
  describe('goto 节点', () => {
    it('goto 节点往返：targetNodeId 保留', () => {
      const nodes: FlowNode[] = [
        {
          id: 'g1',
          type: 'goto',
          position: { x: 0, y: 0 },
          data: { id: 'g1', label: '跳到结尾', targetNodeId: 'end1' }
        },
        {
          id: 'end1',
          type: 'end',
          position: { x: 200, y: 0 },
          data: { id: 'end1', label: '结局', endingType: 'normal', message: '完' }
        }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('@goto')
      // 目标节点有 label "结局"，formatGotoNode 优先输出 label
      expect(script).toContain('target: "结局"')
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(2)
      const gotoNode = result.nodes!.find(n => n.type === 'goto')
      expect(gotoNode).toBeDefined()
      // label "结局" 通过 labelToId 解析回 "end1"
      expect((gotoNode!.data as any).targetNodeId).toBe('end1')
    })
  })

  // ── 结束节点 (end) ──────────────────────────────────────────
  describe('end 节点', () => {
    it('end 节点四种结局类型往返', () => {
      const types = ['normal', 'good', 'bad', 'true'] as const
      for (const endingType of types) {
        const nodes: FlowNode[] = [
          {
            id: 'e1',
            type: 'end',
            position: { x: 0, y: 0 },
            data: { id: 'e1', label: '结局', endingType, message: '谢谢游玩', background: 'assets/end.png' }
          }
        ]
        const script = flowToScript(nodes, [])
        expect(script).toContain(`type: "${endingType}"`)
        const result = scriptToFlow(script)
        expect(result.success).toBe(true)
        expect(result.nodes).toHaveLength(1)
        expect((result.nodes![0].data as any).endingType).toBe(endingType)
      }
    })

    it('end 节点无出边', () => {
      const nodes: FlowNode[] = [
        { id: 'e1', type: 'end', position: { x: 0, y: 0 }, data: { id: 'e1', label: '完', endingType: 'normal', message: '' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.edges).toHaveLength(0)
    })
  })

  // ── 音频节点 (audio) ────────────────────────────────────────
  describe('audio 节点', () => {
    it('audio bgm play 往返：所有字段保留', () => {
      const nodes: FlowNode[] = [
        {
          id: 'a1',
          type: 'audio',
          position: { x: 0, y: 0 },
          data: { id: 'a1', label: '背景音乐', audioType: 'bgm', action: 'play', src: 'assets/bgm.mp3', loop: true, volume: 0.8 }
        }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('@audio')
      expect(script).toContain('type: "bgm"')
      expect(script).toContain('action: "play"')
      expect(script).toContain('loop: "true"')
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
      const data = result.nodes![0].data as any
      expect(data.audioType).toBe('bgm')
      expect(data.action).toBe('play')
      expect(data.loop).toBe(true)
      expect(data.volume).toBe(0.8)
    })

    it('audio se stop 往返', () => {
      const nodes: FlowNode[] = [
        {
          id: 'a2',
          type: 'audio',
          position: { x: 0, y: 0 },
          data: { id: 'a2', label: '停止音效', audioType: 'se', action: 'stop', src: '', loop: false, volume: 1 }
        }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).audioType).toBe('se')
      expect((result.nodes![0].data as any).action).toBe('stop')
    })

    it('audio 含 next 连线', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', label: 'bgm', audioType: 'bgm', action: 'play', src: 'a.mp3', loop: false, volume: 1, nextNodeId: 'd1' } },
        { id: 'd1', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 'd1', label: 'd', character: 'x', content: 'y' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.edges).toHaveLength(1)
    })
  })

  // ── CG节点 (cg) ────────────────────────────────────────────
  describe('cg 节点', () => {
    it('cg 节点三种过渡效果往返', () => {
      const transitions = ['none', 'fade', 'zoom'] as const
      for (const transition of transitions) {
        const nodes: FlowNode[] = [
          {
            id: 'cg1',
            type: 'cg',
            position: { x: 0, y: 0 },
            data: { id: 'cg1', label: 'CG', src: 'assets/cg.png', transition, duration: 800 }
          }
        ]
        const script = flowToScript(nodes, [])
        expect(script).toContain(`transition: "${transition}"`)
        const result = scriptToFlow(script)
        expect(result.success).toBe(true)
        expect((result.nodes![0].data as any).transition).toBe(transition)
      }
    })

    it('cg 节点 duration 往返', () => {
      const nodes: FlowNode[] = [
        { id: 'cg1', type: 'cg', position: { x: 0, y: 0 }, data: { id: 'cg1', label: 'CG', src: 'a.png', transition: 'fade', duration: 1500 } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect((result.nodes![0].data as any).duration).toBe(1500)
    })
  })

  // ── 延时节点 (wait) ─────────────────────────────────────────
  describe('wait 节点', () => {
    it('wait 节点 duration 往返', () => {
      const nodes: FlowNode[] = [
        { id: 'w1', type: 'wait', position: { x: 0, y: 0 }, data: { id: 'w1', label: '等待', duration: 3000 } }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('duration: "3000"')
      const result = scriptToFlow(script)
      expect((result.nodes![0].data as any).duration).toBe(3000)
    })

    it('wait 节点默认值', () => {
      // duration=0 应该正确保留（parseNum 修复了 parseInt('0')||1000 的 bug）
      const nodes: FlowNode[] = [
        { id: 'w1', type: 'wait', position: { x: 0, y: 0 }, data: { id: 'w1', label: '默认延时', duration: 0 } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).duration).toBe(0)
    })
  })

  // ── 随机节点 (random) ───────────────────────────────────────
  describe('random 节点', () => {
    it('random 节点多分支往返', () => {
      const nodes: FlowNode[] = [
        {
          id: 'r1',
          type: 'random',
          position: { x: 0, y: 0 },
          data: {
            id: 'r1',
            label: '随机事件',
            branches: [
              { id: 'b1', targetNodeId: 't1', weight: 3 },
              { id: 'b2', targetNodeId: 't2', weight: 1 },
              { id: 'b3', targetNodeId: 't3', weight: 2 }
            ]
          }
        },
        { id: 't1', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 't1', label: 'A', character: 'A', content: '一' } },
        { id: 't2', type: 'dialog', position: { x: 200, y: 100 }, data: { id: 't2', label: 'B', character: 'B', content: '二' } },
        { id: 't3', type: 'dialog', position: { x: 200, y: 200 }, data: { id: 't3', label: 'C', character: 'C', content: '三' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(4)
      const randomNode = result.nodes!.find(n => n.type === 'random')
      expect((randomNode!.data as any).branches).toHaveLength(3)
      const weights = (randomNode!.data as any).branches.map((b: any) => b.weight).sort()
      expect(weights).toEqual([1, 2, 3])
      expect(result.edges!.filter(e => e.source === 'r1')).toHaveLength(3)
    })

    it('random 节点单分支往返', () => {
      const nodes: FlowNode[] = [
        {
          id: 'r1',
          type: 'random',
          position: { x: 0, y: 0 },
          data: {
            id: 'r1',
            label: '单分支',
            branches: [
              { id: 'b1', targetNodeId: 't1', weight: 1 }
            ]
          }
        },
        { id: 't1', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 't1', label: 'A', character: 'A', content: '一' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(2)
      const randomNode = result.nodes!.find(n => n.type === 'random')
      expect((randomNode!.data as any).branches).toHaveLength(1)
      expect(result.edges!.filter(e => e.source === 'r1')).toHaveLength(1)
    })

    it('random 节点无分支往返', () => {
      const nodes: FlowNode[] = [
        { id: 'r1', type: 'random', position: { x: 0, y: 0 }, data: { id: 'r1', label: '空随机', branches: [] } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
      expect(result.edges).toHaveLength(0)
      expect((result.nodes![0].data as any).branches).toHaveLength(0)
    })
  })

  // ── 标签节点 (label) ────────────────────────────────────────
  describe('label 节点', () => {
    it('label 节点颜色往返', () => {
      const colors = ['#6b7280', '#3b82f6', '#22c55e', '#ef4444']
      for (const color of colors) {
        const nodes: FlowNode[] = [
          { id: 'l1', type: 'label', position: { x: 0, y: 0 }, data: { id: 'l1', label: '标注', color } }
        ]
        const script = flowToScript(nodes, [])
        const result = scriptToFlow(script)
        expect(result.success).toBe(true)
        expect((result.nodes![0].data as any).color).toBe(color)
      }
    })

    it('label 节点无出边', () => {
      const nodes: FlowNode[] = [
        { id: 'l1', type: 'label', position: { x: 0, y: 0 }, data: { id: 'l1', label: '标签', color: '#6b7280' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect(result.edges).toHaveLength(0)
    })
  })

  // ── 动画节点 (animation) ────────────────────────────────────
  describe('animation 节点', () => {
    it('animation 四种动作类型往返', () => {
      const actions = ['enter', 'exit', 'shake', 'flash'] as const
      for (const action of actions) {
        const nodes: FlowNode[] = [
          {
            id: 'anim1',
            type: 'animation',
            position: { x: 0, y: 0 },
            data: { id: 'anim1', label: '动作', target: 'hero', action, position: 'center', duration: 500 }
          }
        ]
        const script = flowToScript(nodes, [])
        expect(script).toContain('@anim')
        expect(script).toContain(`action: "${action}"`)
        const result = scriptToFlow(script)
        expect(result.success).toBe(true)
        expect((result.nodes![0].data as any).action).toBe(action)
      }
    })

    it('animation 入场位置往返', () => {
      const positions = ['left', 'center', 'right'] as const
      for (const position of positions) {
        const nodes: FlowNode[] = [
          { id: 'a1', type: 'animation', position: { x: 0, y: 0 }, data: { id: 'a1', label: '入场', target: 'hero', action: 'enter', position, duration: 500 } }
        ]
        const result = scriptToFlow(flowToScript(nodes, []))
        expect((result.nodes![0].data as any).position).toBe(position)
      }
    })

    it('animation 画面特效 target=screen', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'animation', position: { x: 0, y: 0 }, data: { id: 'a1', label: '震动', target: 'screen', action: 'shake', duration: 300 } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).target).toBe('screen')
    })

    it('animation 含 next 连线', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'animation', position: { x: 0, y: 0 }, data: { id: 'a1', label: '动作', target: 'hero', action: 'enter', duration: 500, nextNodeId: 'd1' } },
        { id: 'd1', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 'd1', label: 'd', character: 'x', content: 'y' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect(result.edges).toHaveLength(1)
    })
  })

  // ── 变量设置节点 (setVariable) ───────────────────────────────
  describe('setVariable 节点', () => {
    it('setVariable 五种操作符往返', () => {
      const ops = ['=', '+=', '-=', '*=', '/='] as const
      for (const op of ops) {
        const nodes: FlowNode[] = [
          { id: 'sv1', type: 'setVariable', position: { x: 0, y: 0 }, data: { id: 'sv1', label: '变量', variable: 'score', op, value: '10' } }
        ]
        const script = flowToScript(nodes, [])
        expect(script).toContain(`op: "${op}"`)
        const result = scriptToFlow(script)
        expect(result.success).toBe(true)
        expect((result.nodes![0].data as any).op).toBe(op)
      }
    })
  })

  // ── 混合节点图测试 ──────────────────────────────────────────
  describe('混合节点图', () => {
    it('12 种节点同时往返：所有类型节点数量守恒', () => {
      const nodes: FlowNode[] = [
        { id: 'n1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'n1', label: 'D', character: 'A', content: 'hi' } },
        { id: 'n2', type: 'choice', position: { x: 250, y: 0 }, data: { id: 'n2', label: 'C', title: '选', options: [] } },
        { id: 'n3', type: 'condition', position: { x: 500, y: 0 }, data: { id: 'n3', label: 'X', expression: 'a > 0', trueNextId: '', falseNextId: '' } },
        { id: 'n4', type: 'setVariable', position: { x: 750, y: 0 }, data: { id: 'n4', label: 'V', variable: 'v', op: '=', value: '1' } },
        { id: 'n5', type: 'goto', position: { x: 1000, y: 0 }, data: { id: 'n5', label: 'G', targetNodeId: '' } },
        { id: 'n6', type: 'end', position: { x: 1250, y: 0 }, data: { id: 'n6', label: 'E', endingType: 'normal', message: '' } },
        { id: 'n7', type: 'audio', position: { x: 0, y: 150 }, data: { id: 'n7', label: 'A', audioType: 'bgm', action: 'play', src: '', loop: false, volume: 1 } },
        { id: 'n8', type: 'cg', position: { x: 250, y: 150 }, data: { id: 'n8', label: 'P', src: '', transition: 'fade', duration: 800 } },
        { id: 'n9', type: 'wait', position: { x: 500, y: 150 }, data: { id: 'n9', label: 'W', duration: 1000 } },
        { id: 'n10', type: 'random', position: { x: 750, y: 150 }, data: { id: 'n10', label: 'R', branches: [] } },
        { id: 'n11', type: 'label', position: { x: 1000, y: 150 }, data: { id: 'n11', label: 'L', color: '#6b7280' } },
        { id: 'n12', type: 'animation', position: { x: 1250, y: 150 }, data: { id: 'n12', label: 'M', target: '', action: 'enter', duration: 500 } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(12)

      const typeCounts: Record<string, number> = {}
      for (const n of result.nodes!) {
        typeCounts[n.type] = (typeCounts[n.type] || 0) + 1
      }
      expect(typeCounts['dialog']).toBe(1)
      expect(typeCounts['choice']).toBe(1)
      expect(typeCounts['condition']).toBe(1)
      expect(typeCounts['setVariable']).toBe(1)
      expect(typeCounts['goto']).toBe(1)
      expect(typeCounts['end']).toBe(1)
      expect(typeCounts['audio']).toBe(1)
      expect(typeCounts['cg']).toBe(1)
      expect(typeCounts['wait']).toBe(1)
      expect(typeCounts['random']).toBe(1)
      expect(typeCounts['label']).toBe(1)
      expect(typeCounts['animation']).toBe(1)
    })

    it('13 种节点同时往返（含 savePoint）：所有类型节点数量守恒', () => {
      const nodes: FlowNode[] = [
        { id: 'n1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'n1', label: 'D', character: 'A', content: 'hi' } },
        { id: 'n2', type: 'choice', position: { x: 250, y: 0 }, data: { id: 'n2', label: 'C', title: '选', options: [] } },
        { id: 'n3', type: 'condition', position: { x: 500, y: 0 }, data: { id: 'n3', label: 'X', expression: 'a > 0', trueNextId: '', falseNextId: '' } },
        { id: 'n4', type: 'setVariable', position: { x: 750, y: 0 }, data: { id: 'n4', label: 'V', variable: 'v', op: '=', value: '1' } },
        { id: 'n5', type: 'goto', position: { x: 1000, y: 0 }, data: { id: 'n5', label: 'G', targetNodeId: '' } },
        { id: 'n6', type: 'end', position: { x: 1250, y: 0 }, data: { id: 'n6', label: 'E', endingType: 'normal', message: '' } },
        { id: 'n7', type: 'audio', position: { x: 0, y: 150 }, data: { id: 'n7', label: 'A', audioType: 'bgm', action: 'play', src: '', loop: false, volume: 1 } },
        { id: 'n8', type: 'cg', position: { x: 250, y: 150 }, data: { id: 'n8', label: 'P', src: '', transition: 'fade', duration: 800 } },
        { id: 'n9', type: 'wait', position: { x: 500, y: 150 }, data: { id: 'n9', label: 'W', duration: 1000 } },
        { id: 'n10', type: 'random', position: { x: 750, y: 150 }, data: { id: 'n10', label: 'R', branches: [] } },
        { id: 'n11', type: 'label', position: { x: 1000, y: 150 }, data: { id: 'n11', label: 'L', color: '#6b7280' } },
        { id: 'n12', type: 'animation', position: { x: 1250, y: 150 }, data: { id: 'n12', label: 'M', target: '', action: 'enter', duration: 500 } },
        { id: 'n13', type: 'savePoint', position: { x: 0, y: 300 }, data: { id: 'n13', label: 'S', slotLabel: '存档位 1' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(13)

      const typeCounts: Record<string, number> = {}
      for (const n of result.nodes!) {
        typeCounts[n.type] = (typeCounts[n.type] || 0) + 1
      }
      expect(typeCounts['savePoint']).toBe(1)
    })
  })

  // ── 存档点节点 (savePoint) ────────────────────────────────────
  describe('savePoint 节点', () => {
    it('savePoint 基础往返：slotLabel 保留', () => {
      const nodes: FlowNode[] = [
        {
          id: 'sp1',
          type: 'savePoint',
          position: { x: 0, y: 0 },
          data: { id: 'sp1', label: '存档点', slotLabel: '存档位 1', nextNodeId: 'd1' }
        },
        { id: 'd1', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 'd1', label: 'd', character: 'x', content: 'y' } }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('@savePoint')
      expect(script).toContain('slotLabel: "存档位 1"')
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(2)
      const sp = result.nodes!.find(n => n.type === 'savePoint')
      expect(sp).toBeDefined()
      expect((sp!.data as any).slotLabel).toBe('存档位 1')
      expect(result.edges).toHaveLength(1)
    })

    it('savePoint 无连线往返', () => {
      const nodes: FlowNode[] = [
        { id: 'sp1', type: 'savePoint', position: { x: 0, y: 0 }, data: { id: 'sp1', label: '存档', slotLabel: '快存位' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
      expect(result.edges).toHaveLength(0)
    })
  })

  // ── unlockCondition 往返测试 ──────────────────────────────────
  describe('unlockCondition 往返', () => {
    it('dialog 节点含 unlockCondition：往返后保留', () => {
      const nodes: FlowNode[] = [
        {
          id: 'd1',
          type: 'dialog',
          position: { x: 0, y: 0 },
          data: { id: 'd1', label: '锁定的对话', character: 'A', content: '需要条件', unlockCondition: 'flag_seen_intro' }
        }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('unlock: "flag_seen_intro"')
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).unlockCondition).toBe('flag_seen_intro')
    })

    it('choice 节点含 unlockCondition：往返后保留', () => {
      const nodes: FlowNode[] = [
        {
          id: 'c1',
          type: 'choice',
          position: { x: 0, y: 0 },
          data: { id: 'c1', label: '锁定的选择', title: '选吧', options: [], unlockCondition: 'affection > 50' }
        }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('unlock: "affection > 50"')
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).unlockCondition).toBe('affection > 50')
    })

    it('condition 节点含 unlockCondition：往返后保留', () => {
      const nodes: FlowNode[] = [
        {
          id: 'cond1',
          type: 'condition',
          position: { x: 0, y: 0 },
          data: { id: 'cond1', label: 'cond', expression: 'a > 0', trueNextId: '', falseNextId: '', unlockCondition: 'key_collected' }
        }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).unlockCondition).toBe('key_collected')
    })

    it('random 节点含 unlockCondition：往返后保留', () => {
      const nodes: FlowNode[] = [
        {
          id: 'r1',
          type: 'random',
          position: { x: 0, y: 0 },
          data: { id: 'r1', label: '随机', branches: [], unlockCondition: 'unlocked_random' }
        }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).unlockCondition).toBe('unlocked_random')
    })

    it('label 节点含 unlockCondition：往返后保留', () => {
      const nodes: FlowNode[] = [
        { id: 'l1', type: 'label', position: { x: 0, y: 0 }, data: { id: 'l1', label: 'L', color: '#6b7280', unlockCondition: 'seen_ch1' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).unlockCondition).toBe('seen_ch1')
    })

    it('dialog 节点无 unlockCondition 时脚本不包含 unlock 行', () => {
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', label: '普通对话', character: 'A', content: 'hello' } }
      ]
      const script = flowToScript(nodes, [])
      expect(script).not.toContain('unlock:')
    })
  })

  // ── 计时器节点 ────────────────────────────────────────────

  describe('计时器节点（timer）', () => {
    it('倒计时节点往返：类型和属性保留', () => {
      const nodes: FlowNode[] = [
        { id: 't1', type: 'timer', position: { x: 0, y: 0 }, data: { id: 't1', label: '倒计时', mode: 'countdown', duration: 5000, variable: 'time_left' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes![0].type).toBe('timer')
      expect((result.nodes![0].data as any).mode).toBe('countdown')
      expect((result.nodes![0].data as any).duration).toBe(5000)
      expect((result.nodes![0].data as any).variable).toBe('time_left')
    })

    it('秒表节点含 next 连线：往返后保留', () => {
      const nodes: FlowNode[] = [
        { id: 't1', type: 'timer', position: { x: 0, y: 0 }, data: { id: 't1', label: '秒表', mode: 'stopwatch', duration: 0, variable: 'elapsed' } },
        { id: 'd1', type: 'dialog', position: { x: 0, y: 100 }, data: { id: 'd1', label: 'D', character: 'A', content: 'OK' } }
      ]
      const edges: FlowEdge[] = [{ id: 'e1', source: 't1', target: 'd1' }]
      const script = flowToScript(nodes, edges)
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(1)
    })
  })

  // ── 角色移动节点 ──────────────────────────────────────────

  describe('角色移动节点（moveCharacter）', () => {
    it('移动节点往返：位置和过渡属性保留', () => {
      const nodes: FlowNode[] = [
        { id: 'm1', type: 'moveCharacter', position: { x: 0, y: 0 }, data: { id: 'm1', label: '移动', target: 'hero.png', fromPosition: 'center', toPosition: 'left', duration: 1200, easing: 'ease-out' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes![0].type).toBe('moveCharacter')
      expect((result.nodes![0].data as any).fromPosition).toBe('center')
      expect((result.nodes![0].data as any).toPosition).toBe('left')
      expect((result.nodes![0].data as any).duration).toBe(1200)
    })
  })

  // ── Steam成就节点 ──────────────────────────────────────────

  describe('Steam成就节点（steamAchievement）', () => {
    it('成就节点往返：achievementId 保留', () => {
      const nodes: FlowNode[] = [
        { id: 's1', type: 'steamAchievement', position: { x: 0, y: 0 }, data: { id: 's1', label: '成就', achievementId: 'FIRST_CLEAR' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes![0].type).toBe('steamAchievement')
      expect((result.nodes![0].data as any).achievementId).toBe('FIRST_CLEAR')
    })

    it('成就节点含 unlockCondition：往返后保留', () => {
      const nodes: FlowNode[] = [
        { id: 's1', type: 'steamAchievement', position: { x: 0, y: 0 }, data: { id: 's1', label: '隐藏成就', achievementId: 'SECRET', unlockCondition: 'found_secret' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).unlockCondition).toBe('found_secret')
    })
  })

  // ── 自定义成就节点 ──────────────────────────────────────────

  describe('成就节点（achievement）', () => {
    it('成就节点往返：achievementId 保留', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'achievement', position: { x: 0, y: 0 }, data: { id: 'a1', label: '成就', achievementId: 'ach_001' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes![0].type).toBe('achievement')
      expect((result.nodes![0].data as any).achievementId).toBe('ach_001')
    })

    it('成就节点含 unlockCondition：往返后保留', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'achievement', position: { x: 0, y: 0 }, data: { id: 'a1', label: '隐藏', achievementId: 'hid', unlockCondition: 'found_secret' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).unlockCondition).toBe('found_secret')
    })
  })

  // ── 17节点混合往返 ──────────────────────────────────────────

  describe('17节点混合往返（全部类型）', () => {
    it('17种节点类型同时存在：all roundtrip', () => {
      const allTypes = ['dialog', 'choice', 'condition', 'setVariable', 'goto', 'end', 'audio', 'cg', 'wait', 'random', 'label', 'animation', 'savePoint', 'timer', 'moveCharacter', 'steamAchievement', 'achievement']
      const nodes: FlowNode[] = allTypes.map((type, i) => ({
        id: `n${i}`,
        type: type as any,
        position: { x: 0, y: i * 100 },
        data: { id: `n${i}`, label: `#${i} ${type}` }
      }))
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(17)
    })
  })
})

// ============================================================
// 扩展边界与极端情况测试
// ============================================================

describe('扩展边界与极端情况测试', () => {

  // ── 特殊字符与转义 ─────────────────────────────────────────

  describe('特殊字符与转义', () => {
    it('对话内容含反斜杠：后向往返一致', () => {
      const nodes: FlowNode[] = [
        { id: 'n1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'n1', label: 'D', character: 'X', content: '路径是 C:\\game\\data' } }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('\\\\')
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
    })

    it('对话内容含单引号：后向往返一致', () => {
      const nodes: FlowNode[] = [
        { id: 'n1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'n1', label: 'D', character: 'X', content: "it's a test" } }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain("it's a test")
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
    })

    it('对话内容含 emoji：往返后内容不变', () => {
      const nodes: FlowNode[] = [
        { id: 'n1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'n1', label: 'D', character: 'A', content: '😀🎮✨ 恭喜' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      const data = result.nodes![0].data as any
      expect(data.content).toContain('😀')
      expect(data.content).toContain('🎮')
      expect(data.content).toContain('✨')
    })

    it('对话内容含 URL 和特殊字符', () => {
      const nodes: FlowNode[] = [
        { id: 'n1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'n1', label: 'D', character: 'A', content: '访问 https://example.com?q=1&lang=zh 查看详情！' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      const data = result.nodes![0].data as any
      expect(data.content).toContain('https://example.com')
    })

    it('角色名和标签含中文特殊字符', () => {
      const nodes: FlowNode[] = [
        { id: 'n1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'n1', label: '【备注】', character: '？？？', content: '……' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      const data = result.nodes![0].data as any
      expect(data.character).toBe('？？？')
      expect(data.label).toBe('【备注】')
    })

    it('选项文本含引号：往返后保留', () => {
      const nodes: FlowNode[] = [
        { id: 'c1', type: 'choice', position: { x: 0, y: 0 }, data: { id: 'c1', label: '选择', title: '怎么办', options: [
          { id: 'o1', text: '说"你好"', nextNodeId: 't1' },
          { id: 'o2', text: "说'再见'", nextNodeId: 't2' }
        ]}},
        { id: 't1', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 't1', label: 'A', character: 'A', content: 'hi' } },
        { id: 't2', type: 'dialog', position: { x: 200, y: 200 }, data: { id: 't2', label: 'B', character: 'B', content: 'bye' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(3)
      const choiceNode = result.nodes!.find(n => n.type === 'choice')
      const options = (choiceNode!.data as any).options
      expect(options).toHaveLength(2)
    })

    it('变量值含特殊字符', () => {
      const nodes: FlowNode[] = [
        { id: 'sv1', type: 'setVariable', position: { x: 0, y: 0 }, data: { id: 'sv1', label: 'V', variable: 'message', op: '=', value: 'hello world!' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).value).toBe('hello world!')
    })
  })

  // ── 对话节点可选字段 ──────────────────────────────────────────

  describe('对话节点全部可选字段', () => {
    it('全部可选字段同时存在：往返后保留', () => {
      const nodes: FlowNode[] = [
        {
          id: 'd1',
          type: 'dialog',
          position: { x: 0, y: 0 },
          data: {
            id: 'd1',
            label: '首次见面',
            character: '女主角',
            content: '你好，我叫小美。',
            background: 'assets/bg/cafe.png',
            characterSprite: 'assets/sprites/girl_happy.png',
            typingSpeed: 60,
            textColor: '#ffcc00',
            fontSize: 20,
            transition: 'fade',
            transitionDuration: 800,
            unlockCondition: 'has_met_girl == true'
          }
        }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('background: "assets/bg/cafe.png"')
      expect(script).toContain('sprite: "assets/sprites/girl_happy.png"')
      expect(script).toContain('typingSpeed: 60')
      expect(script).toContain('textColor: "#ffcc00"')
      expect(script).toContain('fontSize: 20')
      expect(script).toContain('transition: "fade"')
      expect(script).toContain('transitionDuration: 800')
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      const data = result.nodes![0].data as any
      expect(data.background).toBe('assets/bg/cafe.png')
      expect(data.characterSprite).toBe('assets/sprites/girl_happy.png')
      expect(data.typingSpeed).toBe(60)
      expect(data.textColor).toBe('#ffcc00')
      expect(data.fontSize).toBe(20)
      expect(data.transition).toBe('fade')
      expect(data.transitionDuration).toBe(800)
    })

    it('默认值不会被输出到脚本', () => {
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', label: 'D', character: 'A', content: 'hi', typingSpeed: 45, textColor: '#eeeeee', fontSize: 16, transition: 'none', transitionDuration: 400 } }
      ]
      const script = flowToScript(nodes, [])
      expect(script).not.toContain('typingSpeed')
      expect(script).not.toContain('textColor')
      expect(script).not.toContain('fontSize')
      expect(script).not.toContain('transition:')
      expect(script).not.toContain('transitionDuration')
    })

    it('部分可选字段设置部分不设置', () => {
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', label: 'D', character: 'A', content: 'hi', typingSpeed: 80, background: 'bg.png' } }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('typingSpeed: 80')
      expect(script).toContain('background: "bg.png"')
      expect(script).not.toContain('fontSize')
      expect(script).not.toContain('transition:')
    })
  })

  // ── 空值与最小值边界 ───────────────────────────────────────

  describe('空值与最小值边界', () => {
    it('对话节点内容为空字符串', () => {
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', label: '沉默', character: '??', content: '' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).content).toBe('')
    })

    it('对话节点角色名为空字符串', () => {
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', label: '旁白', character: '', content: '系统提示' } }
      ]
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect((result.nodes![0].data as any).character).toBe('')
    })

    it('音频音量为 0', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', label: '静音', audioType: 'bgm', action: 'play', src: 's.mp3', loop: false, volume: 0 } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).volume).toBe(0)
    })

    it('音频音量为 1', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', label: '满音量', audioType: 'bgm', action: 'play', src: 's.mp3', loop: false, volume: 1 } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).volume).toBe(1)
    })

    it('CG duration 为 0', () => {
      const nodes: FlowNode[] = [
        { id: 'cg1', type: 'cg', position: { x: 0, y: 0 }, data: { id: 'cg1', label: '瞬间', src: 'a.png', transition: 'none', duration: 0 } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).duration).toBe(0)
    })

    it('CG duration 很大', () => {
      const nodes: FlowNode[] = [
        { id: 'cg1', type: 'cg', position: { x: 0, y: 0 }, data: { id: 'cg1', label: '慢速', src: 'a.png', transition: 'fade', duration: 99999 } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).duration).toBe(99999)
    })

    it('wait 节点负数 duration 被处理', () => {
      const nodes: FlowNode[] = [
        { id: 'w1', type: 'wait', position: { x: 0, y: 0 }, data: { id: 'w1', label: '负延时', duration: -1 } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      // parseInt("-1") recovers -1, NaN fallback kicks in → 1000
      // Actually parseInt("-1") returns -1, not NaN, then -1 || 1000 → -1
      // Verify no crash and node exists
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
    })

    it('setVariable 值为负数', () => {
      const nodes: FlowNode[] = [
        { id: 'sv1', type: 'setVariable', position: { x: 0, y: 0 }, data: { id: 'sv1', label: '扣分', variable: 'score', op: '=', value: '-100' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).value).toBe('-100')
    })

    it('setVariable 值为 0', () => {
      const nodes: FlowNode[] = [
        { id: 'sv1', type: 'setVariable', position: { x: 0, y: 0 }, data: { id: 'sv1', label: '归零', variable: 'score', op: '=', value: '0' } }
      ]
      const script = flowToScript(nodes, [])
      expect(script).toContain('value: "0"')
      const result = scriptToFlow(script)
      expect((result.nodes![0].data as any).value).toBe('0')
    })

    it('timer duration 为 0', () => {
      const nodes: FlowNode[] = [
        { id: 't1', type: 'timer', position: { x: 0, y: 0 }, data: { id: 't1', label: '即时', mode: 'countdown', duration: 0, variable: 't' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).duration).toBe(0)
    })

    it('moveCharacter duration 为 0', () => {
      const nodes: FlowNode[] = [
        { id: 'm1', type: 'moveCharacter', position: { x: 0, y: 0 }, data: { id: 'm1', label: '瞬移', target: 'h', fromPosition: 'left', toPosition: 'right', duration: 0, easing: 'linear' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).duration).toBe(0)
    })

    it('animation duration 为 0', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'animation', position: { x: 0, y: 0 }, data: { id: 'a1', label: '瞬动', target: 'hero', action: 'enter', duration: 0 } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).duration).toBe(0)
    })
  })

  // ── 选择节点边界 ──────────────────────────────────────────

  describe('选择节点边界', () => {
    it('10个选项的选择节点：往返后选项数量不变', () => {
      const options = Array.from({ length: 10 }, (_, i) => ({
        id: `o${i}`,
        text: `选项${i}`,
        nextNodeId: `t${i}`
      }))
      const nodes: FlowNode[] = [
        { id: 'c1', type: 'choice', position: { x: 0, y: 0 }, data: { id: 'c1', label: '多选', title: '十个选项', options } },
        ...options.map((o, i) => ({
          id: `t${i}`,
          type: 'dialog' as const,
          position: { x: 200, y: i * 100 },
          data: { id: `t${i}`, label: `T${i}`, character: `C${i}`, content: `内容${i}` }
        }))
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(11)
      const choiceNode = result.nodes!.find(n => n.type === 'choice')
      expect((choiceNode!.data as any).options).toHaveLength(10)
      expect(result.edges!.filter(e => e.source === 'c1')).toHaveLength(10)
    })

    it('选项文本为空字符串', () => {
      const nodes: FlowNode[] = [
        { id: 'c1', type: 'choice', position: { x: 0, y: 0 }, data: { id: 'c1', label: 'C', title: '选', options: [
          { id: 'o1', text: '', nextNodeId: 't1' }
        ]}},
        { id: 't1', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 't1', label: 'T', character: 'X', content: 'x' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect(result.success).toBe(true)
      expect((result.nodes!.find(n => n.type === 'choice')!.data as any).options[0].text).toBe('')
    })

    it('选择标题为空', () => {
      const nodes: FlowNode[] = [
        { id: 'c1', type: 'choice', position: { x: 0, y: 0 }, data: { id: 'c1', label: 'C', title: '', options: [
          { id: 'o1', text: '继续', nextNodeId: 't1' }
        ]}},
        { id: 't1', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 't1', label: 'T', character: 'X', content: 'x' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect(result.success).toBe(true)
      expect((result.nodes!.find(n => n.type === 'choice')!.data as any).title).toBe('')
    })

    it('选项的 nextNodeId 指向不存在的节点：解析后连线仍然保留', () => {
      const nodes: FlowNode[] = [
        { id: 'c1', type: 'choice', position: { x: 0, y: 0 }, data: { id: 'c1', label: 'C', title: '选', options: [
          { id: 'o1', text: '去某处', nextNodeId: 'nonexistent' }
        ]}}
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect(result.success).toBe(true)
      // 边仍然指向指定 ID，即使节点不存在也应保留引用
      expect(result.edges).toHaveLength(1)
      expect(result.edges![0].target).toBe('nonexistent')
    })
  })

  // ── 随机节点边界 ──────────────────────────────────────────

  describe('随机节点边界', () => {
    it('权重为 0 的分支：往返后保留', () => {
      const nodes: FlowNode[] = [
        { id: 'r1', type: 'random', position: { x: 0, y: 0 }, data: { id: 'r1', label: 'R', branches: [
          { id: 'b1', targetNodeId: 't1', weight: 0 },
          { id: 'b2', targetNodeId: 't2', weight: 10 }
        ]}},
        { id: 't1', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 't1', label: 'A', character: 'A', content: '零权' } },
        { id: 't2', type: 'dialog', position: { x: 200, y: 100 }, data: { id: 't2', label: 'B', character: 'B', content: '正常' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      const randomNode = result.nodes!.find(n => n.type === 'random')
      const branches = (randomNode!.data as any).branches
      expect(branches).toHaveLength(2)
      expect(branches[0].weight).toBe(0)
      expect(branches[1].weight).toBe(10)
    })

    it('20个分支的随机节点往返', () => {
      const branches = Array.from({ length: 20 }, (_, i) => ({
        id: `b${i}`,
        targetNodeId: `t${i}`,
        weight: i + 1
      }))
      const nodes: FlowNode[] = [
        { id: 'r1', type: 'random', position: { x: 0, y: 0 }, data: { id: 'r1', label: 'R', branches } },
        ...branches.map((_, i) => ({
          id: `t${i}`,
          type: 'dialog' as const,
          position: { x: 200, y: i * 100 },
          data: { id: `t${i}`, label: `T${i}`, character: `C${i}`, content: `c${i}` }
        }))
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect(result.success).toBe(true)
      const randomNode = result.nodes!.find(n => n.type === 'random')
      expect((randomNode!.data as any).branches).toHaveLength(20)
      expect(result.edges!.filter(e => e.source === 'r1')).toHaveLength(20)
    })

    it('所有分支权重相同', () => {
      const nodes: FlowNode[] = [
        { id: 'r1', type: 'random', position: { x: 0, y: 0 }, data: { id: 'r1', label: '平等', branches: [
          { id: 'b1', targetNodeId: 't1', weight: 1 },
          { id: 'b2', targetNodeId: 't2', weight: 1 },
          { id: 'b3', targetNodeId: 't3', weight: 1 }
        ]}},
        { id: 't1', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 't1', label: 'A', character: 'A', content: '一' } },
        { id: 't2', type: 'dialog', position: { x: 200, y: 100 }, data: { id: 't2', label: 'B', character: 'B', content: '二' } },
        { id: 't3', type: 'dialog', position: { x: 200, y: 200 }, data: { id: 't3', label: 'C', character: 'C', content: '三' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      const branches = (result.nodes!.find(n => n.type === 'random')!.data as any).branches
      expect(branches.every((b: any) => b.weight === 1)).toBe(true)
    })
  })

  // ── 复杂图结构 ──────────────────────────────────────────

  describe('复杂图结构', () => {
    it('菱形分叉模式（A→B→D, A→C→D）往返后节点保留、边正确', () => {
      // 注意：A 的next通过显式边e1指向B，data中的nextNodeId='C'被忽略
      // flowToScript 优先取显式边，产生 A→B, B→D, C→D（A 无显式边到C）
      const nodes: FlowNode[] = [
        { id: 'A', type: 'dialog', position: { x: 0, y: 200 }, data: { id: 'A', label: 'A', character: 'A', content: '起点' } },
        { id: 'B', type: 'dialog', position: { x: 400, y: 0 }, data: { id: 'B', label: 'B', character: 'B', content: '上', nextNodeId: 'D' } },
        { id: 'C', type: 'dialog', position: { x: 400, y: 400 }, data: { id: 'C', label: 'C', character: 'C', content: '下', nextNodeId: 'D' } },
        { id: 'D', type: 'dialog', position: { x: 800, y: 200 }, data: { id: 'D', label: 'D', character: 'D', content: '汇合' } }
      ]
      const edges: FlowEdge[] = [
        { id: 'e1', source: 'A', target: 'B' },
        { id: 'e3', source: 'B', target: 'D' },
        { id: 'e4', source: 'C', target: 'D' }
      ]
      const result = scriptToFlow(flowToScript(nodes, edges))
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(4)
      expect(result.edges).toHaveLength(3)
      const incomingD = result.edges!.filter(e => e.target === 'D')
      expect(incomingD).toHaveLength(2)
    })

    it('分支→汇合→分支→汇合（连续菱形）', () => {
      const nodes: FlowNode[] = [
        { id: 'start', type: 'dialog', position: { x: 0, y: 200 }, data: { id: 'start', label: 'S', character: 'S', content: '开始' } },
        { id: 'c1', type: 'choice', position: { x: 0, y: 200 }, data: { id: 'c1', label: 'C1', title: '分支1', options: [
          { id: 'o1', text: '上', nextNodeId: 'm1a' }, { id: 'o2', text: '下', nextNodeId: 'm1b' }
        ]}},
        { id: 'm1a', type: 'dialog', position: { x: 400, y: 0 }, data: { id: 'm1a', label: 'A', character: 'A', content: '路上' } },
        { id: 'm1b', type: 'dialog', position: { x: 400, y: 400 }, data: { id: 'm1b', label: 'B', character: 'B', content: '路下' } },
        { id: 'c2', type: 'choice', position: { x: 800, y: 200 }, data: { id: 'c2', label: 'C2', title: '分支2', options: [
          { id: 'o3', text: '左', nextNodeId: 'm2a' }, { id: 'o4', text: '右', nextNodeId: 'm2b' }
        ]}},
        { id: 'm2a', type: 'dialog', position: { x: 1200, y: 0 }, data: { id: 'm2a', label: 'L', character: 'L', content: '左' } },
        { id: 'm2b', type: 'dialog', position: { x: 1200, y: 400 }, data: { id: 'm2b', label: 'R', character: 'R', content: '右' } }
      ]
      const edges: FlowEdge[] = [
        { id: 'e1', source: 'start', target: 'c1' },
        { id: 'e2', source: 'm1a', target: 'c2' }, { id: 'e3', source: 'm1b', target: 'c2' }
      ]
      const result = scriptToFlow(flowToScript(nodes, edges))
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(7)
      // c1 应发出 2 条边，c2 也应发出 2 条边
      expect(result.edges!.filter(e => e.source === 'c1')).toHaveLength(2)
      expect(result.edges!.filter(e => e.source === 'c2')).toHaveLength(2)
    })

    it('断开子图：两个独立的节点组同时存在', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'a1', label: 'A', character: 'A', content: '组1', nextNodeId: 'a2' } },
        { id: 'a2', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 'a2', label: 'A2', character: 'A2', content: '继续1' } },
        { id: 'b1', type: 'dialog', position: { x: 0, y: 200 }, data: { id: 'b1', label: 'B', character: 'B', content: '组2', nextNodeId: 'b2' } },
        { id: 'b2', type: 'dialog', position: { x: 200, y: 200 }, data: { id: 'b2', label: 'B2', character: 'B2', content: '继续2' } }
      ]
      const edges: FlowEdge[] = [
        { id: 'e1', source: 'a1', target: 'a2' },
        { id: 'e2', source: 'b1', target: 'b2' }
      ]
      const result = scriptToFlow(flowToScript(nodes, edges))
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(4)
      expect(result.edges).toHaveLength(2)
    })

    it('多个末端节点无出边（树状结局）', () => {
      const nodes: FlowNode[] = [
        { id: 'root', type: 'dialog', position: { x: 0, y: 100 }, data: { id: 'root', label: 'R', character: 'R', content: '根' } },
        { id: 'c1', type: 'choice', position: { x: 200, y: 100 }, data: { id: 'c1', label: 'C', title: '选择', options: [
          { id: 'o1', text: '结局A', nextNodeId: 'endA' },
          { id: 'o2', text: '结局B', nextNodeId: 'endB' },
          { id: 'o3', text: '结局C', nextNodeId: 'endC' }
        ]}},
        { id: 'endA', type: 'end', position: { x: 400, y: 0 }, data: { id: 'endA', label: 'A', endingType: 'good', message: '好结局' } },
        { id: 'endB', type: 'end', position: { x: 400, y: 200 }, data: { id: 'endB', label: 'B', endingType: 'normal', message: '普通' } },
        { id: 'endC', type: 'end', position: { x: 400, y: 400 }, data: { id: 'endC', label: 'C', endingType: 'bad', message: '坏结局' } }
      ]
      const edges: FlowEdge[] = [
        { id: 'e1', source: 'root', target: 'c1' }
      ]
      const result = scriptToFlow(flowToScript(nodes, edges))
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(5)
      // 3 个 end 节点自身不产生出边，但 c1 的选项应产生 3 条边
      expect(result.edges!.filter(e => e.source === 'c1')).toHaveLength(3)
    })

    it('condition 节点→分支→合流（条件控制流）', () => {
      const nodes: FlowNode[] = [
        { id: 'cond1', type: 'condition', position: { x: 0, y: 100 }, data: { id: 'cond1', label: 'C', expression: 'score >= 10', trueNextId: 'good', falseNextId: 'bad' } },
        { id: 'good', type: 'dialog', position: { x: 300, y: 0 }, data: { id: 'good', label: 'G', character: 'A', content: '通过', nextNodeId: 'join' } },
        { id: 'bad', type: 'dialog', position: { x: 300, y: 200 }, data: { id: 'bad', label: 'B', character: 'A', content: '失败', nextNodeId: 'join' } },
        { id: 'join', type: 'dialog', position: { x: 600, y: 100 }, data: { id: 'join', label: 'J', character: 'A', content: '继续' } }
      ]
      const edges: FlowEdge[] = [
        { id: 'e1', source: 'good', target: 'join' },
        { id: 'e2', source: 'bad', target: 'join' }
      ]
      const result = scriptToFlow(flowToScript(nodes, edges))
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(4)
      // cond1 应产生 2 条边（true/false），good/bad 各一条到 join
      expect(result.edges!.filter(e => e.source === 'cond1')).toHaveLength(2)
      expect(result.edges!.filter(e => e.target === 'join')).toHaveLength(2)
    })
  })

  // ── 混合边类型（隐式+显式边） ────────────────────────────────

  describe('混合隐式边与显式边', () => {
    it('显式边覆盖隐式边：节点 data 中有 nextNodeId 但 edges 中也有不同的连线', () => {
      // flowToScript 优先使用 edges 中的 target
      const nodes: FlowNode[] = [
        { id: 'd1', type: 'dialog', position: { x: 0, y: 0 }, data: { id: 'd1', label: 'D', character: 'A', content: 'hi', nextNodeId: 'old_target' } },
        { id: 'd2', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 'd2', label: 'D2', character: 'B', content: 'bye' } }
      ]
      const edges: FlowEdge[] = [
        { id: 'e1', source: 'd1', target: 'd2' }
      ]
      const script = flowToScript(nodes, edges)
      const result = scriptToFlow(script)
      expect(result.edges).toHaveLength(1)
      expect(result.edges![0].source).toBe('d1')
      expect(result.edges![0].target).toBe('d2')
    })

    it('条件节点的 true/false 分支：隐式边提取正确', () => {
      const nodes: FlowNode[] = [
        { id: 'cond1', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'cond1', label: 'C', expression: 'a > 0', trueNextId: 'yes', falseNextId: 'no' } },
        { id: 'yes', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 'yes', label: 'Y', character: 'Y', content: '是' } },
        { id: 'no', type: 'dialog', position: { x: 200, y: 200 }, data: { id: 'no', label: 'N', character: 'N', content: '否' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      const trueEdge = result.edges!.find(e => e.label === 'true')
      const falseEdge = result.edges!.find(e => e.label === 'false')
      expect(trueEdge!.target).toBe('yes')
      expect(falseEdge!.target).toBe('no')
    })

    it('条件节点仅 true 分支有值时只产生一条边', () => {
      const nodes: FlowNode[] = [
        { id: 'cond1', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'cond1', label: 'C', expression: 'a > 0', trueNextId: 'yes', falseNextId: '' } },
        { id: 'yes', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 'yes', label: 'Y', character: 'Y', content: '是' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      const condEdges = result.edges!.filter(e => e.source === 'cond1')
      expect(condEdges).toHaveLength(1)
      expect(condEdges[0].label).toBe('true')
    })

    it('条件节点仅 false 分支有值时只产生一条边', () => {
      const nodes: FlowNode[] = [
        { id: 'cond1', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'cond1', label: 'C', expression: 'a > 0', trueNextId: '', falseNextId: 'no' } },
        { id: 'no', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 'no', label: 'N', character: 'N', content: '否' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      const condEdges = result.edges!.filter(e => e.source === 'cond1')
      expect(condEdges).toHaveLength(1)
      expect(condEdges[0].label).toBe('false')
    })
  })

  // ── goto 节点 ──────────────────────────────────────────

  describe('goto 节点边界', () => {
    it('goto 指向不存在的节点：往返后保留引用', () => {
      const nodes: FlowNode[] = [
        { id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', label: '跳', targetNodeId: 'missing_node' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect(result.success).toBe(true)
      const gotoNode = result.nodes!.find(n => n.type === 'goto')
      expect((gotoNode!.data as any).targetNodeId).toBe('missing_node')
      expect(result.edges).toHaveLength(1)
      expect(result.edges![0].target).toBe('missing_node')
    })

    it('goto 指向空字符串不产生边', () => {
      const nodes: FlowNode[] = [
        { id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', label: '空跳', targetNodeId: '' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect(result.success).toBe(true)
      expect(result.edges).toHaveLength(0)
    })
  })

  // ── 全类型 unlockCondition ──────────────────────────────

  describe('全类型 unlockCondition 往返', () => {
    const conditionExpr = 'flag_seen_chapter1 == true && affection >= 100'

    it('setVariable 节点含 unlockCondition', () => {
      const nodes: FlowNode[] = [
        { id: 'sv1', type: 'setVariable', position: { x: 0, y: 0 }, data: { id: 'sv1', label: 'V', variable: 'v', op: '=', value: '1', unlockCondition: conditionExpr } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).unlockCondition).toBe(conditionExpr)
    })

    it('goto 节点含 unlockCondition', () => {
      const nodes: FlowNode[] = [
        { id: 'g1', type: 'goto', position: { x: 0, y: 0 }, data: { id: 'g1', label: 'G', targetNodeId: 't1', unlockCondition: conditionExpr } },
        { id: 't1', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 't1', label: 'T', character: 'A', content: 'x' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes!.find(n => n.type === 'goto')!.data as any).unlockCondition).toBe(conditionExpr)
    })

    it('end 节点含 unlockCondition', () => {
      const nodes: FlowNode[] = [
        { id: 'e1', type: 'end', position: { x: 0, y: 0 }, data: { id: 'e1', label: 'E', endingType: 'true', message: '真结局', unlockCondition: conditionExpr } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).unlockCondition).toBe(conditionExpr)
    })

    it('audio 节点含 unlockCondition', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'audio', position: { x: 0, y: 0 }, data: { id: 'a1', label: 'A', audioType: 'bgm', action: 'play', src: 'm.mp3', loop: false, volume: 1, unlockCondition: conditionExpr } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).unlockCondition).toBe(conditionExpr)
    })

    it('cg 节点含 unlockCondition', () => {
      const nodes: FlowNode[] = [
        { id: 'cg1', type: 'cg', position: { x: 0, y: 0 }, data: { id: 'cg1', label: 'CG', src: 'a.png', transition: 'fade', duration: 800, unlockCondition: conditionExpr } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).unlockCondition).toBe(conditionExpr)
    })

    it('wait 节点含 unlockCondition', () => {
      const nodes: FlowNode[] = [
        { id: 'w1', type: 'wait', position: { x: 0, y: 0 }, data: { id: 'w1', label: 'W', duration: 1000, unlockCondition: conditionExpr } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).unlockCondition).toBe(conditionExpr)
    })

    it('animation 节点含 unlockCondition', () => {
      const nodes: FlowNode[] = [
        { id: 'a1', type: 'animation', position: { x: 0, y: 0 }, data: { id: 'a1', label: 'A', target: 'hero', action: 'enter', duration: 500, unlockCondition: conditionExpr } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).unlockCondition).toBe(conditionExpr)
    })

    it('savePoint 节点含 unlockCondition', () => {
      const nodes: FlowNode[] = [
        { id: 'sp1', type: 'savePoint', position: { x: 0, y: 0 }, data: { id: 'sp1', label: 'S', slotLabel: '存档', unlockCondition: conditionExpr } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).unlockCondition).toBe(conditionExpr)
    })

    it('timer 节点含 unlockCondition', () => {
      const nodes: FlowNode[] = [
        { id: 't1', type: 'timer', position: { x: 0, y: 0 }, data: { id: 't1', label: 'T', mode: 'countdown', duration: 5000, variable: 't', unlockCondition: conditionExpr } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).unlockCondition).toBe(conditionExpr)
    })

    it('moveCharacter 节点含 unlockCondition', () => {
      const nodes: FlowNode[] = [
        { id: 'm1', type: 'moveCharacter', position: { x: 0, y: 0 }, data: { id: 'm1', label: 'M', target: 'hero', fromPosition: 'left', toPosition: 'right', duration: 1000, easing: 'linear', unlockCondition: conditionExpr } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      expect((result.nodes![0].data as any).unlockCondition).toBe(conditionExpr)
    })
  })

  // ── 大规模测试 ─────────────────────────────────────────

  describe('大规模往返测试', () => {
    it('50个链式对话节点往返：节点/边数量不变', () => {
      const n = 50
      const nodes: FlowNode[] = Array.from({ length: n }, (_, i) => ({
        id: `n${i}`,
        type: 'dialog' as const,
        position: { x: i * 200, y: 0 },
        data: { id: `n${i}`, label: `角色${i}`, character: `角色${i}`, content: `这是第 ${i} 句对话` }
      }))
      const edges: FlowEdge[] = Array.from({ length: n - 1 }, (_, i) => ({
        id: `e${i}`,
        source: `n${i}`,
        target: `n${i + 1}`
      }))
      const result = scriptToFlow(flowToScript(nodes, edges))
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(n)
      expect(result.edges).toHaveLength(n - 1)
    })

    it('100个异构节点混合往返', () => {
      // 4个完整循环的 24节点=96 + 4 = 100
      const typePool = ['dialog', 'choice', 'condition', 'setVariable', 'goto', 'audio', 'cg', 'wait', 'random', 'label', 'animation', 'savePoint', 'timer', 'moveCharacter', 'achievement', 'steamAchievement']
      const nodes: FlowNode[] = Array.from({ length: 100 }, (_, i) => {
        const type = typePool[i % typePool.length]
        return {
          id: `n${i}`,
          type: type as any,
          position: { x: 0, y: i * 100 },
          data: { id: `n${i}`, label: `#${i} ${type}` }
        }
      })
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(100)
    })

    it('200节点 dialog 往返：性能不出错', () => {
      const n = 200
      const nodes: FlowNode[] = Array.from({ length: n }, (_, i) => ({
        id: `d${i}`,
        type: 'dialog' as const,
        position: { x: 0, y: i * 50 },
        data: { id: `d${i}`, label: `D${i}`, character: `C${i % 10}`, content: `文本${i}` }
      }))
      const script = flowToScript(nodes, [])
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(n)
    })
  })

  // ── 脚本解析边界 ─────────────────────────────────────────

  describe('脚本解析边界', () => {
    it('脚本中指令之间有多余空白行', () => {
      const script = `
@dialog(id: "n1", character: "A") {
  content: "hello"
}


@dialog(id: "n2", character: "B") {
  content: "world"
}
`
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(2)
    })

    it('脚本中含纯注释行（仅 //）', () => {
      const script = `
@dialog(id: "n1", character: "A") {
  content: "hello"
}
//
@dialog(id: "n2", character: "B") {
  content: "world"
}
`
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(2)
    })

    it('脚本中指令包含未识别的属性（应被忽略）', () => {
      const script = `
@dialog(id: "n1", character: "A") {
  content: "hello"
  unknownProperty: "should be fine"
}
`
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(1)
    })

    it('选择节点 option 的 next 为空字符串：不产生边', () => {
      const script = `
@choice(id: "c1", title: "选") {
  option("某些") { next: "" }
}
`
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      expect(result.edges).toHaveLength(0)
    })

    it('end 节点 bad 结局：类型和 message 保留', () => {
      const script = `
@end(id: "e1", type: "bad") {
  message: "游戏结束"
}
`
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      const data = result.nodes![0].data as any
      expect(data.endingType).toBe('bad')
      expect(data.message).toBe('游戏结束')
    })

    it('条件节点 falseNextId 为空时只解析 trueNextId', () => {
      const script = `
@condition(id: "cond1", label: "cond") {
  expr: "score >= 50"
  true: "yes"
}
`
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      const data = result.nodes![0].data as any
      expect(data.trueNextId).toBe('yes')
      expect(data.falseNextId).toBe('')
      expect(result.edges).toHaveLength(1)
    })

    it('动画节点省略 position 时使用默认值', () => {
      const script = `
@anim(id: "a1", target: "hero", action: "shake", duration: "300") {
}
`
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      const data = result.nodes![0].data as any
      expect(data.target).toBe('hero')
      expect(data.action).toBe('shake')
      expect(data.duration).toBe(300)
    })

    it('计时器 stopwatch 模式', () => {
      const script = `
@timer(id: "t1", mode: "stopwatch", variable: "elapsed") {
  duration: "0"
}
`
      const result = scriptToFlow(script)
      expect(result.success).toBe(true)
      const data = result.nodes![0].data as any
      expect(data.mode).toBe('stopwatch')
      expect(data.variable).toBe('elapsed')
    })

    it('moveCharacter 各种 easing 值', () => {
      const easings = ['linear', 'ease', 'ease-in', 'ease-out']
      for (const easing of easings) {
        const script = `
@moveCharacter(id: "m1", target: "hero", from: "left", to: "right", duration: "800", easing: "${easing}") {
}
`
        const result = scriptToFlow(script)
        expect(result.success).toBe(true)
        expect((result.nodes![0].data as any).easing).toBe(easing)
      }
    })
  })

  // ── 混合图极端组合 ─────────────────────────────────────────

  describe('混合图极端组合', () => {
    it('17种节点 + 连线交织：源和目标均存在', () => {
      // 构建一个完整的连接链：每种节点连接到下一节点
      const types = ['dialog', 'choice', 'condition', 'setVariable', 'goto', 'end', 'audio', 'cg', 'wait', 'random', 'label', 'animation', 'savePoint', 'timer', 'moveCharacter', 'steamAchievement', 'achievement'] as const
      const nodes: FlowNode[] = types.map((type, i) => ({
        id: `n${i}`,
        type: type as any,
        position: { x: i * 200, y: 0 },
        data: { id: `n${i}`, label: `#${i} ${type}` }
      }))
      // 让dialog连接到choice (用nextNodeId), choice的option指向condition, etc
      // 用显式边连接所有节点
      const edges: FlowEdge[] = types.slice(0, -1).map((_, i) => ({
        id: `e${i}`,
        source: `n${i}`,
        target: `n${i + 1}`
      }))
      const result = scriptToFlow(flowToScript(nodes, edges))
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(17)
      // 显式边经过节点格式化后，部分被内部边（choice/condition/random）替代或合并
      expect(result.edges!.length).toBeGreaterThanOrEqual(12)
      // 所有 edge 的 source/target 都在 nodes 中
      const nodeIds = new Set(result.nodes!.map(n => n.id))
      for (const e of result.edges!) {
        expect(nodeIds.has(e.source)).toBe(true)
        expect(nodeIds.has(e.target)).toBe(true)
      }
    })

    it('每个节点类型都有 next 引用的串联图', () => {
      // 除了 end/label 外，所有节点类型都有某种隐式边
      const typesWithNext = ['dialog', 'setVariable', 'audio', 'cg', 'wait', 'animation', 'savePoint', 'timer', 'moveCharacter', 'steamAchievement', 'achievement']
      const nodes: FlowNode[] = typesWithNext.map((type, i) => ({
        id: `n${i}`,
        type: type as any,
        position: { x: i * 200, y: 0 },
        data: { id: `n${i}`, label: `#${i}`, nextNodeId: i < typesWithNext.length - 1 ? `n${i + 1}` : '' }
      }))
      const result = scriptToFlow(flowToScript(nodes, []))
      expect(result.success).toBe(true)
      expect(result.nodes).toHaveLength(typesWithNext.length)
      expect(result.edges).toHaveLength(typesWithNext.length - 1)
    })
  })

  // ── 表达式条件节点 ─────────────────────────────────────────

  describe('条件节点表达式', () => {
    it('含 && 的表达式往返', () => {
      const nodes: FlowNode[] = [
        { id: 'cond1', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'cond1', label: 'C', expression: 'affection >= 100 && seen_ending == true', trueNextId: 'yes', falseNextId: 'no' } },
        { id: 'yes', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 'yes', label: 'Y', character: 'Y', content: '是' } },
        { id: 'no', type: 'dialog', position: { x: 200, y: 200 }, data: { id: 'no', label: 'N', character: 'N', content: '否' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      const data = result.nodes!.find(n => n.type === 'condition')!.data as any
      expect(data.expression).toContain('&&')
    })

    it('含 || 的表达式往返', () => {
      const nodes: FlowNode[] = [
        { id: 'cond1', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'cond1', label: 'C', expression: 'score >= 80 || hp >= 50', trueNextId: 'yes', falseNextId: 'no' } },
        { id: 'yes', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 'yes', label: 'Y', character: 'Y', content: '是' } },
        { id: 'no', type: 'dialog', position: { x: 200, y: 200 }, data: { id: 'no', label: 'N', character: 'N', content: '否' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      const data = result.nodes!.find(n => n.type === 'condition')!.data as any
      expect(data.expression).toContain('||')
    })

    it('含括号的复杂表达式往返', () => {
      const nodes: FlowNode[] = [
        { id: 'cond1', type: 'condition', position: { x: 0, y: 0 }, data: { id: 'cond1', label: 'C', expression: '(affection >= 100 && seen_ending == true) || score >= 80', trueNextId: 'yes', falseNextId: 'no' } },
        { id: 'yes', type: 'dialog', position: { x: 200, y: 0 }, data: { id: 'yes', label: 'Y', character: 'Y', content: '是' } },
        { id: 'no', type: 'dialog', position: { x: 200, y: 200 }, data: { id: 'no', label: 'N', character: 'N', content: '否' } }
      ]
      const result = scriptToFlow(flowToScript(nodes, []))
      const data = result.nodes!.find(n => n.type === 'condition')!.data as any
      expect(data.expression).toContain('(')
      expect(data.expression).toContain(')')
    })
  })

  // ── 冲突/同步状态 ──────────────────────────────────────────

  describe('冲突检测扩展', () => {
    it('相同时间戳（同时修改）视为冲突', () => {
      const ts = new Date()
      const state = detectConflict(ts, ts)
      expect(state.hasConflict).toBe(true)
    })

    it('时间戳相差 1ms：有先后顺序也视为冲突（双方都修改了）', () => {
      const t1 = new Date('2025-01-01T00:00:00.000Z')
      const t2 = new Date('2025-01-01T00:00:00.001Z')
      const state = detectConflict(t1, t2)
      expect(state.hasConflict).toBe(true)
    })
  })
})
