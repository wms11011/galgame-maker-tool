// ============================================================
// 导出服务 - 网页版 / 桌面版导出
// ============================================================

import * as fs from 'fs-extra'
import * as path from 'path'
// 定义导出相关的类型（原 ../types/export 模块不存在）
interface ExportConfig {
  outputPath: string
  type: 'web' | 'desktop'
  resolution: '1280x720' | '1920x1080'
  includeDebugInfo?: boolean
  targetPlatforms?: ('win' | 'mac' | 'linux')[]
}

interface ExportResult {
  success: boolean
  outputPath?: string
  error?: string
}

type ProgressCallback = (stage: string, percent: number) => void
import { generateSteamConfig, generateSteamAppId, generateAchievementJson, generateSteamRuntimeJs } from './steamworksService'

interface ValidationResult { valid: boolean; errors: string[] }

export function validateConfig(config: ExportConfig): ValidationResult {
  const errors: string[] = []
  if (!config.outputPath) errors.push('输出路径不能为空')
  if (!['web', 'desktop'].includes(config.type)) errors.push('导出类型必须为 web 或 desktop')
  if (!['1280x720', '1920x1080'].includes(config.resolution)) errors.push('分辨率必须为 1280x720 或 1920x1080')
  return { valid: errors.length === 0, errors }
}

