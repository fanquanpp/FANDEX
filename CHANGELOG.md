# 更新日志（CHANGELOG）

本文件记录 FANDEX 单仓库的版本发布历史与各版本变更说明。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循语义化版本（SemVer）。

> 发布说明约定：`android-release.yml` 工作流在打 `v*` 标签发布时，
> 会自动提取本文档中对应 `## [vX.Y.Z]` 段落作为 GitHub Release 说明。

## [v4.2.0] - 2026-09-02

本版本是一次面向编程语言类与全栈开发类模块的内容深度工程：补全占位文档、
新增学习总结、系统性修复 Markdown 围栏语义错误，并同步收紧构建期校验。
全端版本号统一为 4.2.0。

### 新增

- **21 个模块学习总结**：java / kotlin / csharp / go / python / rust / c / cpp /
  javascript / typescript / vue3 / react / nextjs / astro / nestjs / vite /
  deno / bun / svelte / angular / tailwind 各新增 1 篇学习总结文档，
  含 Mermaid 知识地图、易混淆概念对比、常见误区、自检清单与后续学习路径；
- **4 篇新增知识文档**：astro 视图过渡、astro 中间件与图片优化、
  vite 插件开发实战、bun 内置 SQLite/S3 与文件 I/O；
- **Rust 语法速查**：cnt-content/syntax 新增 041-rust 素材（10 篇 77 个速查卡片），
  build-syntax 映射同步，语法速览页覆盖全部 14 门语言；
- **长文档前置说明**：524 篇超万字文档补齐"前置知识 / 学习目标"章节
  （由 prerequisites 与正文 H2 结构推导生成）；
- 代码示例特色化：新增与补全内容统一采用"虚拟歌手音乐平台"虚构领域
  （P主 / 歌姬 / 歌曲 / 演唱会 / 应援色），风格参照 vocaloid 项目。

### 修复

- **Markdown 围栏语义错误 81 处**：正文步骤/清单被误包为代码块、
  围栏语言标注缺失或错误（benchmark 输出、伪代码、配置文件等 26 处补注）、
  ASCII 流程图转 Mermaid（V8 流水线、Spring 请求链、TLS 1.3 握手等 9 处）、
  时间线转表格（TS / Kotlin / C++ 演进史等 5 处）、
  围栏嵌套断裂与内容重复 4 处（vue3 响应式丢失开门栏、csharp/Unity 与
  csharp/异步状态机 mermaid 被吞、go/正则 Thompson 构造缺"连接"条目）；
- **49 篇占位骨架文档补全**：清理全部"主题已规划、正文待补全"占位文档
  （javascript 4、typescript 3、java 5、kotlin 2、csharp 4、go 3、c 5、
  python 4、rust 8、astro 3、vite 3、tailwind 3、deno 3、bun 3、angular 3）；
- python 学习路径节点 ID 重复（python-101）修复；
- 74 篇文档 author 字段统一为 fanquanpp；
- 35 篇文档正文站内链接补前导斜杠（相对形式在站点 404）；
- 14 篇文档 order 与学习顺序/步长 10 规则不一致的重排。

### 变更

- **删除 46 篇总览式 MERGED 合集文档**及其生成脚本 regen_merged.py，
  内容源回归单一结构（web 端构建规模同步减小）；
- docs collection schema 收紧：移除 tags / created / readingTime /
  references / etymology / estimatedReadingTime / lastReviewed / reviewer
  等历史宽容字段，与 content-audit 的 10 字段白名单完全一致；
- 根 package.json 清理指向不存在 @fandex/tools 包的失效脚本；
- 全端版本号统一 4.2.0（Android 双端 versionCode 各自递增）；
- 文档规模信息统一为 46 模块 / 1743 篇。

## [v4.1.0] - 2026-09-02

本版本新增 Windows 桌面端，并同步完善两端 Android 应用的体验细节。全端版本号
统一为 4.1.0。

### 新增

- **Windows 桌面端（app-desktop）**：基于 Tauri 2，内嵌 web 端构建产物，
  完全离线可用；窗口状态记忆（位置/尺寸自动恢复）；由统一 app-icon 生成的
  全套图标；构建时剔除在线编程（前端实验室）页面并断言校验；
  发布包命名 FANDEX-Setup-<版本>.exe；
- **Windows 桌面端快捷键**：Ctrl+Alt+F 全局呼出/隐藏主窗口（应用处于后台时
  仍可触发，再次按下收起）；F11 全屏切换、Escape 退出全屏；
  Alt+左/右方向键后退/前进，对齐浏览器阅读习惯；
- **app-Android-new 开屏动画**：接入 core-splashscreen，品牌图标 + 深浅色
  自适应背景（冷雾灰/近黑），600ms 品牌展示后渐出进入应用；
- **app-Android-new 主题图标**：launcher 增加 monochrome 单色层
  （Android 13+ 主题图标支持）；
- **app-Android-old 源仓库选择**：顶部导航栏新增源仓库按钮，点击弹出
  悬浮面板列出两个源仓库（当前仓库 FANDEX 与历史仓库 FANDEX-App，
  按版本区间说明区分），风格与现有界面统一；
- 仓库根 LICENSE 文件（MIT），消除 README 与 package.json 的许可声明死链。

### 变更

