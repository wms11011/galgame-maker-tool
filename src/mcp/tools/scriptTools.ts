/**
 * MCP Tools — 脚本转换
 * 复用 mappingEngine 纯函数，无 Electron/Pinia 依赖
 */
import { z } from 'zod'
import { scriptToFlow, flowToScript, validateFlow } from '../../renderer/src/utils/mappingEngine'
import * as fs from 'fs'

// ── Zod schemas ──

export const ScriptToFlowSchema = z.object({
  script: z.string().describe('.gs 格式的 GALGAME 脚本'),
})

export const FlowToScriptSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.record(z.unknown())
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string().optional()
  })).optional()
})

export const ValidateScriptSchema = z.object({
  script: z.string().describe('.gs 格式的脚本'),
})

export const ScriptFromFileSchema = z.object({
  filePath: z.string().describe('.gs 脚本文件的绝对路径'),
})

// ── Tool handlers ──

export async function handleScriptToFlow(args: z.infer<typeof ScriptToFlowSchema>) {
  const result = scriptToFlow(args.script)
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: result.success,
        nodeCount: result.nodes?.length ?? 0,
        edgeCount: result.edges?.length ?? 0,
        nodes: result.nodes,
        edges: result.edges,
        errors: result.errors,
        warnings: result.warnings
      }, null, 2)
    }]
  }
}

export async function handleFlowToScript(args: z.infer<typeof FlowToScriptSchema>) {
  const nodes = args.nodes as any
  const edges = (args.edges || []) as any
  const script = flowToScript(nodes, edges)
  return {
    content: [{
      type: 'text' as const,
      text: script
    }]
  }
}

export async function handleValidateScript(args: z.infer<typeof ValidateScriptSchema>) {
  const parsed = scriptToFlow(args.script)
  const warnings = parsed.warnings ?? []
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        valid: parsed.success,
        nodeCount: parsed.nodes?.length ?? 0,
        warningCount: warnings.length,
        warnings,
        errors: parsed.errors
      }, null, 2)
    }]
  }
}

export async function handleScriptFromFile(args: z.infer<typeof ScriptFromFileSchema>) {
  if (!fs.existsSync(args.filePath)) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `文件不存在: ${args.filePath}` }) }] }
  }
  const script = fs.readFileSync(args.filePath, 'utf-8')
  const result = scriptToFlow(script)
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        file: args.filePath,
        success: result.success,
        nodeCount: result.nodes?.length ?? 0,
        edgeCount: result.edges?.length ?? 0,
        nodes: result.nodes,
        edges: result.edges,
        errors: result.errors,
        warnings: result.warnings
      }, null, 2)
    }]
  }
}
