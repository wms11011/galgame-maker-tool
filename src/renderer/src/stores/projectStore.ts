import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ProjectMeta, ProjectData, AssetInfo, AssetCategory } from '../types'
import { useFlowStore } from './flowStore'
import { useAssetStore } from './assetStore'
import { useVariableStore } from './variableStore'
import { useCharacterStore } from './characterStore'
import { useSaveStore } from './saveStore'
import { useAchievementStore } from './achievementStore'
import { useItemStore } from './itemStore'
import { useGlossaryStore } from './glossaryStore'
import { flowToScript } from '../utils/mappingEngine'

export const useProjectStore = defineStore('project', () => {
  const meta = ref<ProjectMeta | null>(null)
  const isOpen = ref(false)
  const recentProjects = ref<ProjectMeta[]>([])
  const script = ref<string>('')
  const assets = ref<AssetInfo[]>([])
  const autoSync = ref(true)
  let flowStore: ReturnType<typeof useFlowStore> | null = null

  function initFlowWatcher(): void {
    if (flowStore) return
    flowStore = useFlowStore()
    const fs = flowStore

    console.log('[项目] 初始化流程图监听器')

    watch(
      [() => fs.nodes, () => fs.edges],
      ([newNodes, newEdges]) => {
        if (autoSync.value && isOpen.value) {
          console.log('[自动同步] 流程图变化,生成代码')
          console.log('[自动同步] 节点数:', newNodes.length, '连线数:', newEdges.length)
          try {
            script.value = flowToScript(newNodes, newEdges)
            fs.syncState = 'synced'
            console.log('[自动同步] 代码生成成功,长度:', script.value.length)
          } catch (error) {
            console.error('[自动同步] 代码生成失败:', error)
            fs.syncState = 'conflict'
          }
        }
      },
      { deep: true, immediate: false }
    )
  }

  function setAutoSync(enabled: boolean): void {
    autoSync.value = enabled
  }

  function syncScriptFromFlow(): void {
    if (!flowStore) {
      flowStore = useFlowStore()
    }
    const fs = flowStore
    console.log('[同步] 开始从流程图生成脚本')
    console.log('[同步] 节点数量:', fs.nodes.length)
    console.log('[同步] 连线数量:', fs.edges.length)

    if (fs.nodes.length === 0) {
      console.warn('[同步] 流程图为空,生成空脚本')
      script.value = ''
      fs.syncState = 'synced'
      return
    }

    try {
      script.value = flowToScript(fs.nodes, fs.edges)
      fs.syncState = 'synced'
      console.log('[同步] 脚本生成成功')
      console.log('[同步] 脚本长度:', script.value.length, '字符')
      console.log('[同步] 脚本内容:\n', script.value)
    } catch (error) {
      console.error('[同步] 代码生成失败:', error)
      fs.syncState = 'conflict'
      throw error
    }
  }

  async function createProject(name: string, path: string): Promise<void> {
    if (!window.electronAPI) {
      console.warn('electronAPI not available (non-Electron environment)')
      return
    }
    const result = await window.electronAPI.createProject(name, path)
    if (result.success && result.data) {
      meta.value = result.data.meta
      script.value = result.data.script ?? ''
      assets.value = result.data.assets ?? []
      const assetStore = useAssetStore()
      for (const a of assets.value) {
        if (!a.category) {
          const parent = a.relativePath.split('/').slice(-2, -1)[0] || ''
          const m: Record<string, AssetCategory> = {characters:'character',avatars:'avatar',backgrounds:'background',items:'item',cg:'cg',live2d:'live2d',audio:'audio'}
          if (m[parent]) a.category = m[parent]
        }
      }
      assetStore.assets = assets.value
      const variableStore = useVariableStore()
      variableStore.loadVariables(result.data.variables ?? [])
      if (result.data.globalFlags) {
        variableStore.loadGlobalFlags(result.data.globalFlags)
      }
      if (result.data.flagAliases) {
        variableStore.loadFlagAliases(result.data.flagAliases)
      }
      const characterStore = useCharacterStore()
      characterStore.loadCharacters(result.data.characters ?? [])
      isOpen.value = true
      addToRecent(result.data.meta)
      useSaveStore().setProjectPath(result.data.meta.projectPath)
      const achStore = useAchievementStore()
      achStore.setProjectPath(result.data.meta.projectPath)
      if (result.data.achievements) achStore.loadDefinitions(result.data.achievements)
      if (result.data.items) useItemStore().loadItems(result.data.items)
      if (result.data.glossary) useGlossaryStore().loadTerms(result.data.glossary)
      if (!flowStore) flowStore = useFlowStore()
      const fs = flowStore
      fs.loadFlow(result.data.flow.nodes, result.data.flow.edges)
      if (result.data.groups) fs.loadGroups(result.data.groups)
      initFlowWatcher()
    }
  }

  async function openProject(): Promise<void> {
    if (!window.electronAPI) {
      console.warn('electronAPI not available (non-Electron environment)')
      return
    }
    const result = await window.electronAPI.openProject()
    if (result && result.success && result.data) {
      meta.value = result.data.meta
      script.value = result.data.script ?? ''
      assets.value = result.data.assets ?? []
      const assetStore = useAssetStore()
      for (const a of assets.value) {
        if (!a.category) {
          const parent = a.relativePath.split('/').slice(-2, -1)[0] || ''
          const m: Record<string, AssetCategory> = {characters:'character',avatars:'avatar',backgrounds:'background',items:'item',cg:'cg',live2d:'live2d',audio:'audio'}
          if (m[parent]) a.category = m[parent]
        }
      }
      assetStore.assets = assets.value
      const variableStore = useVariableStore()
      variableStore.loadVariables(result.data.variables ?? [])
      if (result.data.globalFlags) {
        variableStore.loadGlobalFlags(result.data.globalFlags)
      }
      if (result.data.flagAliases) {
        variableStore.loadFlagAliases(result.data.flagAliases)
      }
      const characterStore = useCharacterStore()
      characterStore.loadCharacters(result.data.characters ?? [])
      isOpen.value = true
      addToRecent(result.data.meta)
      useSaveStore().setProjectPath(result.data.meta.projectPath)
      const achStore = useAchievementStore()
      achStore.setProjectPath(result.data.meta.projectPath)
      if (result.data.achievements) achStore.loadDefinitions(result.data.achievements)
      if (result.data.items) useItemStore().loadItems(result.data.items)
      if (result.data.glossary) useGlossaryStore().loadTerms(result.data.glossary)
      if (!flowStore) flowStore = useFlowStore()
      const fs = flowStore
      fs.loadFlow(result.data.flow.nodes, result.data.flow.edges)
      if (result.data.groups) fs.loadGroups(result.data.groups)
      initFlowWatcher()
    }
  }

  async function saveProject(): Promise<boolean> {
    if (!meta.value) {
      console.warn('[保存] 保存失败：项目未打开')
      return false
    }
    if (!window.electronAPI) {
      console.warn('[保存] electronAPI not available (non-Electron environment)')
      return false
    }

    if (!meta.value.projectPath) {
      console.error('[保存] 保存失败：项目路径为空')
      return false
    }

    console.log('[保存] 准备保存项目:', meta.value.projectPath)

    if (!flowStore) {
      flowStore = useFlowStore()
    }
    const fs = flowStore

    const assetStore = useAssetStore()
    assets.value = assetStore.assets

    const variableStore = useVariableStore()

    const characterStore = useCharacterStore()

    if (autoSync.value && !script.value.trim()) {
      try {
        console.log('[保存] 自动从流程图生成脚本')
        script.value = flowToScript(fs.nodes, fs.edges)
      } catch (error) {
        console.error('[保存] 代码生成失败:', error)
      }
    }

    const projectData: ProjectData = JSON.parse(
      JSON.stringify({
        meta: meta.value,
        flow: { nodes: fs.nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })), edges: fs.edges },
        script: script.value,
        assets: assets.value,
        variables: variableStore.variables,
        characters: characterStore.characters,
        globalFlags: variableStore.globalFlags,
        flagAliases: variableStore.flagAliases,
        groups: fs.groups,
        achievements: useAchievementStore().achievements,
        items: useItemStore().items,
        glossary: useGlossaryStore().terms
      })
    )

    console.log('[保存] 项目数据:', {
      name: projectData.meta.name,
      path: projectData.meta.projectPath,
      nodesCount: projectData.flow.nodes.length,
      edgesCount: projectData.flow.edges.length,
      scriptLength: projectData.script.length,
      assetsCount: projectData.assets.length,
      variablesCount: projectData.variables?.length ?? 0,
      charactersCount: projectData.characters?.length ?? 0,
      groupsCount: projectData.groups?.length ?? 0
    })

    const result = await window.electronAPI.saveProject(projectData)
    console.log('[保存] 保存结果:', result)

    if (result.success) {
      meta.value = { ...meta.value, updatedAt: new Date().toISOString() }
      fs.isDirty = false
      fs.syncState = 'synced'
      console.log('[保存] 项目保存成功')
      return true
    } else {
      console.error('[保存] 项目保存失败:', result.error)
      return false
    }
  }

  async function saveProjectAs(): Promise<boolean> {
    if (!meta.value) return false
    if (!window.electronAPI) return false
    if (!flowStore) flowStore = useFlowStore()
    const fs = flowStore

    const assetStore = useAssetStore()
    assets.value = assetStore.assets

    const variableStore = useVariableStore()

    const characterStore = useCharacterStore()

    const projectData: ProjectData = JSON.parse(
      JSON.stringify({
        meta: meta.value,
        flow: { nodes: fs.nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })), edges: fs.edges },
        script: script.value,
        assets: assets.value,
        variables: variableStore.variables,
        characters: characterStore.characters,
        globalFlags: variableStore.globalFlags,
        flagAliases: variableStore.flagAliases,
        groups: fs.groups,
        achievements: useAchievementStore().achievements,
        items: useItemStore().items,
        glossary: useGlossaryStore().terms
      })
    )

    const result = await window.electronAPI.saveProjectAs(projectData)
    if (result.success && result.data?.path) {
      meta.value = { ...meta.value, projectPath: result.data.path, updatedAt: new Date().toISOString() }
      useSaveStore().setProjectPath(result.data.path)
      fs.isDirty = false
      fs.syncState = 'synced'
      return true
    }
    return false
  }

  function closeProject(): void {
    meta.value = null
    script.value = ''
    assets.value = []
    isOpen.value = false
  }

  function addToRecent(projectMeta: ProjectMeta): void {
    const existing = recentProjects.value.findIndex(
      (p) => p.projectPath === projectMeta.projectPath
    )
    if (existing !== -1) {
      recentProjects.value.splice(existing, 1)
    }
    recentProjects.value.unshift(projectMeta)
    if (recentProjects.value.length > 10) {
      recentProjects.value = recentProjects.value.slice(0, 10)
    }
  }

  return {
    meta,
    isOpen,
    script,
    assets,
    recentProjects,
    autoSync,
    createProject,
    openProject,
    saveProject,
    saveProjectAs,
    closeProject,
    setAutoSync,
    syncScriptFromFlow,
    initFlowWatcher
  }
})
