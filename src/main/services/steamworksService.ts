/**
 * Steamworks 成就配置服务
 * 管理成就 ID 映射 → Steam 统计/成就 API 配置生成
 */

export interface SteamAchievementConfig {
  id: string
  name: string
  description: string
  icon: string
  statName: string
  defaultValue: number
}

export interface SteamworksExport {
  appId: string
  achievements: SteamAchievementConfig[]
  stats: { name: string; type: 'INT' | 'FLOAT' | 'AVGRATE'; defaultValue: number }[]
}

/** 从项目成就列表生成 Steamworks 配置 */
export function generateSteamConfig(
  achievements: { id: string; name: string; description: string; icon: string }[],
  appId = '480'
): SteamworksExport {
  const configs: SteamAchievementConfig[] = achievements.map((a, i) => ({
    id: a.id,
    name: a.name,
    description: a.description || a.name,
    icon: a.icon || '🏆',
    statName: `ACH_${a.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    defaultValue: 0
  }))

  return {
    appId,
    achievements: configs,
    stats: configs.map(c => ({
      name: c.statName,
      type: 'INT' as const,
      defaultValue: 0
    }))
  }
}

/** 生成 steam_appid.txt 内容 */
export function generateSteamAppId(appId: string): string {
  return `${appId}\n`
}

/** 生成成就配置 JSON（供运行时读取） */
export function generateAchievementJson(config: SteamworksExport): string {
  return JSON.stringify({
    appId: config.appId,
    achievements: Object.fromEntries(
      config.achievements.map(a => [
        a.id,
        { name: a.name, description: a.description, statName: a.statName }
      ])
    )
  }, null, 2)
}

/** 生成 Steamworks 统计脚本（注入到导出 HTML） */
export function generateSteamRuntimeJs(): string {
  return [
    '(function(){',
    'if(typeof window==="undefined")return;',
    'window.__STEAM_ACHIEVEMENTS__=window.__STEAM_ACHIEVEMENTS__||{};',
    'window.steamAPI={',
    'setAchievement:function(id){',
    'window.__STEAM_ACHIEVEMENTS__[id]=true;',
    'console.log("[Steam] Achievement set:",id);',
    'try{',
    'if(window.electronAPI?.setSteamAchievement){window.electronAPI.setSteamAchievement(id)}',
    '}catch(e){}',
    '},',
    'isAchieved:function(id){return!!window.__STEAM_ACHIEVEMENTS__[id]},',
    'getAllAchievements:function(){return window.__STEAM_ACHIEVEMENTS__}',
    '};',
    '})();'
  ].join('\n')
}
