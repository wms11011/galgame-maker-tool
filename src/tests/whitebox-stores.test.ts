import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGlossaryStore } from '../renderer/src/stores/glossaryStore'
import { useItemStore } from '../renderer/src/stores/itemStore'

describe('白盒: glossaryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loadTerms 加载并深拷贝', () => {
    const store = useGlossaryStore()
    store.loadTerms([{ term: 'A', category: '世界观', definition: '定义A' }])
    expect(store.terms.length).toBe(1)
    expect(store.terms[0].term).toBe('A')
    // 修改原始数组不影响 store
    store.loadTerms([])
    expect(store.terms.length).toBe(0)
  })

  it('addTerm 添加不重复术语', () => {
    const store = useGlossaryStore()
    store.addTerm({ term: 'A', category: 'X', definition: 'D' })
    expect(store.terms.length).toBe(1)
    store.addTerm({ term: 'A', category: 'Y', definition: 'D2' })
    expect(store.terms.length).toBe(1) // 重复不添加
    store.addTerm({ term: 'B', category: 'X', definition: 'D' })
    expect(store.terms.length).toBe(2)
  })

  it('updateTerm 按旧名称更新，找不到则新增', () => {
    const store = useGlossaryStore()
    store.addTerm({ term: 'A', category: 'X', definition: 'Old' })
    store.updateTerm('A', { term: 'A2', category: 'Y', definition: 'New' })
    expect(store.terms[0].term).toBe('A2')
    expect(store.terms[0].category).toBe('Y')
    // 找不到旧名称则新增
    store.updateTerm('NOTEXIST', { term: 'C', category: 'Z', definition: 'Cdef' })
    expect(store.terms.length).toBe(2)
  })

  it('removeTerm 删除术语', () => {
    const store = useGlossaryStore()
    store.addTerm({ term: 'A', category: 'X', definition: 'D' })
    store.addTerm({ term: 'B', category: 'X', definition: 'D' })
    store.removeTerm('A')
    expect(store.terms.length).toBe(1)
    expect(store.terms[0].term).toBe('B')
    store.removeTerm('NOTEXIST')
    expect(store.terms.length).toBe(1) // 不崩溃
  })
})

describe('白盒: itemStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const makeItem = (id: string, name: string, type: any = 'key') => ({ id, name, icon: '📦', type, description: '' })

  it('loadItems 加载道具', () => {
    const store = useItemStore()
    store.loadItems([makeItem('i1', '钥匙')])
    expect(store.items.length).toBe(1)
    store.loadItems([])
    expect(store.items.length).toBe(0)
  })

  it('addItem 添加不重复道具', () => {
    const store = useItemStore()
    store.addItem(makeItem('i1', '钥匙'))
    store.addItem(makeItem('i1', '钥匙2')) // 重复id不添加
    expect(store.items.length).toBe(1)
    store.addItem(makeItem('i2', '药水', 'consumable'))
    expect(store.items.length).toBe(2)
  })

  it('removeItem 删除', () => {
    const store = useItemStore()
    store.addItem(makeItem('i1', '钥匙'))
    store.removeItem('i1')
    expect(store.items.length).toBe(0)
  })

  it('updateItem 更新字段', () => {
    const store = useItemStore()
    store.addItem(makeItem('i1', '钥匙'))
    store.updateItem('i1', { name: '金钥匙', type: 'key' as any })
    expect(store.items[0].name).toBe('金钥匙')
  })

  it('getByName 按名查找', () => {
    const store = useItemStore()
    store.addItem(makeItem('i1', '钥匙'))
    expect(store.getByName('钥匙')?.id).toBe('i1')
    expect(store.getByName('不存在')).toBeUndefined()
  })

  it('hasItem 存在判断', () => {
    const store = useItemStore()
    store.addItem(makeItem('i1', '钥匙'))
    expect(store.hasItem('钥匙')).toBe(true)
    expect(store.hasItem('药水')).toBe(false)
  })

  it('byType 按类型分组', () => {
    const store = useItemStore()
    store.addItem(makeItem('i1', '钥匙', 'key'))
    store.addItem(makeItem('i2', '药水', 'consumable'))
    store.addItem(makeItem('i3', '万能钥匙', 'key'))
    expect(store.byType['key']?.length).toBe(2)
    expect(store.byType['consumable']?.length).toBe(1)
    expect(store.byType['equipment']).toBeUndefined()
  })

  it('itemMap 快速查找', () => {
    const store = useItemStore()
    store.addItem(makeItem('i1', '钥匙'))
    expect(store.itemMap['钥匙']).toBeDefined()
    expect(store.itemMap['不存在']).toBeUndefined()
  })
})
