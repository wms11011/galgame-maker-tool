import type * as Monaco from 'monaco-editor'
import { useFlowStore } from '../stores/flowStore'
import { NODE_TYPE_REGISTRY } from './nodeTypeRegistry'

const DIRECTIVE_NAMES = Object.values(NODE_TYPE_REGISTRY).map(m => m.directiveName)

/**
 * 注册 GALGAME 脚本语言到 Monaco Editor
 * 包含语法高亮（Monarch tokenizer）和代码补全提供者
 */
export function registerGalgameLanguage(monaco: typeof Monaco): void {
  // 注册语言
  monaco.languages.register({
    id: 'galgame-script',
    extensions: ['.gs'],
    aliases: ['GalgameScript', 'galgame-script']
  })

  // 定义 Monarch tokenizer（语法高亮）
  monaco.languages.setMonarchTokensProvider('galgame-script', {
    keywords: ['option'],
    directives: DIRECTIVE_NAMES.map(n => `@${n}`),
    attributes: [
      'id', 'character', 'content', 'background', 'sprite', 'next',
      'title', 'expr', 'true', 'false', 'type', 'target', 'op', 'value',
      'var', 'duration', 'transition', 'src', 'action', 'loop', 'volume',
      'message', 'slotLabel', 'mode', 'variable', 'from', 'to', 'easing',
      'achievementId', 'typingSpeed', 'textColor', 'fontSize', 'color',
      'unlock', 'position', 'weight'
    ],

    tokenizer: {
      root: [
        // 单行注释
        [/\/\/.*$/, 'comment'],

        // 指令关键字（从注册表生成）
        [new RegExp(`@(${DIRECTIVE_NAMES.join('|')})\\b`), 'keyword'],

        // option 和 branch 关键字
        [/\b(option|branch)\b/, 'keyword'],

        // 属性名（在冒号之前）
        [
          /\b(id|character|content|background|sprite|next|title|expr|true|false|type|target|op|value|var|duration|transition|src|action|loop|volume|message|slotLabel|mode|variable|from|to|easing|achievementId|typingSpeed|textColor|fontSize|color|unlock|position|weight)\b(?=\s*:)/,
          'attribute.name'
        ],

        // 三引号多行字符串
        [/"""/, { token: 'string.quote', bracket: '@open', next: '@tripleString' }],

        // 双引号字符串
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

        // 括号和大括号
        [/[{}]/, 'delimiter.curly'],
        [/[()]/, 'delimiter.paren'],

        // 冒号
        [/:/, 'delimiter'],

        // 逗号
        [/,/, 'delimiter'],

        // 空白
        [/\s+/, 'white']
      ],

      string: [
        [/[^"\\]+/, 'string'],
        [/\\\./, 'string.escape'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ],

      tripleString: [
        [/"""/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
        [/[^"\\]+/, 'string'],
        [/\\[^"]/, 'string.escape'],
        [/"/, 'string']
      ]
    }
  })

  // 定义语言配置（括号匹配、注释等）
  monaco.languages.setLanguageConfiguration('galgame-script', {
    comments: {
      lineComment: '//'
    },
    brackets: [
      ['{', '}'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '(', close: ')' },
      { open: '"', close: '"' }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '(', close: ')' },
      { open: '"', close: '"' }
    ]
  })

  // Warm anime theme for Monaco
  monaco.editor.defineTheme('galgame-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'F0A0A8', fontStyle: 'bold' },
      { token: 'attribute.name', foreground: 'F0A060' },
      { token: 'string', foreground: '74B88A' },
      { token: 'string.quote', foreground: '74B88A' },
      { token: 'string.escape', foreground: 'F0C860' },
      { token: 'comment', foreground: '7A9078', fontStyle: 'italic' },
      { token: 'delimiter', foreground: 'C8B8A8' },
      { token: 'delimiter.curly', foreground: 'F0C860' },
      { token: 'delimiter.paren', foreground: 'E890A8' }
    ],
    colors: {}
  })

  // 注册代码补全提供者
  monaco.languages.registerCompletionItemProvider('galgame-script', {
    triggerCharacters: ['@', '"', ':'],

    provideCompletionItems(
      model: Monaco.editor.ITextModel,
      position: Monaco.Position
    ): Monaco.languages.CompletionList {
      const word = model.getWordUntilPosition(position)
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }

      const lineContent = model.getLineContent(position.lineNumber)
      const textBeforeCursor = lineContent.substring(0, position.column - 1)

      const suggestions: Monaco.languages.CompletionItem[] = []

      // 输入 @ 时补全指令
      if (textBeforeCursor.trimStart().startsWith('@') || textBeforeCursor.endsWith('@')) {
        const directiveRange: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: textBeforeCursor.lastIndexOf('@') + 1,
          endColumn: position.column
        }

        suggestions.push(
          {
            label: '@dialog', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@dialog(id: "${1:node_id}", character: "${2:角色名}") {\n  content: "${3:对话内容}"\n  next: "${4:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '对话节点：显示角色对话', range: directiveRange
          },
          {
            label: '@choice', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@choice(id: "${1:node_id}", title: "${2:选择标题}") {\n  option("${3:选项1}") { next: "${4:next_id}" }\n  option("${5:选项2}") { next: "${6:next_id}" }\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '选择节点：提供多个选项分支', range: directiveRange
          },
          {
            label: '@condition', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@condition(id: "${1:node_id}") {\n  expr: "${2:flag > 0}"\n  true: "${3:true_node}"\n  false: "${4:false_node}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '条件节点：根据条件表达式跳转', range: directiveRange
          },
          {
            label: '@setVar', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@setVar(id: "${1:node_id}", var: "${2:varName}", op: "${3:=}", value: "${4:0}") {\n  next: "${5:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '变量设置节点：设置/修改变量值', range: directiveRange
          },
          {
            label: '@goto', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@goto(id: "${1:node_id}", target: "${2:target_id}") {\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '跳转节点：跳转到指定节点', range: directiveRange
          },
          {
            label: '@end', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@end(id: "${1:node_id}", type: "${2:normal}") {\n  message: "${3:感谢游玩}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '结束节点：游戏结局 (normal/good/bad/true)', range: directiveRange
          },
          {
            label: '@audio', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@audio(id: "${1:node_id}", type: "${2:bgm}", action: "${3:play}", src: "${4:audio.mp3}", loop: "${5:true}", volume: "${6:0.7}") {\n  next: "${7:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '音频节点：播放/停止背景音乐或音效', range: directiveRange
          },
          {
            label: '@cg', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@cg(id: "${1:node_id}", src: "${2:cg.png}", transition: "${3:fade}", duration: "${4:2000}") {\n  next: "${5:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'CG节点：显示全屏CG图像', range: directiveRange
          },
          {
            label: '@wait', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@wait(id: "${1:node_id}", duration: "${2:1000}") {\n  next: "${3:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '延时节点：等待指定时间后继续', range: directiveRange
          },
          {
            label: '@random', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@random(id: "${1:node_id}") {\n  option("${2:target1}", ${3:1})\n  option("${4:target2}", ${5:1})\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '随机节点：按权重随机选择分支', range: directiveRange
          },
          {
            label: '@label', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@label(id: "${1:node_id}", label: "${2:章节名}", color: "${3:#8b5cf6}") {\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '标签节点：章节标记', range: directiveRange
          },
          {
            label: '@anim', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@anim(id: "${1:node_id}", target: "${2:角色}", action: "${3:enter}", duration: "${4:500}") {\n  next: "${5:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '动画节点：角色动画效果 (enter/exit/shake/flash)', range: directiveRange
          },
          {
            label: '@savePoint', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@savePoint(id: "${1:node_id}", slotLabel: "${2:存档点}") {\n  next: "${3:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '存档点节点：提示玩家存档', range: directiveRange
          },
          {
            label: '@timer', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@timer(id: "${1:node_id}", mode: "${2:countdown}", duration: ${3:5000}, variable: "${4:timerVar}") {\n  next: "${5:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '计时器节点：倒计时/秒表', range: directiveRange
          },
          {
            label: '@moveCharacter', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@moveCharacter(id: "${1:node_id}", target: "${2:角色}", from: "${3:left}", to: "${4:center}", duration: ${5:800}, easing: "${6:ease}") {\n  next: "${7:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '角色移动节点：移动角色位置', range: directiveRange
          },
          {
            label: '@steamAchievement', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@steamAchievement(id: "${1:node_id}", achievementId: "${2:ach_id}") {\n  next: "${3:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Steam成就节点：解锁Steam成就', range: directiveRange
          },
          {
            label: '@achievement', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@achievement(id: "${1:node_id}", achievementId: "${2:ach_id}") {\n  next: "${3:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '成就节点：解锁游戏内成就', range: directiveRange
          },
          {
            label: '@particle', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@particle(id: "${1:node_id}", preset: "${2:snow}", density: ${3:100}, speed: ${4:1}, duration: ${5:3000}) {\n  next: "${6:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '粒子特效节点：雨(rain)/雪(snow)/樱花(sakura)/落叶(leaf)/星星(star)', range: directiveRange
          },
          {
            label: '@live2d', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@live2d(id: "${1:node_id}", model: "${2:model_path}", expression: "${3:neutral}", position: "${4:center}") {\n  next: "${5:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Live2D节点：显示动态立绘模型 (expression: neutral/happy/sad/surprised)', range: directiveRange
          },
          {
            label: '@item', kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '@item(id: "${1:node_id}", action: "${2:get}", item: "${3:道具名}") {\n  next: "${4:next_id}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '道具节点：获得(get)/使用(use)/失去(lose)/检查(check)道具', range: directiveRange
          }
        )
      }

      // 输入 next:、true:、false: 后补全节点 ID
      const nextAttrMatch = textBeforeCursor.match(/\b(next|true|false)\s*:\s*"?$/)
      if (nextAttrMatch) {
        try {
          const flowStore = useFlowStore()
          const nodeIds = flowStore.nodes.map((n) => n.id)

          for (const nodeId of nodeIds) {
            suggestions.push({
              label: nodeId,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: nodeId,
              documentation: `节点 ID: ${nodeId}`,
              range
            })
          }
        } catch {
          // 在 Monaco 上下文中 Pinia 可能未初始化，忽略错误
        }
      }

      // 属性名补全（在 { } 块内）
      const isInsideBlock = ((): boolean => {
        const fullText = model.getValue()
        const offset = model.getOffsetAt(position)
        let depth = 0
        for (let i = 0; i < offset; i++) {
          if (fullText[i] === '{') depth++
          else if (fullText[i] === '}') depth--
        }
        return depth > 0
      })()

      if (isInsideBlock && !textBeforeCursor.trim().startsWith('@')) {
        const attrSuggestions = [
          { label: 'content', doc: '对话内容' },
          { label: 'background', doc: '背景图路径' },
          { label: 'sprite', doc: '角色立绘路径' },
          { label: 'next', doc: '下一节点 ID' },
          { label: 'expr', doc: '条件表达式' },
          { label: 'true', doc: '条件为真时跳转的节点 ID' },
          { label: 'false', doc: '条件为假时跳转的节点 ID' }
        ]

        for (const attr of attrSuggestions) {
          suggestions.push({
            label: attr.label,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `${attr.label}: "$1"`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: attr.doc,
            range
          })
        }
      }

      return { suggestions }
    }
  })
}
