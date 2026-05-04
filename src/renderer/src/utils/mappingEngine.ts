// ============================================================
// 双向映射引擎 - GALGAME 制作工具
// 实现流程图 ↔ 脚本的双向转换与冲突检测
// ============================================================

import type {
  FlowNode,
  FlowEdge,
  ParseResult,
  ParseError,
  ConflictState,
  DialogNodeData,
  ChoiceNodeData,
  ConditionNodeData,
  SetVariableNodeData,
  GotoNodeData,
  EndNodeData,
  AudioNodeData,
  CgNodeData,
  WaitNodeData,
  RandomNodeData,
  LabelNodeData,
  AnimationNodeData,
  SavePointNodeData,
  TimerNodeData,
  MoveCharacterNodeData,
  SteamAchievementNodeData,
  AchievementNodeData,
  ParticleNodeData, ItemNodeData,
  Live2DNodeData, ItemAction
} from '../types/index'
import { FlowTraversal } from './FlowTraversal'

// ============================================================
// 7.1 flowToScript - 流程图 → 脚本
// ============================================================

/**
 * 将流程图节点和连线转换为 GALGAME 脚本字符串
 */
export function flowToScript(nodes: FlowNode[], edges: FlowEdge[]): string {
  if (nodes.length === 0) return ''

  const traversal = new FlowTraversal(nodes, edges)
  const blocks: string[] = []

  for (const node of nodes) {
    let block: string

    switch (node.type) {
      case 'dialog':
        block = formatDialogNode(node.data as DialogNodeData, traversal)
        break
      case 'choice':
        block = formatChoiceNode(node.data as ChoiceNodeData, traversal)
        break
      case 'condition':
        block = formatConditionNode(node.data as ConditionNodeData, traversal)
        break
      case 'setVariable':
        block = formatSetVariableNode(node.data as SetVariableNodeData, traversal)
        break
      case 'goto':
        block = formatGotoNode(node.data as GotoNodeData, traversal)
        break
      case 'end':
        block = formatEndNode(node.data as EndNodeData)
        break
      case 'audio':
        block = formatAudioNode(node.data as AudioNodeData, traversal)
        break
      case 'cg':
        block = formatCgNode(node.data as CgNodeData, traversal)
        break
      case 'wait':
        block = formatWaitNode(node.data as WaitNodeData, traversal)
        break
      case 'random':
        block = formatRandomNode(node.data as RandomNodeData, edges, traversal)
        break
      case 'label':
        block = formatLabelNode(node.data as LabelNodeData)
        break
      case 'animation':
        block = formatAnimationNode(node.data as AnimationNodeData, traversal)
        break
      case 'savePoint':
        block = formatSavePointNode(node.data as SavePointNodeData, traversal)
        break
      case 'timer':
        block = formatTimerNode(node.data as TimerNodeData, traversal)
        break
      case 'moveCharacter':
        block = formatMoveCharacterNode(node.data as MoveCharacterNodeData, traversal)
        break
      case 'steamAchievement':
        block = formatSteamAchievementNode(node.data as SteamAchievementNodeData, traversal)
        break
      case 'achievement':
        block = formatAchievementNode(node.data as AchievementNodeData, traversal)
        break
      case 'particle':
        block = formatParticleNode(node.data as ParticleNodeData, traversal)
        break
      case 'live2d':
        block = formatLive2DNode(node.data as Live2DNodeData, traversal)
        break
      case 'item':
        block = formatItemNode(node.data as ItemNodeData, traversal)
        break
      default:
        continue
    }

    blocks.push(block)
  }

  return blocks.join('\n\n') + (blocks.length > 0 ? '\n' : '')
}

/**
 * 格式化对话节点为脚本块
 */
function formatDialogNode(data: DialogNodeData, traversal: FlowTraversal): string {
  // 纯对话节点（无背景/立绘/特效/解锁条件/自定义样式）→ 简写输出
  const isPlainDialog = data.character && !data.background && !data.characterSprite &&
    !data.unlockCondition && !data.label && !data.bonusItem &&
    (!data.typingSpeed || data.typingSpeed === 45) &&
    (!data.textColor || data.textColor === '#eeeeee') &&
    (!data.fontSize || data.fontSize === 16) &&
    (!data.transition || data.transition === 'none') &&
    (!data.transitionDuration || data.transitionDuration === 400)
  if (isPlainDialog) {
    return `${escapeString(data.character)}: "${escapeString(data.content)}"`
  }

  const nextId = traversal.getNext(data.id) ?? ''

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@dialog(id: "${data.id}", character: "${escapeString(data.character)}"${labelPart}) {`)
  lines.push(`  content: "${escapeString(data.content)}"`)

  emitUnlockLine(data, lines)

  if (data.background) {
    lines.push(`  background: "${escapeString(data.background)}"`)
  }

  if (data.characterSprite) {
    lines.push(`  sprite: "${escapeString(data.characterSprite)}"`)
  }

  if (data.typingSpeed && data.typingSpeed !== 45) {
    lines.push(`  typingSpeed: ${data.typingSpeed}`)
  }
  if (data.textColor && data.textColor !== '#eeeeee') {
    lines.push(`  textColor: "${data.textColor}"`)
  }
  if (data.fontSize && data.fontSize !== 16) {
    lines.push(`  fontSize: ${data.fontSize}`)
  }
  if (data.transition && data.transition !== 'none') {
    lines.push(`  transition: "${data.transition}"`)
  }
  if (data.transitionDuration && data.transitionDuration !== 400) {
    lines.push(`  transitionDuration: ${data.transitionDuration}`)
  }
  if (data.bonusItem) {
    const action = data.bonusAction || 'get'
    lines.push(`  bonusItem: "${escapeString(data.bonusItem)}", action: "${action}"`)
  }

  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }

  lines.push('}')
  return lines.join('\n')
}

/**
 * 格式化变量设置节点为脚本块
 */
function formatSetVariableNode(data: SetVariableNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@setVar(id: "${data.id}", var: "${escapeString(data.variable)}", op: "${data.op}", value: "${escapeString(data.value)}"${labelPart}) {`)

  emitUnlockLine(data, lines)
  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }

  lines.push('}')
  return lines.join('\n')
}

/**
 * 格式化跳转节点为脚本块
 */
