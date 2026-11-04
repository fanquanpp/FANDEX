# FANDEX web 第 2 期（构建期前后端分离 + 性能轮）子代理共用约束

版本：2026-11-05，架构师产出。本文件只做追加与显式重申，不改写第 1 期约束；两份文件冲突时以本文件为准（仅限本文件明确裁定之处）。
配套规格：`.workflow-tmp/pipeline-spec.md`（数据层与实施步骤），实施任务以该规格的步骤与验收口径为准。

## 0. 继承条款

`.workflow-tmp/uiux-run-constraints.md` 全量继续有效，尤其：

- 第 1 期规格 `.workflow-tmp/uiux-spec.md` 中已裁定终态的设计资产（fx 铁律、暗色纯黑灰板、令牌五档圆角、z-index 刻度、断点纪律、「仪器面板」语言、动效预算禁止清单）不得回退。
- 第 1 期规格 7.4 的 KaTeX `htmlAndMathml` 冲突裁定「不动」继续有效：任何任务不得触碰 astro.config.ts:115 的 output 配置行。
- mermaid 钉死项（layout dagre + look classic，src/lib/mermaid-render.ts）不动。

## 1. 分支 / PR / 推送策略（本轮硬规则）

- 工作分支固定 `feat/web-uiux-revamp-2026-10`，成品更新 **PR #142**（已实测 OPEN，head=该分支）。禁止另开新 PR；禁止直推 main（受保护）。
- 第 2 期全部完成后，由编排器按用户指令执行 merge main 与 GitHub Pages 部署；子代理一律不做合并与部署动作。
- 推送一律走 https 远端：`git push https://github.com/fanquanpp/FANDEX.git feat/web-uiux-revamp-2026-10`（或先 `git remote set-url --push origin https://github.com/fanquanpp/FANDEX.git`）。实测本仓 origin push 指向 `ssh://git@ssh.github.com:443/fanquanpp/FANDEX.git`，禁止用 ssh 推送。
- 提交信息 Conventional Commits + 中文描述（如 `perf(web): ...（UI/UX 改版第 2 期）`），延续第 1 期命名惯例；每步至少一个提交，便于逐步回滚。

## 2. 工具链（延续第 1 期 §1）

- pnpm 一律 `cmd /c npx pnpm@11.15.1 -C app-web <script>` 包装。
- npm 直连超时加 `--registry=https://registry.npmmirror.com`；Playwright 浏览器下载用 `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright`。
- Git Bash 坑：grep 是 ugrep 别名；终端中文显示 GBK 乱码（验证中文用 node 读字符串）；WebFetch 证书报错改 curl/gh api。
- 本机 4173 端口被另一项目进程占用（Vsinger 静态服务，勿杀）：本地 LHCI 用 `LHCI_PORT=4190 npx --yes @lhci/cli autorun --config=app-web/lighthouserc.json --collect.url=http://localhost:4190/FANDEX/...` 方式覆盖 URL（第 1 期实测有效）。

## 3. 第 2 期范围红线

- cnt-content/ 内容库与 app-Android-* 不动（content-sync.mjs 的自动规范化改写除外，它是既有 FIX 契约）。
- 令牌唯一真源流程不动：shd-shared/tokens/（DTCG）→ build:css → 手工同步 app-web/src/styles/shared/tokens.css；check-tokens-drift 门禁保持挂在 dev/build 双链。
- fx 铁律不动（唯一背景层 SceneBackdrop z-index:-1；letter-glitch 参数终态）。
- hover 预取策略不动（astro.config.ts:74-81 注释已论证弱网危害，第 1 期规格 1.3.8 裁定）。
- KaTeX 字体裁剪脚本 prune-katex-fonts.mjs 不动；KaTeX css 仅 [module]/[slug].astro:3 引入的现状不动。
- 不引入 3D 运行时 / gsap / tsparticles / 全站 motion runtime（第 1 期规格 7.2 放弃清单继续有效）。
- 客户端运行时依赖净增 = 0（第 2 期唯一新增依赖是 devDependency `@shikijs/transformers`，钉 4.5.0，经 pnpm-workspace.yaml catalog 声明）。

## 4. 数据层纪律（本轮新增，核心）

1. **派生产物不提交**：`app-web/src/data/*.json`、`app-web/public/data/**`、`app-web/public/syntax-data/**` 一律 gitignore。第 1 期已入库的生成物（doc-index.json、syntax-index.json、syntax-data/ 14 文件）在本轮 `git rm --cached` 移出索引。`node_modules/.cache/**`（仓库根）天然不入库（根 .gitignore:65 的 node_modules/ 已覆盖）。
2. **产物缓存区**：所有数据产物唯一落盘真源在仓库根 `node_modules/.cache/fandex-data/`（gitignored）；`app-web/src/data/`（构建期 import 通道）与 `app-web/public/data/`（运行时 fetch 通道）只是发布通道副本，由生产者脚本按内容哈希 writeIfChanged 同步，人手不得直接改这三处。
3. **schema 版本化**：缓存清单 manifest.json 记录每个产物的 schemaVersion 与内容哈希；产物 schema 任何不兼容变更必须 bump 版本并清空缓存目录重建。发布通道文件保持既有 payload 形状（doc-index = 裸数组，qa-check.mjs:124-135 依赖此形状），版本信息只进 manifest。
4. **缓存键 = 内容哈希**：任何增量缓存键必须由输入内容（文件文本/元数据）派生，禁止 mtime/时间戳派生；内容变更必须使产物失效（不允许只按文件名或路径缓存）。时间戳类不稳定字段（如 doc-stats 的 generatedAt，现 build-stats.mjs:87）从产物中移除或改为内容派生，保证同输入同输出。
5. **生产者单写权**：scripts/ 下生产者脚本只写「缓存区 + 各自发布通道」，不得写其他工作树文件；content-sync.mjs 的 FIX 模式（改写 cnt-content frontmatter/modules.json/learning-path 骨架）是唯一例外，为既有契约。
6. **dev/build 双链同步**：package.json:15（dev）与 :16（build）的前置步骤链必须同步调整，单入口 script 名不变；dev 与 build 的数据前置段产出必须一致（同一套缓存键）。
7. **脚本顺序依赖保持**：content-sync（重建 shd-shared/metadata/modules.json）必须先于 build-syntax（读 modules.json 色表/排序，build-syntax.mjs:10,61-74）与 build-stats；此顺序在两条链中都不得打乱。
8. **mermaid 缓存契约**：render-mermaid.mjs 与 src/plugins/rehype-mermaid-dual.ts 的 canonicalSource 必须逐字一致（后者 151-167 行），缓存目录定位算法（rehype-mermaid-dual.ts:39-51 从 cwd 上溯 pnpm-workspace.yaml）不得改动；主构建不起 Chromium 的现状保持。

