// ============================================================
// 剧情预览引擎 - 基于 PixiJS 的 GALGAME 渲染核心
// ============================================================

import * as PIXI from 'pixi.js'
import type {
  ProjectData,
  FlowNode,
  ChoiceOption,
  AchievementDef
} from '../types/index'
import { getAssetUrl } from '../utils/assetUrl'
import { AudioManager } from '../audio/AudioManager'
import { parseTextEffects } from '../utils/textEffectParser'
import type { ParsedText, TextSegment } from '../utils/textEffectParser'

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'bool'; value: boolean }
  | { kind: 'op'; value: string }
  | { kind: 'lparen' }
  | { kind: 'rparen' }

function tokenizeCondition(expr: string): Token[] {
  const tokens: Token[] = []
  const regex = /(\d+(?:\.\d+)?|true|false|>=|<=|==|!=|>|<|&&|\|\||!|\(|\))/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(expr)) !== null) {
    const s = m[1]
    if (s === 'true') tokens.push({ kind: 'bool', value: true })
    else if (s === 'false') tokens.push({ kind: 'bool', value: false })
    else if (/^\d/.test(s)) tokens.push({ kind: 'number', value: Number(s) })
    else if (s === '(') tokens.push({ kind: 'lparen' })
    else if (s === ')') tokens.push({ kind: 'rparen' })
    else tokens.push({ kind: 'op', value: s })
  }
  return tokens
}

function safeEvalCondition(expr: string): boolean {
  const stripped = expr
    .replace(/\d+(?:\.\d+)?/g, '')
    .replace(/true|false/g, '')
    .replace(/>=|<=|==|!=|>|<|&&|\|\||!/g, '')
    .replace(/[()]/g, '')
    .replace(/\s/g, '')
  if (/[+\-*/]/.test(stripped)) return false
  const tokens = tokenizeCondition(expr)
  let pos = 0

  function peek(): Token | undefined { return tokens[pos] }
  function advance(): Token { return tokens[pos++] }

  function parsePrimary(): number | boolean {
    const t = peek()
    if (!t) return false
    if (t.kind === 'number') { advance(); return t.value }
    if (t.kind === 'bool') { advance(); return t.value }
    if (t.kind === 'lparen') {
      advance()
      const val = parseOr()
      if (peek()?.kind === 'rparen') advance()
      return val
    }
    if (t.kind === 'op' && t.value === '!') {
      advance()
      const val = parsePrimary()
      return !val
    }
    advance()
    return false
  }

  function parseComparison(): boolean {
    const left = parsePrimary()
    const t = peek()
    if (t?.kind === 'op' && ['>=', '<=', '==', '!=', '>', '<'].includes(t.value)) {
      const op = t.value
      advance()
      const right = parsePrimary()
      const l = typeof left === 'number' ? left : (left ? 1 : 0)
      const r = typeof right === 'number' ? right : (right ? 1 : 0)
      switch (op) {
        case '>=': return l >= r
        case '<=': return l <= r
        case '>': return l > r
        case '<': return l < r
        case '==': return left === right
        case '!=': return left !== right
      }
    }
    return typeof left === 'boolean' ? left : left !== 0
  }

  function parseAnd(): boolean {
    let result = parseComparison()
    while (peek()?.kind === 'op' && peek()!.value === '&&') {
      advance()
      result = result && parseComparison()
    }
    return result
  }

  function parseOr(): boolean {
    let result = parseAnd()
    while (peek()?.kind === 'op' && peek()!.value === '||') {
      advance()
      result = result || parseAnd()
    }
    return result
  }

  try { return parseOr() }
  catch { return false }
}
import { FlowTraversal } from '../utils/FlowTraversal'
import { StateManager } from './StateManager'
import { AnimationHelper } from './AnimationHelper'
import { AutoAchievementChecker } from './AutoAchievementChecker'
import {
  BaseNodeRenderer,
  DialogRenderer, ChoiceRenderer, ConditionRenderer, SetVariableRenderer,
  GotoRenderer, EndRenderer, AudioRenderer, CgRenderer, WaitRenderer,
  RandomRenderer, LabelRenderer, AnimationRenderer, SavePointRenderer,
  TimerRenderer, MoveCharacterRenderer, SteamAchievementRenderer, AchievementRenderer,
  ParticleRenderer, Live2DRenderer, ItemRenderer
} from './renderers'

type Resolution = '1280x720' | '1920x1080'

export interface VariableChange {
  step: number
  nodeId: string
  varName: string
  oldValue: number
  newValue: number
  op: string
  valueStr: string
}

export interface AutoCheckResult {
  name: string
  condition: string
  resolvedCondition: string
  result: boolean
}

export interface LastAutoCheckInfo {
  timestamp: number
  step: number
  candidateCount: number
  variables: Record<string, number>
  globalFlags: Record<string, boolean>
  results: AutoCheckResult[]
  newlyUnlocked: string[]
  error?: string
}

export interface DebugInfo {
  currentNodeId: string | null
  currentNodeType: string | null
  currentNodeLabel: string | null
  visitedNodes: { id: string; type: string; label: string }[]
  variables: Record<string, number>
  variableHistory: VariableChange[]
  stepCount: number
  isEnded: boolean
  isRunning: boolean
  isBreakpointPaused: boolean
  speed: number
  achievements: { id: string; name: string; unlocked: boolean; autoCheck: boolean; condition: string }[]
  lastAutoCheck: LastAutoCheckInfo | null
  flagAliases: Record<string, string>
  errorNodes: { nodeId: string; error: string; timestamp: number }[]
}

// ============================================================
// 10.1 渲染核心初始化
// ============================================================

export class PreviewEngine {
  // 核心服务（供渲染器访问）
  app: PIXI.Application | null = null
  projectData: ProjectData | null = null

  // 五层渲染容器
  bgLayer!: PIXI.Container       // L0: 背景层
  charLayer!: PIXI.Container     // L1: 角色层
  dialogLayer!: PIXI.Container   // L2: 对话框层
  choiceLayer!: PIXI.Container   // L3: 选择项层
  transLayer!: PIXI.Container    // L4: 过渡效果层

  currentNodeId: string | null = null
  private bgSprite: PIXI.Sprite | null = null
  charSprites: Map<string, PIXI.Sprite> = new Map()
  private variables: Record<string, number> = {}
  private globalFlags: Record<string, boolean> = {}
  private flagAliases: Record<string, string> = {}
  audioManager: AudioManager | null = null

  // 逐字打印状态
  private isTyping = false
  private typingCharIndex = 0
  private typingTarget: PIXI.Text | null = null
  private typingFullText = ''
  private typingSpeed = 45
  private typingParsed: ParsedText | null = null
  private effectTimer: ReturnType<typeof setInterval> | null = null
  private sceneParticleContainer: PIXI.Container | null = null
  private sceneParticleTicker: ((dt: number) => void) | null = null

  // 调试状态
  private visitedNodes: { id: string; type: string; label: string }[] = []
  private variableHistory: VariableChange[] = []
  private enteredGroups: Set<string> = new Set()
  private stepCount = 0
  debugCallback: ((info: DebugInfo) => void) | null = null