function formatGotoNode(data: GotoNodeData, traversal: FlowTraversal): string {
  const rawTarget = traversal.getNext(data.id) ?? data.targetNodeId ?? ''
  // 优先使用目标节点的 label（人类可读），否则用 ID
  const targetNode = rawTarget ? traversal.getNode(rawTarget) : undefined
  const targetLabel = targetNode ? ((targetNode.data as Record<string, unknown>).label as string) || '' : ''
  const target = targetLabel || rawTarget

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@goto(id: "${data.id}", target: "${escapeString(target)}"${labelPart}) {`)
  emitUnlockLine(data, lines)
  lines.push('}')
  return lines.join('\n')
}

/**
 * 格式化结束节点为脚本块
 */
function formatEndNode(data: EndNodeData): string {
  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@end(id: "${data.id}", type: "${escapeString(data.endingType)}"${labelPart}) {`)
  lines.push(`  message: "${escapeString(data.message)}"`)
  emitUnlockLine(data, lines)
  if (data.background) {
    lines.push(`  background: "${escapeString(data.background)}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

/**
 * 格式化音频节点为脚本块
 */
function formatAudioNode(data: AudioNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@audio(id: "${data.id}", type: "${escapeString(data.audioType)}", action: "${escapeString(data.action)}", src: "${escapeString(data.src)}", loop: "${data.loop}", volume: "${data.volume}"${labelPart}) {`)
  emitUnlockLine(data, lines)
  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

/**
 * 格式化CG节点为脚本块
 */
function formatCgNode(data: CgNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@cg(id: "${data.id}", src: "${escapeString(data.src)}", transition: "${escapeString(data.transition)}", duration: "${data.duration}"${labelPart}) {`)
  emitUnlockLine(data, lines)
  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

/**
 * 格式化延时节点为脚本块
 */
function formatWaitNode(data: WaitNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@wait(id: "${data.id}", duration: "${data.duration}"${labelPart}) {`)
  emitUnlockLine(data, lines)
  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

/**
 * 格式化随机节点为脚本块
 */
function formatRandomNode(data: RandomNodeData, edges: FlowEdge[], traversal: FlowTraversal): string {
  const outEdges = traversal.getOutgoing(data.id)
  const branches = traversal.getRandomBranches(data.id)

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@random(id: "${data.id}"${labelPart}) {`)

  emitUnlockLine(data, lines)

  if (outEdges.length > 0) {
    for (const out of outEdges) {
      const branch = branches.find(b => b.targetNodeId === out.target)
      const weight = branch ? String(branch.weight) : out.label ?? '1'
      lines.push(`  option("${out.target}", ${weight})`)
    }
  }

  lines.push('}')
  return lines.join('\n')
}

/**
 * 格式化标签节点为脚本块
 */
function formatLabelNode(data: LabelNodeData): string {
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  const colorPart = data.color ? `, color: "${escapeString(data.color)}"` : ''
  const unlockPart = data.unlockCondition ? `\n  unlock: "${escapeString(data.unlockCondition)}"` : ''
  return `@label(id: "${data.id}"${labelPart}${colorPart}) {${unlockPart}\n}`
}

/**
 * 格式化动画节点为脚本块
 */
function formatAnimationNode(data: AnimationNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  const positionPart = data.position ? `, position: "${escapeString(data.position)}"` : ''
  lines.push(`@anim(id: "${data.id}", target: "${escapeString(data.target)}", action: "${escapeString(data.action)}", duration: "${data.duration}"${positionPart}${labelPart}) {`)
  emitUnlockLine(data, lines)
  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

/**
 * 格式化存档点节点为脚本块
 */
function formatSavePointNode(data: SavePointNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@savePoint(id: "${data.id}", slotLabel: "${escapeString(data.slotLabel)}"${labelPart}) {`)
  emitUnlockLine(data, lines)
  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

function formatTimerNode(data: TimerNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  const varPart = data.variable ? `, variable: "${escapeString(data.variable)}"` : ''
  lines.push(`@timer(id: "${data.id}", mode: "${data.mode}", duration: ${data.duration}${labelPart}${varPart}) {`)
  emitUnlockLine(data, lines)
  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

function formatMoveCharacterNode(data: MoveCharacterNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@moveCharacter(id: "${data.id}", target: "${escapeString(data.target)}", from: "${data.fromPosition}", to: "${data.toPosition}", duration: ${data.duration}, easing: "${data.easing}"${labelPart}) {`)
  emitUnlockLine(data, lines)
  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

function formatSteamAchievementNode(data: SteamAchievementNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@steamAchievement(id: "${data.id}", achievementId: "${escapeString(data.achievementId)}"${labelPart}) {`)
  emitUnlockLine(data, lines)
  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

function formatAchievementNode(data: AchievementNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@achievement(id: "${data.id}", achievementId: "${escapeString(data.achievementId)}"${labelPart}) {`)
  emitUnlockLine(data, lines)
  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

function formatParticleNode(data: ParticleNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''
  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  const densityPart = data.density ? `, density: ${data.density}` : ''
  const speedPart = data.speed ? `, speed: ${data.speed}` : ''
  const durationPart = data.duration ? `, duration: ${data.duration}` : ''
  lines.push(`@particle(id: "${data.id}", preset: "${data.preset}"${densityPart}${speedPart}${durationPart}${labelPart}) {`)
  emitUnlockLine(data, lines)
  if (nextId) {
    lines.push(`  next: "${nextId}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

function formatItemNode(data: ItemNodeData, traversal: FlowTraversal): string {
  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  const invPart = data.inventoryVar ? `, inventory: "${escapeString(data.inventoryVar)}"` : ''
  lines.push(`@item(id: "${data.id}", action: "${data.action}", item: "${escapeString(data.itemName)}"${invPart}${labelPart}) {`)
  if (data.action === 'check') {
    if (data.trueNextId) lines.push(`  true: "${data.trueNextId}"`)
    if (data.falseNextId) lines.push(`  false: "${data.falseNextId}"`)
  }
  if (data.action !== 'check' && data.nextNodeId) {
    lines.push(`  next: "${data.nextNodeId}"`)
  }
  lines.push('}')
  return lines.join('\n')
}

function formatLive2DNode(data: Live2DNodeData, traversal: FlowTraversal): string {
  const nextId = traversal.getNext(data.id) ?? ''
  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  const exprPart = data.expression ? `, expression: "${data.expression}"` : ''
  const motionPart = data.motion ? `, motion: "${data.motion}"` : ''
  const posPart = data.position ? `, position: "${data.position}"` : ''
  lines.push(`@live2d(id: "${data.id}", model: "${escapeString(data.model)}"${labelPart}${exprPart}${motionPart}${posPart}) {`)
  emitUnlockLine(data, lines)
  if (nextId) lines.push(`  next: "${nextId}"`)
  lines.push('}')
  return lines.join('\n')
}

/**
 * 格式化选择节点为脚本块
 */
function formatChoiceNode(data: ChoiceNodeData, traversal: FlowTraversal): string {
  const outEdges = traversal.getChoiceTargets(data.id)

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@choice(id: "${data.id}", title: "${escapeString(data.title)}"${labelPart}) {`)

  emitUnlockLine(data, lines)

  if (outEdges.length > 0) {
    for (const out of outEdges) {
      let optionText = out.label ?? ''
      if (!optionText && data.options) {
        const matchedOpt = data.options.find(o => o.nextNodeId === out.target)
        optionText = matchedOpt?.text ?? ''
      }
      lines.push(`  option("${escapeString(optionText)}") { next: "${out.target}" }`)
    }
  }

  lines.push('}')
  return lines.join('\n')
}

/**
 * 格式化条件节点为脚本块
 */
function formatConditionNode(data: ConditionNodeData, traversal: FlowTraversal): string {
  const { trueTarget: trueId, falseTarget: falseId } = traversal.getConditionTargets(data.id)

  const lines: string[] = []
  const labelPart = data.label ? `, label: "${escapeString(data.label)}"` : ''
  lines.push(`@condition(id: "${data.id}"${labelPart}) {`)
  lines.push(`  expr: "${escapeString(data.expression)}"`)

  emitUnlockLine(data, lines)

  if (trueId) {
    lines.push(`  true: "${trueId}"`)
  }

  if (falseId) {
    lines.push(`  false: "${falseId}"`)
  }

  lines.push('}')
  return lines.join('\n')
}

/**
 * 安全解析数字，若缺失或非数字则返回默认值（正确处理 0）
 */
function parseNum(raw: string | undefined, fallback: number, min?: number): number {
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  if (isNaN(n)) return fallback
  if (min !== undefined && n < min) return fallback
  return n
}

/**
 * 转义字符串中的双引号和反斜杠
 */
function escapeString(str: string | undefined): string {
  if (str === undefined) return ''
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char === '\\') {
      result += '\\\\'
    } else if (char === '"') {
      result += '\\"'
    } else if (char === '\n') {
      result += '\\n'
    } else if (char === '\t') {
      result += '\\t'
    } else {
      result += char
    }
  }
  return result
}

function emitUnlockLine(data: { unlockCondition?: string }, lines: string[]): void {
  if (data.unlockCondition) {
    lines.push(`  unlock: "${escapeString(data.unlockCondition)}"`)
  }
}

/** 去除多行字符串的公共前导空白 */
function dedentString(str: string): string {
  const lines = str.split('\n')
  if (lines.length <= 1) return str
  // 查找最小公共缩进（忽略空行和仅含空格的行）
  let minIndent = Infinity
  for (const line of lines) {
    if (line.trim() === '') continue
    const match = line.match(/^ */)
    if (match) minIndent = Math.min(minIndent, match[0].length)
  }
  if (minIndent === Infinity || minIndent === 0) return str
  // 去除每行的公共缩进 + 去除首尾空行
  const dedented = lines.map(l => l.slice(minIndent))
  while (dedented.length > 0 && dedented[0].trim() === '') dedented.shift()
  while (dedented.length > 0 && dedented[dedented.length - 1].trim() === '') dedented.pop()
  return dedented.join('\n')
}

// ============================================================
// 7.3 scriptToFlow - 脚本 → 流程图
// ============================================================

// Token 类型
type TokenType =
  | 'DIRECTIVE'
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'LBRACE'
  | 'RBRACE'
  | 'LPAREN'
  | 'RPAREN'
  | 'COLON'
  | 'COMMA'
  | 'EOF'

interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}

/**
 * 词法分析器：将脚本字符串转换为 Token 列表
 */
function tokenize(script: string): Token[] {
  const tokens: Token[] = []
  let pos = 0
  let line = 1
  let column = 1

  function advance(): string {
    const ch = script[pos++]
    if (ch === '\n') {
      line++
      column = 1
    } else {
      column++
    }
    return ch
  }

  function peek(offset = 0): string {
    return script[pos + offset] ?? ''
  }

  while (pos < script.length) {
    const startLine = line
    const startCol = column
    const ch = script[pos]

    // 跳过空白
    if (/\s/.test(ch)) {
      advance()
      continue
    }

    // 单行注释
    if (ch === '/' && peek(1) === '/') {
      while (pos < script.length && script[pos] !== '\n') {
        advance()
      }
      continue
    }

    // 指令 @dialog / @choice / @condition
    if (ch === '@') {
      advance() // consume '@'
      let name = ''
      while (pos < script.length && /[a-zA-Z0-9_]/.test(script[pos])) {
        name += advance()
      }
      tokens.push({ type: 'DIRECTIVE', value: name, line: startLine, column: startCol })
      continue
    }

    // 三引号字符串 """（必须在普通字符串之前检测）
    if (ch === '"' && peek(1) === '"' && peek(2) === '"') {
      advance(); advance(); advance() // consume opening """
      let str = ''
      const startLine2 = line
      while (pos < script.length) {
        if (script[pos] === '"' && peek(1) === '"' && peek(2) === '"') {
          advance(); advance(); advance() // consume closing """
          break
        }
        if (script[pos] === '\\' && script[pos + 1] === '\n') {
          advance(); advance() // line continuation: backslash-newline → skip
          continue
        }
        str += advance()
      }
      str = dedentString(str)
      tokens.push({ type: 'STRING', value: str, line: startLine2, column: startCol })
      continue
    }

    // 字符串
    if (ch === '"') {
      advance() // consume opening "
      let str = ''
      while (pos < script.length && script[pos] !== '"') {
        if (script[pos] === '\\') {
          advance() // consume backslash
          const escaped = advance()
          switch (escaped) {
            case '"':
              str += '"'
              break
            case '\\':
              str += '\\'
              break
            case 'n':
              str += '\n'
              break
            case 't':
              str += '\t'
              break
            default:
              str += escaped
          }
        } else {
          str += advance()
        }
      }
      if (pos < script.length) advance() // consume closing "
      tokens.push({ type: 'STRING', value: str, line: startLine, column: startCol })
      continue
    }

    // 标识符（含关键字 true/false）
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = ''
      while (pos < script.length && /[a-zA-Z0-9_\-.]/.test(script[pos])) {
        ident += advance()
      }
      tokens.push({ type: 'IDENTIFIER', value: ident, line: startLine, column: startCol })
      continue
    }

    // 数字（整数/浮点数）
    if (/[0-9]/.test(ch)) {
      let num = ''
      while (pos < script.length && /[0-9.]/.test(script[pos])) {
        num += advance()
      }
      tokens.push({ type: 'NUMBER', value: num, line: startLine, column: startCol })
      continue
    }

    // 单字符 token
    switch (ch) {
      case '{':
        advance()
        tokens.push({ type: 'LBRACE', value: '{', line: startLine, column: startCol })
        break
      case '}':
        advance()
        tokens.push({ type: 'RBRACE', value: '}', line: startLine, column: startCol })
        break
      case '(':
        advance()
        tokens.push({ type: 'LPAREN', value: '(', line: startLine, column: startCol })
        break
      case ')':
        advance()
        tokens.push({ type: 'RPAREN', value: ')', line: startLine, column: startCol })
        break
      case ':':
        advance()
        tokens.push({ type: 'COLON', value: ':', line: startLine, column: startCol })
        break
      case ',':
        advance()
        tokens.push({ type: 'COMMA', value: ',', line: startLine, column: startCol })
        break
      default:
        // 跳过未知字符
        advance()
    }
  }

  tokens.push({ type: 'EOF', value: '', line, column })
  return tokens
}

/**
 * Token 流游标
 */
class TokenStream {
  private tokens: Token[]
  private pos = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  peek(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '', line: 0, column: 0 }
  }

  next(): Token {
    const t = this.tokens[this.pos]
    if (this.pos < this.tokens.length - 1) this.pos++
    return t
  }

  expect(type: TokenType, value?: string): Token {
    const t = this.next()
    if (t.type !== type) {
      throw new ParseErrorObj(
        t.line,
        t.column,
        `期望 ${type}${value ? ` "${value}"` : ''}，实际得到 ${t.type} "${t.value}"`
      )
    }
    if (value !== undefined && t.value !== value) {
      throw new ParseErrorObj(
        t.line,
        t.column,
        `期望值 "${value}"，实际得到 "${t.value}"`
      )
    }
    return t
  }

  hasNext(): boolean {
    return this.peek().type !== 'EOF'
  }
}

class ParseErrorObj extends Error {
  constructor(
    public line: number,
    public column: number,
    message: string
  ) {
    super(message)
  }
}

/**
 * 解析属性列表（key: value 对）
 * 返回 Record<string, string>
 */
function parseAttributes(stream: TokenStream): Record<string, string> {
  const attrs: Record<string, string> = {}

  // 解析 (key: value, key: value) 形式的属性
  stream.expect('LPAREN')

  while (stream.peek().type !== 'RPAREN' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next() // STRING or IDENTIFIER
    attrs[key.value] = val.value

    if (stream.peek().type === 'COMMA') {
      stream.next() // consume comma
    }
  }

  stream.expect('RPAREN')
  return attrs
}

/**
 * 解析块体内的 key: value 属性
 */
function parseBlockBody(stream: TokenStream): Record<string, string> {
  const body: Record<string, string> = {}
  stream.expect('LBRACE')

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    // 跳过 option(...) 子块（由 parseChoiceBlock 单独处理）
    if (stream.peek().type === 'IDENTIFIER' && stream.peek().value === 'option') {
      break
    }

    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next() // STRING or IDENTIFIER
    body[key.value] = val.value

    // 跳过可选的逗号或换行
    if (stream.peek().type === 'COMMA') {
      stream.next()
    }
  }

  return body
}

/**
 * 解析 @dialog 指令
 */
function parseDialogDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  const body = parseBlockBody(stream)
  stream.expect('RBRACE')

  const id = attrs['id'] ?? `dialog_${Date.now()}`

  return {
    id,
    type: 'dialog',
    position,
    data: {
      id,
      label: attrs['label'] || attrs['character'] || '',
      character: attrs['character'] ?? '',
      content: body['content'] ?? '',
      background: body['background'],
      characterSprite: body['sprite'],
      unlockCondition: body['unlock'],
      nextNodeId: body['next'],
      typingSpeed: body['typingSpeed'] !== undefined ? Number(body['typingSpeed']) : undefined,
      textColor: body['textColor'],
      fontSize: body['fontSize'] !== undefined ? Number(body['fontSize']) : undefined,
      transition: body['transition'],
      transitionDuration: body['transitionDuration'] !== undefined ? Number(body['transitionDuration']) : undefined,
      bonusItem: body['bonusItem'],
      bonusAction: (body['action'] as 'get' | 'use' | 'lose') || 'get'
    }
  }
}

/**
 * 解析 @choice 指令（含 option 子块）
 */
function parseChoiceDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const options: Array<{ id: string; text: string; nextNodeId: string }> = []
  const body: Record<string, string> = {}
  let optIndex = 0

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    if (stream.peek().type === 'IDENTIFIER' && stream.peek().value === 'option') {
      stream.next() // consume 'option'
      stream.expect('LPAREN')
      const labelToken = stream.next() // STRING
      stream.expect('RPAREN')
      stream.expect('LBRACE')

      // 解析 option 块内的 next: "..."
      let nextId = ''
      while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
        const key = stream.expect('IDENTIFIER')
        stream.expect('COLON')
        const val = stream.next()
        if (key.value === 'next') nextId = val.value
      }
      stream.expect('RBRACE')

      options.push({
        id: `opt_${optIndex++}`,
        text: labelToken.value,
        nextNodeId: nextId
      })
    } else if (stream.peek().type === 'IDENTIFIER' && stream.peek().value === 'unlock') {
      stream.next()
      stream.expect('COLON')
      body['unlock'] = stream.next().value
    } else {
      // 跳过未知 token
      stream.next()
    }
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `choice_${Date.now()}`

  return {
    id,
    type: 'choice',
    position,
    data: {
      id,
      label: attrs['label'] || attrs['title'] || '',
      title: attrs['title'] ?? '',
      unlockCondition: body['unlock'],
      options
    }
  }
}

/**
 * 解析 @condition 指令
 */
function parseConditionDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const body: Record<string, string> = {}

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `condition_${Date.now()}`

  return {
    id,
    type: 'condition',
    position,
    data: {
      id,
      label: attrs['label'] || body['expr'] || '',
      expression: body['expr'] ?? '',
      unlockCondition: body['unlock'],
      trueNextId: body['true'] ?? '',
      falseNextId: body['false'] ?? ''
    }
  }
}

/**
 * 解析 @setVar 指令
 */
function parseSetVarDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const body: Record<string, string> = {}

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `setVar_${Date.now()}`

  return {
    id,
    type: 'setVariable',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      variable: attrs['var'] ?? '',
      op: (attrs['op'] as string) ?? '=',
      value: attrs['value'] ?? '',
      unlockCondition: body['unlock'],
      nextNodeId: body['next']
    }
  }
}

function parseGotoDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const body: Record<string, string> = {}

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `goto_${Date.now()}`

  return {
    id,
    type: 'goto',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      targetNodeId: attrs['target'] ?? '',
      unlockCondition: body['unlock']
    }
  }
}

function parseEndDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const body: Record<string, string> = {}

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `end_${Date.now()}`

  return {
    id,
    type: 'end',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      endingType: (attrs['type'] as EndNodeData['endingType']) || 'normal',
      message: body['message'] ?? '',
      background: body['background'],
      unlockCondition: body['unlock']
    }
  }
}

function parseAudioDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const body: Record<string, string> = {}

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `audio_${Date.now()}`

  return {
    id,
    type: 'audio',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      audioType: (attrs['type'] as AudioNodeData['audioType']) || 'bgm',
      action: (attrs['action'] as AudioNodeData['action']) || 'play',
      src: attrs['src'] ?? '',
      loop: attrs['loop'] === 'true',
      volume: parseNum(attrs['volume'], 1, 0),
      unlockCondition: body['unlock'],
      nextNodeId: body['next']
    }
  }
}

function parseCgDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const body: Record<string, string> = {}

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `cg_${Date.now()}`

  return {
    id,
    type: 'cg',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      src: attrs['src'] ?? '',
      transition: (attrs['transition'] as CgNodeData['transition']) || 'fade',
      duration: parseNum(attrs['duration'], 800, 0),
      unlockCondition: body['unlock'],
      nextNodeId: body['next']
    }
  }
}

function parseWaitDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const body: Record<string, string> = {}

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `wait_${Date.now()}`

  return {
    id,
    type: 'wait',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      duration: parseNum(attrs['duration'], 1000, 0),
      unlockCondition: body['unlock'],
      nextNodeId: body['next']
    }
  }
}

function parseRandomDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const branches: Array<{ id: string; targetNodeId: string; weight: number }> = []
  const body: Record<string, string> = {}
  let brIndex = 0

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    if (stream.peek().type === 'IDENTIFIER' && (stream.peek().value === 'option' || stream.peek().value === 'branch')) {
      stream.next()
      stream.expect('LPAREN')
      const targetToken = stream.next()
      stream.expect('COMMA')
      const weightToken = stream.next()
      stream.expect('RPAREN')

      branches.push({
        id: `br_${brIndex++}`,
        targetNodeId: targetToken.value,
        weight: parseNum(weightToken.value, 1)
      })
    } else if (stream.peek().type === 'IDENTIFIER' && stream.peek().value === 'unlock') {
      stream.next()
      stream.expect('COLON')
      body['unlock'] = stream.next().value
    } else {
      stream.next()
    }
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `random_${Date.now()}`

  return {
    id,
    type: 'random',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      unlockCondition: body['unlock'],
      branches
    }
  }
}

function parseLabelDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const body: Record<string, string> = {}

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `label_${Date.now()}`

  return {
    id,
    type: 'label',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      unlockCondition: body['unlock'],
      color: attrs['color'] || '#6b7280'
    }
  }
}

function parseAnimationDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const body: Record<string, string> = {}

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `anim_${Date.now()}`

  return {
    id,
    type: 'animation',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      target: attrs['target'] ?? '',
      action: (attrs['action'] as AnimationNodeData['action']) || 'enter',
      position: (attrs['position'] as AnimationNodeData['position']) || 'center',
      duration: parseNum(attrs['duration'], 500, 0),
      unlockCondition: body['unlock'],
      nextNodeId: body['next']
    }
  }
}

function parseSavePointDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')

  const body: Record<string, string> = {}

  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }

  stream.expect('RBRACE')

  const id = attrs['id'] ?? `savePoint_${Date.now()}`

  return {
    id,
    type: 'savePoint',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      slotLabel: attrs['slotLabel'] || '存档位 1',
      nextNodeId: body['next'],
      unlockCondition: body['unlock']
    }
  }
}

function parseTimerDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')
  const body: Record<string, string> = {}
  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }
  stream.expect('RBRACE')
  const id = attrs['id'] ?? `timer_${Date.now()}`
  return {
    id,
    type: 'timer',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      mode: (attrs['mode'] as TimerNodeData['mode']) || 'countdown',
      duration: parseNum(attrs['duration'], 3000, 0),
      variable: attrs['variable'] ?? '',
      unlockCondition: body['unlock'],
      nextNodeId: body['next']
    }
  }
}

function parseMoveCharacterDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')
  const body: Record<string, string> = {}
  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }
  stream.expect('RBRACE')
  const id = attrs['id'] ?? `moveChar_${Date.now()}`
  return {
    id,
    type: 'moveCharacter',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      target: attrs['target'] ?? '',
      fromPosition: (attrs['from'] as MoveCharacterNodeData['fromPosition']) || 'center',
      toPosition: (attrs['to'] as MoveCharacterNodeData['toPosition']) || 'left',
      duration: parseNum(attrs['duration'], 800, 0),
      easing: (attrs['easing'] as MoveCharacterNodeData['easing']) || 'ease',
      unlockCondition: body['unlock'],
      nextNodeId: body['next']
    }
  }
}

function parseSteamAchievementDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')
  const body: Record<string, string> = {}
  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }
  stream.expect('RBRACE')
  const id = attrs['id'] ?? `steam_${Date.now()}`
  return {
    id,
    type: 'steamAchievement',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      achievementId: attrs['achievementId'] ?? '',
      unlockCondition: body['unlock'],
      nextNodeId: body['next']
    }
  }
}

function parseAchievementDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')
  const body: Record<string, string> = {}
  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }
  stream.expect('RBRACE')
  const id = attrs['id'] ?? `ach_${Date.now()}`
  return {
    id,
    type: 'achievement',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      achievementId: attrs['achievementId'] ?? '',
      unlockCondition: body['unlock'],
      nextNodeId: body['next']
    }
  }
}

function parseParticleDirective(
  stream: TokenStream,
  attrs: Record<string, string>,
  position: { x: number; y: number }
): FlowNode {
  stream.expect('LBRACE')
  const body: Record<string, string> = {}
  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }
  stream.expect('RBRACE')
  const id = attrs['id'] ?? `particle_${Date.now()}`
  return {
    id,
    type: 'particle',
    position,
    data: {
      id,
      label: attrs['label'] || '',
      preset: (attrs['preset'] as import('../types').ParticlePreset) || 'snow',
      density: parseNum(attrs['density'], 100, 0),
      speed: parseNum(attrs['speed'], 1, 0),
      duration: parseNum(attrs['duration'], 3000, 0),
      unlockCondition: body['unlock'],
      nextNodeId: body['next']
    }
  }
}

function parseItemDirective(stream: TokenStream, attrs: Record<string, string>, position: { x: number; y: number }): FlowNode {
  stream.expect("LBRACE")
  const body: Record<string, string> = {}
  while (stream.peek().type !== "RBRACE" && stream.peek().type !== "EOF") {
    const key = stream.expect("IDENTIFIER")
    stream.expect("COLON")
    const val = stream.next()
    body[key.value] = val.value
  }
  stream.expect("RBRACE")
  const id = attrs["id"] ?? `item_${Date.now()}`
  return {
    id, type: "item", position,
    data: {
      id, label: attrs["label"] || "",
      action: (attrs["action"] as ItemAction) || "get",
      itemName: attrs["item"] ?? "",
      inventoryVar: attrs["inventory"] || "背包",
      trueNextId: body["true"],
      falseNextId: body["false"],
      nextNodeId: body["next"]
    }
  }
}

function parseLive2DDirective(stream: TokenStream, attrs: Record<string, string>, position: { x: number; y: number }): FlowNode {
  stream.expect('LBRACE')
  const body: Record<string, string> = {}
  while (stream.peek().type !== 'RBRACE' && stream.peek().type !== 'EOF') {
    const key = stream.expect('IDENTIFIER')
    stream.expect('COLON')
    const val = stream.next()
    body[key.value] = val.value
  }
  stream.expect('RBRACE')
  const id = attrs['id'] ?? `live2d_${Date.now()}`
  return {
    id, type: 'live2d', position,
    data: {
      id, label: attrs['label'] || '',
      model: attrs['model'] ?? '',
      expression: attrs['expression'] || 'neutral',
      motion: attrs['motion'],
      position: (attrs['position'] as 'left' | 'center' | 'right') || 'center',
      unlockCondition: body['unlock'],
      nextNodeId: body['next']
    }
  }
}

/**
 * 从节点数据中提取 FlowEdge 列表
 */
function extractEdges(node: FlowNode): FlowEdge[] {
  const edges: FlowEdge[] = []

  switch (node.type) {
    case 'dialog': {
      const data = node.data as DialogNodeData
      const nextId = data.nextNodeId
      if (nextId) {
        edges.push({
          id: `edge_${node.id}_${nextId}`,
          source: node.id,
          target: nextId
        })
      }
      break
    }

    case 'choice': {
      const data = node.data as ChoiceNodeData
      for (const opt of data.options) {
        if (opt.nextNodeId) {
          edges.push({
            id: `edge_${node.id}_${opt.nextNodeId}_${opt.id}`,
            source: node.id,
            target: opt.nextNodeId,
            label: opt.text
          })
        }
      }
      break
    }

    case 'condition': {
      const data = node.data as ConditionNodeData
      if (data.trueNextId) {
        edges.push({
          id: `edge_${node.id}_true`,
          source: node.id,
          target: data.trueNextId,
          label: 'true'
        })
      }
      if (data.falseNextId) {
        edges.push({
          id: `edge_${node.id}_false`,
          source: node.id,
          target: data.falseNextId,
          label: 'false'
        })
      }
      break
    }

    case 'setVariable': {
      const data = node.data as SetVariableNodeData
      const nextId = data.nextNodeId
      if (nextId) {
        edges.push({
          id: `edge_${node.id}_${nextId}`,
          source: node.id,
          target: nextId
        })
      }
      break
    }

    case 'goto': {
      const data = node.data as GotoNodeData
      const targetId = data.targetNodeId
      if (targetId) {
        edges.push({
          id: `edge_${node.id}_${targetId}`,
          source: node.id,
          target: targetId
        })
      }
      break
    }

    case 'end': {
      // 结束节点无出边
      break
    }

    case 'audio': {
      const data = node.data as AudioNodeData
      const nextId = data.nextNodeId
      if (nextId) {
        edges.push({
          id: `edge_${node.id}_${nextId}`,
          source: node.id,
          target: nextId
        })
      }
      break
    }

    case 'cg': {
      const data = node.data as CgNodeData
      const nextId = data.nextNodeId
      if (nextId) {
        edges.push({
          id: `edge_${node.id}_${nextId}`,
          source: node.id,
          target: nextId
        })
      }
      break
    }

    case 'wait': {
      const data = node.data as WaitNodeData
      const nextId = data.nextNodeId
      if (nextId) {
        edges.push({
          id: `edge_${node.id}_${nextId}`,
          source: node.id,
          target: nextId
        })
      }
      break
    }

    case 'random': {
      const data = node.data as RandomNodeData
      for (const br of data.branches) {
        if (br.targetNodeId) {
          edges.push({
            id: `edge_${node.id}_${br.targetNodeId}_${br.id}`,
            source: node.id,
            target: br.targetNodeId,
            label: String(br.weight)
          })
        }
      }
      break
    }

    case 'label': {
      // 标签节点不生成边（从脚本解析时）
      break
    }

    case 'animation': {
      const data = node.data as AnimationNodeData
      const nextId = data.nextNodeId
      if (nextId) {
        edges.push({
          id: `edge_${node.id}_${nextId}`,
          source: node.id,
          target: nextId
        })
      }
      break
    }

    case 'savePoint': {
      const data = node.data as SavePointNodeData
      const nextId = data.nextNodeId
      if (nextId) {
        edges.push({
          id: `edge_${node.id}_${nextId}`,
          source: node.id,
          target: nextId
        })
      }
      break
    }
    case 'timer': {
      const data = node.data as TimerNodeData
      const nextId = data.nextNodeId
      if (nextId) {
        edges.push({
          id: `edge_${node.id}_${nextId}`,
          source: node.id,
          target: nextId
        })
      }
      break
    }
    case 'moveCharacter': {
      const data = node.data as MoveCharacterNodeData
      const nextId = data.nextNodeId
      if (nextId) {
        edges.push({
          id: `edge_${node.id}_${nextId}`,
          source: node.id,
          target: nextId
        })
      }
      break
    }
    case 'steamAchievement': {
      const data = node.data as SteamAchievementNodeData
      const nextId = data.nextNodeId
      if (nextId) {
        edges.push({
          id: `edge_${node.id}_${nextId}`,
          source: node.id,
          target: nextId
        })
      }
      break
    }
    case 'achievement': {
      const data = node.data as AchievementNodeData
      const nextId = data.nextNodeId
      if (nextId) {
        edges.push({
          id: `edge_${node.id}_${nextId}`,
          source: node.id,
          target: nextId
        })
      }
      break
    }
  }

  return edges
}

/**
 * 将脚本字符串解析为流程图节点和连线
 */
/**
 * 对话简写预处理器：将 "角色名: "台词"" 展开为 @dialog 节点
 * 仅在花括号块外部生效，块内部的同名模式不展开
 */
function expandShorthand(script: string): string {
  const lines = script.split('\n')

  type ClassifiedLine = { kind: 'shorthand'; indent: string; character: string; content: string } | { kind: 'other'; text: string; depthDelta: number }

  const classified: ClassifiedLine[] = []
  let depth = 0

  for (const line of lines) {
    let newDepth = depth
    for (const ch of line) {
      if (ch === '{') newDepth++
      else if (ch === '}') newDepth--
    }
    const delta = newDepth - depth

    if (depth === 0 && newDepth === 0) {
      const m = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*"((?:[^"\\]|\\.)*)"\s*$/)
      if (m) {
        classified.push({ kind: 'shorthand', indent: m[1], character: m[2], content: m[3] })
        depth = newDepth
        continue
      }
    }

    classified.push({ kind: 'other', text: line, depthDelta: delta })
    depth = newDepth
  }

  let autoIdx = 0
  const result: string[] = []

  function emitShorthandGroup(group: Array<{ indent: string; character: string; content: string }>, nextIdOverride?: string): void {
    for (let i = 0; i < group.length; i++) {
      const nodeId = `auto_d_${autoIdx + i}`
      const s = group[i]
      const nextId = i < group.length - 1 ? `auto_d_${autoIdx + i + 1}` : (nextIdOverride ?? '')
      const nextLine = nextId ? `\n${s.indent}  next: "${nextId}"` : ''
      result.push(`${s.indent}@dialog(id: "${nodeId}", character: "${s.character}") {\n${s.indent}  content: "${s.content}"${nextLine}\n${s.indent}}`)
    }
    autoIdx += group.length
  }

  let shorthandBuffer: Array<{ indent: string; character: string; content: string }> = []

  for (const entry of classified) {
    if (entry.kind === 'shorthand') {
      shorthandBuffer.push(entry)
    } else {
      if (shorthandBuffer.length > 0) {
        emitShorthandGroup(shorthandBuffer)
        shorthandBuffer = []
      }
      result.push(entry.text)
    }
  }

  if (shorthandBuffer.length > 0) {
    emitShorthandGroup(shorthandBuffer)
  }

  return result.join('\n')
}

export function scriptToFlow(script: string): ParseResult {
  if (!script.trim()) {
    return { success: true, nodes: [], edges: [] }
  }

  const expanded = expandShorthand(script)
  const tokens = tokenize(expanded)
  const stream = new TokenStream(tokens)
  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []
  const errors: ParseError[] = []
  let nodeIndex = 0

  while (stream.hasNext()) {
    const token = stream.peek()

    if (token.type === 'DIRECTIVE') {
      stream.next() // consume directive token
      const position = { x: nodeIndex * 250, y: 100 }

      try {
        let node: FlowNode

        // 解析属性 (id: "...", ...)
        const attrs = parseAttributes(stream)

        switch (token.value) {
          case 'dialog':
            node = parseDialogDirective(stream, attrs, position)
            break
          case 'choice':
            node = parseChoiceDirective(stream, attrs, position)
            break
          case 'condition':
            node = parseConditionDirective(stream, attrs, position)
            break
          case 'setVar':
            node = parseSetVarDirective(stream, attrs, position)
            break
          case 'goto':
            node = parseGotoDirective(stream, attrs, position)
            break
          case 'end':
            node = parseEndDirective(stream, attrs, position)
            break
          case 'audio':
            node = parseAudioDirective(stream, attrs, position)
            break
          case 'cg':
            node = parseCgDirective(stream, attrs, position)
            break
          case 'wait':
            node = parseWaitDirective(stream, attrs, position)
            break
          case 'random':
            node = parseRandomDirective(stream, attrs, position)
            break
          case 'label':
            node = parseLabelDirective(stream, attrs, position)
            break
          case 'anim':
            node = parseAnimationDirective(stream, attrs, position)
            break
          case 'savePoint':
            node = parseSavePointDirective(stream, attrs, position)
            break
          case 'timer':
            node = parseTimerDirective(stream, attrs, position)
            break
          case 'moveCharacter':
            node = parseMoveCharacterDirective(stream, attrs, position)
            break
          case 'steamAchievement':
            node = parseSteamAchievementDirective(stream, attrs, position)
            break
          case 'achievement':
            node = parseAchievementDirective(stream, attrs, position)
            break
          case 'particle':
            node = parseParticleDirective(stream, attrs, position)
            break
          case 'live2d':
            node = parseLive2DDirective(stream, attrs, position)
            break
          case 'item':
            node = parseItemDirective(stream, attrs, position)
            break
          default:
            errors.push({
              line: token.line,
              column: token.column,
              message: `未知指令 "@${token.value}"`
            })
            continue
        }

        nodes.push(node)
        edges.push(...extractEdges(node))
        nodeIndex++
      } catch (e) {
        if (e instanceof ParseErrorObj) {
          errors.push({ line: e.line, column: e.column, message: e.message })
        } else {
          errors.push({ line: token.line, column: token.column, message: String(e) })
        }
        // 尝试跳过到下一个 RBRACE 以恢复解析
        let depth = 0
        while (stream.hasNext()) {
          const t = stream.peek()
          if (t.type === 'LBRACE') depth++
          else if (t.type === 'RBRACE') {
            if (depth <= 0) {
              stream.next()
              break
            }
            depth--
          }
          stream.next()
        }
      }
    } else {
      stream.next() // 跳过非指令 token
    }
  }

  // 第二遍：解析 label 到 node ID 的映射（处理 @goto target 使用 label 的情况）
  const labelToId = new Map<string, string>()
  for (const n of nodes) {
    const lbl = (n.data as Record<string, unknown>).label as string | undefined
    if (lbl) labelToId.set(lbl, n.id)
  }
  for (const n of nodes) {
    if (n.type === 'goto') {
      const target = (n.data as Record<string, unknown>).targetNodeId as string | undefined
      if (target && !nodes.some(x => x.id === target)) {
        const resolved = labelToId.get(target)
        if (resolved) {
          (n.data as Record<string, unknown>).targetNodeId = resolved
          // 同时修复已提取的 edge（target 也需要从 label 更新为 ID）
          for (const e of edges) {
            if (e.source === n.id && e.target === target) {
              e.target = resolved
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, nodes, edges, errors }
  }

  const warnings = validateFlow(nodes, edges)

  return { success: true, nodes, edges, warnings }
}

/**
 * 脚本验证：检测常见问题，返回非阻塞警告
 */
export function validateFlow(nodes: FlowNode[], edges: FlowEdge[]): ParseError[] {
  const warnings: ParseError[] = []
  const nodeIds = new Set(nodes.map(n => n.id))
  const labelMap = new Map<string, string[]>()

  // 收集所有 label
  for (const n of nodes) {
    const lbl = (n.data as Record<string, unknown>).label as string | undefined
    if (lbl) {
      if (!labelMap.has(lbl)) labelMap.set(lbl, [])
      labelMap.get(lbl)!.push(n.id)
    }
  }

  // 1. 重复 label 警告
  for (const [lbl, ids] of labelMap) {
    if (ids.length > 1) {
      warnings.push({ line: 0, column: 0, message: `标签 "${lbl}" 被 ${ids.length} 个节点使用 (${ids.join(', ')})` })
    }
  }

  // 构建出边映射
  const outDegree = new Map<string, number>()
  for (const n of nodes) outDegree.set(n.id, 0)
  for (const e of edges) {
    outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1)
  }

  for (const n of nodes) {
    const d = n.data as Record<string, unknown>

    // 2. 对话节点无内容
    if (n.type === 'dialog' && !d.content) {
      warnings.push({ line: 0, column: 0, message: `对话节点 "${d.label || n.id}" 内容为空` })
    }

    // 3. choice 节点选项不足
    if (n.type === 'choice') {
      const opts = d.options as Array<unknown> | undefined
      if (!opts || opts.length < 2) {
        warnings.push({ line: 0, column: 0, message: `选择节点 "${d.label || n.id}" 选项不足（至少需要2个）` })
      }
    }

    // 4. 条件节点无表达式
    if (n.type === 'condition' && !d.expression) {
      warnings.push({ line: 0, column: 0, message: `条件节点 "${d.label || n.id}" 未设置条件表达式` })
    }

    // 5. 非终止节点无出边
    const terminalTypes = new Set(['end', 'label'])
    if (!terminalTypes.has(n.type) && (outDegree.get(n.id) ?? 0) === 0) {
      // 检查是否有隐式连接（nextNodeId / targetNodeId）
      const hasImplicit = d.nextNodeId || d.targetNodeId || d.trueNextId || d.falseNextId
      if (!hasImplicit) {
        warnings.push({ line: 0, column: 0, message: `节点 "${d.label || n.id}" (${n.type}) 没有出边，可能是死路` })
      }
    }

    // 6. goto 目标不存在
    if (n.type === 'goto') {
      const target = d.targetNodeId as string | undefined
      if (target && !nodeIds.has(target)) {
        warnings.push({ line: 0, column: 0, message: `@goto "${d.label || n.id}" 的目标 "${target}" 不存在` })
      }
    }
  }

  return warnings
}

// ============================================================
// 7.5 冲突检测与同步协调
// ============================================================

/**
 * 检测流程图与脚本之间是否存在冲突
 * @param flowModifiedAt 流程图最后修改时间
 * @param codeModifiedAt 脚本最后修改时间
 */
export function detectConflict(
  flowModifiedAt: Date | null,
  codeModifiedAt: Date | null
): ConflictState {
  const now = new Date()

  // 两者都未修改
  if (!flowModifiedAt && !codeModifiedAt) {
    return {
      hasConflict: false,
      flowModified: false,
      codeModified: false,
      lastSyncTime: now
    }
  }

  const flowModified = flowModifiedAt !== null
  const codeModified = codeModifiedAt !== null

  // 两者都修改了 → 冲突
  const hasConflict = flowModified && codeModified

  // lastSyncTime 取两者中较早的时间（或当前时间）
  let lastSyncTime = now
  if (flowModifiedAt && codeModifiedAt) {
    lastSyncTime = flowModifiedAt < codeModifiedAt ? flowModifiedAt : codeModifiedAt
  } else if (flowModifiedAt) {
    lastSyncTime = flowModifiedAt
  } else if (codeModifiedAt) {
    lastSyncTime = codeModifiedAt
  }

  return {
    hasConflict,
    flowModified,
    codeModified,
    lastSyncTime
  }
}

/**
 * 解决冲突
 * @param strategy 'keep-flow' 保留流程图（重新生成脚本）| 'keep-code' 保留脚本（重新解析流程图）
 * @param nodes 当前流程图节点
 * @param edges 当前流程图连线
 * @param script 当前脚本内容
 */
export function resolveConflict(
  strategy: 'keep-flow' | 'keep-code',
  nodes: FlowNode[],
  edges: FlowEdge[],
  script: string
): { nodes?: FlowNode[]; edges?: FlowEdge[]; script?: string } {
  if (strategy === 'keep-flow') {
    // 以流程图为准，重新生成脚本
    const newScript = flowToScript(nodes, edges)
    return { script: newScript }
  } else {
    // 以脚本为准，重新解析流程图
    const result = scriptToFlow(script)
    if (result.success && result.nodes && result.edges) {
      return { nodes: result.nodes, edges: result.edges }
    }
    // 解析失败时返回空结果（调用方应检查）
    return { nodes: [], edges: [] }
  }
}
