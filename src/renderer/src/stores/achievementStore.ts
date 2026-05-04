import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AchievementDef } from '../types'

const STORAGE_PREFIX = 'galgame_achievements_'

function storageKey(projectPath: string): string {
  return STORAGE_PREFIX + projectPath
}

function loadFromStorage(projectPath: string): AchievementDef[] {
  try {
    const raw = localStorage.getItem(storageKey(projectPath))
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* ignore */ }
  return []
}

function saveToStorage(projectPath: string, achievements: AchievementDef[]): void {
  try {
    localStorage.setItem(storageKey(projectPath), JSON.stringify(achievements))
  } catch { /* ignore */ }
}

export const useAchievementStore = defineStore('achievement', () => {
  const achievements = ref<AchievementDef[]>([])
  const projectPath = ref<string>('')

  const unlockedCount = computed(() => achievements.value.filter(a => a.unlocked).length)
  const totalCount = computed(() => achievements.value.length)
  const progressPct = computed(() => totalCount.value > 0 ? Math.round((unlockedCount.value / totalCount.value) * 100) : 0)

  function setProjectPath(p: string): void {
    projectPath.value = p
    achievements.value = loadFromStorage(p)
  }

  function persist(): void {
    if (projectPath.value) {
      saveToStorage(projectPath.value, achievements.value)
    }
  }

  function addAchievement(name: string, description: string, icon: string = '🏆', color: string = '#f59e0b'): string {
    const id = `ach_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    achievements.value.push({
      id,
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      unlocked: false
    })
    persist()
    return id
  }

  function removeAchievement(id: string): void {
    achievements.value = achievements.value.filter(a => a.id !== id)
    persist()
  }

  function unlockAchievement(id: string): boolean {
    const ach = achievements.value.find(a => a.id === id)
    if (!ach || ach.unlocked) return false
    ach.unlocked = true
    ach.unlockedAt = new Date().toISOString()
    persist()
    return true
  }

  function lockAchievement(id: string): void {
    const ach = achievements.value.find(a => a.id === id)
    if (ach) {
      ach.unlocked = false
      ach.unlockedAt = undefined
      persist()
    }
  }

  function resetAll(): void {
    for (const a of achievements.value) {
      a.unlocked = false
      a.unlockedAt = undefined
    }
    persist()
  }

  function loadDefinitions(defs: AchievementDef[]): void {
    achievements.value = defs.map(d => ({ ...d }))
  }

  function updateAchievement(id: string, patch: Partial<Pick<AchievementDef, 'name' | 'description' | 'icon' | 'color' | 'unlockCondition' | 'autoCheck'>>): void {
    const ach = achievements.value.find(a => a.id === id)
    if (ach) {
      Object.assign(ach, patch)
      persist()
    }
  }

  function getById(id: string): AchievementDef | undefined {
    return achievements.value.find(a => a.id === id)
  }

  return {
    achievements,
    projectPath,
    unlockedCount,
    totalCount,
    progressPct,
    setProjectPath,
    addAchievement,
    removeAchievement,
    unlockAchievement,
    lockAchievement,
    resetAll,
    loadDefinitions,
    updateAchievement,
    getById
  }
})
