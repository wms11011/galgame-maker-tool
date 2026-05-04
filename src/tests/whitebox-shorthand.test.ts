import { describe, it, expect } from 'vitest'
import { scriptToFlow, flowToScript } from '../renderer/src/utils/mappingEngine'

describe('对话简写语法', () => {
  describe('基本简写解析', () => {
    it('单行简写解析为一个对话节点', () => {
      const script = 'Alice: "你好"'
      const result = scriptToFlow(script)
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].type).toBe('dialog')
      expect(result.nodes[0].data.character).toBe('Alice')
      expect(result.nodes[0].data.content).toBe('你好')
    })

    it('多行简写自动串联', () => {
      const script = `Alice: "第一句"
Bob: "第二句"
Alice: "第三句"`
      const result = scriptToFlow(script)
      expect(result.nodes).toHaveLength(3)
      expect(result.nodes[0].data.character).toBe('Alice')
      expect(result.nodes[1].data.character).toBe('Bob')
      expect(result.nodes[2].data.character).toBe('Alice')
    })

    it('角色名含下划线', () => {
      const script = 'narrator_voice: "旁白"'
      const result = scriptToFlow(script)
      expect(result.nodes[0].data.character).toBe('narrator_voice')
    })
  })

  describe('简写与指令混合', () => {
    it('简写行后可跟 @ 指令', () => {
      const script = `Alice: "你好"
@choice(id: "c1") {
  option("选项") { next: "n1" }
}`
      const result = scriptToFlow(script)
      expect(result.nodes.length).toBeGreaterThanOrEqual(2)
      const dialogNodes = result.nodes.filter(n => n.type === 'dialog')
      expect(dialogNodes).toHaveLength(1)
    })

    it('@ 指令间穿插简写', () => {
      const script = `@label(id: "l1", label: "第一章") {
}
Alice: "章节开始"
Bob: "欢迎"`
      const result = scriptToFlow(script)
      expect(result.nodes.length).toBe(3)
    })
  })

  describe('块内不展开', () => {
    it('花括号内的 Alice: 模式不展开', () => {
      const script = `@dialog(id: "n1", character: "X") {
  content: "Alice: 这句不会展开"
}`
      const result = scriptToFlow(script)
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].data.content).toBe('Alice: 这句不会展开')
    })

    it('嵌套花括号正确跟踪深度', () => {
      const script = `@choice(id: "c1") {
  option("A") { next: "n1" }
}
Alice: "括号外的简写"`
      const result = scriptToFlow(script)
      const dialogNodes = result.nodes.filter(n => n.type === 'dialog')
      expect(dialogNodes).toHaveLength(1)
      expect(dialogNodes[0].data.content).toBe('括号外的简写')
    })
  })

  describe('往返一致性', () => {
    it('简写解析后再生成脚本 — 纯对话节点保持简写', () => {
      const script = 'Alice: "测试消息"'
      const parsed = scriptToFlow(script)
      const regenerated = flowToScript(parsed.nodes, parsed.edges)
      // 再解析一次验证往返
      const round2 = scriptToFlow(regenerated)
      expect(round2.nodes).toHaveLength(1)
      expect(round2.nodes[0].data.character).toBe('Alice')
      expect(round2.nodes[0].data.content).toBe('测试消息')
    })
  })

  describe('脚本验证', () => {
    it('空对话内容警告', () => {
      const result = scriptToFlow('@dialog(id: "n1", character: "X") { content: "" }')
      expect(result.warnings).toBeDefined()
      expect(result.warnings!.some(w => w.message.includes('内容为空'))).toBe(true)
    })

    it('choice 选项不足警告', () => {
      const result = scriptToFlow('@choice(id: "c1", title: "X") { option("A") { next: "n1" } }')
      expect(result.warnings!.some(w => w.message.includes('选项不足'))).toBe(true)
    })

    it('条件节点无表达式警告', () => {
      const result = scriptToFlow('@condition(id: "c1") { expr: "" }')
      expect(result.warnings!.some(w => w.message.includes('未设置条件表达式'))).toBe(true)
    })

    it('重复 label 警告', () => {
      const script = `@label(id: "l1", label: "dup") { }
@label(id: "l2", label: "dup") { }`
      const result = scriptToFlow(script)
      expect(result.warnings!.some(w => w.message.includes('dup') && w.message.includes('2 个'))).toBe(true)
    })

    it('goto 目标不存在警告', () => {
      const result = scriptToFlow('@goto(id: "g1", target: "ghost") { }')
      expect(result.warnings!.some(w => w.message.includes('不存在'))).toBe(true)
    })

    it('正常脚本无警告', () => {
      const script = `@dialog(id: "n1", character: "X") {
  content: "hello"
  next: "c1"
}
@choice(id: "c1") {
  option("A") { next: "n1" }
  option("B") { next: "n1" }
}
@condition(id: "cond1") {
  expr: "x >= 1"
}`
      const result = scriptToFlow(script)
      // condition has true/false branch placeholders (implicit), dialog has next
      expect(result.warnings!.filter(w => !w.message.includes('没有出边') && !w.message.includes('死路')).length).toBe(0)
    })
  })

  describe('多行字符串（三引号）', () => {
    it('基本三引号字符串解析', () => {
      const script = `@dialog(id: "n1", character: "旁白") {
  content: """
    欢迎来到这个世界。
    这是一个全新的开始。
    """
}`
      const result = scriptToFlow(script)
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].data.content).toContain('欢迎来到这个世界')
      expect(result.nodes[0].data.content).toContain('全新的开始')
    })

    it('三引号自动去除公共缩进', () => {
      const script = `@dialog(id: "n1", character: "X") {
  content: """
      第一行
      第二行
      第三行
    """
}`
      const result = scriptToFlow(script)
      const content = result.nodes[0].data.content
      // 公共缩进被去除
      expect(content.startsWith('第一行')).toBe(true)
      expect(content.split('\n')).toHaveLength(3)
    })

    it('三引号不处理内部转义', () => {
      const script = `@dialog(id: "n1", character: "X") {
  content: """
    他说："你好"
    她笑了
    """
}`
      const result = scriptToFlow(script)
      // 内部的双引号不需要转义
      expect(result.nodes[0].data.content).toContain('他说："你好"')
    })

    it('三引号字符串可跨多行', () => {
      const script = `@dialog(id: "n1", character: "X") {
  content: """
    行1
    行2
    行3
    行4
    """
}`
      const result = scriptToFlow(script)
      expect(result.nodes[0].data.content.split('\n')).toHaveLength(4)
    })
  })
})
