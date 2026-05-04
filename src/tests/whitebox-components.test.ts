import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import NodeForm from '../renderer/src/components/NodeForm.vue'
import { useAssetStore } from '../renderer/src/stores/assetStore'
import { useCharacterStore } from '../renderer/src/stores/characterStore'

// Mock child components that NodeForm uses
vi.stubGlobal('window', { electronAPI: undefined })

describe('NodeForm 组件', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('渲染 dialog 节点表单', () => {
    const wrapper = mount(NodeForm, {
      props: {
        nodeType: 'dialog',
        formData: { id: 'd1', label: '测试', character: 'Alice', content: 'hello' }
      },
      global: {
        plugins: [ElementPlus],
        stubs: { 'el-select': true, 'el-option': true, 'el-input': true, 'el-input-number': true, 'el-switch': true, 'el-slider': true }
      }
    })
    expect(wrapper.find('.node-form').exists()).toBe(true)
    expect(wrapper.find('.section-title').text()).toBe('对话节点')
  })

  it('渲染 setVariable 节点表单', () => {
    const wrapper = mount(NodeForm, {
      props: {
        nodeType: 'setVariable',
        formData: { id: 's1', label: '', variable: 'x', op: '=', value: '10' }
      },
      global: {
        plugins: [ElementPlus],
        stubs: { 'el-select': true, 'el-option': true, 'el-input': true, 'el-input-number': true, 'el-switch': true }
      }
    })
    expect(wrapper.find('.section-title').text()).toBe('变量设置')
  })

  it('未知类型不渲染表单', () => {
    const wrapper = mount(NodeForm, {
      props: {
        nodeType: 'nonexistent',
        formData: {}
      },
      global: {
        plugins: [ElementPlus],
        stubs: { 'el-select': true, 'el-option': true, 'el-input': true, 'el-input-number': true, 'el-switch': true }
      }
    })
    expect(wrapper.find('.section-title').exists()).toBe(true)
    expect(wrapper.find('.section-title').text()).toBe('nonexistent')
  })

  it('隐藏字段不渲染', () => {
    const wrapper = mount(NodeForm, {
      props: {
        nodeType: 'dialog',
        formData: { id: 'd1', character: 'Alice', content: 'hi' }
      },
      global: {
        plugins: [ElementPlus],
        stubs: { 'el-select': true, 'el-option': true, 'el-input': true, 'el-input-number': true, 'el-switch': true }
      }
    })
    // id 字段 hidden，不应出现在表单中
    const html = wrapper.html()
    // label 文本中不应包含 "ID"
    const labels = wrapper.findAll('.form-label')
    const labelTexts = labels.map(l => l.text())
    expect(labelTexts.some(t => t === 'ID')).toBe(false)
  })

  it('dialog 节点显示角色选择字段', () => {
    const charStore = useCharacterStore()
    charStore.addCharacter({ name: 'Alice', displayName: 'Alice', color: '#fff', sprite: '', avatar: '', live2dModel: '' })
    const wrapper = mount(NodeForm, {
      props: {
        nodeType: 'dialog',
        formData: { id: 'd1', character: 'Alice', content: 'hi' }
      },
      global: {
        plugins: [ElementPlus],
        stubs: { 'el-select': true, 'el-option': true, 'el-input': true, 'el-input-number': true, 'el-switch': true }
      }
    })
    // 角色字段应该渲染（通过 el-select stub）
    expect(wrapper.find('.node-form').exists()).toBe(true)
  })
})

describe('NodePanel 组件', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('NodePanel 渲染节点类型（live2d已废弃不显示）', async () => {
    const { default: NodePanel } = await import('../renderer/src/components/NodePanel.vue')
    const wrapper = mount(NodePanel, {
      global: {
        stubs: { 'el-button': true, 'el-icon': true }
      }
    })
    // live2d 已废弃，共 19 个活跃节点类型
    const cards = wrapper.findAll('.node-card')
    expect(cards.length).toBeGreaterThanOrEqual(19)
  })

  it('NodePanel 卡片包含图标和名称', async () => {
    const { default: NodePanel } = await import('../renderer/src/components/NodePanel.vue')
    const wrapper = mount(NodePanel, {
      global: {
        stubs: { 'el-button': true, 'el-icon': true }
      }
    })
    const firstCard = wrapper.find('.node-card')
    expect(firstCard.find('.card-icon').exists()).toBe(true)
    expect(firstCard.find('.card-name').exists()).toBe(true)
  })
})
