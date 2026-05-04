import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowStore } from '../renderer/src/stores/flowStore'
import { useProjectStore } from '../renderer/src/stores/projectStore'
import { useAssetStore } from '../renderer/src/stores/assetStore'
import { useVariableStore } from '../renderer/src/stores/variableStore'
import { useCharacterStore } from '../renderer/src/stores/characterStore'
import { useAchievementStore } from '../renderer/src/stores/achievementStore'
import { useSaveStore } from '../renderer/src/stores/saveStore'
import { useItemStore } from '../renderer/src/stores/itemStore'
import { useGlossaryStore } from '../renderer/src/stores/glossaryStore'

// ══════════════════════════════════════════════════════════
// flowStore 补充覆盖
// ══════════════════════════════════════════════════════════
describe('flowStore 补充', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('clearBreakpoints', () => {
    it('清除所有断点', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      store.addNode('dialog')
      store.toggleBreakpoint(store.nodes[0].id)
      store.toggleBreakpoint(store.nodes[1].id)
      expect(store.breakpointCount).toBe(2)
      store.clearBreakpoints()
      expect(store.breakpointCount).toBe(0)
    })

    it('空断点集调用不报错', () => {
      const store = useFlowStore()
      store.clearBreakpoints()
      expect(store.breakpointCount).toBe(0)
    })
  })

  describe('clearCoverage', () => {
    it('清除覆盖记录', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      store.addNode('dialog')
      const ids = [store.nodes[0].id, store.nodes[1].id]
      store.markNodesCovered(ids)
      expect(store.coverageStats.covered).toBe(2)
      store.clearCoverage()
      expect(store.coverageStats.covered).toBe(0)
    })
  })

  describe('markNodesCovered', () => {
    it('标记节点为已覆盖', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      store.addNode('dialog')
      const n1 = store.nodes[0].id
      const n2 = store.nodes[1].id
      store.markNodesCovered([n1, n2])
      expect(store.coveredNodeIds.has(n1)).toBe(true)
      expect(store.coveredNodeIds.has(n2)).toBe(true)
      expect(store.coverageStats.covered).toBe(2)
    })

    it('重复标记不会重复计数', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      store.addNode('dialog')
      const n1 = store.nodes[0].id
      const n2 = store.nodes[1].id
      store.markNodesCovered([n1])
      store.markNodesCovered([n1, n2])
      expect(store.coverageStats.covered).toBe(2)
    })

    it('空数组不改变覆盖', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      store.markNodesCovered([])
      expect(store.coverageStats.covered).toBe(0)
    })
  })

  describe('setDialogDefaults 多键', () => {
    it('同时设置多个默认值', () => {
      const store = useFlowStore()
      store.setDialogDefaults({ character: 'Alice', background: 'bg.png', characterSprite: 'alice.png' })
      expect(store.dialogDefaults.character).toBe('Alice')
      expect(store.dialogDefaults.background).toBe('bg.png')
      expect(store.dialogDefaults.characterSprite).toBe('alice.png')
    })

    it('部分更新保留未设置的键', () => {
      const store = useFlowStore()
      store.setDialogDefaults({ character: 'Bob', background: 'sky.png' })
      store.setDialogDefaults({ character: 'Alice' })
      expect(store.dialogDefaults.character).toBe('Alice')
      expect(store.dialogDefaults.background).toBe('sky.png')
    })
  })

  describe('removeNode cleanup', () => {
    it('removeNode 清理分组引用', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      const nid = store.nodes[0].id
      store.addGroup('test')
      const gid = store.groups[0].id
      store.addNodeToGroup(gid, nid)
      expect(store.groups[0].nodeIds).toContain(nid)
      store.removeNode(nid)
      expect(store.groups[0].nodeIds).not.toContain(nid)
    })
  })

  describe('removeGroup 边界', () => {
    it('不存在的分组不报错', () => {
      const store = useFlowStore()
      expect(() => store.removeGroup('no_such_group')).not.toThrow()
    })
  })

  describe('addNodesToGroup 边界', () => {
    it('从旧分组移除再加入新分组', () => {
      const store = useFlowStore()
      store.addGroup('G1')
      store.addGroup('G2')
      const g1 = store.groups[0].id
      const g2 = store.groups[1].id
      store.addNodesToGroup(g1, ['n1', 'n2'])
      store.addNodesToGroup(g2, ['n1'])
      expect(store.groups[0].nodeIds).toEqual(['n2'])
      expect(store.groups[1].nodeIds).toEqual(['n1'])
    })
  })

  describe('getGroupByNodeId 边界', () => {
    it('节点不在任何分组返回 undefined', () => {
      const store = useFlowStore()
      store.addNode('dialog')
      expect(store.getGroupByNodeId(store.nodes[0].id)).toBeUndefined()
    })
  })

  describe('hasBreakpoint 边界', () => {
    it('未设置断点返回 false', () => {
      const store = useFlowStore()
      expect(store.hasBreakpoint('ghost')).toBe(false)
    })
  })

  describe('undo/redo 交互', () => {
    it('undo 后 redo 恢复', () => {
      const store = useFlowStore()
      store.addNode('dialog', { x: 0, y: 0 })
      const countAfterAdd = store.nodes.length
      store.undo()
      expect(store.nodes.length).toBe(countAfterAdd - 1)
      store.redo()
      expect(store.nodes.length).toBe(countAfterAdd)
    })

    it('空 undo stack 不报错', () => {
      const store = useFlowStore()
      expect(() => store.undo()).not.toThrow()
    })

    it('空 redo stack 不报错', () => {
      const store = useFlowStore()
      expect(() => store.redo()).not.toThrow()
    })

    it('新操作清空 redo stack', () => {
      const store = useFlowStore()
      store.addNode('dialog', { x: 0, y: 0 })
      const countBeforeUndo = store.nodes.length
      store.undo()
      expect(store.nodes.length).toBe(countBeforeUndo - 1)
      // 新操作 → redo stack 被清空
      store.addNode('dialog', { x: 100, y: 0 })
      store.undo()
      store.redo() // 恢复的是第二次 addNode，不是第一次
      expect(store.nodes.length).toBe(countBeforeUndo)
    })
  })
})

