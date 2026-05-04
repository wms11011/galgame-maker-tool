import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameSaveData } from '../types'

const STORAGE_PREFIX = 'galgame_saves_'
const MAX_SAVES = 50

function storageKey(projectPath: string): string {
  return STORAGE_PREFIX + projectPath
}

function loadFromStorage(projectPath: string): GameSaveData[] {
  try {
    const raw = localStorage.getItem(storageKey(projectPath))
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // corrupted data, ignore
  }
  return []
}

function saveToStorage(projectPath: string, saves: GameSaveData[]): void {
  try {
    localStorage.setItem(storageKey(projectPath), JSON.stringify(saves))
  } catch {
    // storage full or unavailable
  }
}

export const useSaveStore = defineStore('save', () => {
  const saves = ref<GameSaveData[]>([])
  const activeSaveId = ref<string | null>(null)
  const projectPath = ref<string>('')

  const saveCount = computed(() => saves.value.length)

  function setProjectPath(p: string): void {
    projectPath.value = p
    saves.value = loadFromStorage(p)
    activeSaveId.value = null
  }

  function persist(): void {
    if (projectPath.value) {
      saveToStorage(projectPath.value, saves.value)
    }
  }

  function createSave(
    projectName: string,
    currentNodeId: string,
    currentNodeLabel: string,
    variables: Record<string, number>,
    visitedNodeIds: string[],
    globalFlags: Record<string, boolean>,
    slotLabel?: string,
    screenshot?: string
  ): GameSaveData {
    if (saves.value.length >= MAX_SAVES) {
      const oldest = saves.value[0]
      saves.value.shift()
      if (activeSaveId.value === oldest.id) activeSaveId.value = null
    }
    const save: GameSaveData = {
      id: `save_${Date.now()}`,
      slotLabel: slotLabel || `存档 ${saves.value.length + 1}`,
      timestamp: new Date().toISOString(),
      projectName,
      currentNodeId,
      currentNodeLabel,
      variables: { ...variables },
      visitedNodeIds: [...visitedNodeIds],
      globalFlags: { ...globalFlags },
      screenshot: screenshot || undefined
    }
    saves.value.push(save)
    persist()
    return save
  }

  function loadSave(saveId: string): GameSaveData | null {
    const save = saves.value.find((s) => s.id === saveId)
    if (save) {
      activeSaveId.value = saveId
    }
    return save ?? null
  }

  function deleteSave(saveId: string): void {
    saves.value = saves.value.filter((s) => s.id !== saveId)
    if (activeSaveId.value === saveId) {
      activeSaveId.value = null
    }
    persist()
  }

  function clearAll(): void {
    saves.value = []
    activeSaveId.value = null
    persist()
  }

  function getMostRecent(): GameSaveData | null {
    if (saves.value.length === 0) return null
    return saves.value[saves.value.length - 1]
  }

  return {
    saves,
    activeSaveId,
    saveCount,
    projectPath,
    setProjectPath,
    createSave,
    loadSave,
    deleteSave,
    clearAll,
    getMostRecent
  }
})
