import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCharacterStore } from '../renderer/src/stores/characterStore'
import type { CharacterInfo } from '../renderer/src/types'

describe('白盒: characterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function makeChar(name: string, overrides: Partial<CharacterInfo> = {}): CharacterInfo {
    return {
      name,
      displayName: name,
      color: '#ffffff',
      sprite: '',
      avatar: '',
      live2dModel: '',
      ...overrides
    }
  }

  describe('loadCharacters', () => {
    it('深拷贝加载角色列表', () => {
      const store = useCharacterStore()
      const list = [makeChar('Alice'), makeChar('Bob')]
      store.loadCharacters(list)
      list[0].displayName = 'Changed'
      expect(store.characters[0].displayName).toBe('Alice')
      expect(store.characters).toHaveLength(2)
    })
  })

  describe('addCharacter', () => {
    it('添加新角色', () => {
      const store = useCharacterStore()
      store.addCharacter(makeChar('Alice'))
      expect(store.characters).toHaveLength(1)
      expect(store.characters[0].name).toBe('Alice')
    })

    it('重复名称不添加', () => {
      const store = useCharacterStore()
      store.addCharacter(makeChar('Alice'))
      store.addCharacter(makeChar('Alice', { displayName: 'Alice2' }))
      expect(store.characters).toHaveLength(1)
      expect(store.characters[0].displayName).toBe('Alice')
    })

    it('深拷贝存入', () => {
      const store = useCharacterStore()
      const c = makeChar('Alice')
      store.addCharacter(c)
      c.displayName = 'Modified'
      expect(store.characters[0].displayName).toBe('Alice')
    })
  })

  describe('removeCharacter', () => {
    it('删除存在的角色', () => {
      const store = useCharacterStore()
      store.addCharacter(makeChar('Alice'))
      store.addCharacter(makeChar('Bob'))
      store.removeCharacter('Alice')
      expect(store.characters).toHaveLength(1)
      expect(store.characters[0].name).toBe('Bob')
    })

    it('删除不存在的角色无影响', () => {
      const store = useCharacterStore()
      store.addCharacter(makeChar('Alice'))
      store.removeCharacter('Ghost')
      expect(store.characters).toHaveLength(1)
    })
  })

  describe('updateCharacter', () => {
    it('更新角色部分字段', () => {
      const store = useCharacterStore()
      store.addCharacter(makeChar('Alice'))
      store.updateCharacter('Alice', { displayName: '爱丽丝', color: '#ff0000' })
      expect(store.characters[0].displayName).toBe('爱丽丝')
      expect(store.characters[0].color).toBe('#ff0000')
      expect(store.characters[0].name).toBe('Alice') // 未变的字段
    })

    it('不存在的角色无操作', () => {
      const store = useCharacterStore()
      store.addCharacter(makeChar('Alice'))
      store.updateCharacter('Ghost', { displayName: '幽灵' })
      expect(store.characters[0].displayName).toBe('Alice')
    })
  })

  describe('characterNames', () => {
    it('返回所有角色名', () => {
      const store = useCharacterStore()
      store.addCharacter(makeChar('Alice'))
      store.addCharacter(makeChar('Bob'))
      expect(store.characterNames).toEqual(['Alice', 'Bob'])
    })
  })
})
