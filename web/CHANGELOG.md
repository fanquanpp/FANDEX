# 更新日志

## v1.2.0（2026-07-18）

### 新增 SVG 模块

新增"SVG"文档模块，归入 `dev-lang` 分类，前置依赖 `html5`。提供 17 篇系统化教学文档，覆盖从入门到实战的完整路径。

#### 模块配置

- 在 `src/lib/modules.ts` 新增 SVG 模块定义（id: `svg`，icon: `SVG`）
- 在 `modulePrerequisites` 中声明 `svg: ['html5']`
- 在 `src/data/roadmap.json` 的 Phase 2 Web 基础中插入 SVG（位于 css 与 javascript 之间）
- 在 careerPaths 全栈入门路径中加入 SVG 步骤
- 关联 `html5/SVG矢量图形.md` 的 `related` 字段，指向新的 svg 模块文档

#### 文档清单（17 篇）

基础篇：

- `svg/概述与环境配置.md`：SVG 发展、特性对比、嵌入方式、开发环境
- `svg/基础语法与文档结构.md`：根元素、命名空间、defs/symbol/use、嵌套规则
- `svg/坐标系与viewBox.md`：视口、viewBox、preserveAspectRatio、坐标系变换
- `svg/基本图形详解.md`：rect/circle/ellipse/line/polyline/polygon 与描边属性
- `svg/路径path详解.md`：path 命令、贝塞尔曲线、弧线、fill-rule

样式篇：

- `svg/文本与排版.md`：text/tspan/textPath、文字锚点、可访问文本
- `svg/颜色与填充.md`：fill/stroke、currentColor、paint-order、vector-effect
- `svg/渐变与图案.md`：linearGradient/radialGradient/pattern 与组合应用
- `svg/变换transform.md`：translate/rotate/scale/matrix 与 transform-origin
- `svg/滤镜详解.md`：feGaussianBlur/feDropShadow/feColorMatrix/光照

进阶篇：

- `svg/裁剪与蒙版.md`：clipPath 硬裁剪、mask 软蒙版、组合应用
- `svg/符号与复用.md`：defs/symbol/use、图标系统构建
- `svg/动画基础.md`：SMIL/animateTransform/animateMotion 与 CSS 动画对比
- `svg/CSS样式化.md`：优先级、CSS 变量、伪类、媒体查询、主题切换
- `svg/JavaScript交互.md`：DOM 操作、事件、动态生成、数据驱动可视化

应用篇：

- `svg/响应式与性能.md`：响应式适配、性能瓶颈、优化策略、懒加载
- `svg/图标与可访问性.md`：图标系统、aria 属性、WCAG 对比度
- `svg/实战项目.md`：环形进度条、柱状图、动画 Logo、地图、加载动画、折线图、饼图

---

## v1.1.0（2026-07-16）

### 小更新（文本勘误与装饰层补全）

本次为小更新，保持现有版本号 1.1.0。主要修正文本文件版权信息，扩展几何背景装饰组件变体，并为信息页统一应用装饰层。

#### 文本勘误

- 确认 `LICENSE` 版权年份为 2026（仓库新建于 2026 年）
- 校对 `README.md`：文档数 1995、模块数 51、Pages 链接 https://fanquanpp.github.io/FANDEX-web/、关联项目描述（FANDEX-exe 桌面端、FANDEX-App 移动端）、参赛信息、创意展示 HTML 引用均确认正确
- 校对 `DISCLAIMER.md`：最后更新日期 2026-07-16、GitHub 链接指向 fanquanpp/FANDEX-web 均确认正确
- 校对 `CODE_OF_CONDUCT.md`、`CONTRIBUTING.md`、`SECURITY.md`：联系方式与生效日期均确认正确

#### GeoBgDecor 组件变体扩展

- 扩展 `GeoBgVariant` 类型，新增 `loading`、`error`、`info` 三种变体
- `loading` 变体：网格底纹 + 小点阵，用于加载态页面
- `error` 变体：网格底纹 + 大点阵，用于错误态页面
- `info` 变体：类似 docs 但更克制，用于 about/disclaimer/privacy 等信息页
- 保留原有 home/docs/list/minimal 四种变体配置不变
- `geo-decor.css` 中 `geo-dots-lg`、`geo-arc-tr`、`geo-arc-tl`、`geo-square-br`、`geo-square-bl`、`geo-diag-line`、`geo-wave-lines` 等装饰类样式均已存在，无需补充

#### 信息页装饰层应用补全

- `404.astro` 应用 `minimal` 变体（手动引入 geo-decor.css，因页面未使用 BaseLayout）
- `search.astro` 应用 `minimal` 变体
- `tags/index.astro` 应用 `list` 变体
- `tags/[tag].astro` 应用 `list` 变体
- `roadmap.astro` 应用 `docs` 变体
- `privacy.astro` 已应用 `docs` 变体，确认正确无需改动

---

## v2.0.0（2026-07-14）

### 架构重构（跨项目统一重构）

