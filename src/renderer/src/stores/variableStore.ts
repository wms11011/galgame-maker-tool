import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VariableInfo, VariableOp } from '../types'

export const useVariableStore = defineStore('variable', () => {
  const variables = ref<VariableInfo[]>([])
  const runtime = ref<Record<string, number | string | boolean | string[]>>({})
  const globalFlags = ref<Record<string, boolean>>({})
  const flagAliases = ref<Record<string, string>>({})

  function loadVariables(vars: VariableInfo[]): void {
    variables.value = vars.map(v => ({ ...v, type: v.type || 'number' }))
    resetRuntime()
  }

  function loadGlobalFlags(flags: Record<string, boolean>): void {
    globalFlags.value = { ...flags }
  }

  function resetRuntime(): void {
    const rt: Record<string, number | string | boolean | string[]> = {}
    for (const v of variables.value) {
      const t = v.type || 'number'
      if (t === 'array') {
        rt[v.name] = Array.isArray(v.initialValue) ? [...v.initialValue as string[]] : []
      } else {
        rt[v.name] = v.initialValue
      }
    }
    runtime.value = rt
  }

  function addVariable(info: VariableInfo): void {
    if (variables.value.some(v => v.name === info.name)) return
    variables.value.push({ ...info, type: info.type || 'number' })
    runtime.value[info.name] = info.initialValue
  }

  function removeVariable(name: string): void {
    variables.value = variables.value.filter(v => v.name !== name)
    delete runtime.value[name]
  }

  function updateVariable(name: string, patch: Partial<Omit<VariableInfo, 'name'>>): void {
    const v = variables.value.find(x => x.name === name)
    if (v) Object.assign(v, patch)
  }

  function setRuntime(name: string, value: number): void {
    runtime.value[name] = value
  }

  function getRuntime(name: string): number {
    return runtime.value[name] ?? 0
  }

  function applyOp(name: string, op: VariableOp, value: number): void {
    const cur = runtime.value[name] ?? 0
    switch (op) {
      case '=': runtime.value[name] = value; break
      case '+=': runtime.value[name] = cur + value; break
      case '-=': runtime.value[name] = cur - value; break
      case '*=': runtime.value[name] = cur * value; break
      case '/=':
        runtime.value[name] = value !== 0 ? cur / value : cur
        break
      case 'push': {
        const arr = runtime.value[name]
        if (Array.isArray(arr)) { arr.push(String(value)) }
        break
      }
      case 'pop': {
        const arr = runtime.value[name]
        if (Array.isArray(arr)) { arr.pop() }
        break
      }
      case 'clear': {
        const arr = runtime.value[name]
        if (Array.isArray(arr)) { arr.length = 0 }
        break
      }
    }
  }

  const variableNames = computed(() => variables.value.map(v => v.name))

  // 全局标记（跨周目持久化）
  function setGlobalFlag(name: string, value: boolean): void {
    globalFlags.value[name] = value
  }

  function getGlobalFlag(name: string): boolean {
    return globalFlags.value[name] ?? false
  }

  function toggleGlobalFlag(name: string): void {
    globalFlags.value[name] = !globalFlags.value[name]
  }

  const globalFlagNames = computed(() => Object.keys(globalFlags.value))

  function setFlagAlias(name: string, alias: string): void {
    flagAliases.value[name] = alias
  }

  function removeFlagAlias(name: string): void {
    delete flagAliases.value[name]
  }

  function loadFlagAliases(aliases: Record<string, string>): void {
    flagAliases.value = { ...aliases }
  }

  return {
    variables,
    runtime,
    globalFlags,
    flagAliases,
    loadVariables,
    loadGlobalFlags,
    resetRuntime,
    addVariable,
    removeVariable,
    updateVariable,
    setRuntime,
    getRuntime,
    applyOp,
    variableNames,
    setGlobalFlag,
    getGlobalFlag,
    toggleGlobalFlag,
    globalFlagNames,
    setFlagAlias,
    removeFlagAlias,
    loadFlagAliases
  }
})