## 5. 前端工程规矩（重申，防新任务漏看）

- Astro 7 预渲染期求值页面脚本：新增客户端 lib 顶层 DOM 访问必须加 `if (!import.meta.env.SSR && typeof document !== 'undefined')` 守卫。
- island 组件无 props 必须写空接口（`Record<string, never>` 会被 client:* 拒绝）。
- 站点 base /FANDEX/：绝对链接一律 `new URL(path, Astro.site).href`；岛屿运行时 fetch 用 `import.meta.env.BASE_URL` 拼接（参照 SyntaxExplorer.tsx:208 的 `${base}syntax-data/${id}.json` 模式）；文档正文根相对 /module/slug。
- dev 路由必须尾斜杠（无斜杠 404）。
- astro:before-swap 清理用 Set 登记模式（src/lib/mermaid-render.ts、stat-count-up 先例）。
- 侧栏类文档页脚本改写注意：rolldown 可能整树摇掉纯副作用导入——功能缺失先 grep 产物 HTML 再查 JS 资产。
- dialog 自定义 display 必须显式关闭态 display:none 与 [open]{display:flex}。
- 禁止 hover 改写 animation-duration；一切新动效尊重 global.css:101-105 全局 reduced-motion 兜底，单文件不重复写 @media。

## 6. 断点纪律

- 规范档：移动 <768 / 平板 768-1023 / 桌面 >=1024；成对查询互补（767.98px vs 768px、1023px vs 1024px）；恰 768px 与恰 1024px 整数宽走桌面档。
- 本轮所有带响应式的改动，视检必须覆盖恰 768px（历史上错过）；涉及双列/折叠布局的加测恰 1024px。

## 7. 输出纪律

- 全量禁 emoji 及变体选择器（含 U+2713 U+26A0 U+2605 U+2630 U+FE0F）；允许纯文本箭头与数学符号（← → ↓ × ≡）。
- 抽检命令（新增文件收尾必跑）：
  `node -e "process.exit(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(require('fs').readFileSync(process.argv[1],'utf8'))?1:0)" <file>`

## 8. 门禁清单（按强度排序，每步收尾至少跑前三项；阶段收尾全跑）

1. `cmd /c npx pnpm@11.15.1 -C app-web lint`（0 错误放行）
2. `cmd /c npx pnpm@11.15.1 -C app-web typecheck`（0 错误放行；注意数据产物 gitignore 后，typecheck 前必须已跑过数据前置段——CI deploy.yml 顺序为 build-stats 先于 typecheck，保持）
3. `cmd /c npx pnpm@11.15.1 -C app-web qa`（0 errors）
4. `cmd /c npx pnpm@11.15.1 -C app-web build`（全绿，含 tokens-drift 与 pagefind）
5. `cmd /c npx pnpm@11.15.1 -C app-web exec playwright test`（冒烟 6 用例，跑前需 build；无头 Chrome 截图须独立 --user-data-dir）
6. LHCI 三 URL（lighthouserc.json 原生 4173 被占时按 §2 换 4190 + collect.url 覆盖）：perf >= 0.85 error 档不破。

audit:content / audit:learning-path 仅内容变更相关，本轮一般无需；数据层改到 learning-path 产物时加跑 audit:learning-path。

## 9. 视检验证协议（每个 UI 相关任务收尾必须执行）

- 首选 Playwright 无头 chromium；dist 用 scripts/lhci-server.mjs 或 astro preview，迭代轮用 astro dev（端口 3000，路由带尾斜杠）。
- 截图前先注销 SW 与清缓存：页内 `navigator.serviceWorker.getRegistrations()` 全 unregister + `caches.keys()` 全删 + reload，否则新旧混存假阴性。
- 逐页 goto → 核对 URL → DOM 探针 → 截图；明暗两套（[data-theme]/localStorage）。
- 视口规格：桌面 1440x900；移动 375x1700（加高视口规避 fullPage 合成假象）；响应式断点加测恰 768px 与恰 1024px。
- setViewportSize 不派发 resize 事件，resize 依赖逻辑手动 dispatchEvent；标签页状态在调用间重置，每单元格完成 goto→探查→截图全流程。
- 截图存 `.workflow-tmp/shots/`（gitignored）。

## 10. 与第 1 期约束的关系说明

第 1 期约束文件不修改不废弃；本轮子代理开工前两份都读。第 1 期约束中「doc-index.json 随提交带上无妨」一条自本轮起被第 4 节第 1 条替代（改为不提交）——这是本轮显式裁定，不算冲突。