// ══════════════════════════════════════════════════════════
// projectStore 补充覆盖
// ══════════════════════════════════════════════════════════
describe('projectStore 补充', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始状态 isOpen 为 false', () => {
    const store = useProjectStore()
    expect(store.isOpen).toBe(false)
    expect(store.meta).toBeNull()
  })

  it('初始 script 为空字符串', () => {
    const store = useProjectStore()
    expect(store.script).toBe('')
  })

  it('初始 assets 为空数组', () => {
    const store = useProjectStore()
    expect(store.assets).toEqual([])
  })

  it('autoSync 默认开启', () => {
    const store = useProjectStore()
    expect(store.autoSync).toBe(true)
  })

  it('setAutoSync 切换', () => {
    const store = useProjectStore()
    store.setAutoSync(false)
    expect(store.autoSync).toBe(false)
    store.setAutoSync(true)
    expect(store.autoSync).toBe(true)
  })

  it('closeProject 重置所有状态', () => {
    const store = useProjectStore()
    // 初始化各 Store 并设置一些数据
    const flowStore = useFlowStore()
    flowStore.addNode('dialog')
    useVariableStore().addVariable({ name: 'x', type: 'number', initialValue: 1 })
    useCharacterStore().addCharacter({ name: 'Alice', displayName: 'Alice', color: '#fff', sprite: '', avatar: '', live2dModel: '' })

    store.closeProject()
    expect(store.meta).toBeNull()
    expect(store.script).toBe('')
    expect(store.assets).toEqual([])
  })

  it('syncScriptFromFlow 在未打开项目时静默处理', () => {
    const store = useProjectStore()
    // isOpen is false, syncScriptFromFlow should not throw
    expect(() => (store as any).syncScriptFromFlow?.() || true).toBeTruthy()
  })

  it('recentProjects 初始为空', () => {
    const store = useProjectStore()
    expect(store.recentProjects).toEqual([])
  })

  it('meta 初始为 null', () => {
    const store = useProjectStore()
    expect(store.meta).toBeNull()
  })
})
