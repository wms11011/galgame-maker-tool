import type { FlowNode } from '../../types/index'
import type { SetVariableNodeData } from '../../types/index'
import { BaseNodeRenderer } from './BaseRenderer'

export class SetVariableRenderer extends BaseNodeRenderer {
  async render(node: FlowNode): Promise<void> {
    const data = node.data as SetVariableNodeData
    const varName = data.variable
    if (!varName) {
      this.engine.emitDebug()
      const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
      if (nextId) { await this.engine.renderNode(nextId) }
      else { this.engine.endCallback?.() }
      return
    }

    const op = data.op || '='
    const raw = data.value
    const cur = this.engine.state.variables[varName]
    const getOldVal = () => typeof cur === 'number' ? cur : 0

    // 数组操作
    if (Array.isArray(cur)) {
      switch (op) {
        case 'push': if (raw) cur.push(raw); break
        case 'pop': cur.pop(); break
        case 'clear': cur.length = 0; break
        default: this.engine.state.variables[varName] = raw ? String(raw).split(',') : []
      }
    }
    // 布尔操作
    else if (typeof cur === 'boolean') {
      this.engine.state.variables[varName] = raw === 'true' || raw === '1'
    }
    // 字符串操作
    else if (typeof cur === 'string') {
      this.engine.state.variables[varName] = op === '+=' ? (String(cur ?? '') + String(raw ?? '')) : String(raw ?? '')
    }
    // 数值操作（默认）
    else {
      const val = parseFloat(raw) || 0
      const num = typeof cur === 'number' ? cur : 0
      switch (op) {
        case '=': this.engine.state.variables[varName] = val; break
        case '+=': this.engine.state.variables[varName] = num + val; break
        case '-=': this.engine.state.variables[varName] = num - val; break
        case '*=': this.engine.state.variables[varName] = num * val; break
        case '/=': this.engine.state.variables[varName] = val !== 0 ? num / val : num; break
      }
    }

    const newVal = this.engine.state.variables[varName]
    this.engine.state.variableHistory.push({
      step: this.engine.state.stepCount,
      nodeId: node.id,
      varName,
      oldValue: getOldVal(),
      newValue: typeof newVal === 'number' ? newVal : 0,
      op,
      valueStr: `${getOldVal()} ${op} ${raw} → ${newVal}`
    })

    this.engine.emitDebug()

    const nextId = this.engine.traversal?.getNext(node.id) ?? data.nextNodeId ?? ''
    if (nextId) {
      await this.engine.renderNode(nextId)
    } else {
      this.engine.endCallback?.()
    }
  }
}
