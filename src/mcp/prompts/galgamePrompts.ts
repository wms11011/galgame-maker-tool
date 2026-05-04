import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getState } from '../shared/projectState'

export function registerGalgamePrompts(server: McpServer) {
  server.prompt(
    'character-design',
    {
      name: '角色设定',
      description: '为 galgame 设计一个角色',
      arguments: [
        { name: 'characterName', description: '角色名', required: true },
        { name: 'role', description: '角色定位（如主角/女主/配角）', required: false }
      ]
    },
    async ({ characterName, role }) => {
      const state = getState()
      const existingChars = state.characters.map(c => `- ${c.name}`).join('\n')
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `请为视觉小说设计角色：「${characterName}」${role ? `，定位为 ${role}` : ''}。

已有角色：
${existingChars || '（暂无）'}

请提供：
1. 姓名
2. 性格描述（2-3句话）
3. 背景故事（简短的3-5句）
4. 与已有角色的关系（如果有）
5. 建议的立绘风格

输出格式为 JSON：{"name": "...", "personality": "...", "bio": "...", "relations": "...", "spriteStyle": "..."}`
          }
        }]
      }
    }
  )

  server.prompt(
    'branch-design',
    {
      name: '分支设计',
      description: '为当前剧情设计分支选项',
      arguments: [
        { name: 'sceneDescription', description: '当前场景描述', required: true },
        { name: 'branchCount', description: '分支数量（2-4）', required: false }
      ]
    },
    async ({ sceneDescription, branchCount }) => {
      const count = parseInt(branchCount || '3')
      const state = getState()
      const varInfo = state.variables.map(v => `- ${v.name} (${v.type}) = ${v.initialValue}`).join('\n')
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `为以下场景设计 ${count} 个剧情分支选项：

场景：${sceneDescription}

可用变量：
${varInfo || '（暂无）'}

请生成 .gs 格式的 @choice 节点，每个选项指向不同的后续节点。包含条件判断（@condition）来根据变量值引导路线。`
          }
        }]
      }
    }
  )

  server.prompt(
    'script-fix',
    {
      name: '脚本修复',
      description: '检查并修复脚本问题',
      arguments: [
        { name: 'script', description: '需要检查的 .gs 脚本（如果为空则使用当前项目脚本）', required: false }
      ]
    },
    async ({ script }) => {
      const state = getState()
      const targetScript = script || state.script.slice(0, 5000)
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `请检查以下 .gs 脚本的问题并修复：

${targetScript || '（无脚本内容）'}

常见问题：
- 节点 ID 重复
- 连线断裂（节点引用了不存在的 target）
- 变量未定义就使用
- 条件表达式语法错误
- choice 节点选项不足
- 对话节点缺少内容

输出修复后的完整 .gs 脚本，并在最后用 // 注释说明修复了哪些问题。`
          }
        }]
      }
    }
  )
}
