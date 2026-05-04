import { describe, it, expect } from 'vitest'
import { parseTextEffects, stripTags } from '../renderer/src/utils/textEffectParser'

describe('textEffectParser', () => {
  describe('parseTextEffects', () => {
    it('纯文本无特效', () => {
      const r = parseTextEffects('你好世界')
      expect(r.hasEffects).toBe(false)
      expect(r.plainText).toBe('你好世界')
      expect(r.segments).toHaveLength(1)
      expect(r.segments[0].text).toBe('你好世界')
    })

    it('解析 shake 标签', () => {
      const r = parseTextEffects('{shake}不可能！{/shake}')
      expect(r.hasEffects).toBe(true)
      expect(r.plainText).toBe('不可能！')
      expect(r.segments[0].effect).toBe('shake')
    })

    it('解析 wave 标签', () => {
      const r = parseTextEffects('{wave}欢迎回来{/wave}')
      expect(r.segments[0].effect).toBe('wave')
    })

    it('解析 color 标签', () => {
      const r = parseTextEffects('这是{color=#ff0000}红色{/color}文字')
      expect(r.segments[0].text).toBe('这是')
      expect(r.segments[1].color).toBe('#ff0000')
      expect(r.segments[1].text).toBe('红色')
      expect(r.plainText).toBe('这是红色文字')
    })

    it('解析 size 标签', () => {
      const r = parseTextEffects('{size=24}大号{/size}文字')
      expect(r.segments[0].fontSize).toBe(24)
    })

    it('解析 speed 标签', () => {
      const r = parseTextEffects('{speed=20}快速打字{/speed}')
      expect(r.segments[0].speed).toBe(20)
    })

    it('解析 pause 标签', () => {
      const r = parseTextEffects('你好{pause=1000}世界')
      expect(r.pauses).toHaveLength(1)
      expect(r.pauses[0].duration).toBe(1000)
      expect(r.plainText).toBe('你好世界')
    })

    it('嵌套标签合并效果', () => {
      const r = parseTextEffects('{shake}{color=#ff0000}红色抖动{/color}{/shake}')
      expect(r.segments[0].effect).toBe('shake')
      expect(r.segments[0].color).toBe('#ff0000')
    })

    it('多段标签', () => {
      const r = parseTextEffects('普通{shake}抖动{/shake}又普通{bounce}弹跳{/bounce}')
      expect(r.segments).toHaveLength(4)
    })

    it('空文本返回空解析', () => {
      const r = parseTextEffects('')
      expect(r.plainText).toBe('')
      expect(r.segments).toHaveLength(0)
    })
  })

  describe('stripTags', () => {
    it('去除所有标签', () => {
      expect(stripTags('{shake}你好{/shake}{color=#f00}世界{/color}')).toBe('你好世界')
    })

    it('无标签文本保持不变', () => {
      expect(stripTags('普通文本')).toBe('普通文本')
    })
  })

  describe('边界情况', () => {
    it('不匹配的闭合标签被忽略', () => {
      const r = parseTextEffects('你好{/shake}')
      expect(r.plainText).toBe('你好')
    })

    it('pause 标签不在 plainText 中', () => {
      const r = parseTextEffects('你好{pause=200}世界')
      expect(r.plainText).toBe('你好世界')
      expect(r.pauses).toHaveLength(1)
      expect(r.pauses[0].duration).toBe(200)
    })

    it('speed 不传值正常解析', () => {
      const r = parseTextEffects('{speed}文本{/speed}')
      expect(r.segments[0].speed).toBeUndefined()
    })

    it('连续关闭标签不报错', () => {
      const r = parseTextEffects('{shake}文本{/shake}{/shake}')
      expect(r.segments[0].effect).toBe('shake')
    })

    it('未闭合标签作为纯文本', () => {
      const r = parseTextEffects('{shake}文本')
      expect(r.plainText).toBe('文本')
      expect(r.segments[0].effect).toBe('shake')
    })

    it('标签间无文本时合并', () => {
      const r = parseTextEffects('{color=#f00}{size=20}大红色{/size}{/color}')
      expect(r.segments[0].color).toBe('#f00')
      expect(r.segments[0].fontSize).toBe(20)
      expect(r.segments[0].text).toBe('大红色')
    })

    it('嵌套后再恢复', () => {
      const r = parseTextEffects('普通{shake}抖动{/shake}又普通')
      expect(r.segments.length).toBe(3)
      expect(r.segments[0].text).toBe('普通')
      expect(r.segments[1].effect).toBe('shake')
      expect(r.segments[2].text).toBe('又普通')
    })
  })
})
