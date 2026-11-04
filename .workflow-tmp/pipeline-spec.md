# FANDEX web 第 2 期规格：构建期「内容后端」与「站点前端」分离（数据层与实施步骤）

版本：v1（2026-11-05，架构师产出）
依据：`.workflow-tmp/pipeline-constraints.md`（本轮约束）+ `.workflow-tmp/uiux-run-constraints.md`（第 1 期硬约束，继续有效）+ 第 1 期规格遗留项（uiux-spec.md 2.6 代码块 SSR 化）+ 勘察事实（scripts 全量审读）+ 性能基线（LHCI 0.99 / 首页关键路径 JS 113.8KB gzip）+ 本轮实测（第 6 节）。
性质约束：每条可实施、可验证；与约束冲突处如实标注（见 11.2 缓议清单）。

---

## 1. 现状问题（全部有 path:line 或实测证据）

P1 产物落盘双轨混乱：build-stats.mjs:8-9 把两个产物写进 app-web/src/data/，其中 doc-stats.json gitignored（app-web/.gitignore:51）而 doc-index.json 入库；build-syntax.mjs:11-12 把 syntax-index.json 与 public/syntax-data/ 14 文件（实测合计约 764KB）全部入库。派生产物入库 = PR diff 噪音 + 仓库负担 + 「真源」歧义。

P2 dev 启动每次付全价：package.json:15 dev 链 = content-sync（FIX，实测 --check 8389ms，大头是 85-110 行全量 git log）+ check-tokens-drift（147ms）+ build-stats（793ms，O(n) 读 2083 文件）+ build-syntax（6253ms，shiki 加载 16 语言全量重建）。合计约 15.6s 才起 astro dev；且 dev 链会改写工作树。

P3 岛屿数据整包内联：SidebarModules.tsx:12 静态 import doc-index.json（实测 221184 B），打包进「全部模块」面板岛（sidebar-modules-mount.ts:5 注明约 187KB 原始/70KB gzip，现态 216KB/约 70KB gz）；用户首次打开面板即拉全量 2083 条，实际只需要所展开模块的条目。

P4 CI 无产物缓存：deploy.yml:42-99 无任何 actions/cache 步骤，每次部署对 1033 张图 x2 主题全量重渲（render-mermaid 脚本本身已按内容哈希增量，render-mermaid.mjs:79-86 cacheKey，但缓存目录 node_modules/.cache/mermaid-dual 每次 CI 从零开始）；timeout 40min（deploy.yml:46）。

P5 学习路径消费端 48 连静态 import：src/lib/learning-path.ts:6-55 import 47 张地图 + index，56 行 import doc-index，构建期在内存做 slug→href 解析（138-143 docTitleMap）；同一份解析逻辑无法被审计脚本复用，产物无版本无哈希。

P6 脚本间无统一缓存设施：各脚本各写各的（mermaid 有哈希缓存，build-syntax/build-stats/content-sync 无）；「缓存目录如何定位仓库根」的算法只存在于 TS 插件（rehype-mermaid-dual.ts:39-51），mjs 脚本侧无共享实现。

## 2. 目标架构：内容后端 → 产物缓存 → 发布通道 → 站点前端

```
[内容后端]                          [产物缓存区]                    [发布通道]                      [站点前端]
cnt-content/full ──> content-sync ──> shd-shared/metadata（真源，入库）  │
cnt-content/full ──> build-stats ───> node_modules/.cache/fandex-data/ ──> app-web/src/data/*.json ──> astro build 静态 import（SSR）
cnt-content/syntax ─> build-syntax ─>   manifest.json（版本+哈希）   ──> app-web/public/data/**      ──> 岛屿运行时 fetch
shd-shared/metadata/learning-path → build-learning-path ─>             │
cnt-content/full ──> render-mermaid -> node_modules/.cache/mermaid-dual/（独立缓存区，契约不变）
```

原则：

- 内容后端（scripts/ + cnt-content + shd-shared/metadata）是唯一生产者；站点前端（astro build）是只读消费者，不感知内容库细节。
- 缓存区是产物的唯一真源；发布通道是缓存区的按需副本（writeIfChanged 同步，字节相同则跳写——本轮实测 build-stats/build-syntax 重跑后 git status 干净，证明产物确定性达标）。
- 三个产物消费场景明确分离：SSR 构建期读 src/data/（Vite 静态 import，随构建打包）；浏览器运行时读 public/data/（BASE 相对 fetch，按需）；审计与门禁读缓存区 manifest 对账。

## 3. 产物登记表（schema / 缓存键 / 落盘 / 消费者 / 失效）

统一约定：缓存区目录 `node_modules/.cache/fandex-data/<product>/v<N>/`；manifest.json 记录 `{ product, schemaVersion, inputsHash, writtenAt }`；发布通道文件保持既有 payload 形状（版本信息只进 manifest，不进 payload——qa-check.mjs:124-135 依赖 doc-index 是裸数组，doc-service.ts:82-92 依赖 doc-stats 三字段）。

### 3.1 doc-index（文档索引）

- schema：payload = `Array<{ slug: string; module: string; title: string; order: number }>`（与现态 build-stats.mjs:64-69 完全一致，不兼容变更不允许）。
- 缓存键（doc-index 与 doc-stats 共享，一次哈希覆盖两产物）：`sha256(JSON.stringify({ totals, sortedRecords }))`，其中 totals = `{ totalDocs, totalModules, totalCategories }`、sortedRecords = 解析后的 doc-index 记录数组。**不能只用记录数组哈希**：totalDocs = files.length（build-stats.mjs:48,84，collectMarkdownFiles 统计全部 .md/.mdx，含无 module 的文件与下划线前缀目录），totalCategories 来自独立的 categorySet（build-stats.mjs:59-60，category 字段不在记录数组内）——无 module 文件的增删或 category 变更会改 stats 而记录数组不变，仅按数组哈希会漏失效。frontmatter 变更必然改变该组合串，满足「内容变更必须失效」。源文件级哈希不采用（解析即全量、无节省）。
- 落盘：缓存区 doc-index/v2/payload.json（含 envelope）→ 发布通道 src/data/doc-index.json（裸数组）+ public/data/doc-index/{module}.json 每模块分块 `{ module, docs: [{slug,title,order}] }`（48 个文件，实测模块数 48，doc-stats.json:3）。
- 消费者：SSR = doc-service.ts:5（getDocsIndex）、src/lib/learning-path.ts:56（docTitleMap）；运行时 = SidebarModules 岛按模块 fetch 分块（见 7.3）；门禁 = qa-check.mjs:124-135 模块一致性对账（不改）。
- 失效：任一文档 frontmatter 变 → 记录数组变 → 全量重建（O(n) 793ms 实测，无需文件级增量）。

