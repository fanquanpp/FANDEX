# FANDEX-web 变更日志

本文件记录 FANDEX-web 仓库的版本演进。1.x.x → 2.0.0 大版本升级以本文档为准；2.0.0 之后的版本变更由 Changesets 自动维护，详见 [Changesets 流程说明](../.changeset/README.md)。

---

## v2.0.0 — 大版本升级（架构重构与工程化落地）

**发布日期**：2026-07-14

本次为大版本更新，落地三层架构（UI / Service / Data）、强化类型安全、重写代码运行沙箱、建立测试基线，并完成 CI/CD 流水线全面升级。本次升级包含破坏性变更，详见下文「破坏性变更」章节。

### 新增功能

#### 架构与代码组织

- 落地三层架构（UI 层 / Service 层 / Data 层），Service 层承载全部业务逻辑
- 新增 Service 层 10 个服务文件，覆盖文档、模块、标签、术语、进度、学习路径、搜索、代码运行、知识地图、可观测性
- Service 层统一入口 `src/services/index.ts`，UI 层禁止直接访问 Data 层
- 新增 `src/components/BaseLayout.astro` 基础布局，消除 `HomeLayout` 与 `Layout` 重复代码
- 新增 `src/config/runtime.ts` 集中管理运行时配置（站点 URL、CDN、超时、FUSE 阈值），支持环境变量覆盖

#### 类型安全

- 新增类型声明文件：`mermaid.d.ts`、`dompurify.d.ts`、`pagefind.d.ts`
- 消除全项目 `any` 类型（`search-worker.ts`、`rehype-lazy-images.ts`、`remark-admonition.ts`、`tags/index.astro`、`map.astro` 等）
- `tsconfig.json` 严格模式实际生效，`astro check` 全量通过无 `any` 警告

#### code-runner 沙箱重写

- 重写 `src/lib/code-runner.ts` 为 iframe sandbox 模式（`sandbox="allow-scripts"` 不带 `allow-same-origin`）
- 移除 `UNSAFE_PATTERNS` 黑名单机制，改用跨域隔离
- 实现 5 秒超时机制（`setTimeout` + iframe 清理）
- `console.log/info/warn/error` 通过 `postMessage` 上报至父页面
- 沙箱内执行 `window.parent.document.body.innerHTML = ''` 与 `globalThis.eval('fetch("/")')` 均被隔离

#### 测试基线

- 新增 99 个单元测试，覆盖核心模块：
  - `src/lib/modules.test.ts` 模块查询与分类逻辑
  - `src/lib/code-runner.test.ts` 沙箱执行、超时、console 捕获、错误捕获、沙箱逃逸场景
  - `src/lib/progress.test.ts` 学习进度持久化
  - `scripts/build-search-index.test.mjs` 搜索索引生成
  - `scripts/build-glossary-index.test.mjs` 术语索引生成
- CI 中新增 `unit-test` Job 执行 `npm run test`，作为 deploy Job 的前置依赖

#### CI/CD 流水线

- 新增 `type-check` Job 执行 `astro check`，作为 deploy Job 的前置依赖
- CI 流水线升级为八阶段：lint → type-check → unit-test → build → e2e-test → qa-check → lighthouse → deploy
- 新增 Bundle 体积分析（`scripts/analyze-bundle.mjs`），构建后自动检查 JS ≤ 150KB / CSS ≤ 30KB gzipped
- 新增 E2E 冒烟测试 Job，对关键路由做 HTTP 200 校验
- 新增 QA 质量门禁 Job（`scripts/qa-check.mjs`），覆盖文件审计 / Web 架构 / 内容 / SEO 六大维度
- 新增 Lighthouse CI 性能预算门禁（LCP ≤ 2.5s / CLS ≤ 0.1 / TBT ≤ 200ms）
- 新增 Changesets 版本管理（`.changeset/` + `changeset.yml` PR 检测）
- 新增 `CODEOWNERS` 代码所有者规则
- 新增 Issue 模板（bug_report / feature_request / content_improvement）与 PR 模板

#### 文档与开发者体验

- 新增 `docs/architecture.md` 架构文档，含三层架构图、目录结构、依赖矩阵、扩展指南
- 新增 `docs/contributing.md` 贡献指南，含 12 项质量基准、frontmatter 规范、Conventional Commits 规范
- 新增 `docs/design-system.md` 设计系统文档，含 Design Tokens、双主题机制、shadcn-vue 使用指南
- 升级 `README.md`，补充技术栈、快速开始、项目结构、开发者文档链接

#### 内容

- 新增 SVG 模块，归入 `dev-lang` 分类，前置依赖 `html5`，提供 17 篇系统化教学文档
- 新增多个模块的补充文档（详见各模块更新日志）

### 改进

#### 去重与统一

- 统一 `docSlug` 函数定义至 `src/lib/modules.ts`，消除 4 处重复定义
- 抽取 `src/lib/external-loader.ts`（Mermaid 与 DOMPurify 异步加载缓存）
- 抽取 `src/lib/mermaid-renderer.ts`（Mermaid 初始化与渲染）
- 抽取 `src/lib/reading-time.ts`（阅读时长计算）
- 将 `roadmap.astro` 内联的 11 个 Phase 与 10 个职业路径数据外置为 `src/data/roadmap.json`