export async function exportProject(
  projectData: unknown, config: ExportConfig, onProgress: ProgressCallback
): Promise<ExportResult> {
  const validation = validateConfig(config)
  if (!validation.valid) return { success: false, error: validation.errors.join('; ') }
  try {
    onProgress('准备中', 5)
    await fs.ensureDir(config.outputPath)
    return config.type === 'web'
      ? await exportWeb(projectData, config, onProgress)
      : await exportDesktop(projectData, config, onProgress)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function exportWeb(
  projectData: unknown, config: ExportConfig, onProgress: ProgressCallback
): Promise<ExportResult> {
  const data = projectData as Record<string, unknown>
  const meta = data?.meta as Record<string, unknown> | undefined
  const gameName = sanitizeName((meta?.name as string) || 'galgame')
  const outputDir = path.join(config.outputPath, gameName)

  onProgress('复制资源', 20)
  await fs.ensureDir(outputDir)
  const projectPath = meta?.projectPath as string | undefined
  if (projectPath) {
    const assetsDir = path.join(projectPath, 'assets')
    if (await fs.pathExists(assetsDir)) await fs.copy(assetsDir, path.join(outputDir, 'assets'))
  }
  onProgress('生成代码', 60)
  const dataWithDebug = { ...data, includeDebugInfo: config.includeDebugInfo }
  await fs.writeFile(path.join(outputDir, 'game.js'), generateRuntimeJs(dataWithDebug), 'utf-8')
  const [width, height] = config.resolution.split('x')
  const html = generateIndexHtml(width, height)
  await fs.writeFile(path.join(outputDir, 'index.html'), html, 'utf-8')

  // Steam 成就配置
  const achievements = (data?.achievements as any[]) || []
  if (achievements.length > 0) {
    const steamConfig = generateSteamConfig(achievements, '480')
    await fs.writeFile(path.join(outputDir, 'steam_appid.txt'), generateSteamAppId(steamConfig.appId), 'utf-8')
    await fs.writeFile(path.join(outputDir, 'achievements.json'), generateAchievementJson(steamConfig), 'utf-8')
    await fs.writeFile(path.join(outputDir, 'steam_api.js'), generateSteamRuntimeJs(), 'utf-8')
  }

  onProgress('打包完成', 100)
  return { success: true, outputPath: outputDir }
}

function sanitizeName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').substring(0, 50)
}

async function exportDesktop(
  projectData: unknown, config: ExportConfig, onProgress: ProgressCallback
): Promise<ExportResult> {
  // 桌面版 = 网页版 + 各平台启动脚本
  const result = await exportWeb(projectData, config, onProgress)
  if (!result.success) return result
  const data = projectData as Record<string, unknown>
  const meta = data?.meta as Record<string, unknown> | undefined
  const gameName = (meta?.name as string) || 'GALGAME'
  const platforms = config.targetPlatforms || ['win']

  if (platforms.includes('win')) {
    await fs.writeFile(path.join(result.outputPath!, '启动游戏.bat'),
      '@echo off\r\ncd /d "%~dp0"\r\nstart "" "index.html"\r\necho ' + gameName + ' 已启动\r\npause\r\n', 'utf-8')
  }
  if (platforms.includes('mac')) {
    await fs.writeFile(path.join(result.outputPath!, '启动游戏.command'),
      '#!/bin/bash\ncd "$(dirname "$0")"\nopen "index.html"\necho "' + gameName + ' 已启动"\nread -p "按任意键退出..."\n', 'utf-8')
  }
  if (platforms.includes('linux')) {
    await fs.writeFile(path.join(result.outputPath!, '启动游戏.sh'),
      '#!/bin/bash\ncd "$(dirname "$0")"\nxdg-open "index.html" 2>/dev/null || open "index.html" 2>/dev/null || echo "请手动打开 index.html"\necho "' + gameName + ' 已启动"\nread -p "按任意键退出..."\n', 'utf-8')
  }
  return result
}

function generateRuntimeJs(projectData: unknown): string {
  const json = JSON.stringify(projectData, null, 2)
  const parts = [
    '// GALGAME 运行时',
    '(function(){',
    '"use strict";',
    'const data=window.__GALGAME_DATA__=' + json + ';',
    'const nodes=data.flow?.nodes??[];',
    'const edges=data.flow?.edges??[];',
    'const state={currentNode:null,variables:{},flags:{},visited:new Set,saves:[],bgm:null};',
    'for(const v of data.variables??[]){',
    'if(v.type==="array")state.variables[v.name]=Array.isArray(v.initialValue)?[...v.initialValue]:[];',
    'else if(v.type==="string")state.variables[v.name]=String(v.initialValue??"");',
    'else if(v.type==="boolean")state.variables[v.name]=v.initialValue===true||v.initialValue==="true";',
    'else state.variables[v.name]=Number(v.initialValue??0)}',
    'Object.assign(state.flags,data.globalFlags??{});',
    generateRuntimeJsCore()
  ]
  return parts.join('\n')
}

function generateRuntimeJsCore(): string {
  // Return the bulk of the engine as a separate function to avoid template literal issues
  return [
"function esc(s){return String(s??\"\").replace(/&/g,\"&amp;\").replace(/</g,\"&lt;\").replace(/>/g,\"&gt;\").replace(/\"/g,\"&quot;\")}",
"function $(s){return document.querySelector(s)}",
"function setHTML(h){const c=$(\"#game-container\");if(c)c.innerHTML=h}",
"function clearUI(){setHTML(\"\")}",
"function stripTags(s){return s.replace(/\\{[^}]+\\}/g,'')}",
"function hasEffect(s,t){return new RegExp('\\\\\\\\{'+t).test(s)}",
"function showDialog(name,text){var pt=stripTags(text);var c='';if(hasEffect(text,'shake'))c+=' vn-shake';if(hasEffect(text,'wave'))c+=' vn-wave';if(hasEffect(text,'bounce'))c+=' vn-bounce';setHTML('<div class=\"vn-layer vn-dialog-box\">'+(name?'<div class=\"vn-name\">'+esc(name)+'</div>':'')+'<div class=\"vn-text'+c+'\">'+esc(pt)+'</div><div class=\"vn-hint\">点击继续</div></div>')}",
"function showChoice(title,opts){const th=title?'<div class=\"vn-choice-title\">'+esc(title)+'</div>':\"\";setHTML('<div class=\"vn-layer vn-choice-box\">'+th+'<div class=\"vn-choice-btns\">'+opts.map(o=>'<button class=\"vn-choice-btn\" data-target=\"'+esc(o.nextNodeId)+'\">'+esc(o.text)+'</button>').join(\"\")+'</div></div>');$(\".vn-choice-box\")?.addEventListener(\"click\",e=>{const b=e.target.closest(\".vn-choice-btn\");if(b?.dataset.target)advance(b.dataset.target)})}",
"function showEnd(type,msg){const c={normal:\"#94a3b8\",good:\"#22c55e\",bad:\"#ef4444\",true:\"#f59e0b\"},l={normal:\"完结\",good:\"好结局\",bad:\"坏结局\",true:\"真结局\"};setHTML('<div class=\"vn-layer vn-ending\"><div class=\"vn-ending-type\" style=\"color:'+(c[type]||\"#94a3b8\")+'\">'+(l[type]||type)+'</div><div class=\"vn-ending-msg\">'+esc(msg)+'</div></div>')}",
"function showCg(src,trans,dur){const cls=trans===\"fade\"?\"vn-cg-fade-in\":trans===\"zoom\"?\"vn-cg-zoom-in\":\"\";setHTML('<div class=\"vn-layer vn-cg '+cls+'\"><img src=\"'+esc(src)+'\" class=\"vn-cg-img\"></div>');const el=$(\".vn-cg\");if(el)el.style.animationDuration=(dur||1e3)+\"ms\"}",
"function showWait(text){setHTML('<div class=\"vn-layer vn-wait\"><div class=\"vn-wait-text\">'+esc(text||\"...\")+'</div></div>')}",
"function bg(src){const c=$(\"#game-container\");if(c&&src)c.style.backgroundImage=\"url(\"+esc(src)+\")\"}",
"function evalExpr(expr){if(!expr)return true;try{var e=expr;for(var k in state.variables){var v=state.variables[k];e=e.replace(new RegExp('(^|\\\\s)'+k.replace(/[.*+?^${}()|\\\\[\\\\]\\\\]/g,'\\\\$&')+'(?=\\\\s|$|\\\\)|,|\\\\+|-|\\\\*|/|=|!|<|>)','g'),'$1'+v)}for(var k in state.flags){e=e.replace(new RegExp('(^|\\\\s)'+k.replace(/[.*+?^${}()|\\\\[\\\\]\\\\]/g,'\\\\$&')+'(?=\\\\s|$|\\\\)|,|\\\\+|-|\\\\*|/|=|!|<|>)','g'),'$1'+(state.flags[k]?'true':'false'))}var tks=[];var rx=/(\\\\d+(?:\\\\.\\\\d+)?|true|false|>=|<=|==|!=|>|<|&&|\\\\|\\\\||!|\\\\(|\\\\))/g;var m;while((m=rx.exec(e))!==null){var s=m[1];if(s==='true')tks.push({k:'b',v:true});else if(s==='false')tks.push({k:'b',v:false});else if(/^\\\\d/.test(s))tks.push({k:'n',v:Number(s)});else if(s==='(')tks.push({k:'lp'});else if(s===')')tks.push({k:'rp'});else tks.push({k:'o',v:s})}var p=0;function pk(){return tks[p]}function adv(){return tks[p++]}function prim(){var t=pk();if(!t)return false;if(t.k==='n'){adv();return t.v}if(t.k==='b'){adv();return t.v}if(t.k==='lp'){adv();var v=or();if(pk()&&pk().k==='rp')adv();return v}if(t.k==='o'&&t.v==='!'){adv();return !prim()}adv();return false}function cmp(){var l=prim();var t=pk();if(t&&t.k==='o'&&['>=','<=','==','!=','>','<'].indexOf(t.v)>=0){var op=t.v;adv();var r=prim();var lv=typeof l==='number'?l:l?1:0;var rv=typeof r==='number'?r:r?1:0;switch(op){case'>=':return lv>=rv;case'<=':return lv<=rv;case'>':return lv>rv;case'<':return lv<rv;case'==':return l===r;case'!=':return l!==r}}return typeof l==='boolean'?l:l!==0}function and(){var r=cmp();while(pk()&&pk().k==='o'&&pk().v==='&&'){adv();r=r&&cmp()}return r}function or(){var r=and();while(pk()&&pk().k==='o'&&pk().v==='||'){adv();r=r||and()}return r}return or()}catch(e){return true}}",
"function playAudio(src,loop,vol){stopAudio();if(!src)return;try{const a=new Audio(src);a.loop=!!loop;a.volume=vol??0.7;a.play().catch(()=>{});state.bgm=a}catch(e){}}",
"function stopAudio(){if(state.bgm){try{state.bgm.pause();state.bgm.currentTime=0}catch(e){}state.bgm=null}}",
"const outEdges=new Map;const inEdges=new Map;",
"for(const n of nodes){outEdges.set(n.id,[]);inEdges.set(n.id,[])}",
"for(const e of edges)outEdges.get(e.source)?.push({target:e.target,label:e.label});",
"for(const n of nodes){const d=n.data??{};const t=[];if(d.nextNodeId)t.push(d.nextNodeId);if(d.targetNodeId)t.push(d.targetNodeId);if(d.trueNextId)t.push({id:d.trueNextId,label:\"true\"});if(d.falseNextId)t.push({id:d.falseNextId,label:\"false\"});if(d.options)for(const o of d.options)if(o.nextNodeId)t.push({id:o.nextNodeId,label:o.text});if(d.branches)for(const b of d.branches)if(b.targetNodeId)t.push({id:b.targetNodeId,label:String(b.weight)});for(const imp of t.map(x=>typeof x===\"string\"?{target:x}:{target:x.id,label:x.label})){const ex=outEdges.get(n.id);if(!ex.some(x=>x.target===imp.target))ex.push(imp);const ie=inEdges.get(imp.target);if(ie&&!ie.includes(n.id))ie.push(n.id)}}",
"function getNext(id){return outEdges.get(id)??[]}",
"function advance(nextId){if(!nextId)return;const nn=nodes.find(n=>n.id===nextId);if(nn?.data?.unlockCondition&&!evalExpr(nn.data.unlockCondition)){const nx=getNext(state.currentNode?.id);const fb=nx.find(e=>e.target!==nextId);if(fb){advance(fb.target);return}return}state.visited.add(nextId);const n=nodes.find(x=>x.id===nextId);if(n){state.currentNode=n;execNode(n);checkAuto()}}",
"function waitAndAdvance(ms,nextId){return new Promise(r=>{setTimeout(()=>{advance(nextId);r()},ms)})}",
"function waitClick(){return new Promise(r=>{function h(e){if(e.target.closest(\"button\"))return;document.removeEventListener(\"click\",h);r()}document.addEventListener(\"click\",h)})}",
"async function execNode(node){if(!node)return;state.currentNode=node;try{switch(node.type){case\"dialog\":return execDialog(node);case\"choice\":return execChoice(node);case\"condition\":return execCondition(node);case\"setVariable\":return execSetVar(node);case\"goto\":return execGoto(node);case\"end\":return execEnd(node);case\"audio\":return execAudio(node);case\"cg\":return execCg(node);case\"wait\":return execWait(node);case\"random\":return execRandom(node);case\"label\":return execLabel(node);case\"animation\":return execAnim(node);case\"savePoint\":return execSave(node);case\"timer\":return execTimer(node);case\"moveCharacter\":return execMove(node);case\"steamAchievement\":return execSteam(node);case\"achievement\":return execAch(node);default:{const nx=getNext(node.id);if(nx.length)advance(nx[0].target)}}}catch(e){console.error('[runtime] node',node?.id,'(',node?.type,') failed:',e);const nx=getNext(node.id);if(nx.length)advance(nx[0].target);else{document.querySelector(\"#game-container\")?.innerHTML='<div class=\"vn-layer vn-ending\"><div class=\"vn-ending-msg\">游戏出错</div></div>'}}}",
"async function execDialog(n){const d=n.data??{};if(d.background)bg(d.background);showDialog(d.character,d.content);await waitClick();const nx=getNext(n.id);if(nx.length)advance(nx[0].target)}",
"async function execChoice(n){const d=n.data??{};showChoice(d.title,d.options??[])}",
"async function execCondition(n){const d=n.data??{};advance(evalExpr(d.expression)?d.trueNextId:d.falseNextId)}",
"async function execSetVar(n){const d=n.data??{},v=d.variable;if(!v){const nx=getNext(n.id);if(nx.length)advance(nx[0].target);return}const op=d.op??\"=\",raw=d.value,cur=state.variables[v];if(Array.isArray(cur)){switch(op){case\"push\":if(raw)cur.push(raw);break;case\"pop\":cur.pop();break;case\"clear\":cur.length=0;break;default:state.variables[v]=raw?String(raw).split(\",\"):[]}}else if(typeof cur===\"string\"||typeof raw===\"string\"){state.variables[v]=op===\"+=\"?(String(cur??\"\")+String(raw??\"\")):String(raw??\"\")}else if(typeof cur===\"boolean\"){state.variables[v]=raw===\"true\"||raw===\"1\"}else{const val=parseFloat(raw)||0,num=typeof cur===\"number\"?cur:0;switch(op){case\"=\":state.variables[v]=val;break;case\"+=\":state.variables[v]=num+val;break;case\"-=\":state.variables[v]=num-val;break;case\"*=\":state.variables[v]=num*val;break;case\"/=\":state.variables[v]=val!==0?num/val:num}}const nx=getNext(n.id);if(nx.length)advance(nx[0].target)}",
"async function execGoto(n){advance((n.data??{}).targetNodeId)}",
"async function execEnd(n){const d=n.data??{};stopAudio();showEnd(d.endingType??\"normal\",d.message??\"\")}",
"async function execAudio(n){const d=n.data??{};if(d.action===\"play\"&&d.src)playAudio(d.src,d.loop,d.volume);else if(d.action===\"stop\")stopAudio();const nx=getNext(n.id);if(nx.length)advance(nx[0].target)}",
"async function execCg(n){const d=n.data??{};if(d.src)showCg(d.src,d.transition,d.duration);await waitAndAdvance(d.duration??2e3,getNext(n.id)[0]?.target)}",
"async function execWait(n){const d=n.data??{};showWait(\"...\");await waitAndAdvance(d.duration??1e3,getNext(n.id)[0]?.target)}",
"async function execRandom(n){const d=n.data??{},brs=d.branches??[];if(!brs.length){const nx=getNext(n.id);if(nx.length)advance(nx[0].target);return}const total=brs.reduce((s,b)=>s+(b.weight||1),0);let r=Math.random()*total;for(const b of brs){r-=b.weight||1;if(r<=0){advance(b.targetNodeId);return}}advance(brs[brs.length-1].targetNodeId)}",
"async function execLabel(n){const nx=getNext(n.id);if(nx.length)advance(nx[0].target)}",
"async function execAnim(n){const d=n.data??{};showWait(\"🎬 \"+esc(d.target||\"\")+\" \"+(d.action||\"\"));await waitAndAdvance(d.duration??500,getNext(n.id)[0]?.target)}",
"async function execSave(n){const nx=getNext(n.id);if(nx.length)advance(nx[0].target)}",
"async function execTimer(n){const d=n.data??{},ms=d.duration||3e3,vr=d.variable,md=d.mode||\"countdown\",nx=getNext(n.id)[0]?.target;if(md===\"countdown\"&&vr)state.variables[vr]=ms;const st=performance.now();const iv=setInterval(()=>{const el=performance.now()-st,rem=Math.max(0,ms-el);if(md===\"countdown\"){showWait(\"⏰ 倒计时: \"+Math.ceil(rem/1e3)+\"s\")}else{showWait(\"⏱ 计时: \"+(el/1e3).toFixed(1)+\"s\");if(vr)state.variables[vr]=Math.round(el)}if(rem<=0){clearInterval(iv);if(md===\"countdown\"&&vr)state.variables[vr]=0;clearUI();if(nx)advance(nx)}},200)}",
"async function execMove(n){const d=n.data??{};showWait(\"🚶 \"+esc(d.target||\"角色\")+\" 移动中...\");await waitAndAdvance(d.duration||800,getNext(n.id)[0]?.target)}",
"async function execSteam(n){const d=n.data??{};if(d.achievementId){window.__STEAM_ACHIEVEMENTS__=window.__STEAM_ACHIEVEMENTS__||{};window.__STEAM_ACHIEVEMENTS__[d.achievementId]=true}const nx=getNext(n.id);if(nx.length)advance(nx[0].target)}",
"async function execAch(n){const d=n.data??{},ach=(data.achievements??[]).find(a=>a.id===d.achievementId);if(ach&&!ach.unlocked){if(ach.unlockCondition&&!evalExpr(ach.unlockCondition)){const nx=getNext(n.id);if(nx.length)advance(nx[0].target);return}unlockAch(ach)}const nx=getNext(n.id);if(nx.length)advance(nx[0].target)}",
"function unlockAch(ach){ach.unlocked=true;ach.unlockedAt=new Date().toISOString();const t=document.createElement(\"div\");t.className=\"vn-ach-toast\";t.innerHTML='<span class=\"vn-ach-toast-icon\">'+(ach.icon||\"🏆\")+'</span> 成就解锁: '+esc(ach.name);document.body.appendChild(t);setTimeout(()=>{t.classList.add(\"vn-ach-toast-out\");setTimeout(()=>{if(t.parentNode)t.remove()},500)},3e3)}",
"function checkAuto(){(data.achievements??[]).forEach(a=>{if(a.autoCheck&&!a.unlocked&&a.unlockCondition&&evalExpr(a.unlockCondition))unlockAch(a)})}",
"function findEntry(){const es=nodes.filter(n=>(inEdges.get(n.id)?.length??0)===0);return es.length?es[0]:nodes[0]}",
"document.addEventListener(\"keydown\",e=>{if(e.key===\"Escape\"){}});",
"if(nodes.length){const e=findEntry();if(e){state.currentNode=e;execNode(e)}}else{$(\"#game-container\").innerHTML='<div class=\"vn-layer vn-ending\"><div class=\"vn-ending-msg\">空白项目</div></div>'};const ls=$(\"#loading-screen\");if(ls){setTimeout(()=>{ls.classList.add(\"hidden\");setTimeout(()=>{if(ls.parentNode)ls.remove()},400)},300)}",
"})();",
""
  ].join('\n')
}

function generateIndexHtml(width: string, height: string, faviconPath?: string): string {
  const fav = faviconPath ? '\n  <link rel="icon" href="' + faviconPath + '">' : ''
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>GALGAME</title>' + fav + '\n  <style>\n    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}\n    html,body{width:100%;height:100%;overflow:hidden}\n    body{background:#0a0a0a;display:flex;align-items:center;justify-content:center;font-family:var(--vn-font-family);user-select:none;-webkit-user-select:none}:root{--vn-font-family:"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif;--vn-font-size:17px;--vn-text-color:#e8e8e8;--vn-name-color:#ffd700;--vn-dialog-bg:rgba(0,0,0,0.92);--vn-choice-bg:rgba(30,30,60,.88)}\n    #game-container{width:' + width + 'px;height:' + height + 'px;background:#111;background-size:cover;background-position:center;position:relative;overflow:hidden;cursor:pointer}\n    .vn-layer{position:absolute;z-index:10}\n    .vn-dialog-box{bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.75) 20%,rgba(0,0,0,0.92));padding:48px 32px 28px;min-height:140px}\n    .vn-name{font-size:22px;font-weight:700;color:#ffd700;margin-bottom:6px}\n    .vn-text{font-size:17px;line-height:1.7;color:#e8e8e8;letter-spacing:.02em}\n    .vn-hint{text-align:right;font-size:12px;color:#6b7280;margin-top:12px;animation:blink 1.6s ease-in-out infinite}\n    @keyframes blink{0%,100%{opacity:.3}50%{opacity:1}}\n    .vn-choice-box{top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}\n    .vn-choice-title{font-size:20px;color:#e2e8f0;margin-bottom:16px;font-weight:600}\n    .vn-choice-btns{display:flex;flex-direction:column;gap:10px;align-items:center}\n    .vn-choice-btn{display:block;min-width:240px;padding:12px 36px;background:rgba(30,30,60,.88);color:#e2e8f0;border:1px solid rgba(139,92,246,.5);border-radius:8px;font-size:16px;cursor:pointer;transition:all .15s;font-family:inherit}\n    .vn-choice-btn:hover{background:rgba(60,50,100,.88);border-color:#8b5cf6;transform:translateY(-1px)}\n    .vn-ending{inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.92);z-index:100}\n    .vn-ending-type{font-size:36px;font-weight:700;margin-bottom:16px;letter-spacing:.1em}\n    .vn-ending-msg{font-size:18px;color:#94a3b8;max-width:70%;text-align:center;line-height:1.7}\n    .vn-cg{inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:#000}\n    .vn-cg-img{max-width:100%;max-height:100%;object-fit:contain}\n    .vn-cg-fade-in{animation:fadeIn .6s ease-out}\n    .vn-cg-zoom-in{animation:zoomIn .8s ease-out}\n    @keyframes fadeIn{from{opacity:0}to{opacity:1}}\n    @keyframes zoomIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}\n    .vn-wait{inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);z-index:20}\n    .vn-wait-text{color:#94a3b8;font-size:16px}\n    .vn-ach-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(34,197,94,.92);color:#fff;padding:10px 24px;border-radius:20px;font-size:14px;font-weight:600;z-index:9999;animation:toastIn .4s ease-out;white-space:nowrap}\n    .vn-ach-toast-out{animation:toastOut .4s ease-in forwards}\n    .vn-ach-toast-icon{font-size:18px}#loading-screen{position:fixed;inset:0;z-index:9999;background:#0a0a0a;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity .4s}#loading-screen.hidden{opacity:0;pointer-events:none}.loading-title{font-size:20px;color:#e8e8e8;margin-bottom:16px}.loading-bar-track{width:240px;height:6px;background:#1a1a2e;border-radius:3px;overflow:hidden}.loading-bar-fill{height:100%;background:linear-gradient(90deg,#8b5cf6,#f0a0a8);border-radius:3px;transition:width .3s;width:0%}@media(max-width:768px){#game-container{width:100vw!important;height:100vh!important}.vn-dialog-box{padding:24px 16px 16px!important;min-height:120px!important}.vn-name{font-size:16px!important}.vn-text{font-size:14px!important}.vn-choice-btn{min-width:180px!important;padding:10px 24px!important;font-size:14px!important}.vn-ending-type{font-size:24px!important}}\n    @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}\n    @keyframes toastOut{to{opacity:0;transform:translateX(-50%) translateY(-20px)}}@keyframes textShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}@keyframes textWave{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes textBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}.vn-shake{animation:textShake .3s infinite}.vn-wave{animation:textWave .5s infinite}.vn-bounce{animation:textBounce .4s infinite}\n  </style>\n</head>\n<body>\n  <div id="loading-screen"><div class="loading-title">GALGAME 加载中...</div><div class="loading-bar-track"><div id="loading-bar" class="loading-bar-fill"></div></div></div><div id="game-container"></div>\n  <script src="steam_api.js"></script>\n  <script src="game.js"></script>\n</body>\n</html>\n'
}
