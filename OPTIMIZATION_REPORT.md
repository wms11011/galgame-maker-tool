# Galgame Maker Tool — 后续优化发展报告

> 基于 2026 年 5 月行业主流工具（Ren'Py, TyranoBuilder, WebGAL, NVL Maker, BKEngine）的能力对标分析

---

## 一、行业能力矩阵对标

| 能力维度 | 主流工具基准 | 本项目当前 | 差距 |
|---------|-------------|-----------|------|
| **流程图编辑** | WebGAL Terre 拖拽式 / NVL Maker 图形化 | ✅ VueFlow 节点系统 17 种节点 | 持平 |
| **脚本语言** | Ren'Py .rpy (Python) / TyranoScript / BKE Script | ✅ .gs 自定义脚本 + Monaco 编辑 | 持平 |
| **脚本 ↔ 流程图双向同步** | 多数工具仅单向 | ✅ flowToScript + scriptToFlow 双向同步（2026-05 已修复 script→flow 缺失链路） | 领先 |
| **实时预览** | WebGAL 热重载 / TyranoBuilder 即时预览 | ✅ PixiJS 内嵌预览引擎 | 持平 |
| **Live2D 动态立绘** | Ren'Py / TyranoBuilder / WebGAL 均原生支持 | ❌ 仅有静态 sprite | **缺失** |
| **角色语音 + 口型同步** | Ren'Py 内置 voice 语句 + Rhubarb 口型插件 | ❌ 未实现 | **缺失** |
| **粒子特效** (雨/雪/樱花) | Ren'Py SnowBlossom / WebGAL WebGL 粒子 | ❌ 仅震动+闪烁 | **缺失** |
| **文字动画特效** | Ren'Py Kinetic Text Tags / FancyText | ❌ 仅打字机效果 | 差距 |
| **CG 画廊 / 音乐鉴赏 / 回想** | 三大主流工具标配 | ❌ CgGallery 仅基础浏览 | **缺失** |
| **存档/读档 + 缩略图** | Ren'Py 多槽位 + 截图预览 | ⚠️ savePoint 节点存在但无完整 UI | 差距 |
| **分支管理树状图** | BKEngine 树状图 / NVL Maker 分支管理 | ⚠️ PathTracePanel 基础路径追踪 | 差距 |
| **小游戏框架** | Ren'Py 47+ 社区 minigames | ❌ 未实现 | **缺失** |
| **背包/道具系统** | Ren'Py Lezinventory | ❌ 仅有 array 变量操作 | **缺失** |
| **好感度/养成数值面板** | NVL Maker 数值养成 / Ren'Py DSE | ⚠️ 底层变量引擎存在，无 UI | 差距 |
| **AI 辅助创作** | WebGAL MCP Server 脚本生成/配音 | ❌ 未集成 | **缺失** |
| **Steam 成就集成** | Ren'Py 官方 Steam DLL | ⚠️ steamAchievement 节点仅标记 | 差距 |
| **CG/场景过渡特效** | 30+ 种（百叶窗/马赛克/翻页等） | ⚠️ 仅 fade/slide/zoom | 差距 |
| **无障碍支持** | Ren'Py 自述文本/字体替换 | ❌ 未实现 | 差距 |
| **Web 发布** | WebGAL / TyranoBuilder HTML5 | ⚠️ Web 导出存在但无 CDN/优化 | 差距 |
| **Steam Deck / Linux** | Ren'Py 原生支持 | ❌ 仅脚本生成 | **缺失** |

---

## 二、分层优化路线图

### 🔴 第一层 — 体验闭环（Tier 1，预计 24h）

当前工具具备了「编辑→预览→导出」的核心链路，但首次使用的创作者在 15 分钟内只能做出对话+选择。需补全基础体验：

| 编号 | 功能 | 描述 | 工时 |
|------|------|------|------|
| F1 | **CG 画廊完整实现** | 分类浏览 + 缩略图网格 + 解锁状态 + 全屏预览 | 6h |
| F2 | **存档系统完整 UI** | 6 槽位 + 截图缩略图 + 日期时间戳 + 删除确认 | 6h |
| F3 | **文字特效标签** | `{shake}` `{wave}` `{bounce}` `{color=#xxx}` 等内联标签支持 | 4h |
| F4 | **场景过渡扩展** | 百叶窗(blinds)、马赛克(mosaic)、翻页(wind)、光圈(iris) 等 | 4h |
| F5 | **更多粒子效果** | 雨、雪、樱花、落叶预制粒子 | 4h |

### 🟡 第二层 — 叙事深度（Tier 2，预计 40h）

对标 Ren'Py 的叙事能力，增强创作者表达手段：

| 编号 | 功能 | 描述 | 工时 |
|------|------|------|------|
| F6 | **Live2D / Spine 立绘支持** | 导入 Cubism 模型 → 绑定表情/动作 → 预览引擎渲染 | 20h |
| F7 | **好感度/属性数值面板** | 可视化数值条 + 角色好感雷达图 + 实时更新 | 8h |
| F8 | **分支树状图增强** | 交互式全景分支总览 + 点击跳转 + 结局收集率统计 | 6h |
| F9 | **音乐鉴赏室** | BGM 列表 + 播放/暂停 + 解锁状态 + 专辑封面 | 6h |

### 🟢 第三层 — 生态与分发（Tier 3，预计 48h）

对标商业 VN 发行标准：

