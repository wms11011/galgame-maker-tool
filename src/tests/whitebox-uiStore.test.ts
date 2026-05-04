import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUIStore } from '../renderer/src/stores/uiStore'

describe('白盒: uiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.documentElement.removeAttribute('data-theme')
  })

  describe('初始状态', () => {
    it('默认值正确', () => {
      const store = useUIStore()
      expect(store.activeView).toBe('flow')
      expect(store.leftPanelVisible).toBe(true)
      expect(store.rightPanelVisible).toBe(true)
      expect(store.theme).toBe('light')
      expect(store.previewWindowOpen).toBe(false)
    })
  })

  describe('switchView', () => {
    it('切换到 code 视图', () => {
      const store = useUIStore()
      store.switchView('code')
      expect(store.activeView).toBe('code')
    })

    it('切换到 story-tree 视图', () => {
      const store = useUIStore()
      store.switchView('story-tree')
      expect(store.activeView).toBe('story-tree')
    })

    it('切换回 flow 视图', () => {
      const store = useUIStore()
      store.switchView('code')
      store.switchView('flow')
      expect(store.activeView).toBe('flow')
    })
  })

  describe('togglePanel', () => {
    it('切换左侧面板可见性', () => {
      const store = useUIStore()
      expect(store.leftPanelVisible).toBe(true)
      store.togglePanel('left')
      expect(store.leftPanelVisible).toBe(false)
      store.togglePanel('left')
      expect(store.leftPanelVisible).toBe(true)
    })

    it('切换右侧面板可见性', () => {
      const store = useUIStore()
      expect(store.rightPanelVisible).toBe(true)
      store.togglePanel('right')
      expect(store.rightPanelVisible).toBe(false)
      store.togglePanel('right')
      expect(store.rightPanelVisible).toBe(true)
    })

    it('左右面板互不影响', () => {
      const store = useUIStore()
      store.togglePanel('left')
      expect(store.leftPanelVisible).toBe(false)
      expect(store.rightPanelVisible).toBe(true)
    })
  })

  describe('setTheme', () => {
    it('设置 dark 主题并更新 DOM', () => {
      const store = useUIStore()
      store.setTheme('dark')
      expect(store.theme).toBe('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('设置 light 主题并更新 DOM', () => {
      const store = useUIStore()
      store.setTheme('dark')
      store.setTheme('light')
      expect(store.theme).toBe('light')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('从 light 到 light 无变化', () => {
      const store = useUIStore()
      store.setTheme('light')
      expect(store.theme).toBe('light')
    })
  })
})
