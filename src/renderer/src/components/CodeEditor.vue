<template>
  <div ref="editorContainer" class="code-editor-container" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { registerGalgameLanguage } from '../utils/galgameLanguage'
import { useProjectStore } from '../stores/projectStore'

// 注册 GALGAME 脚本语言（只注册一次）
let languageRegistered = false
if (!languageRegistered) {
  registerGalgameLanguage(monaco)
  languageRegistered = true
}

const emit = defineEmits<{
  change: [value: string]
}>()

const projectStore = useProjectStore()
const editorContainer = ref<HTMLDivElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let decorations: string[] = []
let isSettingValue = false  // 标记是否正在通过 setValue 设置内容

onMounted(() => {
  if (!editorContainer.value) return

  editor = monaco.editor.create(editorContainer.value, {
    value: projectStore.script || '',
    language: 'galgame-script',
    theme: 'galgame-dark',
    fontSize: 14,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    tabSize: 2
  })

  // 监听内容变化，防抖 500ms 后 emit change 事件
  editor.onDidChangeModelContent(() => {
    // 如果是通过 setValue 设置的内容，不触发 change 事件
    if (isSettingValue) return

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      if (editor) {
        emit('change', editor.getValue())
      }
    }, 500)
  })
  
  // 监听 script 变化，同步到编辑器
  watch(
    () => projectStore.script,
    (newScript) => {
      if (editor && editor.getValue() !== newScript) {
        isSettingValue = true
        editor.setValue(newScript)
        isSettingValue = false
      }
    },
    { immediate: false }
  )
})

onUnmounted(() => {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
  }
  if (editor) {
    editor.dispose()
    editor = null
  }
})

// 获取编辑器内容
function getValue(): string {
  return editor?.getValue() ?? ''
}

// 设置编辑器内容
function setValue(code: string): void {
  if (editor) {
    isSettingValue = true
    editor.setValue(code)
    isSettingValue = false
  }
}

// 切换主题
function setTheme(theme: 'vs-dark' | 'vs-light'): void {
  if (theme === 'vs-dark') {
    monaco.editor.setTheme('galgame-dark')
  } else {
    monaco.editor.setTheme('vs-light')
  }
}

// 添加错误标记（红色波浪线）
function addError(line: number, message: string): void {
  if (!editor) return
  const model = editor.getModel()
  if (!model) return

  monaco.editor.setModelMarkers(model, 'galgame-errors', [
    ...monaco.editor.getModelMarkers({ owner: 'galgame-errors' }).filter((m) => m.startLineNumber !== line),
    {
      severity: monaco.MarkerSeverity.Error,
      message,
      startLineNumber: line,
      startColumn: 1,
      endLineNumber: line,
      endColumn: model.getLineMaxColumn(line)
    }
  ])
}

// 清除所有错误标记
function clearErrors(): void {
  if (!editor) return
  const model = editor.getModel()
  if (!model) return
  monaco.editor.setModelMarkers(model, 'galgame-errors', [])
  // 清除装饰器
  decorations = editor.deltaDecorations(decorations, [])
}

defineExpose({
  getValue,
  setValue,
  setTheme,
  addError,
  clearErrors
})
</script>

<style scoped>
.code-editor-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
