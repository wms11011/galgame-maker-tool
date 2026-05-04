#!/usr/bin/env node
/**
 * GALGAME Maker MCP Server
 *
 * 通过 stdio 暴露 galgame 创作工具的脚本转换、流程图操作、
 * AI 生成、资源管理能力给外部 LLM（Claude Desktop / Cursor 等）。
 *
 * 启动方式：
 *   npx tsx src/mcp/server.ts
 *
 * Claude Desktop 配置示例 (~/AppData/Roaming/Claude/claude_desktop_config.json)：
 *   {
 *     "mcpServers": {
 *       "galgame": {
 *         "command": "npx",
 *         "args": ["tsx", "D:/galaGame/galgame-maker-tool/src/mcp/server.ts"]
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import {
  ScriptToFlowSchema, FlowToScriptSchema, ValidateScriptSchema, ScriptFromFileSchema,
  handleScriptToFlow, handleFlowToScript, handleValidateScript, handleScriptFromFile
} from './tools/scriptTools.js'

import {
  AddNodeSchema, DeleteNodeSchema, UpdateNodeSchema, ConnectNodesSchema, GetFlowGraphSchema,
  handleAddNode, handleDeleteNode, handleUpdateNode, handleConnectNodes, handleGetFlowGraph
} from './tools/flowTools.js'

import { GenerateScriptSchema, handleGenerateScript } from './tools/aiTools.js'
import { ListAssetsSchema, ImportAssetSchema, handleListAssets, handleImportAsset } from './tools/assetTools.js'
import {
  CreateProjectSchema, LoadProjectSchema, SaveProjectSchema, GetProjectInfoSchema,
  handleCreateProject, handleLoadProject, handleSaveProject, handleGetProjectInfo
} from './tools/projectTools.js'
import { registerProjectResources } from './resources/projectResource.js'
import { registerGalgamePrompts } from './prompts/galgamePrompts.js'

// ── Create server ──

const server = new McpServer({
  name: 'galgame-maker',
  version: '1.0.0'
})

// ── Phase 1: 核心脚本转换 (3 + 1 tools) ──

server.tool(
  'script_to_flow',
  '将 .gs 格式的 GALGAME 脚本字符串解析为流程图节点和连线',
  ScriptToFlowSchema.shape,
  handleScriptToFlow
)

server.tool(
  'flow_to_script',
  '将流程图节点和连线转换为 .gs 格式的 GALGAME 脚本字符串',
  FlowToScriptSchema.shape,
  handleFlowToScript
)

server.tool(
  'validate_script',
  '验证 .gs 脚本的语法和逻辑问题，返回警告和错误列表',
  ValidateScriptSchema.shape,
  handleValidateScript
)

server.tool(
  'script_from_file',
  '从磁盘读取 .gs 脚本文件并解析为流程图',
  ScriptFromFileSchema.shape,
  handleScriptFromFile
)

// ── Phase 2: 流程图操作 (5 tools) ──

server.tool(
  'add_node',
  '向流程图中添加一个新节点。支持所有类型（dialog/choice/condition/setVariable/goto/end/audio/cg/wait/random/label/animation/savePoint/timer/moveCharacter/steamAchievement/achievement/particle/item）',
  AddNodeSchema.shape,
  handleAddNode
)

server.tool(
  'delete_node',
  '从流程图中删除指定节点及其关联连线',
  DeleteNodeSchema.shape,
  handleDeleteNode
)

server.tool(
  'update_node',
  '更新指定节点的属性（如修改对话内容、角色名、条件表达式等）',
  UpdateNodeSchema.shape,
  handleUpdateNode
)

server.tool(
  'connect_nodes',
  '在两个节点之间创建一条连线',
  ConnectNodesSchema.shape,
  handleConnectNodes
)

server.tool(
  'get_flow_graph',
  '获取当前项目流程图的结构（节点列表+连线列表+图分析结果）',
  GetFlowGraphSchema.shape,
  handleGetFlowGraph
)

// ── Phase 3: AI 生成 + 资源 (3 tools) ──

server.tool(
  'generate_script',
  '使用 AI 生成 GALGAME 脚本。支持对话(dialog)、分支(branch)、翻译(translate)、续写(continue)、角色设定(character)、脚本修复(fix)六种类型。自动注入当前项目的角色、变量、标记等上下文。',
  GenerateScriptSchema.shape,
  handleGenerateScript
)

server.tool(
  'list_assets',
  '列出当前项目的所有资源文件（图片/音频），可按分类过滤',
  ListAssetsSchema.shape,
  handleListAssets
)

server.tool(
  'import_asset',
  '将外部文件导入到项目资源库中',
  ImportAssetSchema.shape,
  handleImportAsset
)

// ── Phase 4: 项目管理 + Resource/Prompt (4 tools) ──

server.tool(
  'create_project',
  '创建一个新的 galgame 项目',
  CreateProjectSchema.shape,
  handleCreateProject
)

server.tool(
  'load_project',
  '加载一个已有的 galgame 项目',
  LoadProjectSchema.shape,
  handleLoadProject
)

server.tool(
  'save_project',
  '将当前项目状态保存到磁盘',
  SaveProjectSchema.shape,
  handleSaveProject
)

server.tool(
  'get_project_info',
  '获取当前项目的完整信息（节点/连线/变量/角色/标记/场景分组）',
  GetProjectInfoSchema.shape,
  handleGetProjectInfo
)

// ── MCP Resources ──
registerProjectResources(server)

// ── MCP Prompts ──
registerGalgamePrompts(server)

// ── Start ──

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[galgame-mcp] Server started on stdio')
}

main().catch(err => {
  console.error('[galgame-mcp] Fatal error:', err)
  process.exit(1)
})
