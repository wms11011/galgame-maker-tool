/**
 * 内联文字特效标签解析器
 *
 * 支持标签:
 *   {shake}text{/shake}      — 抖动
 *   {wave}text{/wave}        — 波浪
 *   {bounce}text{/bounce}    — 弹跳
 *   {color=#xxx}text{/color} — 颜色
 *   {size=N}text{/size}      — 字号
 *   {speed=N}text{/speed}    — 打字速度 (ms/字)
 *   {pause=N}                — 暂停 (ms)
 */

export interface TextSegment {
  text: string
  effect?: 'shake' | 'wave' | 'bounce'
  color?: string
  fontSize?: number
  speed?: number
}

const MAX_NESTING_DEPTH = 10

export interface ParsedText {
  segments: TextSegment[]
  pauses: { index: number; duration: number }[]  // 在文本中的暂停位置
  hasEffects: boolean
  plainText: string  // 纯文本（去除标签）
}

/** 解析带标签的文本 */
export function parseTextEffects(raw: string): ParsedText {
  const segments: TextSegment[] = []
  const pauses: { index: number; duration: number }[] = []
  let plainText = ''
  let hasEffects = false

  // 当前活跃的效果栈
  const effectStack: { type: string; value?: string }[] = []

  // 正则匹配所有标签
  const tagRegex = /\{(\/?(?:shake|wave|bounce|color|size|speed|pause))(=?[^}]*)\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(raw)) !== null) {
    // 标签前的纯文本
    if (match.index > lastIndex) {
      const text = raw.slice(lastIndex, match.index)
      if (text) {
        segments.push(buildSegment(text, effectStack))
        plainText += text
      }
    }

    const tag = match[1]  // 如 "shake", "/shake", "color", "pause"
    const value = match[2]?.replace(/^=/, '') || ''  // 如 "#ff0000", "20", ""

    if (tag === 'pause') {
      pauses.push({ index: plainText.length, duration: parseFloat(value) || 500 })
    } else if (tag.startsWith('/')) {
      // 关闭标签
      const closeType = tag.slice(1)
      for (let i = effectStack.length - 1; i >= 0; i--) {
        if (effectStack[i].type === closeType) {
          effectStack.splice(i, 1)
          break
        }
      }
    } else {
      // 开启标签
      if (effectStack.length >= MAX_NESTING_DEPTH) {
        console.warn(`[textEffectParser] 嵌套深度超过 ${MAX_NESTING_DEPTH}，忽略标签: {${tag}${value ? '=' + value : ''}}`)
      } else {
        effectStack.push({ type: tag, value: value || undefined })
        hasEffects = true
      }
    }

    lastIndex = tagRegex.lastIndex
  }

  // 剩余文本
  if (lastIndex < raw.length) {
    const text = raw.slice(lastIndex)
    if (text) {
      segments.push(buildSegment(text, effectStack))
      plainText += text
    }
  }

  // 合并相邻同效果段
  const merged: TextSegment[] = []
  for (const seg of segments) {
    const last = merged[merged.length - 1]
    if (last &&
        last.effect === seg.effect &&
        last.color === seg.color &&
        last.fontSize === seg.fontSize &&
        last.speed === seg.speed) {
      last.text += seg.text
    } else {
      merged.push({ ...seg })
    }
  }

  return { segments: merged, pauses, hasEffects, plainText }
}

function buildSegment(text: string, stack: { type: string; value?: string }[]): TextSegment {
  const seg: TextSegment = { text }
  for (const item of stack) {
    switch (item.type) {
      case 'shake': seg.effect = 'shake'; break
      case 'wave': seg.effect = 'wave'; break
      case 'bounce': seg.effect = 'bounce'; break
      case 'color': seg.color = item.value || undefined; break
      case 'size': seg.fontSize = item.value ? parseInt(item.value, 10) : undefined; break
      case 'speed': seg.speed = item.value ? parseInt(item.value, 10) : undefined; break
    }
  }
  return seg
}

/** 去除所有标签，返回纯文本 */
export function stripTags(text: string): string {
  return text.replace(/\{[^}]+\}/g, '')
}