- 全端版本号统一 4.1.0（Android 双端 versionCode 继续各自递增）；
- 发布工作流（android-release.yml）的 Release 产物补齐桌面端：
  自动下载 NSIS 安装包并以 FANDEX-Setup-<tag>.exe 命名附带，三端一次发齐；
- 三端内容同步校验（web / Android 双端与 cnt-content 逐字节一致）；
- 文档规模信息统一为 43 模块 / 1718 篇，AGENTS.md 模块->分类映射表对齐。

### 修复

- CHANGELOG v4.1.0 条目格式与位置修正（此前被拼接在文末且缺换行，
  导致发布工作流无法提取发布说明）；
- `app-Android-old` 源仓库悬浮面板补接顶部导航栏触发按钮
  （面板实现已就位但按钮缺失，面板此前无法唤起）。

## [v4.0.0] - 2026-08-30

### 新增

- 仓库根 README 与本 CHANGELOG：完善仓库介绍与版本更新说明。
- 语法速览页与学习路线页视觉提级：新增头部统计横幅（语言 / 语法点 /
  文档总量，路线 / 阶段总量），条目增加序号、分类色药丸与阶段几何刻度条，
  与首页同等级的视觉层次。
- 语法速览 / 学习路线共用 `StatsBar` 统计横幅组件（`ui/components/Common.kt`）。

### 变更

- 目录结构重组：
  - `app-android` 更名为 `app-Android-new`（新技术栈 Android 工程主线）；
  - 旧版 FANDEX-App 归档目录更名为 `app-Android-old`，并参考
    `app-Android-new` 精简为纯 Android 工程结构（移除旧仓库 .github
    工作流、web 官网、screenshots 与独立文档，Android 工程上提至目录根）；
  - 同步更新根 .gitignore、pnpm-workspace、tsconfig、CI 工作流与
    内容生成脚本中的全部路径引用。
- 旧版 App 内置文档整体替换为 cnt-content 内容源：
  - 新增 `app-Android-old/scripts/generate-legacy-content.mjs` 内容管线，
    从 `cnt-content/full` 与 `shd-shared/metadata/modules.json` 生成
    `dist-mobile` 文档与索引；
  - 文档由 22 模块 313 篇（中文文件名）扩展为 54 模块 1903 篇（英文 slug），
    与主仓库内容完全同源；
  - 旧版 `ContentLoader` 数据契约保持不变，文档中文标题改由索引
    `documents` 数组提供（取自 frontmatter）。
- SVG 图标资源统一：`shd-shared/assets/icons/app-icon.svg` 与
  `favicon.svg` 统一为同一设计基准（蓝色对角渐变 + 白色 F），
  `app-Android-new` 启动图标同步（背景品牌蓝渐变、前景白色 F）。
- `app-Android-old` release 构建签名回退策略：无正式 keystore 时
  回退 debug 签名（与 `app-Android-new` 分发策略一致），CI 可直接出包。
- CI（android-release.yml）升级为双端并行构建与发布：
  - matrix 同时构建 `app-Android-new` 与 `app-Android-old`；
  - `v*` 标签发布时 Release 附带双端 APK（`FANDEX-<tag>.apk` /
    `FANDEX-Legacy-<tag>.apk`，applicationId 不同可并存安装）；
  - 发布说明自动提取本 CHANGELOG 对应版本段落。

### 修复

- `app-Android-new` 深浅色模式下按钮与搜索图标全部为黑色的问题：
  `FdxIconButton` 默认着色由 `Color.Unspecified`（退化为 LocalContentColor
  默认黑）改为主题 `onSurface` 语义色，搜索框 leadingIcon 显式使用
  `fgTertiary` 占位色。
- `app-web` 构建（GitHub Actions）在约 1900 篇文档连续高亮时
  Shiki oniguruma WASM 内存越界（`memory access out of bounds`，
  构建 14 分钟后失败）：高亮引擎切换为 Shiki JavaScript 正则引擎
  （`createJavaScriptRegexEngine`，forgiving 模式），构建稳定通过。

### 性能

- `app-Android-new` mermaid 图表缩放 / 平移手势内核重写：
  - 手势进行中锁定容器高度、停止向原生回报，切断「JS 回报 → Compose
    重布局 → WebView 尺寸变化」的每帧反馈循环，缩放拖拽恢复流畅；
  - touchmove 高频事件经 requestAnimationFrame 合帧，舞台固定合成层
    （will-change + translate3d）；
  - 双指手势升级为捏合缩放 + 二维拖动（以捏合中心为焦点），
    放大后可纵向查看全图。

### 移除

- `app-Android-old` 死代码清理（经符号级引用审计确认零调用，
  编译验证通过）：`ui/enhancements` 下 StatusColors、SkeletonScreen、
  DarkModeTuning、SpringAnimations、ParallaxScroll、Tilt3DModifier、
  CustomScrollbar、MicroInteractions 八个文件，以及历史预留层
  `ui/background/L6CardGradientBorder`。
- `app-Android-new` 首页私有 `SectionHeader` 重复实现，统一使用共享版。

## [v1.x] — 历史版本

- 单仓库整合：三端统一 React 生态（web / desktop / android 占位）
  + 共享内容层（cnt-content / shd-shared / tls-tools / thd-third-party）。
- 旧版 FANDEX-App 完整源码迁入仓库归档（后续重组为 `app-Android-old`）。
- 历史变更详见各子工程内部文档与提交历史。
