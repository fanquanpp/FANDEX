# feat(web): UI/UX 改版第 1 期「仪器面板」— 全站视觉语言、三壳统一与性能瘦身

## 改版概览

- 提交规模：`git log main..feat/web-uiux-revamp-2026-10 --oneline` 实测 9 个提交（4ba2ab31 至 b5275ce0）；排除临时产物目录后，真实源码变更 103 个文件，+3878 / −1631 行（`git diff main...feat/web-uiux-revamp-2026-10 --stat` 排除 `.workflow-tmp` 与 `app-web/.workflow-tmp-shots-tmp` 实测）。
- 覆盖范围：全局框架与导航、home、docs、learnpath、playground、features、standalone 七个域的精修，外加一次构建产物性能专项。
- 主线：以设计令牌驱动的「仪器面板」视觉语言（细线、刻度、角标、反色墨水）统一全站组件基元；三套壳顶栏归一为 SiteHeader 单一实现；z-index 收敛为全站单一刻度；文档阅读体验（行宽帽、移动端目录、表格三件）；明暗对比度达 3:1/4.5:1 档位；构建产物裁剪 KaTeX 字体、动态化 panzoom、岛屿延迟水合。
- 活体标本：站内 noindex 页 `/design-system/`（design-system.astro，sitemap 已排除）。

## 分域明细

### 1. 全局框架与导航（三套壳 + 主题/语言/SW/搜索/fx 背景层）

- 壳统一（P0）：新增 `app-web/src/components/SiteHeader.astro`（variant: doc|home，文件头注释成文两变体差异），Layout 与 HomeLayout 删除各自重复顶栏改为消费；404/disclaimer/ai 第三壳按规格保持独立。
- z-index 单一刻度（P0）：`app-web/src/styles/shared/layout-components.css` 令牌块新增 `--z-raised 2` / `--z-sticky 10` / `--z-dropdown 120` / `--z-overlay-top 1000`（layout-components.css:27-41 实测在档），域内消费点全量迁移（app-nav/home-nav/mobile-nav/install-tip/feature-sheet/toast/sw-update/perf-monitor/tooltip/skip-link），删除 tailwind.css 别名块、layout.css 工具类等零消费死码；algorithms 页裸 60 迁 `var(--z-sticky)`。
- 主题三态（P1）：`app-web/src/lib/theme.ts` 增加 ThemePreference（light/dark/system，兼容旧存储值）与 matchMedia 持续跟随；ThemeToggle.tsx 改三态循环并新增 i18n 键。
- P2：layout-interactions.ts SW 注册补 SSR 守卫；删除与 global.css 全局兜底重复的 reduced-motion @media；清理死 scoped 样式块与孤儿断点。

### 2. home（首页门面）

- 横滑器重写为原生 scrollLeft 引擎（`app-web/src/lib/home-interactions.ts`）：触屏可滑、scroll-snap 生效、程序化驱动期间悬挂 snap 并在吸附位恢复（reduced-motion 下实测翻页精确落 432px 栅格位）。
- hero 主 CTA 全视图唯一一枚，消费双层文字滑动（文字层右移淡出 + 箭头滑入 + 竖刻度），波浪描边在该枚退役避免双 hover 语言。
- ModuleCard 归档：去阴影改细线、hover 白名单成文、标题双层下划线；animations.ts 对 css 卡片跳过 JS 阴影绑定。
- CSS 归位前半步：新建 `app-web/src/styles/pages/home-shared.css` 承载首页/子页公共段，index.css 重写为首页独有段并 @import 公共文件（子页 import 路径不变，行为等价实测无损）。

### 3. docs（文档阅读）

- 移动端目录（P0）：`app-web/src/components/TableOfContents.astro` 新增吸顶折叠条（z `--z-toc 20`、当前标题回显）+ 展开面板（85vh、overscroll contain）+ 链接点击/点击外部/Esc 三路关闭 + 「回到开头」行（桌面移动共用）；layout-components.css 中 1023px 块按裁定重写为移动布局。
- 行宽帽（P0）：.prose 段落/列表/引用/提示块/脚注统一 `max-width:var(--size-prose-measure, 68ch)`（实测 1440 下 p=638px，代码块/表格保持全宽）；令牌落批前用同值回退。
- 排版精修（P1/P2）：表头 8% tint + accent 底线、td tabular-nums、行 hover 刻度环；h4 改竖刻度；admonition/hr 收敛；侧栏 hover 仅底色；面包屑字号与 z 迁移；[slug].astro 孤儿断点归一。
- 顺带修复两个既有缺陷：TOC 条目尾随 '#'（锚文本混入，显示层剥离）与模块落地页 SVG 描边 dasharray:1000 宽行尾部常驻显形（pathLength=100 归一）。

### 4. learnpath（学习路径）

