import { describe, it, expect } from 'vitest'
import { scriptToFlow } from '../renderer/src/utils/mappingEngine'

describe('白盒: mappingEngine 错误恢复分支', () => {
  it('未知指令产生错误并继续解析后续节点', () => {
    const script = `
@unknown(id: "x1") {
  foo: "bar"
}
@dialog(id: "n1", character: "A") {
  content: "hello"
}
`
    const result = scriptToFlow(script)
    expect(result.nodes).toBeDefined()
    expect(result.nodes.length).toBeGreaterThanOrEqual(1)
    expect(result.errors).toBeDefined()
    expect(result.errors!.length).toBeGreaterThanOrEqual(1)
  })

  it('已知指令格式错误时触发 ParseError 恢复', () => {
    // 缺少右括号 )，expect(RPAREN) 会抛出 ParseErrorObj
    const script = `
@dialog(id: "n1" {
  content: "hello"
}
@dialog(id: "n2", character: "B") {
  content: "world"
}
`
    const result = scriptToFlow(script)
    expect(result.nodes).toBeDefined()
    expect(result.errors).toBeDefined()
    expect(result.errors!.length).toBeGreaterThanOrEqual(1)
    const n2 = result.nodes.find((n: any) => n.id === 'n2')
    expect(n2).toBeDefined()
  })

  it('dialog body 缺少冒号触发 ParseError 恢复', () => {
    const script = `
@dialog(id: "n1", character: "A") {
  content "hello"
}
@dialog(id: "n2", character: "B") {
  content: "world"
}
`
    const result = scriptToFlow(script)
    expect(result.errors).toBeDefined()
    expect(result.errors!.length).toBeGreaterThanOrEqual(1)
    const n2 = result.nodes.find((n: any) => n.id === 'n2')
    expect(n2).toBeDefined()
  })

  it('空脚本返回空节点数组', () => {
    const result = scriptToFlow('')
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })

  it('仅有空白和注释的脚本', () => {
    const result = scriptToFlow('\n  \n// 注释\n')
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })

  it('choice 节点正确解析 options', () => {
    const script = `
@choice(id: "c1") {
  option("选项A") {
    next: "nA"
  }
  option("选项B") {
    next: "nB"
  }
}
`
    const result = scriptToFlow(script)
    expect(result.nodes).toBeDefined()
    const choice = result.nodes.find((n: any) => n.id === 'c1')
    expect(choice).toBeDefined()
    expect(choice!.type).toBe('choice')
  })

  it('condition 节点正确解析 true/false 分支', () => {
    const script = `
@condition(id: "cond1") {
  expr: "好感度 >= 50"
  true: "goodEnd"
  false: "badEnd"
}
`
    const result = scriptToFlow(script)
    expect(result.nodes).toBeDefined()
    const cond = result.nodes.find((n: any) => n.id === 'cond1')
    expect(cond).toBeDefined()
    expect(cond!.type).toBe('condition')
  })

  it('setVar 节点正确解析', () => {
    const script = `
@setVar(id: "sv1", var: "score", op: "+=", value: "10") {
}
`
    const result = scriptToFlow(script)
    expect(result.nodes).toBeDefined()
    const sv = result.nodes.find((n: any) => n.id === 'sv1')
    expect(sv).toBeDefined()
    expect(sv!.type).toBe('setVariable')
  })

  it('multiple nodes with edges generated', () => {
    const script = `
@dialog(id: "d1", character: "A") {
  content: "Hello"
}
@dialog(id: "d2", character: "B") {
  content: "World"
}
`
    const result = scriptToFlow(script)
    expect(result.nodes.length).toBe(2)
  })

  it('parse error 后继续解析到脚本末尾', () => {
    const script = `
@dialog(id: "bad" {
  content: "broken"
}
@dialog(id: "good", character: "C") {
  content: "works"
}
@dialog(id: "good2", character: "D") {
  content: "also works"
}
`
    const result = scriptToFlow(script)
    expect(result.errors!.length).toBeGreaterThanOrEqual(1)
    const ids = result.nodes.map((n: any) => n.id)
    expect(ids).toContain('good')
    expect(ids).toContain('good2')
  })
})
