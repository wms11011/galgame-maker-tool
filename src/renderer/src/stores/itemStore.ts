import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ItemDef, ItemType } from '../types'

export const useItemStore = defineStore('item', () => {
  const items = ref<ItemDef[]>([])
  const isDirty = ref(false)

  const itemMap = computed(() => {
    const m: Record<string, ItemDef> = {}
    for (const item of items.value) m[item.name] = item
    return m
  })

  const byType = computed(() => {
    const m: Record<string, ItemDef[]> = {}
    for (const item of items.value) {
      if (!m[item.type]) m[item.type] = []
      m[item.type].push(item)
    }
    return m
  })

  function loadItems(data: ItemDef[]): void {
    items.value = data.map(i => ({ ...i }))
    isDirty.value = false
  }

  function addItem(item: ItemDef): void {
    if (items.value.some(i => i.id === item.id)) return
    items.value.push({ ...item })
    isDirty.value = true
  }

  function removeItem(id: string): void {
    items.value = items.value.filter(i => i.id !== id)
    isDirty.value = true
  }

  function updateItem(id: string, patch: Partial<ItemDef>): void {
    const item = items.value.find(i => i.id === id)
    if (item) { Object.assign(item, patch); isDirty.value = true }
  }

  function getByName(name: string): ItemDef | undefined {
    return items.value.find(i => i.name === name)
  }

  function hasItem(name: string): boolean {
    return items.value.some(i => i.name === name)
  }

  return { items, isDirty, itemMap, byType, loadItems, addItem, removeItem, updateItem, getByName, hasItem }
})
