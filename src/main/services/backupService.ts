import { app } from 'electron'
import * as fs from 'fs-extra'
import { join, resolve } from 'path'

// 本地类型定义（与 renderer/src/types/index.ts 保持一致）
interface ProjectMeta {
  name: string
  version: string
  createdAt: string
  updatedAt: string
  projectPath: string
  resolution: '1280x720' | '1920x1080'
}

interface ProjectData {
  meta: ProjectMeta
  flow: { nodes: unknown[]; edges: unknown[] }
  script: string
  assets: unknown[]
}

interface BackupInfo {
  path: string
  createdAt: string
  projectName: string
}

function getBackupDir(): string {
  return join(app.getPath('temp'), 'galgame-backups')
}

function validateProjectData(data: unknown): asserts data is ProjectData {
  if (!data || typeof data !== 'object') {
    throw new Error('备份数据无效')
  }
  const d = data as Record<string, unknown>
  if (!d.meta || typeof d.meta !== 'object') {
    throw new Error('备份数据缺少 meta 字段')
  }
  const meta = d.meta as Record<string, unknown>
  if (!meta.name || typeof meta.name !== 'string') {
    throw new Error('备份数据 meta 缺少 name 字段')
  }
}

function validatePath(path: unknown): asserts path is string {
  if (!path || typeof path !== 'string' || path.trim().length === 0) {
    throw new Error('路径不能为空')
  }
}

export async function createBackup(data: unknown): Promise<string> {
  validateProjectData(data)

  const projectData = data as ProjectData
  const backupDir = getBackupDir()
  await fs.ensureDir(backupDir)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safeName = projectData.meta.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
  const fileName = `${safeName}_${timestamp}.json`
  const backupPath = join(backupDir, fileName)

  await fs.writeJson(backupPath, projectData, { spaces: 2 })

  return backupPath
}

export async function listBackups(): Promise<BackupInfo[]> {
  const backupDir = getBackupDir()

  if (!(await fs.pathExists(backupDir))) {
    return []
  }

  const entries = await fs.readdir(backupDir, { withFileTypes: true })
  const backups: BackupInfo[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue

    const fullPath = join(backupDir, entry.name)
    try {
      const stat = await fs.stat(fullPath)
      // 从文件名解析项目名称：{projectName}_{timestamp}.json
      const nameWithoutExt = entry.name.replace(/\.json$/, '')
      // timestamp 格式：YYYY-MM-DDTHH-MM-SS-mmmZ，最后一段是时区
      // 找最后一个 _ 之前的部分作为项目名
      const lastUnderscoreIdx = nameWithoutExt.lastIndexOf('_')
      const projectName =
        lastUnderscoreIdx > 0 ? nameWithoutExt.substring(0, lastUnderscoreIdx) : nameWithoutExt

      backups.push({
        path: fullPath,
        createdAt: stat.mtime.toISOString(),
        projectName
      })
    } catch {
      // 跳过无法读取的文件
    }
  }

  // 按创建时间降序排列（最新的在前）
  backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return backups
}

export async function restoreBackup(backupPath: string): Promise<ProjectData> {
  validatePath(backupPath)

  // 安全检查：只允许从备份目录恢复
  const backupDir = getBackupDir()
  const resolvedBackupPath = resolve(backupPath)
  const resolvedBackupDir = resolve(backupDir)
  if (!resolvedBackupPath.startsWith(resolvedBackupDir)) {
    throw new Error('非法路径：只能从备份目录恢复')
  }

  if (!(await fs.pathExists(backupPath))) {
    throw new Error(`备份文件不存在：${backupPath}`)
  }

  const data = await fs.readJson(backupPath)
  validateProjectData(data)

  return data as ProjectData
}

let autoBackupTimer: ReturnType<typeof setInterval> | null = null

export function startAutoBackup(
  intervalMs: number,
  getData: () => ProjectData | null
): void {
  stopAutoBackup()

  if (intervalMs <= 0) {
    throw new Error('备份间隔必须大于 0')
  }

  autoBackupTimer = setInterval(async () => {
    try {
      const data = getData()
      if (data) {
        await createBackup(data)
      }
    } catch (err) {
      console.error('[BackupService] 自动备份失败:', err)
    }
  }, intervalMs)
}

export function stopAutoBackup(): void {
  if (autoBackupTimer !== null) {
    clearInterval(autoBackupTimer)
    autoBackupTimer = null
  }
}
