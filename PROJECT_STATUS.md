# Galgame Maker Tool — 项目开发现状分析

> 2026 年 5 月 | 数据来源：OPTIMIZATION_REPORT.md + 最新代码审计

---

## 一、核心质量指标

| 指标 | 初始值 | 当前值 | 判定 |
|---|---|---|---|
| TypeScript 严格模式 | `strict: true` | ✅ + `noUncheckedIndexedAccess` | 🟢 行业最佳 |
| Typecheck 错误 | — | **0** | 🟢 |
| 测试文件 | 18 | **22** | 🟢 |
| 测试用例 | 489 | **638** | 🟢 |
| 分支覆盖率 | — | **80.8%** | 🟡 核心模块 >85% |
| `as any` 数量 | ~120 | **3** | 🟢 -97.5% |
| 渲染引擎行数 | 2,331 | **1,645** | 🟢 -29% |
| 节点类型 | 17 | **19** | 🟢 |
| Monaco 指令 | 3 | **24** | 🟢 |

---

## 二、能力对标矩阵（与行业三大工具对比）

### 🟢 已领先或持平

| 能力 | 本项目 | Ren'Py | TyranoBuilder | WebGAL |
|---|---|---|---|---|
| 流程图编辑 | ✅ VueFlow | ❌ 无 | ✅ 拖拽 | ✅ Terre |
| 脚本↔流程图双向同步 | ✅ | ❌ 单向 | ❌ 单向 | ❌ 单向 |
| 代码编辑器 | ✅ Monaco | ✅ 内置 | ❌ 无 | ❌ 无 |
| TypeScript 类型安全 | ✅ strict | ❌ Python | ❌ JS | ⚠️ |
| 实时预览 | ✅ PixiJS | ✅ | ✅ | ✅ 热重载 |
| 测试覆盖 | ✅ 638 用例 | ❌ 社区 | ❌ | ❌ |

### 🟡 差距较小

| 能力 | 本项目 | 对标 | 差距 |
|---|---|---|---|
| 文字特效 | ✅ 7 种标签 | Ren'Py FancyText | 缺少 glow/outline 等 |
| 场景过渡 | ✅ 8 种 | Ren'Py 30+ | 缺少 ImageDissolve 等 |
| 粒子效果 | ✅ 5 种 (新) | WebGAL WebGL 粒子 | 缺少自定义参数 |
| Live2D | ✅ 双模渲染 (新) | Ren'Py/Tyrano | .moc3 SDK 已集成,缺 Cubism Core 分发 |
| CG 画廊 | ✅ 解锁+预览 | 行业标配 | 缺少分类/过滤 |
| 存档系统 | ✅ 6 槽+截图 | 行业标配 | 缺少云存档 |
| Web 发布 | ✅ loading+响应式 | WebGAL | 缺少 CDN/渐进加载 |

### 🔴 仍然缺失

| 能力 | 描述 | 优先级 |
|---|---|---|
| 小游戏框架 | Ren'Py 47+ minigames | 🟢 低 |
| 道具系统 | Lezinventory | 🟢 低 |
| AI 写作辅助 | LLM 脚本生成 | 🟡 中 |
| 插件市场 | 社区扩展 | 🟡 中 |
| Steam 成就 SDK | Steamworks | 🟡 中 |
| 语音+口型同步 | Rhubarb Lipsync | 🟢 低 |
| 无障碍支持 | 自述文本 | 🟢 低 |

---

## 三、架构概览

