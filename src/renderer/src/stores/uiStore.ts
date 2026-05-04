import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const activeView = ref<'flow' | 'code' | 'story-tree'>('flow')
  const leftPanelVisible = ref(true)
  const rightPanelVisible = ref(true)
  const theme = ref<'dark' | 'light'>('light')
  const previewWindowOpen = ref(false)

  function switchView(view: 'flow' | 'code' | 'story-tree'): void {
    activeView.value = view
  }

  function togglePanel(panel: 'left' | 'right'): void {
    if (panel === 'left') {
      leftPanelVisible.value = !leftPanelVisible.value
    } else {
      rightPanelVisible.value = !rightPanelVisible.value
    }
  }

  function setTheme(newTheme: 'dark' | 'light'): void {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return {
    activeView,
    leftPanelVisible,
    rightPanelVisible,
    theme,
    previewWindowOpen,
    switchView,
    togglePanel,
    setTheme
  }
})