| 编号 | 功能 | 描述 | 工时 |
|------|------|------|------|
| F10 | **Steam 成就 + 云存档** | Steamworks SDK 集成 → 真实成就解锁 + 云端存档同步 | 12h |
| F11 | **完整 Web 发布管线** | CDN 资源优化 + 渐进式加载 + Mobile 响应式布局 | 12h |
| F12 | **AI 辅助写作** | 接入 LLM API → 对话生成建议 → 分支填充 → 自动翻译 | 16h |
| F13 | **扩展市场/插件系统** | 社区自定义节点类型 → 模板市场 → 一键安装 | 8h |

---

## 三、近期优先实施建议（第 1 轮 — 2 周冲刺）

按 **影响 × 可行性** 排序，挑选 4 个功能作为下一冲刺目标：

```
功能             影响范围     实现难度     工期
─────────────────────────────────────────────
F3 文字特效标签   ★★★★★        ★☆☆☆☆       4h
F5 粒子效果       ★★★★★        ★★☆☆☆       4h
F1 CG 画廊完整    ★★★★☆        ★★☆☆☆       6h
F4 场景过渡扩展   ★★★★☆        ★★☆☆☆       4h
─────────────────────────────────────────────
合计                                        18h
```

### F3 文字特效标签 — 详情

在 `.gs` 脚本和预览引擎中支持内联标签：
```
@dialog(...) {
  content: "{shake}不可能！{/shake} 这是 {color=#ff0000}真的{/color}吗？"
}
```

实现方案：
- `mappingEngine.ts` 解析阶段保留标签
- `previewEngine.ts` 渲染阶段逐字解析标签，动态设置 PIXI.Text.style
- 支持 `{shake}` `{wave}` `{bounce}` `{color=}` `{size=}` `{speed=}` `{pause}`

### F5 粒子效果 — 详情

新增 `@particle` 节点类型：
- 预设：雨 (rain)、雪 (snow)、樱花 (sakura)、落叶 (leaf)、星星 (star)
- 参数：密度、速度、风力、持续时间
- 引擎实现：PIXI.ParticleContainer + requestAnimationFrame 粒子池

### F1 CG 画廊 — 详情

扩展 CgGallery 组件：
- 缩略图网格（3 列）
- 未解锁显示剪影 + 锁定图标
- 点击全屏预览（带左右箭头翻页）
- 统计：已解锁 N/总数 M

### F4 场景过渡 — 详情

扩展 `transition` 枚举 + 渲染器实现：
```
'none' | 'fade' | 'slide' | 'zoom' |
'blinds' | 'mosaic' | 'wind' | 'iris' | 'dissolve'
```
每种过渡用 PIXI.Graphics + 逐帧动画实现。

---

## 四、技术架构演进建议

### 4.1 插件系统设计

借鉴 Ren'Py 的 framework 模式，允许第三方通过标准接口注册：
- 自定义节点类型（`registerNodeType(name, component, renderer)`）
- 自定义过渡效果（`registerTransition(name, shader)`）
- 自定义粒子（`registerParticle(name, config)`）

### 4.2 AI 集成方向

参考 WebGAL MCP Server 的设计：
```
用户输入 "在第 3 章增加一段小樱表白的场景"
       ↓
LLM 分析项目脚本 + 角色设定
       ↓
生成 .gs 脚本 + 自动插入节点 + 推荐配乐
       ↓
用户确认 → 合并到流程图
```

**优先级**: 先用 MCP Server 模式验证（1 周原型），再用 API 深度集成（2 周产品化）。

### 4.3 性能优化

当前 `previewEngine.ts` 虽已从 2,331 行精简到 1,395 行，仍有优化空间：
- PIXI.ParticleContainer 替代 Container 用于粒子（10x 性能提升）
- 纹理图集打包（TexturePacker）减少 GPU 切换
- Web 导出时配合 CDN 做渐进式资源加载

---

## 五、总结

| 维度 | 当前项目 | 行业标杆 (Ren'Py+WebGAL) |
|------|---------|--------------------------|
| 编辑体验 | ✅ 流程图 + 脚本双向同步 | ⚠️ 多数工具单向 |
| 预览引擎 | ✅ PixiJS 实时预览 | ✅ 各工具均有 |
| 节点类型 | ✅ 17 种 | ⚠️ Ren'Py 无此概念 |
| 类型安全 | ✅ ~0 as any, strict 模式 | ❌ 脚本语言无类型 |
| Live2D | ❌ | ✅ 标准配置 |
| 粒子 / 特效 | ❌ 基础 | ✅ 丰富 |
| AI 辅助 | ❌ | ✅ WebGAL 已落地 |
| 画廊 / 鉴赏 | ❌ 基础 | ✅ 标配 |
| Steam 集成 | ⚠️ 仅标记 | ✅ 完整 SDK |
| Web 发布 | ⚠️ 基础 | ✅ WebGAL 出色 |
| 存档系统 | ⚠️ 底层存在 | ✅ 完整 UI |

**核心结论**: 本项目在「编辑工具链」层面已达到甚至超越行业水平（流程图双向同步、类型安全、Monaco 编辑器）。差距集中在「表现力」（Live2D、粒子、文字特效）和「发行生态」（Steam、Web、存档 UI、画廊）两个方向。

**推荐策略**: 先补表现力（F3+F5+F4，合计 12h），再补生态（F1+F2+F9，合计 18h），最后补高级特性（F6+F10+F12）。


claude --resume 7299afb6-3fd3-4181-8563-e069bd85043e