```
src/
├── main/services/        (4 files) — Electron 主进程
│   ├── exportService.ts  ← Web/Desktop 导出 + 运行时 JS
│   └── steamworksService.ts  ← 待集成
│
├── renderer/src/
│   ├── preview/
│   │   ├── previewEngine.ts (1,645 lines) — 核心引擎
│   │   ├── renderers/ (21 files) — 19 节点 + BaseRenderer + barrel
│   │   │   ├── BaseRenderer.ts         ← 抽象基类
│   │   │   ├── DialogRenderer.ts ...   ← 17 基础节点
│   │   │   ├── ParticleRenderer.ts     ← 粒子系统 (新增)
│   │   │   └── Live2DRenderer.ts       ← Live2D 双模 (新增)
│   │   ├── StateManager.ts   — 变量/标记/表达式/存档状态
│   │   ├── AnimationHelper.ts — PIXI 动效工具
│   │   ├── AutoAchievementChecker.ts — 自动成就检测 (新增)
│   │   ├── AutoPlayController.ts — 自动播放 (新增)
│   │   └── TypewriterController.ts — 打字机 (新增)
│   │
│   ├── stores/ (9 files) — Pinia 状态管理
│   ├── components/ (30+ files) — Vue 3 组件
│   │   ├── FlowEditor.vue    — 流程图编辑器 (vue-flow)
│   │   ├── PreviewWindow.vue — 预览窗口 + 存档系统
│   │   ├── AffectionPanel.vue — 好感度面板 (新增)
│   │   ├── MusicRoom.vue     — 音乐鉴赏室 (新增)
│   │   ├── CgGallery.vue     — CG 画廊 (增强)
│   │   └── nodes/ (19 files) — 每种节点一个 .vue
│   │
│   ├── utils/ (9 files) — 工具库
│   │   ├── mappingEngine.ts  — flow↔script 双向映射核心
│   │   ├── FlowTraversal.ts  — 统一图遍历
│   │   ├── textEffectParser.ts — 内联标签解析 (新增)
│   │   └── galgameLanguage.ts — Monaco 语言定义
│   │
│   └── types/ (3 files) — TypeScript 类型
│       ├── index.ts   — 全部接口 + 19 节点类型
│       └── guards.ts  — 19 类型守卫 + NODE_TYPE_GUARDS
│
└── tests/ (20 files) — 638 测试
    ├── mappingEngine.test.ts (135)
    ├── flowStore.test.ts (133)
    ├── conditionBuilder.test.ts (54)
    ├── complexFlow.test.ts (42)
    ├── previewEngine.test.ts (40)
    ├── StateManager.test.ts (40)
    ├── renderers/controlFlow.test.ts (31)
    ├── fullFlow.test.ts (25)
    ├── textEffectParser.test.ts (16)
    └── ... (11 more)
```

---

## 四、改造路线图执行情况

| 轮次 | 内容 | 完成 |
|---|---|---|
| 第 1 轮 | P2 类型安全 / P4 错误边界 / P3 流程统一 | ✅ |
| 第 2 轮 | P1 引擎重构 (19 渲染器 + BaseRenderer) | ✅ |
| 第 3 轮 | P5 场景分组 / P6 测试 / P7 变量 / P8 导出 | ✅ |
| 第 4 轮 | F3 文字特效 / F5 粒子 / F4 过渡 / F1 CG / F2 存档 / F9 音乐 | ✅ |
| 第 5 轮 | F7 好感度面板 / F8 分支树 / F11 Web 管线 / F6 Live2D | ✅ |

---

## 五、技术债务清零项

| 债务 | 状态 |
|---|---|
| `parseInt(x) \|\| default` 模式 | ✅ 已修复 (parseNum) |
| Monaco 指令缺失 (3/17) | ✅ 已补齐 (24 指令) |
| `as any` 泛滥 (~120) | ✅ → 3 (vue-flow + Live2D 内部) |
| 预览引擎单体 (2,331 行) | ✅ → 1,645 行 + 21 个渲染器模块 |
| 节点坐标持久化冗余 | ✅ JSON 序列化时剥离 VueFlow 内部字段 |
| 测试 fixture 不同步 | ✅ ALL_TYPES 12→19 / NodeType 3→19 |
| `noUncheckedIndexedAccess` | ✅ 已启用 |
| 脚本→流程图单向同步 | ✅ scriptToFlow 链路补全 |

---

## 六、结论

**当前完成度：~95%**。项目在编辑工具链（流程图双向同步、Monaco 代码编辑器、TypeScript strict 模式）、预览引擎（19 种节点 + 8 种过渡 + 5 种粒子 + Live2D 双模）、发布管线（Web 响应式导出 + 加载屏）三个维度已达到或超越行业水准。

**差距集中在生态层**：Steam SDK、AI 写作、插件系统、小游戏框架——这些属于商业发行和社区生态建设范畴，适合在项目成熟后作为独立模块逐步引入。
