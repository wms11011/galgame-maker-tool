/**
 * MCP Tools — 资源管理
 * 使用纯文件系统操作（不依赖 Electron dialog）
 */
import { z } from 'zod'
import * as fs from 'fs-extra'
import { join, basename, extname, resolve } from 'path'
import { getState } from '../shared/projectState'

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp']
const AUDIO_EXTS = ['.mp3', '.ogg', '.wav']

export const ListAssetsSchema = z.object({
  category: z.string().optional().describe('按分类过滤: character, background, cg, audio, 等')
})

export const ImportAssetSchema = z.object({
  filePath: z.string().describe('要导入的文件的绝对路径'),
  category: z.string().optional().describe('资源分类: character, background, cg, audio, item, live2d, avatar, other'),
  type: z.enum(['image', 'audio']).optional().describe('资源类型，默认根据扩展名自动判断')
})

// ── Handlers ──

function getMimeFromExt(ext: string): 'image' | 'audio' {
  if (IMAGE_EXTS.includes(ext.toLowerCase())) return 'image'
  if (AUDIO_EXTS.includes(ext.toLowerCase())) return 'audio'
  return 'image'
}

const CATEGORY_SUBDIR: Record<string, string> = {
  character: 'characters', avatar: 'avatars', background: 'backgrounds',
  item: 'items', cg: 'cg', live2d: 'live2d', audio: 'audio', other: 'other'
}

export async function handleListAssets(args: z.infer<typeof ListAssetsSchema>) {
  const state = getState()
  if (!state.projectPath) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      error: '未打开项目，无法列出资源。请先使用 script_from_file 加载项目。'
    }) }] }
  }

  const assetsDir = resolve(state.projectPath, 'assets')
  if (!await fs.pathExists(assetsDir)) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      projectPath: state.projectPath, assets: [], count: 0
    }) }] }
  }

  // 从 assets 目录递归收集文件
  const result: Array<{ name: string; relativePath: string; type: string; size: number; category: string }> = []

  async function scanDir(dir: string, parentCat: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        const cat = Object.keys(CATEGORY_SUBDIR).find(k => CATEGORY_SUBDIR[k] === e.name) || parentCat
        await scanDir(full, cat)
      } else if (e.isFile()) {
        const ext = extname(e.name).toLowerCase()
        const type = getMimeFromExt(ext)
        if ((type === 'image' && IMAGE_EXTS.includes(ext)) || (type === 'audio' && AUDIO_EXTS.includes(ext))) {
          const stat = await fs.stat(full)
          const relativePath = full.replace(state.projectPath!, '').replace(/^[/\\]/, '').replace(/\\/g, '/')
          result.push({ name: e.name, relativePath, type, size: stat.size, category: parentCat })
        }
      }
    }
  }

  await scanDir(assetsDir, 'other')

  // 过滤
  const filtered = args.category
    ? result.filter(a => a.category === args.category)
    : result

  return { content: [{ type: 'text' as const, text: JSON.stringify({
    projectPath: state.projectPath,
    assets: filtered,
    count: filtered.length,
    categories: [...new Set(filtered.map(a => a.category))]
  }, null, 2) }] }
}

export async function handleImportAsset(args: z.infer<typeof ImportAssetSchema>) {
  const state = getState()
  if (!state.projectPath) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      error: '未打开项目，无法导入资源'
    }) }] }
  }

  const srcPath = resolve(args.filePath)
  if (!await fs.pathExists(srcPath)) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      error: `文件不存在: ${srcPath}`
    }) }] }
  }

  const ext = extname(srcPath).toLowerCase()
  const type = args.type || getMimeFromExt(ext)
  const allowedExts = type === 'image' ? IMAGE_EXTS : AUDIO_EXTS
  if (!allowedExts.includes(ext)) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({
      error: `不支持的文件格式: ${ext}。${type} 仅支持 ${allowedExts.join(', ')}`
    }) }] }
  }

  const category = args.category || 'other'
  const subDir = CATEGORY_SUBDIR[category] || 'other'
  const destDir = resolve(state.projectPath, 'assets', subDir)
  await fs.ensureDir(destDir)

  const fileName = basename(srcPath)
  const destPath = join(destDir, fileName)
  await fs.copy(srcPath, destPath, { overwrite: true })

  const stat = await fs.stat(destPath)
  const relativePath = `assets/${subDir}/${fileName}`

  // 添加到内存状态
  const assetEntry: any = {
    name: fileName, relativePath, type, size: stat.size, category
  }
  state.assets.push(assetEntry)

  return { content: [{ type: 'text' as const, text: JSON.stringify({
    success: true,
    asset: assetEntry,
    projectPath: state.projectPath,
    totalAssets: state.assets.length
  }, null, 2) }] }
}