- 对比度提档（node 实测驱动）：节点描边/连线/图例线提至 `--color-neutral-600`（双主题 3.48/4.10:1）；暗色小号文本两份 CSS 各立集中 `[data-theme=dark]` 段提至 fg-secondary（6.53:1）；进度徽章改中性墨水，warning 向墨水收 25% 保留色相（4.85:1）。
- DetailPanel 进度三态选中换反色墨水；lp-tech-chips 吸顶 z 迁 `var(--z-sticky)`；地图断点归一；修掉 lp-resume__label 缺分号致 letter-spacing 失效。
- 修复 MapCanvas 两个实测缺陷：ResizeObserver 首次回调覆盖 fitStart 舒适锚点致窄视口首阶段被裁（MIN_SCALE 居中）；同帧多次 applyTransform 过期闭包使缩放读数与 DOM 不符。
- 48 张图 + index.json 全绿（1374 节点、1374 文档引用全部命中 doc-index）；client:load 维持（地图是首屏主内容，visible 无收益有首帧延迟风险）。

### 5. playground（在线前端实验室）

- 工具栏按钮基元 24 处 className 迁移至全站 `.fndx-button--sm` / `.fndx-icon-btn` 体系（git diff 实证 TSX 变更仅 className 行，行为脚本零改动）；编辑器开关组改分段控件语义 `.pg-editor-tab`；标题输入框消费 `--input-*` 令牌链并按规格加 focus 外圈环。
- z-index 按 4.2 迁移总表落位：`.pg-drawer-mask` 150、`.pg-sc-mask` 151（Playwright computed-style 实测），compat-fandex 的 `--fandex-z-overlay` 消费点清零。
- 断点归档成文；仪器行高度统一 `var(--size-control-md)`；补 <720 预览头行窄屏降级；清理死规则与重复 reduced-motion 块；修 `.pg-count--danger` 误留 accent 实底；图鉴占位冷调硬编码改 `--color-bg-code`。
- 明令不动清单零 diff（pg-showcase.ts、FrontendLab.tsx 模板串、CodeMirrorBox 钉死项）。

### 6. features（syntax + algorithms）

- syntax-explorer.css 三处 z-index 归入全局刻度（吸顶栏 `var(--z-sticky)`、Radix 模态遮罩/面板 `var(--z-modal)`/calc(+1)）。
- algorithms/index.astro 335 行内嵌 style 块整体迁入 `app-web/src/styles/pages/algorithms.css`（迁前 grep 实证类名仅本页消费），达成「grep 无 <style>」验收。
- 教程/题图鉴分段切换选中段换反色墨水；题目详情页文本消费行宽帽（帽挂文本元素规避 ch 字体相对性，实测互差 2.4%）。

### 7. standalone（404/disclaimer/ai/设计系统）

- design-system.astro 建成规格活体标本页（按钮四层级三尺寸/圆角五档/反色墨水/刻度线/字号阶梯/代码四例/表格三件/移动 TOC 复刻，noindex + sitemap 排除）。
- 404/disclaimer 去 SceneBackdrop/fx 脚本链（零 fx 请求），404 大数字走 display 字体 + 双层滑动 CTA；error.css 收敛。
- 修复幽灵令牌 `--space-7`（现存档 4/5/6/8/10）：disclaimer.astro、ai.astro、design-system.astro 三处消费点改为现存令牌。
- 明令不动清单复核零 diff（ThemeLangBootstrap、theme.ts、offline.html、manifest、pg-showcase.ts、sw.js、llms.txt、rss.xml、shadcn 九件套）。

## 性能与依赖

已完成（4 项，实施记录含实测数字）：

1. KaTeX 字体裁剪：新增 `app-web/scripts/prune-katex-fonts.mjs` 并挂入 package.json build 链（build 脚本第 16 行实测在链，位于 astro build 后、pagefind 前）；剥离 katex.min.css 中 woff/ttf 备选 src 并删文件，dist 部署体积 −798KB raw，文档页 CSS −2.8KB raw；已在现有 dist 实跑验证幂等（重复运行 0 修正）。
2. panzoom 动态化：`app-web/src/lib/mermaid-interactions.ts` 由静态 import 改 loadPanzoom() 单例动态 import（2307 个文档页仅 573 页含 mermaid 图），1734 个无图文档页每页约 −5.5KB gz JS；异步挂载前校验 figure.isConnected 防换页竞态。
3. Sidebar 模块面板动态边界：`app-web/src/lib/sidebar-modules-mount.ts` 顶层静态 react import 改三路动态 import + loadOnce 单例；面板未打开时 71.5KB gz 数据 chunk（内联 doc-index.json 187KB raw）零加载；诚实核算：文档页 react-dom 本就经 island loader 加载，本项不减少静态 JS 总量，收益在 Sidebar chunk 瘦身与边界干净。
4. design-system.astro 岛屿 client:load 改 client:visible：DesignSystemDemo 81.5KB gz（motion + radix 六件 + react-dom）退出首屏关键路径；其余岛屿逐一评估维持原判（syntax 已 visible；地图/playground 是页面核心内容；ThemeToggle 2.2KB 改 idle 收益趋零）。

