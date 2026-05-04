/**
 * 资源 URL 转换工具
 * 将项目内的相对路径转换为可在渲染进程中使用的 file:// URL
 */

/**
 * 将资源相对路径转换为 file:// 协议 URL
 * @param projectPath 项目根目录绝对路径
 * @param relativePath 资源相对路径（如 "assets/backgrounds/forest.png"）
 * @returns file:// URL 字符串
 */
export function getAssetUrl(projectPath: string, relativePath: string): string {
  if (!projectPath || !relativePath) return ''

  // 规范化路径分隔符（Windows 使用反斜杠，需转换为正斜杠）
  const normalizedProject = projectPath.replace(/\\/g, '/')
  const normalizedRelative = relativePath.replace(/\\/g, '/')

  // 去掉开头的 ./ 或 /
  const cleanRelative = normalizedRelative.replace(/^\.?\//, '')

  // 拼接 file:// URL
  const base = normalizedProject.endsWith('/') ? normalizedProject : normalizedProject + '/'
  return `file:///${base}${cleanRelative}`
}

/**
 * 从 file:// URL 中提取相对路径
 * @param projectPath 项目根目录绝对路径
 * @param fileUrl file:// URL
 * @returns 相对路径，如果无法提取则返回原始 URL
 */
export function urlToRelativePath(projectPath: string, fileUrl: string): string {
  if (!fileUrl.startsWith('file://')) return fileUrl

  const normalizedProject = projectPath.replace(/\\/g, '/').replace(/^\/+/, '')
  const urlPath = fileUrl.replace(/^file:\/\/\/?/, '')

  if (urlPath.startsWith(normalizedProject)) {
    return urlPath.slice(normalizedProject.length).replace(/^\//, '')
  }

  return fileUrl
}