本次为大版本更新，落地三层架构（UI/Service/Data）、强化类型安全、重写代码运行沙箱，并建立测试基线。

#### 架构重构

- 落地三层架构（UI 层 / Service 层 / Data 层），新增 Service 层骨架 6 个文件：
  - `src/services/doc-service.ts` 文档查询与导航服务
  - `src/services/module-service.ts` 模块查询服务
  - `src/services/tag-service.ts` 标签聚合服务
  - `src/services/glossary-service.ts` 术语查询服务
  - `src/services/progress-service.ts` 学习进度服务
  - `src/services/index.ts` 服务层统一导出（UI 层唯一入口）
- 改造 10 个 UI 层文件移除直接 `getCollection` 调用，统一通过 Service 层访问数据层
- 新增 `src/components/BaseLayout.astro` 基础布局，`HomeLayout` 与 `Layout` 继承共享代码，消除重复样式与脚本

#### 去重与类型安全

- 统一 `docSlug` 函数定义至 `src/lib/modules.ts`，消除 4 处重复定义
- 抽取 `src/lib/external-loader.ts`（Mermaid 与 DOMPurify 异步加载缓存）、`src/lib/mermaid-renderer.ts`（Mermaid 初始化与渲染）、`src/lib/reading-time.ts`（阅读时长计算），消除多处重复加载逻辑
- 将 `roadmap.astro` 内联的 11 个 Phase 与 10 个职业路径数据外置为 `src/data/roadmap.json`
- 新增类型声明文件：`src/types/mermaid.d.ts`、`src/types/dompurify.d.ts`、`src/types/pagefind.d.ts`
- 消除全项目 `any` 类型（`search-worker.ts`、`rehype-lazy-images.ts`、`remark-admonition.ts`、`tags/index.astro`、`map.astro` 等）
- `tsconfig.json` 严格模式实际生效，`astro check` 全量通过无 `any` 警告

#### code-runner 沙箱重写

- 重写 `src/lib/code-runner.ts` 为 iframe sandbox 模式（`sandbox="allow-scripts"` 不带 `allow-same-origin`）
- 移除 `UNSAFE_PATTERNS` 黑名单机制，改用跨域隔离
- 实现 5 秒超时机制（`setTimeout` + iframe 清理）
- `console.log/info/warn/error` 通过 `postMessage` 上报至父页面
- 沙箱内执行 `window.parent.document.body.innerHTML = ''` 与 `globalThis.eval('fetch("/")')` 均被隔离

#### 配置集中化

- 新增 `src/config/runtime.ts`，集中管理 `SITE.url`、Mermaid CDN URL、DOMPurify CDN URL、code-runner 超时时长、FUSE 阈值
- 配置项优先从 `import.meta.env` 读取，回退到默认值，可通过环境变量覆盖

#### CI 质量门禁修复

- 移除 `.github/workflows/ci.yml` 中 lint Job 的 `continue-on-error: true`
- 新增 `type-check` Job 执行 `astro check`，作为 deploy Job 的前置依赖
- `.github/workflows/deploy.yml` 在 Pagefind 构建前显式安装 `@pagefind/linux-x64`
- 补充 `prettier-plugin-astro` 依赖，`lint-staged` 配置增加 `astro check` 与 `tsc --noEmit` 钩子
- 完善 `.gitignore`（`.env`、`coverage/`、`*.log`、`.DS_Store`、`Thumbs.db` 等）

#### 测试基线建立

- 新增 99 个单元测试，覆盖核心模块：
  - `src/lib/modules.test.ts` 模块查询与分类逻辑
  - `src/lib/code-runner.test.ts` 沙箱执行、超时、console 捕获、错误捕获、沙箱逃逸场景
  - `src/lib/progress.test.ts` 学习进度持久化
  - `scripts/build-search-index.test.mjs` 搜索索引生成
  - `scripts/build-glossary-index.test.mjs` 术语索引生成
- CI 中新增 test Job 执行 `npm run test`，作为 deploy Job 的前置依赖

---

## v1.1.0（2026-06-24）

### 正式发行版

FANDEX 线上学习平台，内容基准仓库，基于 Astro 5 + Vue 3 构建。

#### 新增

- 首页改造为 FANDEX 生态门户，新增"FANDEX 生态"区域
- 三项目联动入口：FANDEX-web（线上平台）、FANDEX-exe（桌面端）、FANDEX-App（移动端）
- 导航栏新增"桌面端"下载链接
- 页脚新增三项目联动链接
- 程序图标字母 F（favicon.svg + logo-mark 方块样式）
- 51 模块 1995 篇文档，浏览器直接访问
- 交互测验、知识地图、全文搜索、学习路线、标签索引
- 进度追踪、术语悬浮、暗色模式、响应式布局

#### 技术栈

- Astro 5 静态站点生成（SSG），岛屿架构
- Vue 3 按需水合（client:load / client:visible）
- Shiki 双主题代码高亮，构建时零 JS
- Pagefind + Fuse.js 搜索引擎
- Service Worker 离线缓存
- Husky + lint-staged + Prettier 代码质量