评估后不动（有实测依据）：字体已是 optimal（font-display:swap + unicode-range + 自托管 9 字重 188KB，BaseLayout 已 preload 实际用的 3 字重，全量 preload 反而多 6 个无效请求）；图片已 lazy/eager 策略完备；预取 hover 策略有成文权衡注释。死依赖核查 27 个疑似依赖逐一 grep 计数，无一可删。

分析基线（对上轮 dist 静态 import 图遍历 + gzip level 9 实测，未跑全量构建）：首页 14.5KB html + 30.3KB css + 39.6KB js；文档页 19.0KB html + 37.9KB css + 121.2KB js。已知过剩面：SidebarModules 内联全站 2103 条索引、syntax-data 每语言 0.5-1.2MB 无分片、dist/algorithm 三页 HTML 1.5-2.1MB（qa 已有 WARN）——列入第 2 期候选。

## 验证证据

本 PR 正文撰写会话执行的只读核对（git 只读命令，未执行任何写操作）：

- `git log main..feat/web-uiux-revamp-2026-10 --oneline`：9 个提交（4ba2ab31 全局框架 → 4f1a1e04 首页 → 2eee79e8 文档 → 9ffdd828 学习路径 → 97cbae8e playground → cde7c920 syntax/algorithms → f6c631f4 独立壳 → be381daf 性能 → b5275ce0 README 同步）。
- `git diff main...feat/web-uiux-revamp-2026-10 --stat`：全量 293 文件；排除临时目录后 103 文件 +3878/−1631。
- 关键实现点存在性抽查：SiteHeader.astro（variant doc|home 注释在档）、prune-katex-fonts.mjs（package.json build 链在位）、layout-components.css:27-41（--z-raised/--z-sticky/--z-dropdown/--z-overlay-top 令牌在档）、home-shared.css / algorithms.css / error.css / design-system.astro 均存在。

各域自查门禁（来自域实施记录，本会话未重跑，置信度以各域记录为准）：

- lint / typecheck / qa：各域均报 0 错；astro check 166-167 文件 0 错（playground 域存量 4 条 hint）。
- Playwright 无头视检（dev 服务器 + SW 全 unregister/caches 清除协议）：壳 19/19、home 20/20、docs 5 页 x 明暗 x 4 视口共 40 组 + 交互断言、learnpath 验收探针 66/66、features DOM 探针 23/23、standalone 48/48 PASS；fx-backdrop 唯一且 z=-1 在各域复检；emoji 扫描各域 0 命中；截图留档 .workflow-tmp/shots/。
- 视检轮次状态（原值照录）：spotLeft=0，qaLeft=29。

明确未跑（按分工归编排器/CI 统一门禁）：

- 全量 `pnpm build:web`（实测依赖 16-17 分钟全量构建，prune-katex-fonts 仅在现有 dist 实跑验证）。
- `pnpm --filter @fandex/web test:smoke`（tests/ 共 20 用例）。
- LHCI 前后分数（lighthouseBefore/lighthouseAfter 均为 null；lighthouserc.json 硬断言 perf>=0.85、CLS<=0.1 由 CI 执行）。

合并前需处理（本会话实测发现，非域记录内容）：

- 分支误提交了 1752 个临时产物文件（`git diff main... --name-only | grep -c workflow-tmp` 实测；全部为新增 A）：`.workflow-tmp` 1517 个（3D 探针库、Playwright profile 浏览器缓存、截图、探针脚本）、`app-web/.workflow-tmp` 45 个、`app-web/.workflow-tmp-shots-tmp/pw-algo` 190 个浏览器缓存文件。
- 根 `.gitignore` 与 `app-web/.gitignore` 均无 workflow-tmp 规则（`git show` + grep 实测 0 命中）。
- 建议：合并前从分支移除这三组目录并补 gitignore 规则，避免仓库混入浏览器缓存二进制（含 4MB+ 级缓存块）。本会话为只读核对，未执行清理写操作。

## 后续迭代计划（第 2 期候选）

1. 临时产物治理：`.workflow-tmp` 三组目录移出版本库 + gitignore 规则（见上节，第 1 期合并前置）。
2. syntax-data 分片：每语言 0.5-1.2MB（gzip 56KB）单文件全量 fetch，按语言/按章节分片后按需加载。
3. dist/algorithm 三页 HTML 1.5-2.1MB 瘦身：mermaid/公式内联体积（qa 已有 WARN），评估外链资产或按需渲染。
4. SidebarModules 数据边界：内联全站 2103 条 doc-index（187KB raw / 71.5KB gz chunk）改按需 fetch 或裁剪至当前模块域。
5. CI 门禁首跑补证：全量 build、test:smoke 20 用例、LHCI 硬断言（第 1 期按分工未跑，数字均为 null）。
6. `--size-prose-measure` 令牌落批后移除各处 `var(--size-prose-measure, 68ch)` 的 68ch 回退。
7. 行为约束文件订正：KaTeX output 现状为 htmlAndMathml（astro.config.ts:156 实测），与约束记载「已切 mathml」不一致，判定约束文件过时，需更新记载或切回。
8. playground astro check 4 条存量 hint 清零。
