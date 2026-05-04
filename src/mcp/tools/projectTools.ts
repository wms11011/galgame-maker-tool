import { z } from 'zod'
import { createProject, loadProject, saveProject, getState } from '../shared/projectState'

export const CreateProjectSchema = z.object({
  name: z.string().describe('项目名称'),
  projectPath: z.string().describe('项目根目录的绝对路径'),
  resolution: z.enum(['1280x720', '1920x1080']).optional().default('1280x720').describe('分辨率')
})

export const LoadProjectSchema = z.object({
  projectPath: z.string().describe('项目根目录的绝对路径')
})

export const SaveProjectSchema = z.object({})

export const GetProjectInfoSchema = z.object({})

export async function handleCreateProject(args: z.infer<typeof CreateProjectSchema>) {
  try {
    const state = createProject(args.name, args.projectPath, args.resolution)
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      success: true,
      name: state.meta!.name,
      projectPath: state.projectPath,
      resolution: state.meta!.resolution,
      nodeCount: state.nodes.length
    }, null, 2) }] }
  } catch (err) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      error: err instanceof Error ? err.message : String(err)
    }) }] }
  }
}

export async function handleLoadProject(args: z.infer<typeof LoadProjectSchema>) {
  try {
    const state = loadProject(args.projectPath)
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      success: true,
      name: state.meta!.name,
      projectPath: state.projectPath,
      nodeCount: state.nodes.length,
      edgeCount: state.edges.length,
      scriptLength: state.script.length,
      assetCount: state.assets.length,
      variableCount: state.variables.length,
      characterCount: state.characters.length
    }, null, 2) }] }
  } catch (err) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      error: err instanceof Error ? err.message : String(err)
    }) }] }
  }
}

export async function handleSaveProject(_args: z.infer<typeof SaveProjectSchema>) {
  try {
    saveProject()
    const state = getState()
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      success: true,
      projectPath: state.projectPath,
      savedAt: new Date().toISOString()
    }) }] }
  } catch (err) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      error: err instanceof Error ? err.message : String(err)
    }) }] }
  }
}

export async function handleGetProjectInfo(_args: z.infer<typeof GetProjectInfoSchema>) {
  const state = getState()
  if (!state.projectPath) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      error: '未打开项目'
    }) }] }
  }
  return { content: [{ type: 'text' as const, text: JSON.stringify({
    name: state.meta?.name,
    projectPath: state.projectPath,
    resolution: state.meta?.resolution,
    nodes: state.nodes.length,
    edges: state.edges.length,
    scriptLength: state.script.length,
    assets: state.assets.length,
    variables: state.variables.map(v => ({ name: v.name, type: v.type, value: v.initialValue })),
    characters: state.characters.map(c => ({ name: c.name, displayName: (c as any).displayName })),
    globalFlags: state.globalFlags,
    groups: state.groups.map(g => ({ name: g.name, nodeCount: g.nodeIds?.length ?? 0 }))
  }, null, 2) }] }
}
