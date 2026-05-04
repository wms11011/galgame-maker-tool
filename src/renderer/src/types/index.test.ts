import { describe, it, expect } from 'vitest'
import type {
  NodeType,
  SyncState,
  FlowNode,
  FlowEdge,
  DialogNodeData,
  ChoiceNodeData,
  ConditionNodeData,
  ProjectData,
  ProjectMeta,
  AssetInfo
} from './index'

describe('Core Type Definitions', () => {
  it('should create a valid DialogNodeData', () => {
    const data: DialogNodeData = {
      id: 'node_001',
      label: '对话节点',
      character: '主角',
      content: '你好，世界！',
      background: './assets/bg/forest.png',
      characterSprite: './assets/characters/hero.png',
      nextNodeId: 'node_002'
    }
    expect(data.id).toBe('node_001')
    expect(data.character).toBe('主角')
    expect(data.content).toBe('你好，世界！')
  })

  it('should create a valid ChoiceNodeData', () => {
    const data: ChoiceNodeData = {
      id: 'node_002',
      label: '选择节点',
      title: '你要去哪里？',
      options: [
        { id: 'opt_1', text: '去森林探险', nextNodeId: 'node_003' },
        { id: 'opt_2', text: '留在小镇', nextNodeId: 'node_004' }
      ]
    }
    expect(data.options).toHaveLength(2)
    expect(data.options[0].text).toBe('去森林探险')
  })

  it('should create a valid ConditionNodeData', () => {
    const data: ConditionNodeData = {
      id: 'node_005',
      label: '条件节点',
      expression: 'flag_courage > 5',
      trueNextId: 'node_006',
      falseNextId: 'node_007'
    }
    expect(data.expression).toBe('flag_courage > 5')
    expect(data.trueNextId).toBe('node_006')
  })

  it('should create a valid FlowNode', () => {
    const node: FlowNode = {
      id: 'node_001',
      type: 'dialog' as NodeType,
      position: { x: 100, y: 200 },
      data: {
        id: 'node_001',
        label: '对话节点',
        character: '主角',
        content: '你好！'
      }
    }
    expect(node.type).toBe('dialog')
    expect(node.position.x).toBe(100)
  })

  it('should create a valid FlowEdge', () => {
    const edge: FlowEdge = {
      id: 'edge_001',
      source: 'node_001',
      target: 'node_002',
      label: '下一步',
      style: { stroke: '#fff' }
    }
    expect(edge.source).toBe('node_001')
    expect(edge.target).toBe('node_002')
  })

  it('should create a valid ProjectMeta', () => {
    const meta: ProjectMeta = {
      name: '测试项目',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectPath: '/path/to/project',
      resolution: '1280x720'
    }
    expect(meta.resolution).toBe('1280x720')
  })

  it('should create a valid AssetInfo', () => {
    const asset: AssetInfo = {
      name: 'forest.png',
      relativePath: './assets/backgrounds/forest.png',
      type: 'image',
      size: 1024000,
      thumbnail: 'data:image/png;base64,...'
    }
    expect(asset.type).toBe('image')
  })

  it('should create a valid ProjectData', () => {
    const data: ProjectData = {
      meta: {
        name: '测试项目',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectPath: '/path/to/project',
        resolution: '1920x1080'
      },
      flow: {
        nodes: [],
        edges: []
      },
      script: '',
      assets: []
    }
    expect(data.flow.nodes).toHaveLength(0)
    expect(data.meta.resolution).toBe('1920x1080')
  })

  it('should validate NodeType values', () => {
    const types: NodeType[] = [
      'dialog', 'choice', 'condition', 'setVariable', 'goto',
      'end', 'audio', 'cg', 'wait', 'random', 'label', 'animation',
      'savePoint', 'timer', 'moveCharacter', 'steamAchievement', 'achievement', 'particle', 'live2d', 'item'
    ]
    expect(types).toHaveLength(20)
  })

  it('should validate SyncState values', () => {
    const states: SyncState[] = ['synced', 'flow-ahead', 'code-ahead', 'conflict']
    expect(states).toHaveLength(4)
  })
})