#### 构建

- 升级 Astro 至 7.x，启用 Content Layer API
- 升级 Tailwind CSS 至 4.x，采用 CSS-first 配置（移除 `tailwind.config.js`）
- 升级 Vue 至 3.5.x
- 升级 Vitest 至 4.x，新增 V8 覆盖率
- 升级 TypeScript 至 6.x
- Pagefind 通过 `astro-pagefind` 集成，移除手动 `pagefind --site dist` 步骤

#### 代码质量

- 移除 `.github/workflows/ci.yml` 中 lint Job 的 `continue-on-error: true`
- 补充 `prettier-plugin-astro` 依赖
- `lint-staged` 配置增加 `astro check` 与 `tsc --noEmit` 钩子
- 完善 `.gitignore`（`.env`、`coverage/`、`*.log`、`.DS_Store`、`Thumbs.db` 等）

#### 性能

- 静态资源文件名含 hash，支持长期缓存
- 样式内联策略 `auto`，小文件内联大文件外部引用
- 预取策略 `hover`，悬停时预加载页面
- 图片懒加载（`rehype-lazy-images`）
- Service Worker 缓存策略：Cache First（哈希资源）+ Network First（HTML/数据）+ SWR（图片）

### 修复

- 修复 `search-worker.ts` 中 Fuse.js 阈值过宽导致搜索结果噪音过多
- 修复 `tags/index.astro` 标签计数在多语言文档下重复计算
- 修复 `map.astro` 知识地图在大量节点时渲染卡顿
- 修复暗色模式下代码块文字对比度不足
- 修复移动端抽屉导航在某些机型上滑动卡顿
- 修复 `404.astro` 未应用 BaseLayout 导致样式缺失
- 修复 `rss.xml` 在 base path 下的链接错误

### 破坏性变更

#### Service 层强制分层

UI 层（`src/pages/`、`src/components/`、`src/islands/`）禁止直接调用以下 API：

- `getCollection()`（Astro Content Layer）
- `localStorage` / `IndexedDB`（须通过 `progress-service` 或 `observability-service`）
- `src/lib/modules.ts` 中的内部函数（须通过 `module-service` 调用）

**迁移方式**：所有 UI 层导入改为从 `src/services/index.ts` 引用。

```typescript
// 旧
import { getAllDocs } from '@lib/doc-service';
import { getCollection } from 'astro:content';

// 新
import { getAllDocs } from '@services';
```

#### code-runner 沙箱 API 变更

`src/lib/code-runner.ts` 由 Web Worker 重写为 iframe sandbox 模式，API 签名变更：

```typescript
// 旧
runCode(code: string, language: string): Promise<string>;

// 新
runCode(request: RunRequest): Promise<RunResult>;
// RunRequest: { code: string; language: CodeLanguage; timeout?: number }
// RunResult: { success: boolean; output: string; error?: string; duration: number }
```

#### Design Tokens 命名空间

全站 CSS 变量统一使用 `--fandex-` 前缀，原有 `--color-*` 变量已废弃：

```css
/* 旧 */
color: var(--color-primary);

/* 新 */
color: var(--fandex-color-primary-600);
```

#### 配置文件

- `tailwind.config.js` 移除，Tailwind v4 通过 `src/styles/tailwind.css` 的 `@theme` 配置
- `astro.config.ts` 集成方式调整：`pagefind()` 替代手动 `pagefind --site dist`

#### Node.js 版本

CI 与本地开发统一要求 Node.js 22 LTS，不再支持 Node.js 18 / 20。

---

## v1.x.x 历史

### v1.2.0（2026-07-18）

- 新增 SVG 模块，17 篇文档，前置依赖 html5
- 在 `src/lib/modules.ts` 注册 SVG 模块定义
- 在 `src/data/roadmap.json` Phase 2 Web 基础中插入 SVG

### v1.1.0（2026-06-24）

- FANDEX 线上学习平台正式发行版
- 51 模块 1995 篇文档，浏览器直接访问
- 交互测验、知识地图、全文搜索、学习路线、标签索引
- 进度追踪、术语悬浮、暗色模式、响应式布局
- 首页改造为 FANDEX 生态门户，三项目联动入口
- 程序图标字母 F（favicon.svg + logo-mark 方块样式）

---

## 版本规则

| 级别       | 版本号变化         | Changesets 对应 | 适用场景                            |
| :--------- | :----------------- | :-------------- | :---------------------------------- |
| 大版本更新 | `1.x.x` -> `2.x.x` | `major`         | 新模块、新功能、新页面增加及重构    |
| 小更新     | `1.0.x` -> `1.1.x` | `minor`         | 小 BUG 修复、文档纠错、按钮位置调整 |
| 补丁修复   | `1.x.0` -> `1.x.1` | `patch`         | 同一问题或其所属范围内的多次修复    |

## 后续版本管理

v2.0.0 之后的版本变更由 Changesets 自动维护：

1. PR 中通过 `npm run changeset` 添加变更声明
2. 合并至 `main` 后由维护者执行 `npm run changeset:version`
3. Changesets 自动更新 `package.json#version` 与本文件
4. 详细流程参见 [Changesets 流程说明](../.changeset/README.md)
