# 🎮 Galgame Maker Tool

Galgame（视觉小说）制作工具。基于 Electron + Vue 3 + PixiJS，提供流程图编辑、双向脚本映射、AI 辅助创作、实时预览、MCP 协议集成。

---

## 功能

### 流程图编辑器
- **19 种节点类型**：对话、选择、条件、变量设置、跳转、结局、音频、CG、延时、随机、标签、动画、存档、计时器、角色移动、Steam成就、游戏成就、粒子特效、道具
- 拖拽添加节点、连线编辑、场景分组（自定义 BGM/背景/标题卡/粒子特效）
- 撤销/重做（Ctrl+Z/Y）、节点搜索（Ctrl+K）
- 图分析：死路/孤立/不可达节点检测

### 双向脚本映射
- 流程图 ↔ `.gs` 脚本双向转换，往返零损失
- **对话简写语法**：`Alice: "你好"` 代替完整 `@dialog` 格式
- **三引号多行字符串**：`""" ... """` 支持长篇对话
- **Label 跳转**：`@goto(target: "章节名")` 人类可读
- 脚本验证：空对话、选项不足、重复 label、死路检测

### AI 助手
- 多提供商支持：OpenAI、Anthropic Claude、Google Gemini、自定义兼容端点
- 6 种生成类型：对话生成、分支设计、剧情续写、文本翻译、角色设定、脚本修复
- 流式输出、结果插入流程图/追加到脚本
- 角色设定生成后可一键创建角色

### 实时预览
- PixiJS 渲染引擎，支持打字机效果、场景过渡、粒子特效
- 存档/读档系统、对话回看、CG 鉴赏、音乐鉴赏、立绘鉴赏
- 场景分组联动：进入场景自动切换 BGM/背景/粒子

### MCP Server
- 16 个 MCP Tool，可被 Claude Desktop / Cursor / VS Code 等 MCP 客户端调用
- 脚本转换（script_to_flow / flow_to_script / validate_script）
- 流程图操作（add_node / delete_node / update_node / connect_nodes）
- AI 生成（generate_script）、资源管理（list_assets / import_asset）
- 项目管理（create_project / load_project / save_project）
- 2 个 MCP Resource + 3 个 MCP Prompt

### 导出
- 导出为独立 HTML 文件（内嵌 PixiJS 运行时）
- Steamworks 成就配置生成

---

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Electron + Vue 3 (Composition API) |
| 流程图 | VueFlow |
| 状态管理 | Pinia |
| 渲染引擎 | PixiJS v7 |
| 编辑器 | Monaco Editor |
| UI 组件 | Element Plus |
| 测试 | Vitest (1536 tests) + Playwright E2E |
| MCP | @modelcontextprotocol/sdk + zod |
| 画布 Polyfill | @napi-rs/canvas (vitest 中提供真实 Canvas) |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 运行测试
npm test

# 类型检查
npm run typecheck

# 生产构建
npm run build

# 启动 MCP Server（供外部 LLM 调用）
npx tsx src/mcp/server.ts
```

### Claude Desktop MCP 配置

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "galgame": {
      "command": "npx",
      "args": ["tsx", "D:/galaGame/galgame-maker-tool/src/mcp/server.ts"]
    }
  }
}
```

## 项目结构

```
galgame-maker-tool/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── services/            # 主进程服务 (aiService, assetService, backupService...)
│   │   └── ipcHandlers.ts       # IPC 通信桥
│   ├── preload/                 # 预加载脚本
│   ├── renderer/src/            # Vue 渲染进程
│   │   ├── components/          # UI 组件
│   │   │   ├── nodes/           # 19 种节点组件
│   │   │   └── AiAssistantPanel.vue  # AI 助手面板
│   │   ├── stores/              # Pinia 状态管理 (9 stores)
│   │   ├── utils/               # 核心工具
│   │   │   ├── mappingEngine.ts     # 流程图 ↔ 脚本 双向映射
│   │   │   ├── nodeTypeRegistry.ts  # 节点类型元数据
│   │   │   ├── galgameLanguage.ts   # Monaco 语法高亮
│   │   │   ├── FlowTraversal.ts     # 图遍历
│   │   │   ├── graphAnalysis.ts     # 图分析
│   │   │   └── aiHelpers.ts         # AI 工具函数
│   │   └── preview/             # PixiJS 预览引擎
│   │       ├── previewEngine.ts     # 预览核心
│   │       ├── StateManager.ts      # 游戏状态管理
│   │       └── renderers/           # 20 个节点渲染器
│   └── mcp/                     # MCP Server
│       ├── server.ts            # MCP 入口 (16 tools)
│       ├── tools/               # Tool handlers
│       ├── resources/           # MCP Resources
│       └── prompts/             # MCP Prompts
├── test.galgame/                # 测试项目 (94节点完整剧情)
├── e2e/                         # Playwright E2E 测试
└── src/tests/                   # Vitest 单元测试 (1536 tests)
```

## 脚本语言 (.gs)

自定义 DSL，示例：

```
@label(id: "ch1", label: "第一章", color: "#F0A060") {}
Alice: "你终于来了"
@choice(id: "c1", title: "选择回应") {
  option("热情回应") { next: "n1" }
  option("保持沉默") { next: "n2" }
}
@condition(id: "cond1") {
  expr: "好感度 >= 50"
  true: "good"
  false: "bad"
}
@goto(id: "g1", target: "chapter2") {}
@end(id: "e1", type: "good") {
  message: "你们从此幸福地生活在了一起"
}
```

## 测试

```bash
npm test                    # 1536 测试, 68 文件
npx playwright test e2e/    # 7 E2E 测试 (Electron 真环境)
```

## License

MIT
