import { describe, it, expect } from 'vitest'
import { handleScriptToFlow, handleFlowToScript, handleValidateScript } from '../tools/scriptTools'
import { scriptToFlow } from '../../renderer/src/utils/mappingEngine'
import * as fs from 'fs'
import * as path from 'path'

// Load test project script
const mainGs = fs.readFileSync(path.resolve(__dirname, '../../../test.galgame/script/main.gs'), 'utf-8')

describe('MCP script_to_flow', () => {
  it('解析 main.gs 返回节点和连线', async () => {
    const result = await handleScriptToFlow({ script: mainGs })
    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(data.nodeCount).toBeGreaterThanOrEqual(94)
    expect(data.edgeCount).toBeGreaterThanOrEqual(50)
  })

  it('解析空脚本返回空结果', async () => {
    const result = await handleScriptToFlow({ script: '' })
    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(data.nodeCount).toBe(0)
  })

  it('解析语法错误的脚本返回错误', async () => {
    const result = await handleScriptToFlow({ script: '@dialog(id: "bad" {\n  content "missing colon"\n}' })
    const data = JSON.parse(result.content[0].text)
    expect(data.errors).toBeDefined()
    expect(data.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('简写语法正确解析', async () => {
    const result = await handleScriptToFlow({ script: 'Alice: "你好"\nBob: "世界"' })
    const data = JSON.parse(result.content[0].text)
    expect(data.nodeCount).toBe(2)
  })
})

describe('MCP flow_to_script', () => {
  it('往返一致性', async () => {
    // script → flow → script → flow
    const r1 = scriptToFlow(mainGs)
    const nodes = r1.nodes!
    const edges = r1.edges!

    const scriptResult = await handleFlowToScript({ nodes, edges })
    const regenerated = scriptResult.content[0].text

    const r2 = scriptToFlow(regenerated)
    expect(r2.nodes!.length).toBe(r1.nodes!.length)
  })

  it('空数组返回空字符串', async () => {
    const result = await handleFlowToScript({ nodes: [] })
    expect(result.content[0].text).toBe('')
  })
})

describe('MCP validate_script', () => {
  it('正常脚本无严重警告', async () => {
    const result = await handleValidateScript({ script: mainGs })
    const data = JSON.parse(result.content[0].text)
    expect(data.valid).toBe(true)
    expect(data.nodeCount).toBeGreaterThanOrEqual(94)
  })

  it('空对话内容触发警告', async () => {
    const result = await handleValidateScript({
      script: '@dialog(id: "n1", character: "X") {\n  content: ""\n}'
    })
    const data = JSON.parse(result.content[0].text)
    expect(data.warningCount).toBeGreaterThanOrEqual(1)
    expect(data.warnings.some((w: any) => w.message.includes('内容为空'))).toBe(true)
  })

  it('choice 选项不足触发警告', async () => {
    const result = await handleValidateScript({
      script: '@choice(id: "c1") {\n  option("only") { next: "n1" }\n}'
    })
    const data = JSON.parse(result.content[0].text)
    expect(data.warnings.some((w: any) => w.message.includes('选项不足'))).toBe(true)
  })
})
