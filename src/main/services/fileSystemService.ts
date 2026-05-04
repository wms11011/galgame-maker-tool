import { dialog, app } from 'electron'
import * as fs from 'fs-extra'
import { join } from 'path'

// 本地类型定义（与 renderer/src/types/index.ts 保持一致）
interface ProjectMeta {
  name: string
  version: string
  createdAt: string
  updatedAt: string
  projectPath: string
  resolution: '1280x720' | '1920x1080'
}

interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string
}

interface AssetInfo {
  name: string
  relativePath: string
  type: 'image' | 'audio'
  size: number
  thumbnail?: string
}

interface ProjectData {
  meta: ProjectMeta
  flow: { nodes: FlowNode[]; edges: FlowEdge[] }
  script: string
  assets: AssetInfo[]
  variables?: unknown[]
  characters?: unknown[]
  globalFlags?: Record<string, boolean>
  groups?: unknown[]
  achievements?: unknown[]
}

// 项目名称不能包含特殊字符
const INVALID_NAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/

function validateProjectName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('项目名称不能为空')
  }
  if (name.trim().length === 0) {
    throw new Error('项目名称不能为空白字符')
  }
  if (INVALID_NAME_CHARS.test(name)) {
    throw new Error('项目名称包含非法字符（不允许 < > : " / \\ | ? *）')
  }
  if (name.length > 100) {
    throw new Error('项目名称不能超过 100 个字符')
  }
}

function validatePath(dirPath: string): void {
  if (!dirPath || typeof dirPath !== 'string') {
    throw new Error('路径不能为空')
  }
  if (dirPath.trim().length === 0) {
    throw new Error('路径不能为空白字符')
  }
}

function validateProjectData(data: unknown): asserts data is ProjectData {
  if (!data || typeof data !== 'object') {
    throw new Error('项目数据无效')
  }
  const d = data as Record<string, unknown>
  if (!d.meta || typeof d.meta !== 'object') {
    throw new Error('项目数据缺少 meta 字段')
  }
  const meta = d.meta as Record<string, unknown>
  if (!meta.name || typeof meta.name !== 'string') {
    throw new Error('项目 meta 缺少 name 字段')
  }
}

export async function createProject(name: string, dirPath: string): Promise<ProjectData> {
  validateProjectName(name)
  validatePath(dirPath)

  const projectDir = join(dirPath, `${name}.galgame`)

  if (await fs.pathExists(projectDir)) {
    throw new Error(`项目目录已存在：${projectDir}`)
  }

  // 创建目录结构
  await fs.ensureDir(projectDir)
  await fs.ensureDir(join(projectDir, 'script'))
  await fs.ensureDir(join(projectDir, 'assets', 'backgrounds'))
  await fs.ensureDir(join(projectDir, 'assets', 'characters'))
  await fs.ensureDir(join(projectDir, 'assets', 'audio'))

  const now = new Date().toISOString()
  const meta: ProjectMeta = {
    name,
    version: app.getVersion(),
    createdAt: now,
    updatedAt: now,
    projectPath: projectDir,
    resolution: '1280x720'
  }

  const projectData: ProjectData = {
    meta,
    flow: { nodes: [], edges: [] },
    script: '',
    assets: [],
    variables: [],
    characters: [],
    globalFlags: {},
    groups: [],
    achievements: []
  }

  // 写入 data.json
  await fs.writeJson(join(projectDir, 'data.json'), projectData, { spaces: 2 })

  // 写入 script/main.gs
  await fs.writeFile(join(projectDir, 'script', 'main.gs'), '// GALGAME 脚本入口\n')

  // 写入 config.json
  await fs.writeJson(
    join(projectDir, 'config.json'),
    {
      name,
      version: app.getVersion(),
      resolution: '1280x720',
      createdAt: now
    },
    { spaces: 2 }
  )

  return projectData
}

export async function openProject(): Promise<ProjectData | null> {
  const result = await dialog.showOpenDialog({
    title: '打开项目',
    filters: [{ name: 'GALGAME 项目', extensions: ['galgame'] }],
    properties: ['openDirectory']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const projectDir = result.filePaths[0]
  const dataPath = join(projectDir, 'data.json')

  if (!(await fs.pathExists(dataPath))) {
    throw new Error(`无效的项目目录：找不到 data.json（${projectDir}）`)
  }

  const projectData = await fs.readJson(dataPath) as ProjectData
  // 更新 projectPath 为当前实际路径（防止目录被移动）
  projectData.meta.projectPath = projectDir

  return projectData
}

export async function saveProject(data: unknown, projectPath: string): Promise<string> {
  console.log('[保存] 开始保存项目:', projectPath)
  validateProjectData(data)
  validatePath(projectPath)

  if (!(await fs.pathExists(projectPath))) {
    const error = `项目目录不存在：${projectPath}`
    console.error('[保存]', error)
    throw new Error(error)
  }

  const projectData = data as ProjectData
  projectData.meta.updatedAt = new Date().toISOString()

  const dataJsonPath = join(projectPath, 'data.json')

  try {
    // 先写到唯一新文件，再原子移动覆盖（避免打开已被锁定的旧文件）
    const tmpPath = join(projectPath, `data-${Date.now()}.tmp`)
    await fs.writeJson(tmpPath, projectData, { spaces: 2 })
    await fs.move(tmpPath, dataJsonPath, { overwrite: true })
    console.log('[保存] data.json 保存成功')
  } catch (err) {
    console.error('[保存] 保存失败:', err)
    throw new Error(`无法保存项目文件: ${(err as Error).message}`)
  }

  // 同步脚本文件
  if (typeof projectData.script === 'string') {
    await fs.ensureDir(join(projectPath, 'script'))
    const scriptPath = join(projectPath, 'script', 'main.gs')

    try {
      const scriptTmpPath = join(projectPath, 'script', `main-${Date.now()}.tmp`)
      await fs.writeFile(scriptTmpPath, projectData.script, 'utf8')
      await fs.move(scriptTmpPath, scriptPath, { overwrite: true })
      console.log('[保存] 脚本文件保存成功')
    } catch (err) {
      console.warn('保存脚本文件失败:', err)
    }
  }

  console.log('[保存] 项目保存完成:', projectPath)
  return projectPath
}

export async function saveProjectAs(data: unknown): Promise<string | null> {
  validateProjectData(data)

  const projectData = data as ProjectData
  const result = await dialog.showSaveDialog({
    title: '另存为',
    defaultPath: projectData.meta.name,
    filters: [{ name: 'GALGAME 项目', extensions: ['galgame'] }]
  })

  if (result.canceled || !result.filePath) {
    return null
  }

  const projectDir = result.filePath
  await fs.ensureDir(projectDir)
  await fs.ensureDir(join(projectDir, 'script'))
  await fs.ensureDir(join(projectDir, 'assets', 'backgrounds'))
  await fs.ensureDir(join(projectDir, 'assets', 'characters'))
  await fs.ensureDir(join(projectDir, 'assets', 'audio'))

  projectData.meta.projectPath = projectDir
  projectData.meta.updatedAt = new Date().toISOString()

  await fs.writeJson(join(projectDir, 'data.json'), projectData, { spaces: 2 })

  if (typeof projectData.script === 'string') {
    await fs.writeFile(join(projectDir, 'script', 'main.gs'), projectData.script)
  }

  await fs.writeJson(
    join(projectDir, 'config.json'),
    {
      name: projectData.meta.name,
      version: projectData.meta.version,
      resolution: projectData.meta.resolution,
      createdAt: projectData.meta.createdAt
    },
    { spaces: 2 }
  )

  return projectDir
}
