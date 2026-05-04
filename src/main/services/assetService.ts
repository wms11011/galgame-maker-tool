import { dialog } from 'electron'
import * as fs from 'fs-extra'
import { join, basename, extname, relative, resolve } from 'path'

// 本地类型定义（与 renderer/src/types/index.ts 保持一致）
interface AssetInfo {
  name: string
  relativePath: string
  type: 'image' | 'audio'
  size: number
  thumbnail?: string
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']
const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav']

const IMAGE_FILTERS = [{ name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
const AUDIO_FILTERS = [{ name: '音频文件', extensions: ['mp3', 'ogg', 'wav'] }]

const CATEGORY_TO_SUBDIR: Record<string, string> = {
  character: 'characters',
  avatar: 'avatars',
  background: 'backgrounds',
  item: 'items',
  cg: 'cg',
  live2d: 'live2d',
  audio: 'audio',
  other: 'other'
}

function getAssetSubDir(type: 'image' | 'audio', category?: string): string {
  if (type === 'audio') return 'audio'
  if (category && CATEGORY_TO_SUBDIR[category]) return CATEGORY_TO_SUBDIR[category]
  return 'other'
}

function validateAssetType(type: unknown): asserts type is 'image' | 'audio' {
  if (type !== 'image' && type !== 'audio') {
    throw new Error(`无效的资源类型：${type}，必须为 "image" 或 "audio"`)
  }
}

function validatePath(path: unknown): asserts path is string {
  if (!path || typeof path !== 'string' || path.trim().length === 0) {
    throw new Error('路径不能为空')
  }
}

function validateFileExtension(filePath: string, type: 'image' | 'audio'): void {
  const ext = extname(filePath).toLowerCase()
  const allowed = type === 'image' ? IMAGE_EXTENSIONS : AUDIO_EXTENSIONS
  if (!allowed.includes(ext)) {
    throw new Error(
      `不支持的文件格式：${ext}，${type === 'image' ? '图片' : '音频'}仅支持 ${allowed.join(', ')}`
    )
  }
}

async function generateThumbnail(filePath: string): Promise<string> {
  try {
    const sharp = (await import('sharp')).default
    const buffer = await sharp(filePath).resize(100, null, { withoutEnlargement: true }).toBuffer()
    return `data:image/jpeg;base64,${buffer.toString('base64')}`
  } catch {
    return ''
  }
}

export async function importAsset(
  type: 'image' | 'audio',
  projectPath: string,
  category?: string
): Promise<AssetInfo[]> {
  validateAssetType(type)
  validatePath(projectPath)

  const filters = type === 'image' ? IMAGE_FILTERS : AUDIO_FILTERS
  const catLabel = category ? CATEGORY_TO_SUBDIR[category] : 'other'
  const result = await dialog.showOpenDialog({
    title: `导入${type === 'image' ? '图片' : '音频'} → ${catLabel} 分类`,
    filters,
    properties: ['openFile', 'multiSelections']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return []
  }

  const subDir = getAssetSubDir(type, category)
  const destDir = join(projectPath, 'assets', subDir)
  await fs.ensureDir(destDir)

  const imported: AssetInfo[] = []

  for (const srcPath of result.filePaths) {
    validateFileExtension(srcPath, type)

    const fileName = basename(srcPath)
    const destPath = join(destDir, fileName)
    await fs.copy(srcPath, destPath, { overwrite: true })

    const stat = await fs.stat(destPath)
    const relativePath = `assets/${subDir}/${fileName}`

    const assetInfo: AssetInfo = {
      name: fileName,
      relativePath,
      type,
      size: stat.size,
      category: type === 'audio' ? 'audio' : (category || undefined)
    }

    if (type === 'image') {
      assetInfo.thumbnail = await generateThumbnail(destPath)
    }

    imported.push(assetInfo)
  }

  return imported
}

export async function deleteAsset(relativePath: string, projectPath: string): Promise<void> {
  validatePath(relativePath)
  validatePath(projectPath)

  const fullPath = resolve(projectPath, relativePath)
  const assetsDir = resolve(projectPath, 'assets')
  if (!fullPath.startsWith(assetsDir)) {
    throw new Error('非法路径：只能删除 assets 目录下的文件')
  }
  if (relative(projectPath, fullPath).startsWith('..')) {
    throw new Error('非法路径：不允许路径遍历')
  }

  if (!(await fs.pathExists(fullPath))) {
    throw new Error(`文件不存在：${relativePath}`)
  }

  await fs.remove(fullPath)
}

export async function renameAsset(oldRelPath: string, newName: string, projectPath: string): Promise<{ success: boolean; newPath: string }> {
  const oldFull = join(projectPath, oldRelPath)
  const dir = oldRelPath.replace(/[/\\][^/\\]*$/, '')
  const ext = oldRelPath.match(/\.[^.]+$/)?.[0] || ''
  const newRelPath = dir ? `${dir}/${newName}${ext}` : `${newName}${ext}`
  const newFull = join(projectPath, newRelPath)

  if (!(await fs.pathExists(oldFull))) throw new Error(`文件不存在：${oldRelPath}`)
  if (await fs.pathExists(newFull)) throw new Error(`目标已存在：${newRelPath}`)

  await fs.rename(oldFull, newFull)
  return { success: true, newPath: newRelPath }
}

export async function listAssets(projectPath: string): Promise<AssetInfo[]> {
  validatePath(projectPath)

  const assetsDir = join(projectPath, 'assets')
  if (!(await fs.pathExists(assetsDir))) {
    return []
  }

  const assets: AssetInfo[] = []

  async function scanDir(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        await scanDir(fullPath)
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase()
        let type: 'image' | 'audio' | null = null
        if (IMAGE_EXTENSIONS.includes(ext)) {
          type = 'image'
        } else if (AUDIO_EXTENSIONS.includes(ext)) {
          type = 'audio'
        }

        if (type) {
          const stat = await fs.stat(fullPath)
          const relPath = relative(projectPath, fullPath).replace(/\\/g, '/')

          // 从文件夹名推断分类
          const parentDir = relPath.split('/').slice(-2, -1)[0] || ''
          const SUBDIR_TO_CATEGORY: Record<string, string> = {
            characters: 'character', avatars: 'avatar', backgrounds: 'background',
            items: 'item', cg: 'cg', live2d: 'live2d', audio: 'audio', other: 'other'
          }
          const category = SUBDIR_TO_CATEGORY[parentDir] || undefined

          const assetInfo: AssetInfo = {
            name: entry.name,
            relativePath: relPath,
            type,
            size: stat.size,
            category: type === 'audio' ? 'audio' : category
          }

          if (type === 'image') {
            assetInfo.thumbnail = await generateThumbnail(fullPath)
          }

          assets.push(assetInfo)
        }
      }
    }
  }

  await scanDir(assetsDir)
  return assets
}

export async function loadAssetAsDataUrl(projectPath: string, relativePath: string): Promise<string> {
  validatePath(projectPath)
  validatePath(relativePath)

  const fullPath = join(projectPath, relativePath)
  if (!(await fs.pathExists(fullPath))) {
    throw new Error(`文件不存在：${relativePath}`)
  }

  const ext = extname(fullPath).toLowerCase()
  let mimeType = 'application/octet-stream'
  if (['.png'].includes(ext)) {
    mimeType = 'image/png'
  } else if (['.jpg', '.jpeg'].includes(ext)) {
    mimeType = 'image/jpeg'
  } else if (['.webp'].includes(ext)) {
    mimeType = 'image/webp'
  }

  const buffer = await fs.readFile(fullPath)
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}
