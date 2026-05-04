import { getState } from '../shared/projectState'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerProjectResources(server: McpServer) {
  server.resource(
    'project-state',
    'galgame://current-project',
    {
      name: '当前项目状态',
      description: '当前打开的 galgame 项目的完整状态（节点/连线/变量/角色/脚本摘要）',
    },
    async () => {
      const state = getState()
      if (!state.projectPath) {
        return {
          contents: [{ uri: 'galgame://current-project', text: JSON.stringify({ error: '未打开项目' }) }]
        }
      }
      return {
        contents: [{
          uri: 'galgame://current-project',
          text: JSON.stringify({
            name: state.meta?.name,
            projectPath: state.projectPath,
            resolution: state.meta?.resolution,
            nodes: state.nodes.map(n => ({ id: n.id, type: n.type, label: n.data.label || '' })),
            edges: state.edges.map(e => ({ source: e.source, target: e.target, label: e.label })),
            variables: state.variables,
            characters: state.characters,
            globalFlags: state.globalFlags,
            scriptPreview: state.script.slice(0, 2000) + (state.script.length > 2000 ? '...' : '')
          }, null, 2)
        }]
      }
    }
  )

  server.resource(
    'flow-graph',
    'galgame://flow-graph',
    {
      name: '流程图结构',
      description: '当前流程图的节点和连线（精简格式）',
    },
    async () => {
      const state = getState()
      if (!state.projectPath) {
        return {
          contents: [{ uri: 'galgame://flow-graph', text: '{}' }]
        }
      }
      return {
        contents: [{
          uri: 'galgame://flow-graph',
          text: JSON.stringify({
            nodes: state.nodes.map(n => ({ id: n.id, type: n.type, label: n.data.label })),
            edges: state.edges.map(e => ({ source: e.source, target: e.target }))
          }, null, 2)
        }]
      }
    }
  )
}