  // 自动播放
  private autoPlayTimer: ReturnType<typeof setTimeout> | null = null
  private autoPlaySpeed = 800
  private running = false
  private wasAutoPlaying = false  // 自动播放因选择节点暂停，选择后恢复
  private dismissTitleCard: (() => void) | null = null  // 供外部触发的标题卡关闭
  errorNodes: { nodeId: string; error: string; timestamp: number }[] = []
  traversal: FlowTraversal | null = null
  state!: StateManager
  anim!: AnimationHelper
  renderers!: Record<string, BaseNodeRenderer>
  autoChecker!: AutoAchievementChecker

  private initRenderers(): void {
    this.renderers = {
      dialog: new DialogRenderer(this),
      choice: new ChoiceRenderer(this),
      condition: new ConditionRenderer(this),
      setVariable: new SetVariableRenderer(this),
      goto: new GotoRenderer(this),
      end: new EndRenderer(this),
      audio: new AudioRenderer(this),
      cg: new CgRenderer(this),
      wait: new WaitRenderer(this),
      random: new RandomRenderer(this),
      label: new LabelRenderer(this),
      animation: new AnimationRenderer(this),
      savePoint: new SavePointRenderer(this),
      timer: new TimerRenderer(this),
      moveCharacter: new MoveCharacterRenderer(this),
      steamAchievement: new SteamAchievementRenderer(this),
      achievement: new AchievementRenderer(this),
      particle: new ParticleRenderer(this),
      live2d: new Live2DRenderer(this),
      item: new ItemRenderer(this)
    }
    this.autoChecker = new AutoAchievementChecker(this)
  }

  /** 获取节点所属章节的默认背景 */
  getGroupDefaultBg(node: FlowNode): string | undefined {
    const groups = this.projectData?.groups || []
    const group = groups.find(g => g.nodeIds.includes(node.id))
    return group?.defaultBackground
  }

  // 断点
  private breakpointNodeIds: Set<string> = new Set()
  private breakpointPaused = false
  private breakpointResolve: (() => void) | null = null
  private visitedNodeIdsToRestore: string[] = []

  // 回调
  choiceCallback: ((options: ChoiceOption[]) => void) | null = null
  endCallback: (() => void) | null = null
  saveCallback: ((info: { nodeId: string; slotLabel: string; variables: Record<string, number>; visitedNodeIds: string[] }) => void) | null = null
  achievementCallback: ((id: string, name: string) => void) | null = null
  private dialogueCallback: ((character: string, text: string, nodeId: string) => void) | null = null

  onDialogue(cb: (character: string, text: string, nodeId: string) => void): void { this.dialogueCallback = cb }

  // 成就系统
  private achievements: AchievementDef[] = []
  lastAutoCheckInfo: LastAutoCheckInfo | null = null

