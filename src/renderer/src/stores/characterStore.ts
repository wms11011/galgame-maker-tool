import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CharacterInfo } from '../types'

export const useCharacterStore = defineStore('character', () => {
  const characters = ref<CharacterInfo[]>([])

  function loadCharacters(list: CharacterInfo[]): void {
    characters.value = list.map(c => ({ ...c }))
  }

  function addCharacter(info: CharacterInfo): boolean {
    if (characters.value.some(c => c.name === info.name)) return false
    characters.value.push({ ...info })
    return true
  }

  function removeCharacter(name: string): void {
    characters.value = characters.value.filter(c => c.name !== name)
  }

  function updateCharacter(name: string, patch: Partial<CharacterInfo>): void {
    const c = characters.value.find(x => x.name === name)
    if (c) Object.assign(c, patch)
  }

  const characterNames = computed(() => characters.value.map(c => c.name))

  return {
    characters,
    loadCharacters,
    addCharacter,
    removeCharacter,
    updateCharacter,
    characterNames
  }
})