### 3.2 doc-stats（统计）

- schema：`{ totalDocs: number; totalModules: number; totalCategories: number }`。**移除 generatedAt 字段**（build-stats.mjs:87 现写 new Date().toISOString()；实测唯一消费者 doc-service.ts:82-92 只读三个计数器，grep src/ 无其他 generatedAt 消费）——这是让 doc-stats 变成内容稳定产物的先决条件。
- 缓存键：同 3.1（同一次扫描派生，与 doc-index 共享一次解析遍历，脚本内合并产出）。
- 落盘：缓存区 doc-stats/v2/ → 发布通道 src/data/doc-stats.json（保持 gitignored）。

### 3.3 syntax-index 与 syntax-data/{lang}.json（语法库）

- schema：syntax-index 保持 `{ version: 2, languages: [...] }`（build-syntax.mjs:241-244）；分块保持 `{ module, cards }`（:252）。payload 形状不变，本轮只改缓存与增量。
- 缓存键（per 语言文件夹）：`sha256(该文件夹全部 .md 文本拼接 + byId.get(moduleId) 完整切片（title/icon/categories/folder_order，build-syntax.mjs:196-203 全部消费字段）+ modules.json 的 categoryColors + SHIKI_LANG_ALIAS + shiki 版本号 + PRODUCER_VERSION)`。shiki 版本号取值来源钉死：JSON.parse 读 `node_modules/shiki/package.json` 的 version 字段（评审 N-(b)：勿用 import 断言，脚本为 mjs 直读文件即可）。两项完整性要求：
  1. 模块切片必须是 get(moduleId) 的完整对象而非仅色表——语言 meta 的 title/icon（build-syntax.mjs:200-201）与 color（:196-197 经 categories[0] 派生）都进产物，modules.json 改 title/icon/categories 时必须失效。
  2. 键必须含 `PRODUCER_VERSION` 常量（各生产者脚本顶部自定义的常量，初值 1，与 §4 条 5 约定一致）：键是输入文本哈希，提取逻辑本身不在键内——MAX_CODE_LINES/MAX_CODE_CHARS（build-syntax.mjs:31-32）、parseSyntaxPoints 的名称清洗正则（:142）、remark-parse 升级都会改输出而缓存仍命中；逻辑变更时人工 bump PRODUCER_VERSION。
  文件夹内容变 → 该语言失效重算（含 shiki 高亮，最贵段）；modules.json 相关切片变 → 该语言（色表则全部语言）失效。
- 落盘：缓存区 syntax/{lang}/v2/ → 发布通道 src/data/syntax-index.json + public/syntax-data/{lang}.json；重建时改为逐文件 writeIfChanged，删除 build-syntax.mjs:246 的 rmSync 整目录重建（防未变更文件被无谓触碰）。
- 消费者：syntax-service.ts:2（SSR 索引）、SyntaxExplorer.tsx:208（运行时按语言 fetch）。

### 3.4 learning-path-resolved（学习路径解析产物，base 中立）

