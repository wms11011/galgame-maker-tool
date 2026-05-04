/**
 * 纯 TypeScript 项目状态管理（不依赖 Pinia/Vue）
 * MCP Server 进程中使用，替代 Pinia flowStore/projectStore
 */
import type { FlowNode, FlowEdge, ProjectData, AssetInfo, VariableDef, CharacterDef } from '../../renderer/src/types/index'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'

export interface MutableProjectState {
  projectPath: string | null
  meta: ProjectData['meta'] | null
  nodes: FlowNode[]
  edges: FlowEdge[]
  script: string
  assets: AssetInfo[]
  variables: VariableDef[]
  characters: CharacterDef[]
  globalFlags: Record<string, boolean>
  flagAliases: Record<string, string>
  groups: any[]
  achievements: any[]
  items: any[]
  glossary: any[]
}

export function createEmptyState(): MutableProjectState {
  return {
    projectPath: null,
    meta: null,
    nodes: [],
    edges: [],
    script: '',
    assets: [],
    variables: [],
    characters: [],
    globalFlags: {},
    flagAliases: {},
    groups: [],
    achievements: [],
    items: [],
    glossary: []
  }
}

let _state = createEmptyState()

export function getState(): MutableProjectState { return _state }

export function setState(s: MutableProjectState): void { _state = s }

export function loadProject(projectPath: string): MutableProjectState {
  const abs = resolve(projectPath)
  const dataPath = resolve(abs, 'data.json')
  if (!existsSync(dataPath)) {
    throw new Error(`项目数据文件不存在: ${dataPath}`)
  }
  const raw = readFileSync(dataPath, 'utf-8')
  const data: ProjectData = JSON.parse(raw)

  _state = {
    projectPath: abs,
    meta: data.meta,
    nodes: data.flow?.nodes ?? [],
    edges: data.flow?.edges ?? [],
    script: data.script ?? '',
    assets: data.assets ?? [],
    variables: data.variables ?? [],
    characters: data.characters ?? [],
    globalFlags: data.globalFlags ?? {},
    flagAliases: data.flagAliases ?? {},
    groups: data.groups ?? [],
    achievements: data.achievements ?? [],
    items: data.items ?? [],
    glossary: data.glossary ?? []
  }
  return _state
}

export function saveProject(): void {
  if (!_state.projectPath || !_state.meta) {
    throw new Error('未打开项目，无法保存')
  }
  const data: ProjectData = {
    meta: { ..._state.meta, updatedAt: new Date().toISOString() },
    flow: { nodes: _state.nodes, edges: _state.edges },
    script: _state.script,
    assets: _state.assets,
    variables: _state.variables,
    characters: _state.characters,
    globalFlags: _state.globalFlags,
    flagAliases: _state.flagAliases,
    groups: _state.groups,
    achievements: _state.achievements,
    items: _state.items,
    glossary: _state.glossary
  }
  writeFileSync(resolve(_state.projectPath, 'data.json'), JSON.stringify(data, null, 2), 'utf-8')
}

export function createProject(name: string, projectPath: string, resolution: '1280x720' | '1920x1080' = '1280x720'): MutableProjectState {
  const abs = resolve(projectPath)
  const fs = require('fs-extra')
  fs.ensureDirSync(abs)
  fs.ensureDirSync(resolve(abs, 'assets'))
  fs.ensureDirSync(resolve(abs, 'script'))

  const now = new Date().toISOString()
  const meta = { name, version: '1.0.0', createdAt: now, updatedAt: now, projectPath: abs, resolution }
  const data: ProjectData = {
    meta,
    flow: { nodes: [], edges: [] },
    script: '',
    assets: [], variables: [], characters: [],
    globalFlags: {}, flagAliases: {}, groups: [], achievements: [], items: [], glossary: []
  }
  writeFileSync(resolve(abs, 'data.json'), JSON.stringify(data, null, 2), 'utf-8')

  _state = {
    projectPath: abs,
    meta,
    nodes: [], edges: [], script: '',
    assets: [], variables: [], characters: [],
    globalFlags: {}, flagAliases: {}, groups: [], achievements: [], items: [], glossary: []
  }
  return _state
}
