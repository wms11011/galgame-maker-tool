import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { AssetInfo, AssetCategory } from '../types'
import { useProjectStore } from './projectStore'

export const useAssetStore = defineStore('asset', () => {
  const assets = ref<AssetInfo[]>([])
  const selectedAsset = ref<AssetInfo | null>(null)

  async function importAssets(type: 'image' | 'audio', category?: string): Promise<void> {
    if (!window.electronAPI) return
    const projectStore = useProjectStore()
    const result = await window.electronAPI.importAsset(type, projectStore.meta?.projectPath, category)
    if (result.success && result.data) {
      assets.value.push(...result.data)
      projectStore.assets = assets.value
      const catName = category || 'other'
      ElMessage.success(`成功导入 ${result.data.length} 个资源 → ${catName}`)
    } else {
      ElMessage.error(result.error ?? '导入失败')
    }
  }

  async function deleteAsset(relativePath: string): Promise<void> {
    if (!window.electronAPI) {
      console.warn('electronAPI not available (non-Electron environment)')
      return
    }
    const projectStore = useProjectStore()
    const result = await window.electronAPI.deleteAsset(relativePath, projectStore.meta?.projectPath)
    if (result.success) {
      assets.value = assets.value.filter((a) => a.relativePath !== relativePath)
      if (selectedAsset.value?.relativePath === relativePath) selectedAsset.value = null
      // 同步 projectStore 并触发保存，防止关闭后恢复
      const ps = useProjectStore()
      ps.assets = assets.value
      if (ps.saveProject) ps.saveProject()
      ElMessage.success('资源已删除')
    } else {
      ElMessage.error(result.error ?? '删除失败')
    }
  }

  async function refreshAssets(): Promise<void> {
    if (!window.electronAPI) {
      console.warn('electronAPI not available (non-Electron environment)')
      return
    }
    const projectStore = useProjectStore()
    if (!projectStore.meta?.projectPath) return
    const result = await window.electronAPI.listAssets(projectStore.meta.projectPath)
    if (result.success && result.data) {
      assets.value = result.data
    }
  }

  function setCategory(relativePath: string, category: string): void {
    const a = assets.value.find(x => x.relativePath === relativePath)
    if (a) { a.category = category as AssetCategory; useProjectStore().assets = assets.value }
  }

  async function renameAsset(oldPath: string, newName: string): Promise<boolean> {
    if (!window.electronAPI) return false
    const projectStore = useProjectStore()
    const result = await window.electronAPI.renameAsset(oldPath, newName, projectStore.meta?.projectPath)
    if (result.success && result.data) {
      const a = assets.value.find(x => x.relativePath === oldPath)
      if (a) {
        a.name = result.data.newPath.replace(/^.*[/\\]/, '')
        a.relativePath = result.data.newPath
      }
      useProjectStore().assets = assets.value
      return true
    }
    return false
  }

  return {
    assets, selectedAsset,
    importAssets, deleteAsset, refreshAssets,
    setCategory, renameAsset
  }
})