- schema：`v1 = { index: string[], maps: Record<techId, ResolvedMap> }`。ResolvedMap 的 module/title/icon/summary/color/officialDocs/stages/stats 与现 LearningPathTechVM（src/lib/learning-path.ts:79-88）一致，但 **nodes 不烘 href**：含 `doc` 引用的节点存 `docRef: { module, slug, docTitle }`（docTitle 依赖 doc-index，已在键内，可烘；href 依赖 base，不烘）。
- **为什么 base 必须不烘（评审 MF2 裁定，采纳方案 (a)）**：href 现按调用方传入的 base 烘进 VM（learning-path.ts:183 `vm.href = \`${base}${module}/${node.doc}/\``，调用点 [tech]/index.astro:20 `import.meta.env.BASE_URL`、:26/:33）；而桌面端构建以 `DESKTOP_BUILD=1` 跑同一条 `pnpm --filter @fandex/web build`（build-desktop.mjs:12-15 直接调用；build-portable.mjs:21-24 经 tauri build 间接），base 切换为 `/`（astro.config.ts:21）——若产物烘 href 且键不含 base，桌面构建会命中 web 键的缓存产物，全站学习路径链接带错 /FANDEX/ 前缀。方案 (a) 产物 base 中立后，web/桌面双构建天然共享同一缓存，键无需含 base；方案 (b)（SITE_BASE 纳入键）被否决，理由：同一台机器先后跑两种构建会互相踢缓存，等效于零缓存。
- 生产者：新脚本 `scripts/build-learning-path.mjs`。解析逻辑从 src/lib/learning-path.ts 移植为 mjs 单一实现：输入 = shd-shared/metadata/learning-path/*.json + modules.json + doc-index 产物；title/icon/color/officialDocs 的派生（learning-path.ts:162-196 经 getModule/categoryColors/getPrimaryCategory，最终源是 modules.json）与 docTitle join（:184）在构建期完成；href 拼接留在 SSR 侧。
- src/lib/learning-path.ts 变薄：删除 48 连 import（:6-55）与 docIndex import（:56）及内联 docTitleMap（:138-143），改为 import 产物 + `getLearningPathTechVM(module, base)` 签名不变（:157-160）——内部仅做 docRef→href 拼接（`\`${base}${module}/${docRef.slug}/\``，与 :183 现式一致），调用点 [tech]/index.astro 与岛 props 契约零变更。
- 缓存键：`sha256(learning-path 目录全部 json 拼接 + modules.json 全文 + doc-index 产物 inputsHash + PRODUCER_VERSION)`。modules.json 必须在键内：产物的 title/icon/color/officialDocs 全部派生自它，content-sync 同链先行重写 modules.json（content-sync.mjs:478）时若不失效产物，学习路径页 meta 陈旧。
- 落盘：缓存区 learning-path/v1/ → 发布通道 src/data/learning-path-resolved.json。
- 消费者：src/lib/learning-path.ts（SSR，供 learning-path/index.astro 与 [tech]/index.astro:130 的岛 props）；audit-learning-path.mjs 继续直接读 shd-shared 源目录（审计职责不变）。
- 等价校验（移植验收，通过后删除临时脚本）：产物 + SSR 拼接后的最终 VM（含 href）对全部 48 个 tech 与旧实现输出 deep-equal。
- 价值定性：SSR 性能中性（build 期成本不变量级），收益是消费图简化（49 个 import → 1 个）、产物进版本化缓存体系、base 中立使 web/桌面双构建共享缓存、岛 props 契约显式化。

### 3.5 mermaid-dual（既有，只做 CI 持久化，不改本地契约）

- 缓存键不变（render-mermaid.mjs:79-86 = sha256(version+theme+canonicalSource)，canonicalSource 与 rehype-mermaid-dual.ts:151-167 逐字一致）。
- 落盘不变（node_modules/.cache/mermaid-dual/{light|dark}-{hash}.svg）。
- 新增：deploy.yml 与 lighthouse.yml 各加一步 actions/cache@v4（详见 S5）。本地实测热缓存 `--check` 642ms 报告待渲染 0/0，即 CI 命中后的目标态。

## 4. 缓存基座 scripts/lib/data-cache.mjs（新建）

API（mjs，node 22，无新依赖）：

- `resolveCacheRoot(): string` —— 从 cwd 上溯找 pnpm-workspace.yaml 定位仓库根（与 rehype-mermaid-dual.ts:39-51 同算法，注释互相引用声明「两份实现必须同步」；不合并 TS/mjs 是刻意取舍，插件在打包环境取值受限）。
- `loadManifest(product): { schemaVersion, inputsHash } | null`
- `isFresh(product, inputsHash): boolean` —— inputsHash 一致且发布通道文件存在才算新鲜。
- `writeProduct(product, { envelope, publish: Array<{path, content}> })` —— 对每个发布文件 writeIfChanged（内容字节相同跳写，保证 git status 干净与 Vite 缓存不被无谓失效）；写前 mkdir -p；写后更新 manifest（含 schemaVersion、inputsHash）。
- `sweepCache(product, keepVersion)` —— 清理旧版本目录。
- `PRODUCER_VERSION` 约定：每个生产者在脚本顶部定义本常量并纳入缓存键（3.3/3.4）；键只覆盖「输入内容」，不覆盖「生产逻辑」——提取规则、清洗正则、上游解析器（remark-parse/shiki）变更时必须人工 bump，否则旧逻辑产物被新键命中的旧值覆盖（评审 MF3）。
- CLI 约定：所有生产者支持 `--rebuild`（无视缓存全量）与 `--check`（只报告待算项，零写入；content-sync 已有同名语义，content-sync.mjs:627-632）。
- 失效兜底：manifest 缺失/损坏/schemaVersion 不匹配 → 视为不新鲜，走全量重建路径（永远保留全量能力：清空缓存目录 = 回到现状行为）。

## 5. 增量策略逐脚本

### 5.1 content-sync.mjs（最大头，实测 8389ms）

- 成本结构：85-110 行 loadGitDates 全量 `git log --pretty=format:@%cs --name-only`（全库历史）是大头；扫描 48 模块/2083 文档为线性可比部分（survey 裁定跨文件一致性使文档级增量不可靠，不采用）。
- 增量方案（git-dates 缓存）：
  1. 缓存区存 `{ headAtBuild: <完整 HEAD hash>, map: { path: date } }`。
  2. 命中条件：`git merge-base --is-ancestor headAtBuild HEAD` 为真（保证历史是线性追加，rebase/amend 破坏祖先关系即回退全量）。
  3. 命中时增量执行 **`git log --pretty=format:@%cs --name-only headAtBuild..HEAD`**（提交范围语法，本轮实测 exit 0、输出格式与 loadGitDates 期望一致），区间结果与缓存 map 按 **max 合并**：`map[path] = max(缓存值, 区间首现值)`，仅当区间首现值更大才覆盖。**禁止「新覆盖旧」**（评审 MF6）：全量算法的首现语义（content-sync.mjs:96 `!map.has(t)` 即 set）建立在全历史 newest-first 遍历之上——路径 P 的全量首现日期 = 全历史中触碰 P 的最新提交日；headAtBuild 为 HEAD 祖先时全历史 = 旧历史 ∪ 区间，故等价增量语义是 max 合并，而非覆盖。反例（真实可达）：路径 P 在 main 上 11-01 被触碰（已入缓存），PR 分支 10-20 也触碰 P 后经 merge 送入区间——区间首现 P = 10-20 < 11-04，「新覆盖旧」把 map[P] 降级为 10-20，全量 log 给 11-04，updated 失真。危害边界：content-sync.mjs:241-244 的手写守卫（frontmatter 已携带更大值时保留）只在本地手改过 frontmatter 时缓解；CI sync 改树不提交，frontmatter 未携带大值时会写入偏旧 updated，污染文档页「更新于」渲染（content-sync.mjs:571-572 gitDate ?? today() 消费同一 map）。**禁止用 `--since=<newestDate>`**：merge 送入的分支提交若提交日期早于缓存内最新日期，--since 会整段漏掉（评审 MF4）；范围语法在「祖先为真」前提下按拓扑穷举区间内全部提交，无日期边界解释问题。
  4. 任何一步不满足（浅克隆、空历史、祖先校验失败）→ 全量 log 回退（现有 104-108 行硬失败守卫保持：空表 + .git 存在即 exit 1，fetch-depth: 0 仍是 deploy.yml:51 硬前提）。
- 输出端：modules.json、learning-path 骨架、frontmatter 改写全部套 writeIfChanged 语义（同步态下 report 全 0 处时零磁盘写）；`--check` 语义不变。
- 目标：热缓存下 dev 链中该步 ≤ 2s；冷态不劣化（≤ 9s）。

### 5.2 build-stats.mjs

- 合并产出 doc-index + doc-stats（一次遍历），接入 data-cache 基座；共享键 = `sha256(JSON.stringify({totals, sortedRecords}))`（3.1，评审 MF5 修正：totals 与记录数组必须同键，缺一会漏失效）。793ms 全量已是秒级，增量收益以「跳过发布通道写盘 + Vite 缓存不失效」为主。
- 同步产出 public/data/doc-index/ 分块（48 文件，每模块一文件）。

### 5.3 build-syntax.mjs（次大头，实测 6253ms）

- 按语言分块缓存（3.3 键）；未失效语言直接从缓存区拷贝分块并复用索引元信息，跳过 remark 解析与 shiki 高亮。
- 保持排在 content-sync 之后（读 modules.json）；LANGUAGE_FOLDERS 硬编码映射不扩（survey risk 已警示漏改静默，本轮不修该债，仅在缓存键注释中重申）。
- 目标：热缓存下 ≤ 1.5s（shiki highlighter 加载仍在，仅跳过重高亮；若 shiki 空加载占大头，允许把 createHighlighter 延迟到首个失效语言时惰性创建）。

### 5.4 check-tokens-drift.mjs / render-mermaid.mjs / 其余

- check-tokens-drift 147ms 纯比对，不增量化（survey 裁定维持）。
- render-mermaid 本地契约不动；CI 缓存步见 S5。
- clean-prerender / prune-katex-fonts / content-audit / pagefind 不适用增量（survey 裁定）。

## 6. 本轮实测基线（2026-11-05，仓库根/相对 app-web 执行）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| content-sync --check | `node scripts/content-sync.mjs --check` | 模块 48 / 文档 0 处补全 / 耗时 8247ms（wall 8389ms） |
| build-stats | `node scripts/build-stats.mjs` | 793ms；重跑后 `git status --short` 干净（产物确定性实证） |
| build-syntax | `node scripts/build-syntax.mjs` | 6253ms；重跑后 git status 干净 |
| check-tokens-drift | `node scripts/check-tokens-drift.mjs` | 147ms |
| render-mermaid --check | `node scripts/render-mermaid.mjs --check` | 1033 张图 / 待渲染 light 0 dark 0，642ms（缓存全命中态） |
| dist 数据体量 | `wc -c src/data/*.json public/syntax-data/javascript.json` | doc-index 221184 B / doc-stats 115 B / syntax-index 1251 B / 单语言分块 541484 B |
| island 挂载点 | grep client: | 6 处：DesignSystemDemo(client:visible)、FrontendLab(client:load)、SyntaxExplorer(client:visible)、LearningPathMap(client:load)、WebVitalsTracker(client:idle, BaseLayout.astro:93)、ThemeToggle(client:load, SiteHeader.astro:115)；SiteHeader 被 Layout.astro 与 HomeLayout.astro 双消费 → ThemeToggle/WebVitalsTracker 覆盖全部页面 |
| 字体 metric fallback | grep size-adjust public/fonts/fonts.css | 零命中（第 1 期规格 5.1.4 的 IBM Plex metric fallback 未落地，遗留可做） |
| PR 状态 | `gh pr view 142 --json state,title,headRefName` | OPEN / feat(web): 全站 UI/UX 深度改版（第 1 期）/ feat/web-uiux-revamp-2026-10 |
| push 远端 | `git remote -v` | fetch=https://github.com/fanquanpp/FANDEX.git，push=ssh://git@ssh.github.com:443/...（约束 §1 据此成文） |
| 评审证据复核（v1.1） | `grep resolveJsonModule app-web/tsconfig.json tsconfig.json`；`head -5 app-web/src/services/syntax-service.ts`；`git ls-files app-web/src/data`；`sed -n '1,30p' app-desktop/build-desktop.mjs`；`sed -n '150,200p' app-web/src/lib/learning-path.ts`；`grep -n "base" [tech]/index.astro`；`sed -n '55,80p' lighthouse.yml`；`git log --pretty=format:@%cs --name-only HEAD~3..HEAD` | tsconfig 两处 resolveJsonModule:true（app-web:12、根:18）；syntax-index 唯一消费 syntax-service.ts:2；src/data/ 下 algo-problems/ 8 个被跟踪 .ts（禁递归 glob 依据）；build-desktop.mjs:12-15 DESKTOP_BUILD=1 直调 `pnpm --filter @fandex/web build`；learning-path.ts:183 href=`${base}${module}/${node.doc}/`、[tech]/index.astro:20 BASE_URL/:26/:33 传参；lighthouse.yml 无 typecheck 步、Build web project 步自含全链；git 范围 log 语法 exit 0（MF4 修复形态实证） |

性能基线（ask 给定）：LHCI 均值 0.99（/ 1.00、/markdown/ 0.98、/syntax/ 1.00）；首页关键路径 JS gzip 113.8KB，其中最大件 client.D0RgnaJv.js 62.8KB（react-dom 调度器 + 水合运行时）、i18n 16.2KB、fx 9.0KB、ClientRouter 4.6KB、WebVitalsTracker 3.4KB。

## 7. web 构建只读消费接线

### 7.1 构建期通道（src/data/，全部 gitignored）

- src/ 侧静态 import 的全部产物（评审 MF1 清点，grep 证实消费点无遗漏）：
  | 产物 | src/ 消费点 |
  | --- | --- |
  | doc-stats.json | doc-service.ts:4（唯一） |
  | doc-index.json | doc-service.ts:5、src/lib/learning-path.ts:56、src/islands/SidebarModules.tsx:12（S2 改 fetch）、qa-check.mjs:125（对账） |
  | syntax-index.json | syntax-service.ts:2（唯一） |
  | learning-path-resolved.json（新增） | src/lib/learning-path.ts（S2 起唯一） |
- **CI 硬性前置（评审 MF1，机制推理：resolveJsonModule=true 见 app-web/tsconfig.json:12 与根 tsconfig.json:18，产物移出索引后 fresh checkout 缺文件，astro check 报 TS2307）**：deploy.yml 现顺序为 sync(:72) → content-audit(:75) → build-stats(:78) → typecheck(:81) → lint(:84) → build:web(:87)——typecheck 在 build:web 之前，而 build-syntax/build-learning-path 只在 build:web 链内。S1 提交必须同步在 deploy.yml 的 typecheck 步之前补齐数据前置链：build-stats 之后显式插入 `build-syntax` 与 `build-learning-path` 两步（或一条数据前置链步串跑 build-stats + build-syntax + build-learning-path）。这是 S1 的验收项，不是 S5 的可选项。lighthouse.yml 不受影响：无 typecheck 步，`pnpm build:web`（lighthouse.yml 的 Build web project 步）自含全链。
- 本地裸跑 typecheck 同理：必须先跑数据前置链（pnpm dev 或逐脚本），缺产物即 TS2307。
- git 操作：`git rm --cached app-web/src/data/doc-index.json app-web/src/data/syntax-index.json app-web/public/syntax-data/*.json`（保留工作区文件）。.gitignore 追加落点钉死（评审 OR2）：改 **app-web/.gitignore**，追加三条精确模式 `src/data/*.json`、`public/data/`、`public/syntax-data/`；**禁止递归 glob**（`src/data/**` 会波及被跟踪源码——git ls-files 实测 src/data/ 下有 algo-problems/ 8 个 .ts 源文件）；app-web/.gitignore:51 现有 `src/data/doc-stats.json` 行随之冗余，同提交删除。qa-check.mjs:124-135 读的是磁盘文件（非 git），不受影响。

### 7.2 运行时通道（public/data/，gitignored）

- 新通道 `public/data/doc-index/{module}.json`；URL 构造统一 `${import.meta.env.BASE_URL}data/doc-index/${moduleId}.json`（BASE_URL 以斜杠结尾，SyntaxExplorer.tsx:208 先例；DESKTOP_BUILD 双态 base 由 astro.config.ts:21 决定，勿手拼 /FANDEX/）。
- pagefind 只索引 HTML，JSON 资源进 dist 不污染搜索索引（public/syntax-data 现态已是同模式，构建与搜索无异常）。

### 7.3 SidebarModules 岛改造（与数据层联动的运行时收益，最大单件）

- 现状：SidebarModules.tsx:12,56-64 静态 import 全量 doc-index（216KB/约 70KB gz）打包进岛 chunk；mount 已是懒边界（sidebar-modules-mount.ts:2-7），但首次开面板即拉全量。
- 改造：
  1. 岛删除 doc-index 静态 import。
  2. 模块行的「有文档」判定与展开箭头改用 counts 数据：Sidebar.astro 在 SSR 侧把 `Record<moduleId, count>`（48 条，约 1KB）序列化进挂载容器 data 属性（或直接由 props 传入，实任务取更简者）。
  3. 模块展开时才 fetch 该模块分块；成功渲染列表，失败显示一行「列表加载失败，点击重试」（重试 = 重新 fetch），console.warn 记录；fetch 内联 1KB 级 JS 并入现有岛代码。
  4. 展开态持久化（MODULE_EXPANDED_KEY）与当前项高亮逻辑不动。
- 验收：dist 岛 chunk 中 grep 不到 doc-index 数据特征（如任一长 slug 字符串）；面板打开时网络面板只出现被展开模块的分块请求；关 JS 时侧栏模块行仍可导航（数据仅影响展开列表——与现状一致，现状关 JS 岛本就不挂载）。

## 8. pnpm dev / build 契约（保持单入口）

- `pnpm -C app-web dev`（package.json:15）script 名与调用方式不变，内部链调整为：content-sync → check-tokens-drift → build-stats（含 doc-index 分块）→ build-syntax → build-learning-path → astro dev。加速全部来自脚本内部缓存，不拆 script、不加新入口。
- `pnpm -C app-web build`（:16）保持单一入口，内部链调整为：render-mermaid → content-sync → check-tokens-drift → build-stats → build-syntax → build-learning-path → astro build → clean-prerender → prune-katex-fonts → pagefind。顺序依赖（5.1-5.3）在两条链中一致。
- CI 对齐（评审 MF1 钉死，非取舍）：deploy.yml sync(:72) / content-audit(:75) / build-stats(:78) 三步保留；**S1 提交必须在 typecheck(:81) 之前插入 build-syntax 与 build-learning-path 两个显式独立步**（插在 build-stats 之后，与 build-stats 同级，便于日志定位）——否则产物移出索引后 fresh checkout 的 typecheck 必红（7.1）。mermaid 缓存步属 S5。
- dev 双链漂移防线：qa-check 增补一条「manifest 与发布通道一致性」检查（S5），dev 与 build 任一链漏跑前置都会在 qa 显式报错而非静默产出旧数据。

## 9. 回滚矩阵

| 步骤 | 回滚方式 | 代价 |
| --- | --- | --- |
| S1 产物层与缓存 | `git revert` 该步提交；缓存区 `rm -rf node_modules/.cache/fandex-data`（纯缓存，重建=现状全量路径，永远保留） | 零风险；旧脚本回滚后仍写旧路径 |
| S2 消费接线 | revert；被 `git rm --cached` 的文件随 revert 恢复入库（git revert 自动还原索引变更） | doc-index.json 回到第 1 期入库态 |
| S3 代码块 SSR 化 | revert；layout-interactions.ts:179-247 的 initCopyButtons DOM 改写恢复 | 客户端改写回归，无数据影响 |
| S4 运行时批次 | revert；ThemeToggle/WebVitalsTracker 恢复 client:load/client:idle 岛 | 岛点位回 6 |
| S5 CI 缓存与门禁 | revert workflow yml；cache key 变化不影响正确性（miss 即全量） | CI 回到全量重渲 |

共同兜底：任何产物异常时 `node_modules/.cache/fandex-data` 整删 + 重跑数据前置段 = 回到无缓存全量行为；`--rebuild` 旗标单产物全量。

## 10. 实施步骤（S1-S5 串行，与 DesignMeta steps 一致）

**S1 data-layer（数据产物层与增量缓存）**
- 内容：新建 scripts/lib/data-cache.mjs（第 4 节 API，含 per-script PRODUCER_VERSION）；content-sync git-dates 增量改 headAtBuild..HEAD 范围语法（5.1，评审 MF4）+ writeIfChanged；build-stats 产物化 + 去 generatedAt + 共享键 {totals, sortedRecords}（3.1/3.2，评审 MF5）+ doc-index 分块产出；build-syntax per-语言键补完整模块切片与 PRODUCER_VERSION（3.3，评审 MF3）；新建 build-learning-path.mjs（产物 base 中立不烘 href、键含 modules.json，3.4，评审 MF2）+ 等价校验；git rm --cached 三类产物 + app-web/.gitignore 三条精确模式（7.1，评审 OR2）；deploy.yml 在 typecheck 前补 build-syntax 与 build-learning-path 显式步（7.1，评审 MF1）。
- paths：app-web/scripts/lib/data-cache.mjs（新）、app-web/scripts/content-sync.mjs、app-web/scripts/build-stats.mjs、app-web/scripts/build-syntax.mjs、app-web/scripts/build-learning-path.mjs（新）、app-web/package.json、app-web/.gitignore、app-web/src/data/*.json、app-web/public/data/、app-web/public/syntax-data/、.github/workflows/deploy.yml、shd-shared/（仅 content-sync 既有改写范围）。
- 验收口径：(a) 热缓存下数据前置段（content-sync + drift + stats + syntax + learning-path）计时 ≤ 5s，冷态（删缓存区）≤ 17s；(b) 连跑两轮前置段，第二轮对发布通道零写盘（writeIfChanged 生效，可用 fs watch 或 mtime 断言）；(c) 改动任一 cnt-content/full md 的 frontmatter 后重跑，doc-index 产物变化、syntax 其余语言缓存命中；(d) `git status --short` 干净（派生产物全部不入库）；(e) CI 缺产物场景本地模拟：删除发布通道产物文件后先跑数据前置链再跑 typecheck 通过（验证 MF1 修复链路；直接裸跑 typecheck 缺文件应报 TS2307 属预期）——S1 阶段删三个产物（doc-stats/doc-index/syntax-index）验证，learning-path-resolved 在 S1 尚无 src 消费者（其 import S2 才出现，删它不触发 TS2307），该部分在 S2 收尾复跑一次同场景；(f) learning-path 等价校验 48/48 deep-equal（产物 + SSR 拼接后含 href 的最终 VM）后删除校验脚本；(g) lint/typecheck/qa 三门禁 0 错。

**S2 consume-wiring（web 消费接线）**
- 内容：learning-path.ts 变薄换产物 import（3.4）——产物 base 中立，getLearningPathTechVM(module, base) 签名与调用点不变（[tech]/index.astro:20,26,33），SSR 侧仅做 docRef→href 拼接（评审 MF2）；SidebarModules 去 doc-index 静态 import + counts props + 展开时 fetch 分块 + 失败重试（7.3）；doc-service/syntax-service 适配确认（doc-stats 无 generatedAt 后类型同步）；qa-check 对 doc-index 对账路径确认不变。
- paths：app-web/src/lib/learning-path.ts、app-web/src/lib/sidebar-modules-mount.ts、app-web/src/islands/SidebarModules.tsx、app-web/src/components/Sidebar.astro、app-web/src/services/doc-service.ts、app-web/src/services/syntax-service.ts、app-web/src/data/*（生成物）。
- 验收口径：(a) 构建后 grep 文档页岛 chunk 无 doc-index 数据特征串；(b) dev 起服务，侧栏「全部模块」面板展开任一模块：网络面板出现对应分块请求且列表完整、失败路径注入故障显示重试行；(c) learning-path 总览与 3 张技术地图页 DOM/props 与改造前 deep-equal（SSR HTML diff 仅允许时间戳类零差异，实测应为零 diff）；(d) 三门禁 + build + 冒烟 6 用例全绿。

**S3 code-ssr（代码块 SSR 化 + Shiki transformers，第 1 期规格 2.6 遗留）**
- 内容：catalog 新增 @shikijs/transformers 4.5.0；新建 src/plugins/rehype-wrap-code-blocks.ts（仿 rehype-wrap-tables 模式，配置 astro.config 顶层显式传参）：输出 figure.code-block[data-lang] + 可选 .code-block__head（meta title）+ SSR copy 按钮，mermaid 块跳过（layout-interactions.ts:185 同款判断前移）；astro.config.ts shikiConfig 挂 transformerMetaHighlight / transformerNotationDiff / transformerNotationFocus / 自定义 title transformer（约 30 行）；删除 layout-interactions.ts:179-247 的 DOM 改写段，保留 document 级事件委托与 copied 反馈；code.css 头栏/行高亮（color-mix accent 12% + 2px 左刻度）/diff/focus 样式，角标 data-lang 退役，与 has-overflow 溢出遮罩联合回归。行号默认关，仅 meta 单块开启。
- paths：app-web/src/plugins/rehype-wrap-code-blocks.ts（新）、app-web/astro.config.ts、app-web/src/lib/layout-interactions.ts、app-web/src/styles/pages/code.css、pnpm-workspace.yaml（仓库根，catalog 段新增 @shikijs/transformers@4.5.0）、app-web/package.json、设计系统页标本（design-system 页与 DesignSystemDemo 中代码样例各一）。
- 验收口径：(a) 关 JS 查看任一文档页：figure.code-block 框架 + 语言名 + copy 按钮均存在于 HTML 源码；(b) 4 个样例各出一处（{n} 行高亮 / [!code ++] / [!code focus] / title 头栏）在指定页可视验证明暗两套；(c) copy 按钮点击可复制且 copied 态 2s 回退（Playwright 交互验证）；(d) mermaid 块无双层框架（抽查含图页）；(e) qa 0 errors、LHCI /markdown/ perf 不低于 0.98；(f) 客户端 JS 净减（layout-interactions 改写段移除后 build 产物对比）。

**S4 runtime-batch（运行时优化批次：岛屿去 React 化 + 字体 fallback）**
- 内容：(a) ThemeToggle 岛 → vanilla 模块（143 行岛逻辑移植，三态 system/light/dark 与 i18n t() 复用，SiteHeader.astro:115 改普通 script + astro:page-load 生命周期，清理用 Set 登记模式）；(b) WebVitalsTracker 岛 → vanilla 模块（web-vitals 保留，91 行移植，BaseLayout.astro:93 改 script）；(c) IBM Plex Sans metric fallback @font-face（size-adjust/ascent-override/descent-override 指系统栈，0 字节，数值实测校准，public/fonts/fonts.css 追加）。已评估缓议：i18n-strings 分包（50787 B，gz 约 16.2KB，一半收益约 8KB——t() 同步契约横跨 SSR 与客户端，改动面全站，收益/风险比不足，11.2 留档）；预取策略不动（约束 §3）。
- paths：app-web/src/islands/ThemeToggle.tsx（删除或转 vanilla）、app-web/src/islands/WebVitalsTracker.tsx（同）、app-web/src/lib/theme-toggle.ts（新，vanilla）、app-web/src/lib/web-vitals.ts（新，vanilla）、app-web/src/components/SiteHeader.astro、app-web/src/components/BaseLayout.astro、app-web/public/fonts/fonts.css、app-web/src/lib/i18n.ts（如 t() 需暴露给 vanilla 的适配）。
- 验收口径：(a) 文档页与首页 HTML 引用的静态 JS 图中 grep 不到 react 命名 chunk（client runtime 不再被任何页面首屏需要）；(b) island client: 挂载点 grep 计数 ≤ 4；(c) 主题三态循环 + system 跟随（dispatchEvent matchMedia change）+ 郎言切换在明暗两套视检通过；(d) LHCI 三页 perf 全部 >= 0.98 且 CLS <= 0.1；(e) reduced-motion 下无动画卡中间态；(f) web-vitals 上报正常（console beacon 断言）。

**S5 ci-cache-gates（CI 缓存持久化 + 门禁增补 + 收尾）**
- 内容：(a) deploy.yml 与 lighthouse.yml 各加 actions/cache@v4：path = node_modules/.cache/mermaid-dual，key = mermaid-${{ github.sha }}，restore-keys = mermaid-（前缀回退，保证部分命中）；deploy.yml 在 render-mermaid 执行步之前 restore（build:web 内部首步即 render-mermaid，restore 步插在依赖安装之后；数据前置链步已于 S1 落在 typecheck 之前，此处不再动）；lighthouse.yml 无 Chromium，靠缓存命中走缓存直读，修复勘察指出的「Lighthouse 量到客户端渲染退化页」路径。(b) qa-check.mjs 增补产物新鲜度门禁（评审 OR1 钉死为方案 b）：qa 以子进程零写入运行各生产者 `--check`（content-sync --check / build-stats --check / build-syntax --check / build-learning-path --check，第 4 节 CLI 约定），任一脚本非零退出或报告待处理项即 fail——**不重derive inputsHash**，键逻辑只存在于生产者一份，杜绝第三份键实现；fail 输出附一句指引「先跑 pnpm dev 或数据前置链再 qa」（评审 N-(d)：本地冷缓存下前置段待算项>0 属预期，防门禁报错被误读为代码缺陷）；成本说明：deploy.yml 的 qa 步（:90）在 build:web（:87）之后，缓存全热为秒级，qa 本身遍历 2309 页为分钟级主体，增量可忽略。(c) README/CHANGELOG 数据层架构说明一段；PR #142 更新第 2 期说明。
- paths：.github/workflows/deploy.yml、.github/workflows/lighthouse.yml、app-web/scripts/qa-check.mjs、README.md、CHANGELOG.md、.workflow-tmp/（留档）。
- 验收口径：(a) 本地模拟 CI 路径：清空缓存 → 全量渲 → 再跑 --check 报待渲染 0（同现状）；CI 侧以 Actions 日志验收 restore size > 0 且 build job 的 render-mermaid 段「待渲染」数量近 0；(b) 人为改动任一内容源（如改一篇 md frontmatter 或删发布通道文件）后 qa 报错 exit 1，重跑前置链后恢复通过；(c) deploy.yml paths 已含 app-web/**（deploy.yml:8），qa-check 与脚本变更天然触发部署构建，验收仅需确认改动文件落入触发范围、无需改 paths；(d) 全门禁 + LHCI 收尾全绿。

## 11. targets（可量化验收目标）

### 11.1 硬目标

| 目标 | 基线（实测） | 目标值 | 验收方式 |
| --- | --- | --- | --- |
| dev 数据前置段（content-sync→drift→stats→syntax→learning-path，astro dev 之前） | 约 15.6s（8389+147+793+6253+新脚本） | 热缓存 <= 5s；冷态 <= 17s（不劣化） | node 计时（各脚本 wall time 求和，写入提交说明） |
| build 数据前置段（含 render-mermaid） | 约 16.2s（热缓存） | 热缓存 <= 6.5s | 同上 |
| CI mermaid 重渲量 | 每次部署 2066 张全渲 | restore 命中后「待渲染」近 0（新增/变更图才渲） | Actions 日志 [render-mermaid] 行 |
| LHCI 三页 perf | 1.00 / 0.98 / 1.00（均值 0.99） | 全部 >= 0.98，error 门 0.85 不破 | lighthouserc + LHCI_PORT=4190 覆盖跑法 |
| 首页关键路径 JS（gzip） | 113.8KB | <= 45KB（甩 react 系 62.8KB 主件） | dist 脚本图 gzip 求和 + LHR network-requests 交叉核对（第 1 期基线同法） |
| 文档页 react 依赖 | 每页首屏含 react-dom 调度器 | HTML 静态 JS 图零 react chunk | grep dist HTML/JS 资产名断言 |
| island 挂载点 | 6 | <= 4（ThemeToggle/WebVitalsTracker 去岛化） | grep client: 计数 |
| 「全部模块」面板首开数据 | 70KB gz 全量索引 | <= 8KB（岛 JS）+ 按模块分块每块约 1-2KB gz | 网络面板实测 |
| 客户端运行时依赖 | 0 新增 | 0 新增（@shikijs/transformers 仅 devDep） | package.json diff 评审 |
| 全站关键路径 CSS 净增 | — | <= +6KB gz（S3 代码块头栏/行级样式） | build 产物 css 对比 |
| 本地全量 build 时长 | 16-17 min（constraints §1:17） | 增幅 <= 10% | build 日志 |
| dist 文档页数 | 2309 html | 2309（± 学习路径等新增路由不计入本目标） | qa-check |
| 大页告警 | 3 个算法大页（warning） | 不新增 | qa-check 1.5MB 门 |

### 11.2 已评估并缓议（防重复议，含理由）

1. i18n-strings 按 locale 分包：收益约 8KB gz，但 t() 同步契约横跨 SSR 与全部客户端模块，分包需重构消费面，风险/收益不足——本轮不做，留档。
2. pagefind 增量：pagefind 无官方增量，站点内容级自研跳过超出本轮分寸——不做。
3. 预取策略调整：第 1 期规格 1.3.8 裁定不动（弱网批量拉页危害已论证）——不做。
4. render-mermaid 本地键与插件 canonicalSource 双实现合并：TS 打包环境取值限制是既有事实（rehype-mermaid-dual.ts:32-38 注释），仅做注释互引防失同步——不合并代码。
5. content-sync 文档级增量：跨文件一致性（order 重排/死链清洗依赖全库索引，survey 裁定本质难增量）——仅做 git-dates 与输出端增量。

---

## 12. 修订记录

- v1.1（2026-11-05，评审轮修订，评审意见 MF1-MF5 / OR1 / OR2 全部采纳）：
  1. MF1：7.1 补 CI 硬性前置——deploy.yml 现顺序 typecheck(:81) 在 build:web(:87) 前，产物移出索引后 fresh checkout 缺 syntax-index.json 必报 TS2307（resolveJsonModule=true 实测 app-web/tsconfig.json:12；syntax-index 唯一消费点 syntax-service.ts:2）；build-syntax 与 build-learning-path 显式步改由 S1 提交落在 typecheck 之前，规格 8 的「取舍」表述删除；src/ 静态 import 产物清点表入 7.1；lighthouse.yml 无 typecheck、build:web 自含全链不受影响（实读确认）。
  2. MF2：3.4 产物改 base 中立（采纳方案 a）——不烘 href，nodes 存 docRef{module,slug,docTitle}，href 拼接留在 learning-path.ts SSR（:183 现式）；键加 modules.json 全文；证据实读：learning-path.ts:162-196 meta 派生、:183 base 烘入、[tech]/index.astro:20/26/33、build-desktop.mjs:12-15 DESKTOP_BUILD=1 直调 web build、build-portable.mjs:21-24 经 tauri build 间接。方案 b（base 进键）否决理由：双 base 构建互踢缓存。
  3. MF3：3.3 键补 byId.get(moduleId) 完整切片（title/icon/categories，build-syntax.mjs:196-201）+ PRODUCER_VERSION 常量（§4 新增条目），覆盖 MAX_CODE_LINES/CHARS（:31-32）、清洗正则（:142）、remark-parse 升级这类「输入不变而输出变」的键洞。
  4. MF4：5.1 增量 log 从 --since=<newestDate> 改为 headAtBuild..HEAD 范围语法（本轮实测 `git log --pretty=format:@%cs --name-only HEAD~3..HEAD` exit 0、输出格式与 loadGitDates 兼容）；缓存结构删 newestDate 字段；写明 --since 会漏 merge 送入的早日期提交（PR #142 案例）。
  5. MF5：3.1/5.2 共享键改为 sha256({totals, sortedRecords})——totalDocs=files.length 含无 module 文件（build-stats.mjs:48,84）、totalCategories 来自独立 categorySet（:59-60），仅按记录数组哈希漏失效。
  6. OR1：S5(b) qa 门禁钉死为方案 b——qa 零写入子进程运行各生产者 --check，pending>0 即 fail；不重derive inputsHash，键逻辑保持生产者单份（§4 API 不导出键构造器即为此意）；成本说明（deploy.yml qa 步在 build 后缓存全热，秒级）。
  7. OR2：7.1 .gitignore 落点钉死 app-web/.gitignore，三条精确模式 src/data/*.json、public/data/、public/syntax-data/，明令禁用递归 glob（git ls-files 实测 src/data/ 下 algo-problems/ 8 个被跟踪 .ts 源文件）；app-web/.gitignore:51 旧行同提交删除。
  8. S1 验收新增 (e)：删除发布通道产物后「数据前置链 → typecheck」本地模拟通过（评审 MF1 未实跑的缺文件 typecheck 场景由实施任务实测）；(f) 等价校验口径改为「产物 + SSR 拼接后含 href 的最终 VM」。
- v1.2（2026-11-05，第 2 轮评审修订）：
  1. MF6（唯一阻断项）：5.1 第 3 点增量合并语义从「新 map 覆盖旧条目」改为 **max 合并**（仅当区间首现值更大才覆盖）。证据实读：content-sync.mjs:96 首现即生效（`!map.has(t)` 即 set）建立在全历史 newest-first 遍历之上，v1.1 括号里「与现算法语义一致」的声称不成立——range log 下全历史 = 旧历史 ∪ 区间，路径 P 的全量首现 = max(缓存值, 区间首现值)；merge 送入的早日期提交触碰已缓存路径时，「新覆盖旧」会把 updated 降级。危害边界：content-sync.mjs:241-244 手写守卫（handValue > patch.updated 保留）仅在 frontmatter 已携带更大值时缓解，CI sync 改树不提交、frontmatter 未携带大值时写入偏旧 updated，污染文档页「更新于」。
  2. 杂项落地（评审 notes，均不阻塞）：(a) PRODUCER_VERSION 表述统一为「各生产者脚本顶部自定义常量」（3.3 条 2 与 §4 条 5 一致）；(b) 3.3 键的 shiki 版本号取值来源钉死为 JSON.parse 读 node_modules/shiki/package.json 的 version；(c) S1 验收 (e) 标注 learning-path-resolved 部分在 S2 收尾复跑（S1 阶段其无 src 消费者，删它不触发 TS2307）；(d) S5(b) qa fail 输出附「先跑 pnpm dev 或数据前置链」指引。评审 N-(e)（deploy.yml 显式步与 build:web 内部链同 job 双跑，显式步写缓存后内部链命中，总代价约一次全量）记录在案，无需规格改动。