  async init(container: HTMLElement, resolution: Resolution): Promise<void> {
    const [width, height] = resolution.split('x').map(Number)

    // PixiJS v7 使用构造函数配置,不是 init() 方法
    this.app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })

    container.appendChild(this.app.view as HTMLCanvasElement)

    // 创建五层容器
    this.bgLayer = new PIXI.Container()
    this.charLayer = new PIXI.Container()
    this.dialogLayer = new PIXI.Container()
    this.choiceLayer = new PIXI.Container()
    this.transLayer = new PIXI.Container()

    this.app.stage.addChild(this.bgLayer)
    this.app.stage.addChild(this.charLayer)
    this.app.stage.addChild(this.dialogLayer)
    this.app.stage.addChild(this.choiceLayer)
    this.app.stage.addChild(this.transLayer)

    // 全局错误处理：防止未捕获异常导致白屏
    this.app.renderer.on('error', (err: unknown) => {
      console.warn('[预览] PixiJS 渲染器错误:', err)
    })

    this.state = new StateManager()
    this.anim = new AnimationHelper(this.app, this.transLayer, this.dialogLayer, this.choiceLayer)
  }

  /**
   * 初始化游戏状态（纯逻辑，不依赖 PIXI/Audio）
   * 可在 vitest 中独立测试
   */
  initState(data: ProjectData): void {
    this.projectData = data
    this.traversal = new FlowTraversal(data.flow.nodes, data.flow.edges)
    if (!this.state) this.state = new StateManager()
    this.state.loadFromProject(
      data.variables || [],
      data.globalFlags || {},
      data.flagAliases || {},
      data.achievements || []
    )

    if (data.items?.length) {
      this.state.variables['_items'] = data.items
    }

    this.achievements = data.achievements || []
    this.autoChecker = new AutoAchievementChecker(this.state, data.achievements || [])

    // 重置运行状态
    this.enteredGroups = new Set()
    this.state.enteredGroups = new Set()
    this.visitedNodes = []
    this.variableHistory = []
    this.stepCount = 0
    this.errorNodes = []
    this.running = false
  }

  /**
   * 预加载项目资源（使用 Texture.from 通过 <img> 标签加载，支持 file:// 协议）
   */
  async loadProject(data: ProjectData): Promise<void> {
    this.initState(data)

    // 初始化音频管理器
    this.audioManager = new AudioManager()

    for (const asset of data.assets) {
      if (asset.type === 'image') {
        const url = getAssetUrl(data.meta.projectPath, asset.relativePath)
        PIXI.Texture.from(url)
      }
    }

    this.initRenderers()
  }

  /**
   * 加载纹理：使用 IPC 通过 main process 加载图片为 data URL
   * 因为 contextIsolation: true 时，渲染进程无法直接使用 file:// URL
   */
  async loadTexture(url: string): Promise<PIXI.Texture | null> {
    return new Promise((resolve) => {
      const loadViaDataUrl = async (dataUrl: string) => {
        const texture = PIXI.Texture.from(dataUrl)
        if (texture.baseTexture.valid) {
          resolve(texture)
          return
        }
        const onDone = (success: boolean) => {
          texture.baseTexture.off('loaded', onLoaded)
          texture.baseTexture.off('error', onError)
          resolve(success ? texture : null)
        }
        const onLoaded = () => onDone(true)
        const onError = () => {
          console.error('[预览] 纹理加载失败:', dataUrl)
          onDone(false)
        }
        texture.baseTexture.once('loaded', onLoaded)
        texture.baseTexture.once('error', onError)
      }

      if (url.startsWith('file://') && window.electronAPI) {
        const projectPath = this.projectData?.meta.projectPath
        if (projectPath) {
          // 规范化路径分隔符，确保替换正确
          const normalizedProjectPath = projectPath.replace(/\\/g, '/')
          const urlPath = url.replace(/^file:\/\/\/?/, '')
          const relativePath = urlPath.replace(normalizedProjectPath, '').replace(/^\//, '').replace(/\\/g, '/')
          console.log('[预览] 加载纹理:', {
            url,
            projectPath,
            normalizedProjectPath,
            urlPath,
            relativePath
          })
          window.electronAPI.loadAssetAsDataUrl(projectPath, relativePath).then((result: { success: boolean; data?: string | null; error?: string }) => {
            if (result.success && result.data) {
              loadViaDataUrl(result.data)
            } else {
              console.error('[预览] 通过 IPC 加载纹理失败:', result.error)
              resolve(null)
            }
          }).catch(err => {
            console.error('[预览] 通过 IPC 加载纹理异常:', err)
            resolve(null)
          })
        } else {
          resolve(null)
        }
      } else {
        loadViaDataUrl(url)
      }
    })
  }

  /**
   * 销毁引擎，释放资源
   */
  destroy(): void {
    this.stopAutoPlay()
    if (this.audioManager) {
      this.audioManager.destroy()
      this.audioManager = null
    }
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true })
      this.app = null
    }
    this.charSprites.clear()
    this.bgSprite = null
    this.currentNodeId = null
  }

  // ============================================================
  // 10.2 场景渲染逻辑
  // ============================================================

  /**
   * 渲染指定节点
   */
  async renderNode(nodeId: string): Promise<void> {
    console.log('[预览] renderNode 调用, nodeId:', nodeId)

    if (!this.projectData || !this.app) {
      console.error('[预览] projectData 或 app 未初始化')
      return
    }

    const node = this.projectData.flow.nodes.find((n) => n.id === nodeId)
    if (!node) {
      console.error('[预览] 找不到节点:', nodeId)
      console.log('[预览] 可用节点:', this.projectData.flow.nodes.map(n => n.id))
      this.endCallback?.()
      return
    }

    // 断点检查
    if (this.breakpointNodeIds.has(nodeId)) {
      this.breakpointPaused = true
      this.emitDebug()
      console.log('[预览] 断点命中:', nodeId)
      await new Promise<void>((resolve) => {
        this.breakpointResolve = resolve
      })
      this.breakpointPaused = false
    }

    // 解锁条件检查
    const unlockCondition = 'unlockCondition' in node.data ? (node.data as Record<string, unknown>).unlockCondition as string | undefined : undefined
    if (unlockCondition && unlockCondition.trim()) {
      const unlocked = this.evaluateExpression(unlockCondition)
      if (!unlocked) {
        console.log('[预览] 节点未解锁:', nodeId, '条件:', unlockCondition)
        this.showLockedOverlay(nodeId, unlockCondition)
        return
      }
      console.log('[预览] 节点已解锁:', nodeId)
    }

    console.log('[预览] 找到节点:', node.type, node.data)
    this.currentNodeId = nodeId
    this.state.stepCount++
    this.state.visitedNodes.push({
      id: node.id,
      type: node.type,
      label: node.data.label || node.id
    })
    this.emitDebug()

    try {
      const renderer = this.renderers[node.type]
      if (renderer) {
        await renderer.render(node)
      }
    } catch (err) {
      console.error(`[预览] 节点 ${nodeId} (${node.type}) 渲染失败:`, err)
      this.errorNodes.push({ nodeId, error: String(err), timestamp: Date.now() })
      this.emitDebug()
      // 尝试跳到下一节点恢复播放
      const fallbackId = this.traversal?.getNext(nodeId) ?? null
      if (fallbackId && fallbackId !== nodeId) {
        await this.renderNode(fallbackId)
      } else {
        this.endCallback?.()
      }
      return
    }

    // 自动检测成就条件
    try {
      this.autoChecker.check()
    } catch (err) {
      console.error('[预览] 自动成就检测失败:', err)
    }
  }




  /**
   * 背景淡入淡出切换
   */
  async fadeBackground(url: string): Promise<void> {
    if (!this.app) return

    const texture = await this.loadTexture(url)
    if (!texture) return

    const newBg = new PIXI.Sprite(texture)
    const { width, height } = this.app.screen
    newBg.width = width
    newBg.height = height
    newBg.alpha = 0

    this.bgLayer.addChild(newBg)

    await this.fadeIn(newBg, 300)

    if (this.bgSprite && this.bgSprite !== newBg) {
      this.bgLayer.removeChild(this.bgSprite)
      this.bgSprite.destroy()
    }
    this.bgSprite = newBg
  }

  /**
   * 清除背景
   */
  clearBackground(): void {
    if (this.bgSprite) {
      this.bgLayer.removeChild(this.bgSprite)
      this.bgSprite.destroy()
      this.bgSprite = null
    }
  }

  /**
   * 清除所有角色立绘
   */
  clearCharacters(): void {
    for (const sprite of this.charSprites.values()) {
      this.charLayer.removeChild(sprite)
      sprite.destroy()
    }
    this.charSprites.clear()
  }

  /**
   * 显示角色立绘
   */
  async showCharacter(name: string, url: string): Promise<void> {
    if (!this.app) return

    const texture = await this.loadTexture(url)
    if (!texture) return

    const sprite = new PIXI.Sprite(texture)
    const { width, height } = this.app.screen

    sprite.anchor.set(0.5, 1)
    sprite.x = width / 2
    sprite.y = height - 80
    sprite.height = height * 0.75
    sprite.scale.x = sprite.scale.y

    const existing = this.charSprites.get(name)
    if (existing) {
      this.charLayer.removeChild(existing)
      existing.destroy()
    }

    this.charLayer.addChild(sprite)
    this.charSprites.set(name, sprite)
  }

  /**
   * 显示对话框（含逐字打印效果）
   */
  showDialogBox(character: string, content: string, style?: { typingSpeed?: number; textColor?: string; fontSize?: number }): void {
    if (!this.app) return

    this.dialogLayer.removeChildren()
    this.stopEffectAnimation()

    const interpolatedContent = this.interpolateText(content)
    const parsed = parseTextEffects(interpolatedContent)
    this.typingParsed = parsed

    const { width, height } = this.app.screen
    const boxHeight = 160
    const padding = 16
    const textColor = style?.textColor ?? '#eeeeee'
    const fontSize = style?.fontSize ?? 16

    // 对话框背景
    const bg = new PIXI.Graphics()
    bg.beginFill(0x000000, 0.75)
    bg.drawRect(0, height - boxHeight, width, boxHeight)
    bg.endFill()
    this.dialogLayer.addChild(bg)

    // 角色名
    const nameText = new PIXI.Text(character, {
      fill: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold'
    })
    nameText.x = padding
    nameText.y = height - boxHeight + padding
    this.dialogLayer.addChild(nameText)

    // 对话内容
    const contentText = new PIXI.Text('', {
      fill: textColor,
      fontSize,
      wordWrap: true,
      wordWrapWidth: width - padding * 2
    })
    contentText.x = padding
    contentText.y = height - boxHeight + padding + 32
    this.dialogLayer.addChild(contentText)

    const speed = style?.typingSpeed ?? 45
    this.dialogueCallback?.(character, interpolatedContent, this.currentNodeId || '')
    this.startTyping(contentText, parsed, speed, textColor, fontSize)
  }

  private startTyping(target: PIXI.Text, parsed: ParsedText, defaultSpeed: number, defaultColor: string, defaultFontSize: number): void {
    this.isTyping = true
    this.typingCharIndex = 0
    this.typingTarget = target
    this.typingFullText = parsed.plainText

    if (!parsed.plainText) {
      this.isTyping = false
      return
    }

    // 若有特效，启动特效动画循环
    if (parsed.hasEffects) {
      this.startEffectAnimation(target, parsed)
    }

    const tick = () => {
      if (!this.isTyping || this.typingCharIndex >= parsed.plainText.length) {
        this.isTyping = false
        this.stopEffectAnimation()
        return
      }

      // 检查当前字符位置的暂停点
      const pause = parsed.pauses.find(p => p.index === this.typingCharIndex)
      if (pause) {
        setTimeout(() => {
          this.typingCharIndex++
          target.text = parsed.plainText.slice(0, this.typingCharIndex)
          this.applyCurrentSegmentStyle(target, parsed, defaultColor, defaultFontSize)
          tick()
        }, pause.duration)
        return
      }

      this.typingCharIndex++
      target.text = parsed.plainText.slice(0, this.typingCharIndex)
      this.applyCurrentSegmentStyle(target, parsed, defaultColor, defaultFontSize)

      // 使用当前段的速度
      const seg = this.getSegmentAt(parsed, this.typingCharIndex)
      const speed = seg?.speed ?? defaultSpeed
      setTimeout(tick, speed)
    }
    setTimeout(tick, defaultSpeed)
  }

  private getSegmentAt(parsed: ParsedText, charIndex: number): TextSegment | undefined {
    let offset = 0
    for (const seg of parsed.segments) {
      if (charIndex <= offset + seg.text.length) return seg
      offset += seg.text.length
    }
    return undefined
  }

  private applyCurrentSegmentStyle(target: PIXI.Text, parsed: ParsedText, defaultColor: string, defaultFontSize: number): void {
    const seg = this.getSegmentAt(parsed, this.typingCharIndex)
    if (!seg) {
      target.style.fill = defaultColor
      target.style.fontSize = defaultFontSize
      return
    }
    target.style.fill = seg.color ?? defaultColor
    target.style.fontSize = seg.fontSize ?? defaultFontSize
  }

  private startEffectAnimation(target: PIXI.Text, parsed: ParsedText): void {
    const origX = target.x
    const origY = target.y
    const startTime = performance.now()
    this.effectTimer = setInterval(() => {
      const seg = this.getSegmentAt(parsed, this.typingCharIndex)
      if (!seg?.effect) {
        target.x = origX
        target.y = origY
        target.scale.set(1)
        return
      }
      const t = (performance.now() - startTime) / 1000
      switch (seg.effect) {
        case 'shake':
          target.x = origX + Math.sin(t * 30) * 3
          break
        case 'wave':
          target.y = origY + Math.sin(t * 8) * 5
          break
        case 'bounce':
          target.scale.set(1 + Math.abs(Math.sin(t * 6)) * 0.06)
          break
      }
    }, 33) // ~30fps
  }

  private stopEffectAnimation(): void {
    if (this.effectTimer) { clearInterval(this.effectTimer); this.effectTimer = null }
    if (this.typingTarget) {
      this.typingTarget.scale.set(1)
    }
  }

  /**
   * 立即完成当前逐字打印（点击跳过）
   */
  private completeTyping(): void {
    if (!this.isTyping) return
    this.isTyping = false
    this.stopEffectAnimation()
    if (this.typingTarget && this.typingFullText) {
      this.typingTarget.text = this.typingFullText
      this.typingCharIndex = this.typingFullText.length
    }
  }

  /**
   * 文本变量插值：将 {变量名} 替换为运行时变量值
   */
  private interpolateText(text: string): string {
    return text.replace(/\{([^}]+)\}/g, (_match, varName) => {
      const trimmed = varName.trim()
      if (trimmed in this.state.variables) {
        return String(this.state.variables[trimmed])
      }
      return `???`
    })
  }

  /**
   * 隐藏对话框
   */
  hideDialogBox(): void {
    this.dialogLayer.removeChildren()
  }

  /**
   * 显示选择项
   */
  showChoiceBox(options: ChoiceOption[]): void {
    if (!this.app) return

    this.choiceLayer.removeChildren()

    const { width, height } = this.app.screen
    const btnHeight = 44
    const btnWidth = 400
    const gap = 12
    const totalH = options.length * (btnHeight + gap) - gap
    let startY = (height - totalH) / 2

    for (const opt of options) {
      const btn = new PIXI.Container()
      btn.x = (width - btnWidth) / 2
      btn.y = startY
      btn.interactive = true
      btn.eventMode = 'static'
      btn.cursor = 'pointer'

      // PixiJS v7 Graphics API
      const bg = new PIXI.Graphics()
      bg.beginFill(0x2a2a6e, 0.9)
      bg.drawRoundedRect(0, 0, btnWidth, btnHeight, 8)
      bg.endFill()
      btn.addChild(bg)

      // PixiJS v7 Text API
      const label = new PIXI.Text(this.interpolateText(opt.text), {
        fill: '#ffffff',
        fontSize: 16
      })
      label.anchor.set(0.5)
      label.x = btnWidth / 2
      label.y = btnHeight / 2
      btn.addChild(label)

      btn.on('pointerover', () => { bg.tint = 0x4444aa })
      btn.on('pointerout', () => { bg.tint = 0xffffff })
      btn.on('pointertap', () => {
        this.choiceLayer.removeChildren()
        if (opt.nextNodeId) {
          const resumeAuto = this.wasAutoPlaying
          this.wasAutoPlaying = false
          this.renderNode(opt.nextNodeId)
          if (resumeAuto) {
            this.running = true
            this.autoPlayTick()
          }
        }
      })

      this.choiceLayer.addChild(btn)
      startY += btnHeight + gap
    }
  }









  /**
   * 展示章节标题卡（带背景图 + 章节名，点击继续）
   */
  async showChapterTitleCard(group: { name: string; color: string; background?: string; bgm?: string; bgmVolume?: number; bgmLoop?: boolean }): Promise<void> {
    if (!this.app) return

    // 隐藏当前对话框和选项，避免标题卡上残留文字
    this.hideDialogBox()
    this.choiceLayer.removeChildren()

    // 切换章节 BGM
    if (group.bgm && this.audioManager) {
      const projectPath = this.projectData!.meta.projectPath
      const bgmUrl = getAssetUrl(projectPath, group.bgm)
      this.audioManager.playBgm(bgmUrl, group.bgmLoop ?? true, (group.bgmVolume ?? 80) / 100)
      console.log('[预览] 章节BGM切换:', group.bgm)
    }

    const { width, height } = this.app.screen
    const stage = this.app.stage
    const projectPath = this.projectData!.meta.projectPath

    // 容器
    const container = new PIXI.Container()
    this.transLayer.addChild(container)

    // 背景：优先用自定义背景图，否则用章节颜色渐变
    if (group.background) {
      const bgUrl = getAssetUrl(projectPath, group.background)
      const texture = await this.loadTexture(bgUrl)
      if (texture) {
        const bg = new PIXI.Sprite(texture)
        bg.width = width
        bg.height = height
        bg.alpha = 0.85
        container.addChild(bg)
      }
    }

    // 半透明颜色遮罩
    const overlay = new PIXI.Graphics()
    overlay.beginFill(parseInt(group.color.replace('#', ''), 16), 0.45)
    overlay.drawRect(0, 0, width, height)
    overlay.endFill()
    container.addChild(overlay)

    // 装饰线
    const lineGraphics = new PIXI.Graphics()
    const lineColor = parseInt(group.color.replace('#', ''), 16)
    lineGraphics.lineStyle(3, lineColor, 0.8)
    lineGraphics.moveTo(width / 2 - 160, height / 2 + 15)
    lineGraphics.lineTo(width / 2 + 160, height / 2 + 15)
    container.addChild(lineGraphics)

    // 章节名
    const title = new PIXI.Text(group.name, {
      fill: '#ffffff',
      fontSize: 48,
      fontWeight: '700',
      fontFamily: 'serif',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowDistance: 3,
      dropShadowBlur: 6
    })
    title.anchor.set(0.5)
    title.x = width / 2
    title.y = height / 2 - 20
    title.alpha = 0
    container.addChild(title)

    // 提示文字（自动播放模式下不显示点击提示）
    const hintText = this.running ? '即将进入章节…' : '点击任意位置继续'
    const hint = new PIXI.Text(hintText, {
      fill: '#cccccc',
      fontSize: 16
    })
    hint.anchor.set(0.5)
    hint.x = width / 2
    hint.y = height / 2 + 50
    hint.alpha = 0
    container.addChild(hint)

    // 入场动画：标题淡入
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const elapsed = now - start
        const t = Math.min(elapsed / 600, 1)
        title.alpha = t
        hint.alpha = t
        if (t >= 1) {
          // 可点击跳过（手动/自动均可）
          container.interactive = true
          container.eventMode = 'static'
          container.cursor = 'pointer'
          let autoTimer: ReturnType<typeof setTimeout> | null = null
          const doResolve = () => {
            if (autoTimer) clearTimeout(autoTimer)
            container.off('pointertap')
            this.dismissTitleCard = null
            resolve()
          }
          container.on('pointertap', doResolve)
          this.dismissTitleCard = doResolve
          if (this.running) {
            // 自动播放模式：2.5秒后自动进入（也可点击跳过）
            autoTimer = setTimeout(doResolve, 2500)
          }
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })

    // 淡出清理
    const fadeStart = performance.now()
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const elapsed = now - fadeStart
        const t = Math.min(elapsed / 400, 1)
        container.alpha = 1 - t
        if (t >= 1) {
          resolve()
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })

    this.transLayer.removeChild(container)
    container.destroy({ children: true })
  }







  /**
   * 显示成就解锁提示
   */
  showAchievementToast(name: string, icon: string): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        if (!this.app) { resolve(); return }

      const { width, height } = this.app.screen
      const toastY = height - 240

      const container = new PIXI.Container()
      container.x = width / 2

      // 磨砂玻璃风格背景 + 金色边框
      const bg = new PIXI.Graphics()
      bg.beginFill(0x1a1020, 0.92)
      bg.drawRoundedRect(-190, -32, 380, 74, 14)
      bg.endFill()
      bg.lineStyle(2, 0xf0c860, 0.5)
      bg.drawRoundedRect(-190, -32, 380, 74, 14)
      container.addChild(bg)

      // 图标
      const iconText = new PIXI.Text(icon, { fontSize: 28 })
      iconText.anchor.set(0.5)
      iconText.x = -135
      iconText.y = 5
      container.addChild(iconText)

      // "成就解锁!" 标签（金色）
      const label = new PIXI.Text('🏆 成就解锁!', {
        fill: '#f0c860',
        fontSize: 13,
        fontWeight: 'bold'
      })
      label.x = -95
      label.y = -8
      container.addChild(label)

      // 成就名称
      const nameText = new PIXI.Text(name, {
        fill: '#ffffff',
        fontSize: 16,
        fontWeight: '700'
      })
      nameText.x = -95
      nameText.y = 14
      container.addChild(nameText)

      // 提示点击关闭
      const hintText = new PIXI.Text('点击关闭 ✕', {
        fill: '#777777',
        fontSize: 10
      })
      hintText.x = 100
      hintText.y = 20
      container.addChild(hintText)

      // 滑入动画起始状态
      container.alpha = 0
      container.y = toastY + 60
      this.transLayer.addChild(container)

      let dismissed = false
      const dismiss = () => {
        if (dismissed) return
        dismissed = true
        ticker.remove(onTick) // 停止主动画 ticker
        const ft = this.app!.ticker
        let fe = 0
        const fd = 300
        const onFade = (dt: number) => {
          fe += dt * (1000 / 60)
          const t = Math.min(fe / fd, 1)
          container.alpha = 1 - t
          if (t >= 1) {
            this.transLayer.removeChild(container)
            container.destroy({ children: true })
            ft.remove(onFade)
            resolve()
          }
        }
        ft.add(onFade)
      }

      // 点击关闭
      container.interactive = true
      container.eventMode = 'static'
      container.cursor = 'pointer'
      container.on('pointertap', dismiss)

      // 滑入动画 + 6秒自动消失
      const ticker = this.app.ticker
      let elapsed = 0
      const slideInDuration = 400
      const autoDismissDelay = 6000

      const onTick = (dt: number) => {
        elapsed += dt * (1000 / 60)
        if (elapsed >= autoDismissDelay) {
          ticker.remove(onTick)
          dismiss()
          return
        }
        if (elapsed < slideInDuration) {
          const t = elapsed / slideInDuration
          const eased = 1 - Math.pow(1 - t, 3)
          container.y = toastY + 60 - 60 * eased
          container.alpha = t
        } else {
          container.y = toastY
          container.alpha = 1
        }
      }
      ticker.add(onTick)
    } catch (e) {
      console.error('[预览] 成就提示动画异常:', e)
      resolve()
    }
    })
  }



  /**
   * 显示锁定提示（节点解锁条件未满足）
   */
  private showLockedOverlay(nodeId: string, condition: string): void {
    if (!this.app) return

    const { width, height } = this.app.screen

    // 半透明遮罩
    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0.7)
    overlay.drawRect(0, 0, width, height)
    overlay.endFill()
    this.transLayer.addChild(overlay)

    // 锁定图标和文字
    const lockIcon = new PIXI.Text('🔒', { fontSize: 48 })
    lockIcon.anchor.set(0.5)
    lockIcon.x = width / 2
    lockIcon.y = height / 2 - 50
    this.transLayer.addChild(lockIcon)

    const titleText = new PIXI.Text('内容未解锁', {
      fill: '#fbbf24',
      fontSize: 22,
      fontWeight: 'bold'
    })
    titleText.anchor.set(0.5)
    titleText.x = width / 2
    titleText.y = height / 2 + 10
    this.transLayer.addChild(titleText)

    const condText = new PIXI.Text(`需要: ${condition}`, {
      fill: '#94a3b8',
      fontSize: 14
    })
    condText.anchor.set(0.5)
    condText.x = width / 2
    condText.y = height / 2 + 48
    this.transLayer.addChild(condText)

    const hintText = new PIXI.Text('请满足条件后重试', {
      fill: '#64748b',
      fontSize: 14
    })
    hintText.anchor.set(0.5)
    hintText.x = width / 2
    hintText.y = height / 2 + 78
    this.transLayer.addChild(hintText)

    // 点击退出
    overlay.interactive = true
    overlay.eventMode = 'static'
    overlay.cursor = 'pointer'
    overlay.on('pointertap', () => {
      this.endCallback?.()
    })

    this.emitDebug()
  }


  /**
   * 求值条件表达式（支持变量名和全局标记替换）
   */
  evaluateExpression(expr: string): boolean {
    try {
      const resolved = this.resolveExpressionVariables(expr)
      if (this.autoChecker?.logCount <= 5) {
        console.log('[预览] 条件求值:', expr, '=>', resolved)
      }
      return safeEvalCondition(resolved)
    } catch {
      return false
    }
  }

  private resolveExpressionVariables(expr: string): string {
    let resolved = expr
    for (const [name, val] of Object.entries(this.state.variables)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$|\\)|,|\\+|-|\\*|/|=|!|<|>)`, 'g')
      resolved = resolved.replace(regex, `$1${val}`)
    }
    for (const [name, val] of Object.entries(this.state.globalFlags)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$|\\)|,|\\+|-|\\*|/|=|!|<|>)`, 'g')
      resolved = resolved.replace(regex, `$1${val ? 'true' : 'false'}`)
    }
    return resolved
  }

  /**
   * 场景过渡：淡出（全屏变黑）
   */
  async applySceneTransition(transition: string, duration = 400): Promise<void> {
    if (!this.app) return
    const { width, height } = this.app.screen

    switch (transition) {
      case 'fade': await this.sceneFadeOut(duration); break
      case 'slide': await this.sceneSlideOut(duration); break
      case 'blinds': await this.transitionBlinds(width, height, duration); break
      case 'mosaic': await this.transitionMosaic(width, height, duration); break
      case 'wind': await this.transitionWind(width, height, duration); break
      case 'iris': await this.transitionIris(width, height, duration); break
      case 'dissolve': await this.transitionDissolve(width, height, duration); break
      // 'none' — no transition
    }
  }

  private async transitionBlinds(w: number, h: number, duration: number): Promise<void> {
    const strips = 10
    const stripW = w / strips
    const graphics: PIXI.Graphics[] = []
    for (let i = 0; i < strips; i++) {
      const g = new PIXI.Graphics()
      g.beginFill(0x000000, 1)
      g.drawRect(i * stripW, 0, stripW, h)
      g.endFill()
      graphics.push(g)
      this.transLayer.addChild(g)
    }
    const start = performance.now()
    await new Promise<void>(resolve => {
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        for (const g of graphics) g.alpha = t
        if (t >= 1) { resolve(); return }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    for (const g of graphics) { this.transLayer.removeChild(g); g.destroy() }
    this.transLayer.removeChildren()
  }

  private async transitionMosaic(w: number, h: number, duration: number): Promise<void> {
    const cols = 8, rows = 6
    const cw = w / cols, ch = h / rows
    const tiles: { g: PIXI.Graphics; delay: number }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const g = new PIXI.Graphics()
        g.beginFill(0x000000, 1)
        g.drawRect(c * cw, r * ch, cw, ch)
        g.endFill()
        g.alpha = 0
        tiles.push({ g, delay: Math.random() * 0.5 })
        this.transLayer.addChild(g)
      }
    }
    const start = performance.now()
    await new Promise<void>(resolve => {
      const tick = (now: number) => {
        const elapsed = (now - start) / duration
        if (elapsed >= 1.5) { resolve(); return }
        for (const t of tiles) {
          t.g.alpha = Math.min(1, Math.max(0, (elapsed - t.delay) * 3))
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    for (const t of tiles) { this.transLayer.removeChild(t.g); t.g.destroy() }
    this.transLayer.removeChildren()
  }

  private async transitionWind(w: number, h: number, duration: number): Promise<void> {
    const strips = 14
    const stripW = w / strips
    const strips2: { g: PIXI.Graphics; x: number }[] = []
    for (let i = 0; i < strips; i++) {
      const g = new PIXI.Graphics()
      g.beginFill(0x000000, 1)
      g.drawRect(0, 0, stripW + 4, h)
      g.endFill()
      g.x = i * stripW
      strips2.push({ g, x: g.x })
      this.transLayer.addChild(g)
    }
    const start = performance.now()
    await new Promise<void>(resolve => {
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        for (let i = 0; i < strips2.length; i++) {
          const s = strips2[i]
          s.g.x = s.x + Math.sin(t * Math.PI * 2 + i * 0.8) * w * (1 - t)
          s.g.alpha = t
        }
        if (t >= 1) { resolve(); return }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    for (const s of strips2) { this.transLayer.removeChild(s.g); s.g.destroy() }
    this.transLayer.removeChildren()
  }

  private async transitionIris(w: number, h: number, duration: number): Promise<void> {
    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 1)
    overlay.drawRect(0, 0, w, h)
    overlay.endFill()
    this.transLayer.addChild(overlay)

    const mask = new PIXI.Graphics()
    this.transLayer.addChild(mask)
    overlay.mask = mask

    const cx = w / 2, cy = h / 2
    const maxRadius = Math.sqrt(cx * cx + cy * cy)
    const start = performance.now()
    await new Promise<void>(resolve => {
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        const radius = maxRadius * (1 - t)
        mask.clear()
        mask.beginFill(0xffffff, 1)
        mask.drawCircle(cx, cy, Math.max(0, radius))
        mask.endFill()
        if (t >= 1) { resolve(); return }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    this.transLayer.removeChild(overlay); overlay.destroy()
    this.transLayer.removeChild(mask); mask.destroy()
    this.transLayer.removeChildren()
  }

  private async transitionDissolve(w: number, h: number, duration: number): Promise<void> {
    const particleCount = 200
    const dots: { g: PIXI.Graphics; x: number; y: number }[] = []
    for (let i = 0; i < particleCount; i++) {
      const g = new PIXI.Graphics()
      g.beginFill(0x000000, Math.random() * 0.5 + 0.3)
      g.drawRect(0, 0, 4, 4)
      g.endFill()
      g.x = Math.random() * w
      g.y = Math.random() * h
      dots.push({ g, x: g.x, y: g.y })
      this.transLayer.addChild(g)
    }
    const start = performance.now()
    await new Promise<void>(resolve => {
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        for (const d of dots) {
          d.g.alpha = 1 - t
          d.g.x = d.x + Math.sin(t * 10 + d.x) * 3
        }
        if (t >= 1) { resolve(); return }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    for (const d of dots) { this.transLayer.removeChild(d.g); d.g.destroy() }
    this.transLayer.removeChildren()
  }

  async sceneFadeOut(durationMs: number): Promise<void> {
    if (!this.app) return
    const { width, height } = this.app.screen

    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 0)
    overlay.drawRect(0, 0, width, height)
    overlay.endFill()
    this.transLayer.addChild(overlay)

    const start = performance.now()
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min((now - start) / durationMs, 1)
        overlay.alpha = t
        if (t >= 1) {
          this.transLayer.removeChild(overlay)
          overlay.destroy()
          resolve()
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  /**
   * 场景过渡：滑出（屏幕内容向右推出后清除）
   */
  async sceneSlideOut(durationMs: number): Promise<void> {
    if (!this.app) return
    const { width } = this.app.screen

    const container = new PIXI.Container()
    // 捕捉当前画面
    const snapshot = new PIXI.Graphics()
    snapshot.beginFill(0x000000, 0.85)
    snapshot.drawRect(0, 0, width, this.app.screen.height)
    snapshot.endFill()
    container.addChild(snapshot)

    // 复制现有内容
    for (const child of [...this.bgLayer.children]) {
      const clone = new PIXI.Graphics()
      clone.beginFill(0xffffff, 0.1)
      clone.drawRect(0, 0, width, this.app.screen.height)
      clone.endFill()
      container.addChild(clone)
    }

    this.transLayer.addChild(container)
    container.x = 0

    const start = performance.now()
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min((now - start) / durationMs, 1)
        const eased = t * t // ease-in
        container.x = -width * eased
        if (t >= 1) {
          this.transLayer.removeChild(container)
          container.destroy({ children: true })
          resolve()
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  /**
   * 淡入动画
   */
  fadeIn(obj: PIXI.DisplayObject, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min((now - start) / durationMs, 1)
        obj.alpha = t
        if (t < 1) {
          requestAnimationFrame(tick)
        } else {
          resolve()
        }
      }
      requestAnimationFrame(tick)
    })
  }

  // ============================================================
  // 公共控制方法
  // ============================================================

  /** 从指定节点开始播放 */
  startFrom(nodeId: string): void {
    this.stopAutoPlay()
    this.state.visitedNodes = []
    this.state.variableHistory = []
    this.state.enteredGroups = new Set()
    this.wasAutoPlaying = false
    this.errorNodes = []
    this.state.stepCount = 0
    this.renderNode(nodeId)
  }

  /** 前进到下一节点（或跳过打字动画） */
  next(): void {
    if (!this.currentNodeId || !this.projectData) return

    // 如果正在逐字打印，先完成打印
    if (this.isTyping) {
      this.completeTyping()
      return
    }

    const node = this.traversal?.getNode(this.currentNodeId)
    if (!node) return

    // 对话节点：推进到下一节点
    if (this.traversal?.isDialog(node.id)) {
      const nextId = this.traversal!.getNext(node.id)
      console.log('[预览] next() 调用 ->', nextId)
      if (nextId) {
        this.renderNode(nextId)
      } else {
        this.endCallback?.()
      }
      return
    }

    // 选择节点：不自动选，等待玩家手动点击选项
    if (this.traversal?.isInteractive(node.id)) {
      return
    }

    // 结束节点：触发结束回调
    if (this.traversal?.isEndNode(node.id)) {
      this.endCallback?.()
    }
  }

  /** 开始自动播放 */
  startAutoPlay(): void {
    this.stopAutoPlay()
    this.running = true
    this.wasAutoPlaying = false
    this.emitDebug()
    // 如果有正在显示的标题卡，立即关闭它
    if (this.dismissTitleCard) {
      this.dismissTitleCard()
      this.dismissTitleCard = null
    }
    // 立即处理当前节点
    this.next()
    // 然后开始定时循环
    const info = this.getDebugInfo()
    if (!info.isEnded && this.running) {
      this.autoPlayTimer = setTimeout(() => this.autoPlayTick(), this.autoPlaySpeed)
    }
  }

  private autoPlayTick(): void {
    if (!this.running) return

    // 遇到选择节点暂停自动播放，等待玩家手动选择（选择后自动恢复）
    if (this.currentNodeId && this.traversal?.isInteractive(this.currentNodeId)) {
      this.wasAutoPlaying = true
      this.running = false
      this.emitDebug()
      return
    }

    this.next()
    const info = this.getDebugInfo()
    if (info.isEnded) {
      this.running = false
      this.emitDebug()
      return
    }
    this.autoPlayTimer = setTimeout(() => this.autoPlayTick(), this.autoPlaySpeed)
  }

  /** 停止自动播放 */
  stopAutoPlay(): void {
    this.running = false
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer)
      this.autoPlayTimer = null
    }
    this.emitDebug()
  }

  /** 设置自动播放速度 */
  setAutoSpeed(ms: number): void {
    this.autoPlaySpeed = Math.max(100, Math.min(5000, ms))
    this.emitDebug()
  }

  /** 快速跳到结局 */
  skipToEnd(): void {
    this.stopAutoPlay()
    const start = Date.now()
    const maxMs = 10000
    const info = this.getDebugInfo()
    while (!info.isEnded) {
      this.next()
      if (Date.now() - start > maxMs) break
    }
    this.emitDebug()
  }

  /** 获取是否正在自动播放 */
  get isRunning(): boolean {
    return this.running
  }

  /** 设置断点列表 */
  setBreakpoints(ids: Set<string>): void {
    this.breakpointNodeIds = ids
  }

  /** 从断点恢复执行 */
  resume(): void {
    if (this.breakpointResolve) {
      this.breakpointResolve()
      this.breakpointResolve = null
    }
  }

  /** 是否因断点暂停 */
  get isPausedAtBreakpoint(): boolean {
    return this.breakpointPaused
  }

  /** 场景粒子特效：进入场景时调用 */
  startSceneParticles(preset: string, density = 100, speed = 1): void {
    this.stopSceneParticles()
    if (!this.app || !preset) return
    const { width, height } = this.app.screen
    const container = new PIXI.Container()
    this.transLayer.addChild(container)
    this.sceneParticleContainer = container
    const particles: Array<{ g: PIXI.Graphics; x: number; y: number; vx: number; vy: number; rot: number; rotSpd: number }> = []
    for (let i = 0; i < density; i++) {
      const p = this.createSceneParticle(preset as any, width, height, speed)
      particles.push(p)
      container.addChild(p.g)
    }
    const ticker = (_dt: number) => {
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.rot += p.rotSpd
        if (p.y > height + 20) { p.y = -20; p.x = Math.random() * width }
        if (p.x > width + 20) p.x = -20
        if (p.x < -20) p.x = width + 20
        p.g.x = p.x; p.g.y = p.y; p.g.rotation = p.rot
      }
    }
    this.sceneParticleTicker = ticker
    this.app.ticker.add(ticker)
  }

  stopSceneParticles(): void {
    if (this.sceneParticleTicker && this.app) this.app.ticker.remove(this.sceneParticleTicker)
    if (this.sceneParticleContainer) { this.sceneParticleContainer.destroy({ children: true }); this.sceneParticleContainer = null }
    this.sceneParticleTicker = null
  }

  private createSceneParticle(preset: string, w: number, h: number, speed: number) {
    const g = new PIXI.Graphics()
    const s = 2 + Math.random() * 4
    switch (preset) {
      case 'rain': g.beginFill(0x8899cc, 0.3 + Math.random() * 0.4); g.drawRect(0, 0, 1, 6 + Math.random() * 8); g.endFill()
        return { g, x: Math.random() * w, y: Math.random() * -h, vx: -0.5 + Math.random(), vy: (4 + Math.random() * 6) * speed, rot: 0.1, rotSpd: 0 }
      case 'snow': g.beginFill(0xffffff, 0.4 + Math.random() * 0.5); g.drawCircle(0, 0, s); g.endFill()
        return { g, x: Math.random() * w, y: Math.random() * -h, vx: -1 + Math.random() * 2, vy: (0.5 + Math.random() * 2) * speed, rot: 0, rotSpd: -0.02 + Math.random() * 0.04 }
      case 'sakura': { const pk = [0xffb7c5, 0xffd1dc, 0xffc0cb, 0xffaabb][Math.floor(Math.random() * 4)]; g.beginFill(pk, 0.6 + Math.random() * 0.3); g.drawEllipse(0, 0, s, s * 0.6); g.endFill()
        return { g, x: Math.random() * w, y: Math.random() * -h, vx: -1.5 + Math.random() * 3, vy: (0.8 + Math.random() * 1.5) * speed, rot: Math.random() * Math.PI * 2, rotSpd: -0.03 + Math.random() * 0.06 } }
      case 'leaf': { const lc = [0xd4a574, 0xc4956a, 0xb8865a, 0xe8c878, 0xa07040]; const c = lc[Math.floor(Math.random() * lc.length)]; g.beginFill(c, 0.5 + Math.random() * 0.4); g.drawEllipse(0, 0, s * 1.5, s * 0.5); g.endFill()
        return { g, x: Math.random() * w, y: Math.random() * -h, vx: -2 + Math.random() * 4, vy: (1 + Math.random() * 2.5) * speed, rot: Math.random() * Math.PI * 2, rotSpd: -0.05 + Math.random() * 0.1 } }
      case 'star': g.beginFill(0xffffcc, 0.3 + Math.random() * 0.5); g.drawStar!(0, 0, 3, s, s * 0.4); g.endFill()
        return { g, x: Math.random() * w, y: Math.random() * -h, vx: -0.3 + Math.random() * 0.6, vy: (0.2 + Math.random() * 0.8) * speed, rot: 0, rotSpd: -0.01 + Math.random() * 0.02 }
      default: g.beginFill(0xffffff, 0.5); g.drawCircle(0, 0, s); g.endFill()
        return { g, x: Math.random() * w, y: Math.random() * -h, vx: Math.random() - 0.5, vy: (1 + Math.random() * 2) * speed, rot: 0, rotSpd: 0 }
    }
  }

  /** 从头重新播放 */
  restart(): void {
    if (!this.projectData) return

    // 停止自动播放和场景粒子
    this.stopAutoPlay()
    this.stopSceneParticles()

    // 重置变量运行时值（全局标记保留，跨周目持久化）
    this.state.variables = {}
    if (this.projectData.variables) {
      for (const v of this.projectData.variables) {
        this.state.variables[v.name] = v.initialValue
      }
    }

    // 停止所有音频
    if (this.audioManager) {
      this.audioManager.stopBgm(0)
      this.audioManager.stopAllSe()
    }

    // 清空所有层
    this.bgLayer.removeChildren()
    this.charLayer.removeChildren()
    this.dialogLayer.removeChildren()
    this.choiceLayer.removeChildren()
    this.transLayer.removeChildren()
    this.charSprites.clear()
    this.bgSprite = null

    // 重置成就解锁状态
    for (const ach of this.state.achievements) {
      ach.unlocked = false
      ach.unlockedAt = undefined
    }
    this.lastAutoCheckInfo = null
    this.autoChecker = new AutoAchievementChecker(this)

    // 重置调试状态
    this.state.visitedNodes = []
    this.state.variableHistory = []
    this.state.enteredGroups = new Set()
    this.wasAutoPlaying = false
    this.state.stepCount = 0

    // 从第一个节点开始
    const firstNode = this.projectData.flow.nodes[0]
    if (firstNode) {
      this.renderNode(firstNode.id)
    }
  }

  /** 注册选择分支回调 */
  onChoiceRequired(callback: (options: ChoiceOption[]) => void): void {
    this.choiceCallback = callback
  }

  /** 注册结束回调 */
  onEnd(callback: () => void): void {
    this.endCallback = callback
  }

  /** 注册存档点回调 */
  onSavePoint(callback: (info: { nodeId: string; slotLabel: string; variables: Record<string, number>; visitedNodeIds: string[] }) => void): void {
    this.saveCallback = callback
  }

  /** 注册成就解锁回调 */
  onAchievementUnlock(callback: (id: string, name: string) => void): void {
    this.achievementCallback = callback
  }

  /** 获取当前成就状态 */
  getAchievements(): AchievementDef[] {
    return this.state.achievements.map(a => ({ ...a }))
  }

  /** 获取当前存档状态 */
  getSaveState(): { currentNodeId: string | null; variables: Record<string, number>; visitedNodeIds: string[]; globalFlags: Record<string, boolean> } {
    return {
      currentNodeId: this.currentNodeId,
      variables: { ...this.state.variables },
      visitedNodeIds: this.state.visitedNodes.map((n) => n.id),
      globalFlags: { ...this.state.globalFlags }
    }
  }

  /** 获取全局标记 */
  getGlobalFlags(): Record<string, boolean> {
    return { ...this.state.globalFlags }
  }

  /** 从存档恢复状态 */
  loadSaveState(state: { currentNodeId: string; variables: Record<string, number>; visitedNodeIds: string[]; globalFlags?: Record<string, boolean> }): void {
    this.stopAutoPlay()
    this.state.variables = { ...state.variables }
    if (state.globalFlags) {
      this.state.globalFlags = { ...state.globalFlags }
    }
    this.state.visitedNodes = []
    this.state.variableHistory = []
    this.state.stepCount = 0
    this.visitedNodeIdsToRestore = [...state.visitedNodeIds]
    // 跳转到存档节点继续执行
    this.renderNode(state.currentNodeId)
  }

  /** 注册调试信息回调 */
  onDebugUpdate(callback: (info: DebugInfo) => void): void {
    this.debugCallback = callback
  }

  /** 获取当前调试信息 */
  getDebugInfo(): DebugInfo {
    return {
      currentNodeId: this.currentNodeId,
      currentNodeType: this.currentNodeId
        ? (this.projectData?.flow.nodes.find(n => n.id === this.currentNodeId)?.type ?? null)
        : null,
      currentNodeLabel: this.currentNodeId
        ? ((() => { const n = this.projectData?.flow.nodes.find(n => n.id === this.currentNodeId); return n ? (n.data as Record<string, unknown>).label as string ?? null : null })())
        : null,
      visitedNodes: [...this.state.visitedNodes],
      variables: { ...this.state.variables },
      variableHistory: [...this.state.variableHistory],
      stepCount: this.state.stepCount,
      isEnded: false,
      isRunning: this.running,
      isBreakpointPaused: this.breakpointPaused,
      speed: this.autoPlaySpeed,
      achievements: this.state.achievements.map(a => ({
        id: a.id,
        name: a.name,
        unlocked: a.unlocked,
        autoCheck: a.autoCheck || false,
        condition: a.unlockCondition || ''
      })),
      lastAutoCheck: this.lastAutoCheckInfo,
      flagAliases: { ...this.state.flagAliases },
      errorNodes: [...this.errorNodes]
    }
  }

  emitDebug(): void {
    if (!this.debugCallback) return
    this.debugCallback(this.getDebugInfo())
  }
}
