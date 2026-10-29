# FANDEX web 全站 UI/UX 改版 第 1 期设计规格

版本：v1（2026-10-30，设计总监产出）
依据：`.workflow-tmp/uiux-run-constraints.md`（全部硬约束）+ 勘察结果（8 areas / 17 keyPages）+ 四路调研纪要（组件库对照 / typelex 对照 / 文档框架基准 / 技术栈性能）+ 本轮源码抽查（引用均给出 path:line）。
范围：排版体系、按钮表单基元、导航全局框架、8 个勘察域改造要点、动效预算、技术栈决策、验收清单。
性质约束：本规格每条须可实施、可验证；与运行约束冲突处如实标注（见 7.4 KaTeX 一节）。

---

## 1. 设计原则与分寸边界

### 1.1 不变量（本轮不可触碰，引自运行约束 §0）

| 编号 | 约束 | 出处 |
| --- | --- | --- |
| C1 | 全站禁止 emoji 及变体选择器 | constraints §0；AGENTS.md |
| C2 | 暗色纯黑灰板 neutral #0A0A0A..#A3A3A3 + cyan #00BCD4/#00E5FF/#4FF2FF；冷青 #0A0E14 系已否决；亮色冷雾灰板 #EBEFF3 系为终态 | constraints §0 |
| C3 | 令牌唯一真源：shd-shared/tokens/（DTCG）→ build:css → 手工同步 app-web/src/styles/shared/tokens.css；只改副本会挂 check-tokens-drift 门禁；批量 needle 必须带右括号 `var(--name)` | constraints §0 |
| C4 | fx 铁律：唯一背景层 SceneBackdrop（fixed + z-index:-1）；禁网格底纹/泛光/扫描带/波浪线；letter-glitch 参数（fontSize 18 / density 0.4 / baseOpacity 0.16 / flow 0.6 / 扫描 0.12）为终态勿调；软渲染跳过画布是刻意设计 | constraints §0 |
| C5 | 品牌字体 IBM Plex Sans / Chakra Petch 不换（换字体须体积论证）；motion 令牌双侧真源（shd-shared/styles/tokens.css 与 app-web/src/motion/tokens.ts，75/150/250/400/600/2000ms） | constraints §0 |
| C6 | 每处动效可解释、可降级、尊重 global.css:101-105 的全局 prefers-reduced-motion 兜底，单文件勿重复写 @media | constraints §0 |
| C7 | 工程规矩：SSR 守卫、空 props 接口、astro:before-swap 清理登记、base /FANDEX/ 拼接、尾斜杠、dialog 显式关闭态、禁止 hover 改写 animation-duration、KaTeX/mermaid 决议 | constraints §3 |

### 1.2 本期做什么

1. 排版系统性精修：行宽、字号纪律、标题层级、代码块、表格、引用（第 2 节）。
2. 组件基元收敛：按钮四层级/三尺寸统一到既有 .fndx-button 体系，圆角归档，选中态统一（第 3 节）。
3. 导航与框架统一：三套壳头部收敛、z-index 统一刻度、移动端目录补齐、断点纪律（第 4 节）。
4. 补齐两处硬差距：移动端目录（全站 2071 页在 <1024px 零页内导航）与代码块行级表达力（现状无 title/行高亮/diff/focus）。
5. 还一笔结构债：代码块框架从客户端 DOM 改写改为 SSR 输出（app-web/src/lib/layout-interactions.ts:190-243 现状为每页浏览都跑 DOM 扫描包 pre、插按钮）。

### 1.3 明确不做什么

1. 不引入任何 3D 运行时（three/deck.gl/babylon/hilo3d/claygl/four/playcanvas 全拒，实测数据见 7.2）。
2. 不引入 gsap / tsparticles / next-themes / 全站 motion runtime（理由见 7.2）。
3. 不做第二个背景层、不加网格底纹、不加泛光光晕、不改 letter-glitch 参数（C4）。
4. 不动历史遗留硬编码（全量入册，防实现任务合法误改后挂 8.7 零 diff 核验）：theme-color 旧 #0a0e14 共五处站点——ThemeLangBootstrap.astro:29、offline.html:20、pg-showcase.ts 21 处（grep -c 实测恰 21）、src/lib/theme.ts:9（THEME_COLOR_DARK，updateMetaThemeColor 每次切主题写 meta）、src/islands/playground/FrontendLab.tsx:51（岛内示例模板串 background:#0a0e14，pg-showcase 之外另 1 处）：不扩散、勿当新债乱清（constraints §0:8 裁定）。例外通道：variables.css:56 的 --fx-scene-base 暗色 #0A0E14 不入本清单，它不是静态硬编码遗留而是全库唯一暗色背景基色定义（fx.css:26 实时消费），与 C2 否决裁定直接冲突，作为 OD-1 待裁决项处理（见 5.8.5）。
5. 不动 mermaid dagre+classic 钉死项；不重开 KaTeX html 输出（见 7.4 冲突上报）。
6. 不改内容库（cnt-content/）与 app-Android-*。
7. 不做字体子集化工具链（收益 <10KB，违反分寸）；不引入 CJK webfont。
8. 不全站 SPA 化、不改 hover 预取策略（astro.config.ts 注释已论证弱网危害）。

### 1.4 新视觉语言裁定：「仪器面板」（2026-10-30 放宽后自主定义）

旧 ark-ui 的圆角档位与竖条标记约束已解除（constraints §0:12）。经权衡，裁定**延续并命名既有视觉方向为「仪器面板」语言**，而不是另起炉灶。理由：

1. 现有资产已大量承载这套语言且与用户终态裁定同源：prose h1/h3/引用的 3px 左条（typography.css:460,474,615）、列表项 2px 刻度（typography.css:534-544）、module-card 的 2px 模块色顶线（module-card.css:24-36）、card-icon 的角标描线（module-card.css:90-102）、1px 细边框代阴影。推倒重来成本高、收益为零。
2. 与暗色纯黑灰板 + cyan + IBM Plex Sans/Chakra Petch/JetBrains Mono + letter-glitch 字符海的「终端仪器」气质同构：细线、刻度、角标、反色墨水都是仪器语义，不依赖大圆角与光晕。
3. 全部表达是纯 CSS（边框/伪元素/color-mix），零 JS、天然可降级、天然过全局 reduced-motion 兜底，符合 C6。

语言四要素（全站自洽口径）：

| 要素 | 规格 | 用在哪 |
| --- | --- | --- |
| 刻度线 | 1-4px 条形（横线/竖线/顶线），颜色 = 模块色或 cyan | 标题、列表、卡片 hover、当前项、表头底线 |
| 角标 | 元素左上角 4px 直角描线（现有 card-icon::before 模式） | 仅限「精选表面」：首页精选卡、设计系统页演示；禁止铺开 |
| 反色墨水 | 选中 = background var(--color-fg-primary) + color var(--color-bg-primary) | 互斥单选（菜单、分段控件、palette 选中项）；常驻位置指示不用（见 3.4） |
| 细线代阴影 | 1px border + color-mix tint，阴影只用于真正浮起层（modal/palette） | 全站卡片、面板 |

明确不进入语言的：点状装饰、发光、玻璃拟态 blur 面板、网格/点阵底纹、超大低对比 display 字（正文对比度必须保 4.5:1，暗色一级灰 #737373 只进 meta/标签不进长正文——暗色基准调研结论，与 C2 一致）。

---

## 2. 排版体系

### 2.1 字体族（不变）

- 正文/UI：`--font-family-body`（IBM Plex Sans + 系统栈）；标题/数字标签：`--font-family-heading`（Chakra Petch）；代码：`--font-family-code`（JetBrains Mono）。自托管 woff2 latin 子集共 10 文件约 168KB（public/fonts/ 实测），中文回退系统字体——此取舍保持，禁引 CJK webfont。

### 2.2 字号阶梯（保持数值，补纪律注释）

现有 `--font-size-xs..6xl` = 12/14/16/18/20/24/30/36/48/60px（shared/tokens.css:138-156），语义映射 heading-1..4/display/hero（:398-416）。裁定：

1. 数值阶梯不变（现有页面全部消费中，改动即全站回归）。
2. 在 DTCG 源 semantic/font.json 补成文注释（零数值变更）：「12px 是 CJK 可读下限，禁止新增 11px 档」「一级灰 #737373 仅限 caption/meta」——吸收 typelex tokens.css:33-47 的成文纪律，防未来回潮。
3. 不新增 17px 档：FANDEX 无 lede 场景，--font-size-body-lg 已映射 18px（tokens.css:404）服务 button-lg；无消费空缺不造档。

### 2.3 行高与段距（保持）

- .prose line-height 1.9（typography.css:427）：中文长文阅读合理，保持。
- 标题 line-height 1.35、margin 1.6em/0.6em（typography.css:451-454），保持。
- 段落 justify 仅限 .prose（typography.css:81-83 注释已成文），UI 文本起点对齐，保持。

### 2.4 行宽帽（P0，本期最重要的单条排版改动）

现状 `.prose max-width:100%`（typography.css:424-426），仅靠容器 64rem 兜底，桌面中文正文单行 60+ 全角字，远超 30-40 字舒适区。裁定：

1. 新增语义令牌，DTCG 键路径 `size.prose.measure: 68ch`（进 shd-shared/tokens/semantic/size.json，随令牌批次同步副本）。命名通道注意：semantic/size.json 的键生成 `--size-*` 前缀（实测生成物：size.control.sm → `--size-control-sm`、size.container.content → `--size-container-content`，见 shd-shared/styles/tokens.css:254-268），故 CSS 侧消费名是 **`--size-prose-measure`**；禁止在 app-web/src/styles/shared/tokens.css 副本手工补 `--prose-measure` 裸名——会挂 check-tokens-drift 门禁。68ch ≈ 37em ≈ 37 个全角字，落在 typelex 实测纪律带（其 .lede 62ch / .page-sub 66ch / .page-head 74ch，typelex base.css:248 / pages.css:51,24）。
2. 应用选择器（帽名单须覆盖全部文本级块，防同类块宽度锯齿）：`.prose p, .prose ul, .prose ol, .prose blockquote, .prose dl, .prose details, .prose .admonition, .prose .footnotes { max-width: var(--size-prose-measure); }`——.prose details（typography.css:732）、.prose .admonition（:789）、.prose .footnotes（:585）与段落同属文本流视觉族，不同帽会出现「段落窄、提示块/折叠块全宽」的交错。不帽名单及理由：`.prose h1..h6`（标题保持结构对齐左缘）、`.prose .table-wrap`（:657）、`.prose pre / .astro-code`、`.prose .mermaid`（代码/表格/图需要全宽）、`.prose img`、`.prose hr`（分隔线属结构元素）。
3. 验证要求：768 / 1024 / 1440px 三档视口截图核对「正文 30-40 全角字/行、代码块仍全宽、无右侧死边浪费」；若 68ch 观感偏窄，允许在 62-74ch 内调令牌值（只动 DTCG 一处）。
4. 已知副作用：长文页纵向变长，需回归目录滚动高亮联动（TableOfContents.astro:199-311 的 IntersectionObserver 按 #app-main 滚动计算，理论上不受影响，验收项 8.3 复核）。

### 2.5 标题层级（prose h1-h6 精修，P1）

现状：h1 1.7em 左条+底线 / h2 1.35em 模块色 2px 底线 / h3 1.15em 左条 / h4 1.05em 下划线 / h5 1em / h6 0.95em 灰（typography.css:458-492）。裁定：

1. h1-h3 结构保持（模块色条 + 底线是「仪器面板」主标记，锚点/目录联动均依赖现有 id 结构，不动 DOM）。
2. h4 弱化问题修正：text-decoration underline（typography.css:480-482）观感像误设链接样式。改为：去下划线，改为行内前置 2px×0.75em 模块色竖刻度（::before，与列表刻度同语言），字号 1.02em、weight 600。纯 CSS，无 DOM 变更。
3. h5 保持；h6 颜色从 `--color-text-secondary` 收紧为 `--color-fg-secondary` 并补 letter-spacing 0.02em，明确「h6 = 小节注记」定位。
4. 移动端 h1-h4 降档映射（typography.css:383-395）保持不变。

### 2.6 代码块（P0 双改：SSR 化 + Shiki 行级增强）

现状证据：astro.config.ts:117-127 shikiConfig 仅有 themes/defaultColor/wrap/langAlias；框架由客户端 layout-interactions.ts:190-243 动态包 .code-block + data-lang 角标 + copy 按钮（JS 失败即整体消失，2000+ 页每页浏览跑 DOM 扫描）；语言角标是 ::before 伪元素（code.css:84-101）。裁定：

1. **SSR 化（P0）**：新增 `app-web/src/plugins/rehype-wrap-code-blocks.ts`，仿 rehype-wrap-tables.ts 模式（配置由 astro.config 顶层显式传参，constraints §3:45）：
   - 输出 `figure.code-block[data-lang]`，内含可选 `div.code-block__head`（有 title 时）+ pre + `button.copy-btn`（SSR 输出按钮元素与 aria 标签，交互改 document 级事件委托）。
   - 读取 pre 的 `data-language` 属性（shiki 已输出，layout-interactions.ts:190 现读取同属性，证明构建期可得）。
   - 删除 layout-interactions.ts 的 initCopyButtons DOM 改写段，保留委托 click 处理与 copied 反馈（code.css:35-38 的 .copied 态样式复用）。
   - mermaid 块维持跳过（现 layout-interactions.ts:185 同款判断前移到插件内）。
2. **Shiki transformers（P0）**：引入 `@shikijs/transformers`（devDependency）。版本配对已核验（2026-10-30 实查 registry.npmmirror.com/@shikijs/transformers/latest）：latest = 4.5.0，dependencies 为 @shikijs/core@4.5.0 + @shikijs/types@4.5.0，与项目 shiki ^4.5.0 同版本线——安装时钉同版本 4.5.0，实现任务首步跑一次本地构建试用确认无 peer 冲突再铺开：
   - transformerMetaHighlight：`js {3,7-9}` 行高亮；CSS = 行背景 color-mix(accent 12%, transparent) + 左缘 2px accent 刻度（仪器刻度线语言）。
   - transformerNotationDiff：`// [!code ++]` / `[!code --]` 绿/红 tint 行。
   - transformerNotationFocus：`// [!code focus]` 非焦点行 opacity 0.45。
   - 自定义 ~30 行 transformer 读 meta `title="..."` 输出 `data-title` 属性，插件据此渲染 .code-block__head 标题条。
3. **头栏样式（P1）**：有 title 或常显模式时，.code-block__head 高 2.25rem、1px 底边、语言名右对齐 0.68em mono 大写（继承现 data-lang 角标的排版语言 code.css:84-101，角标退役）；copy 按钮常驻头栏右侧，不再 hover 才显（触屏无 hover，现 opacity 0.6 方案在移动端不可发现）。
4. **行号默认关**：仅按 meta 单块开启（教学场景按行号讲解时），避免全局常开占宽添噪（基准调研结论）。
5. 全部增量是构建期 + ~1-2KB CSS，客户端 0 新增 JS；须与 code.css:59-62 的 has-overflow 溢出遮罩联合回归。

### 2.7 表格（P1）

现状：th 整行实心 accent 填充、暗色切 primary-700（typography.css:687-699）；even 行斑马纹与 hover 底色已有（:701-707）；构建期 .table-wrap 包裹（astro.config.ts:114）。裁定：

1. **表头降噪**：th 改 color-mix(in srgb, var(--color-accent-base) 8%, var(--color-bg-card)) + border-bottom 2px solid var(--color-accent-base)（明暗同式，cyan 在暗色 8% 混合已自然降饱和，符合暗色基准「强调色降饱和」纪律）；删除 [data-theme='dark'] .prose th 特例（typography.css:696-699）。
2. **数字排版**：`.prose td { font-variant-numeric: tabular-nums; }`（教学站大量数据表，数字列不抖；吸收 typelex base.css:708-715）。
3. **行 hover 刻度环**：`.prose tr:hover td { box-shadow: inset 0 0 0 1px var(--color-border-strong); }`，比整行换底色更贴 1px 细线语言（typelex pages.css:472-511 模式，简化为无圆角版）；保留现 hover 底色，二者叠加。
4. 斑马纹、窄屏横向滚动、767.98px 下的 nowrap 修正（typography.css:411-421）全部保持。

### 2.8 引用与提示块（P2）

现状：blockquote 3px 左条 + 明 10% / 暗 16% tint（typography.css:632,646 实测），warning/danger/tip 变体齐备（:614-655）；.admonition 为 4px 左条（:789-792）与 blockquote 不一致。remark-admonition GitHub 风格（astro.config.ts:90）。裁定：两处微调——admonition 左条 4px 收敛为 3px 与 blockquote 统一；变体 tint 固化为明 10% / 暗 16% 两档常量（现值即如此，写进注释防漂移）。无 DOM 变更。

### 2.9 列表 / hr / 图片 / 链接

- 列表 2px 刻度 marker（typography.css:534-544）、GFM 任务列表双标记去重（:569-582）、脚注区样式（:584-608）：保持。
- hr 3px 粗线（:714-718）：降为 1px + 中段 40% 透明渐变（细线语言统一），P2。
- 图片 1px 边框（:709-712）与懒加载：保持。
- 正文链接：dotted underline + hover 实线（:503-517）保持；导航/标题链接换双层下划线微交互（见 3.6）。

---

## 3. 按钮与表单基元

### 3.1 圆角裁定（P0，随令牌批次一次性落）

DTCG primitive 已有 none(0)/sm(2)/default(4)/md(6)/lg(8)/xl(12)/2xl(16)/3xl(24)/full(shd-shared/tokens/primitive/radius.json:5-13)。裁定**使用档收敛为 0 / 2 / 4 / 8 / full 五档**：

| 语义令牌 | 现映射 | 新映射 | 理由 |
| --- | --- | --- | --- |
| --radius-control | default 4px（tokens.css:468） | sm 2px | 控件小圆角 = 仪器按键；与 1px 边框比例协调 |
| --radius-card | lg 8px（:470） | default 4px | 卡片 6-8px 在细线体系里显「软」，4px 回到锐利 |
| --radius-modal | xl 12px（:472） | lg 8px | 浮层允许最圆档，仍不进两位数 |
| --radius-badge | default 4px（:474） | sm 2px | 徽标随控件 |
| --radius-tooltip | sm（:478） | sm 不变 | - |

理由：圆角档位数量本身没有价值，纪律才有——五档覆盖「直角面板 / 控件 / 卡片 / 浮层 / 真圆」全部层级，任何新组件不再有选择困难；md(6px)/xl(12px)/2xl(16px)/3xl(24px) 保留在 primitive 但语义层停止引用。--radius-full 仅限真圆元素（进度环、圆形开关、头像），禁用于胶囊按钮。

随批清理（P1）：硬编码异值归档——module-card.css:11 的 `var(--radius-md, 4px)` 改 `var(--radius-card)`（现实际解析 6px）；module-card.css:71,99 的 3px 改 2px；code.css:97 角标 6px 随角标退役一并处理；skip-link `var(--radius-md, 4px)`（BaseLayout.astro:110）改 `var(--radius-control)`。

### 3.2 按钮层级与尺寸（收敛到既有体系，P1）

现状已有完整令牌化体系：.fndx-button 四层级 primary/secondary/ghost/danger + sm/md/lg（shared/components.css:4-88，--button-size-* / --button-*-default-* 令牌链 tokens.css:566-604），但页面里散落 nav-btn、entry-btn、MapControls 等各自为政。裁定：

1. **四层级语义钉死**：primary = 每视图至多一个的主行动（首页 hero CTA、表单提交）；secondary = 带边框的次行动；ghost = 工具栏/导航内联操作；danger 仅破坏性操作。层级数量不再新增。
2. **尺寸**：sm 32px / md 40px / lg 48px（--button-size-*-height 现值核对后固化注释）；内边距随字号 em 缩放（若现令牌为 px 值则改 em，随批核对）；min-height 保 44px 触达仅在移动端断点要求（.fndx-button--sm 不用于移动端独立触达目标）。
3. **状态补齐**（shared/components.css 现缺 active/focus-visible 明示）：active 按压 `transform: scale(0.98)`（150ms 内回弹，transform 合成属性不触发重排）；focus-visible 全层级统一 `outline: 2px solid var(--color-border-focus); outline-offset: 2px`；disabled 降 opacity 0.45 + cursor not-allowed。禁止 hover 改写 animation-duration（C7）。
4. **图标按钮**：.fndx-icon-btn（shared/layout-components.css:64-104）保持为独立基元（正方形、tooltip 协作），不强行并入 .fndx-button。
5. 分散按钮的收敛清单（P1 逐个替换为 .fndx-button 类 + 既有令牌）：algorithms 视图切换、learning-path MapControls、playground 工具栏、404/disclaimer 返回链接。DOM 结构不变只换类名与 CSS 消费，降低回归面。

### 3.3 选中态 = 反色墨水（P1，新语言要素）

裁定（吸收 typelex base.css:522,606-610 成文理由「浅色叠加在灰板上一眼无法辨认」）：

1. 适用：互斥单选——search-palette 结果选中项、algorithms 教程/题库分段切换选中段、detail panel 选项、LangToggle/ThemeToggle 菜单选中项。规格：`background: var(--color-fg-primary); color: var(--color-bg-primary);`，暗色下即白底黑字，与 cyan 强调不冲突且让 cyan 保持稀缺。
2. 不适用：常驻位置指示（侧栏当前文档、TOC 当前节、面包屑当前页）——继续用模块色/cyan 刻度线 + 字重提升。理由：侧栏常驻高亮若用反色墨水，大面积纯白块在暗色长列表里喧宾夺主。
3. 与焦点态的关系：反色墨水管「选中」，2px cyan outline 管「焦点」，互不替代。

### 3.4 表单基元（P1）

- 输入框随 --radius-control 收敛到 2px；focus 边框 1px→2px cyan（--color-border-focus）+ 3px color-mix 30% 外圈（键盘可见性）；helper/caption 12px 下限执行 2.2 纪律。
- input 令牌链（--input-radius/--input-size-*，tokens.css:774-804）已有，重复消费不新造。

### 3.5 链接微交互（P1，0KB JS）

双层下划线 hover（animata double-underline 模式，调研 adopt-2，纯 CSS）：底层 1px 常驻线（currentColor 30%），hover 时上层 1px 线自基线上移 2px 交叉。应用：HeaderFeatureLinks、Footer 链接组、ModuleCard 标题。正文 .prose a 保持 dotted 方案（阅读语境不做位移型装饰）。全局 reduced-motion 兜底自动覆盖。

### 3.6 CTA 双层文字滑动（P1，0KB JS）

magicui interactive-hover-button 模式（调研 adopt-3）改造进「仪器面板」语言：文字层 translate-x 8px + 淡出、箭头层滑入，圆点装饰（原组件 h-2 圆点）弃用、换 2px 竖刻度；圆角随 --radius-control。应用：首页 hero 主 CTA（entry-btn 中语义为 primary 的一枚）+ 404 页「返回首页」。每视图至多一枚，防通胀。

---

## 4. 导航与全局框架

### 4.1 三套壳统一（P0）

现状证据：Layout.astro:41-86 与 HomeLayout.astro:37-88 各写一份顶栏（搜索/安装/主题按钮标记重复，home 版多 github 链接、doc 版多 Top 按钮）；404/disclaimer/ai 自建 html 壳无顶栏（勘察 risk）。裁定：

1. 抽取 `app-web/src/components/SiteHeader.astro`：props = `variant: 'doc' | 'home'`，内部统一搜索触发（data-search-trigger）、安装按钮（data-install-app hidden）、LangToggle、ThemeToggle 的标记与顺序；doc 变体含 Top 按钮，home 变体含 github 链接与全屏按钮。Layout.astro 与 HomeLayout.astro 一律消费，删除两份重复标记。
2. 移动端底栏不做组件抽取（修订：grep 实证 mobile-nav 全库仅 Layout.astro:93-150 一处，HomeLayout.astro 全文无移动底栏，原「两壳各一份」前提不成立）——保持 Layout.astro 单点实现；首页无底栏为现状与设计（hero 门面页），不新增。若未来首页需要底栏，再按 SiteMobileNav 抽取路线立项。
3. 404/disclaimer：不挂完整 SiteHeader（无 ClientRouter、MINIMAL_CSP，挂全套会引入 search-palette/sw 脚本链），改为一枚 ghost 按钮「返回首页」（消费 .fndx-button 令牌，视觉同源）。ai.astro 保持独立壳与 AI_SETTINGS_CSP，仅确保令牌副本消费后的颜色一致（其已引 shared/tokens，随令牌批次自动对齐）。
4. 头部行为脚本（搜索/全屏/安装/SW）仍走 layout-interactions.ts 与 BaseLayout.astro:136-146 的模块导入，抽取只动标记不动脚本。

### 4.2 z-index 统一刻度（P0）

现状盘点（本轮 grep z-index 全量实测，含评审补缺）：

1. 权威刻度在 shared/layout-components.css:24-31 的 @layer tokens 块（--z-header 40 / --z-sidebar 30 / --z-toc 20 / --z-mobile-nav 40 / --z-reading-progress 50 / --z-sidebar-backdrop 25 / --z-backdrop 150 / --z-modal 200 / --z-toast 300）。注意 --z-toc / --z-backdrop / --z-toast 现为**零消费死令牌**（grep var(--z- 实证，消费仅 --z-header/--z-mobile-nav/--z-reading-progress/--z-sidebar/--z-sidebar-backdrop 与 syntax-explorer.css:237 的 --z-modal）。
2. tailwind.css:156-172 的 --z-index-* 与二级 --z-* 别名位于 @theme inline（Tailwind 4 产出归 @layer theme；shared/layers.css:2 声明 theme 为第一层 = 优先级最低），与 tokens 层同名时恒被覆盖（--z-modal 双定义名碰撞现由 tokens 层 200 胜出）；且两级别名在 src 内**零消费**（grep 实证无 var(--z-index- 消费点）。结论：别名块不是「第二套生效刻度」而是死代码，处置 = **整块删除**（连带消除 --z-modal 名碰撞），无需映射表。
3. --fandex-z-*（compat-fandex.css:56-63）的真实消费点全库仅两处，均在 playground 岛：playground.css:593 `.pg-drawer-mask` 用 `var(--fandex-z-overlay)` **无 fallback**（删除变量即 z-index 失效为 auto，抽屉遮罩失效）；playground.css:1075 `.pg-sc-mask` 用 `calc(var(--fandex-z-overlay, 50) + 1)` fallback 50（静默降为 51）。两处现状值 1200/1201 本身已越界（高于一切非 top-layer 的 z-index 层，含 toast 300 与全部遮罩带；top-layer 的 dialog 见注 4），随迁移一并修正。
4. 另有 .fndx-z-* 工具类（shared/layout.css:120-123，裸值 1/100/200/300），grep 全库零消费 → 删除。

裁定单一刻度（全部落在 layout-components.css:24-31 既有令牌块，新增三枚：--z-sticky、--z-dropdown、--z-overlay-top，实测需求驱动）：

```
--z-raised: 2            行内浮起（卡内伪元素/悬浮角标）
--z-sticky: 10           页内吸顶条族：面包屑/工具栏/chips/文档头行；必须低于一切遮罩
--z-toc: 20              目录吸顶条与展开面板（4.6）
--z-sidebar-backdrop: 25 侧栏抽屉遮罩（盖住页内吸顶）
--z-sidebar: 30          侧栏抽屉本体
--z-header: 40 / --z-mobile-nav: 40（后者由 .mobile-nav 底栏激活，见总表）
--z-reading-progress: 50 3px 进度条浮于头部上缘（GitHub 式；终值裁定为 50，见注 1）
--z-dropdown: 120        头部下拉菜单/工具提示浮层
--z-backdrop: 150        全屏遮罩（feature-sheet、playground 抽屉/lightbox 遮罩）
--z-modal: 200           模态与 dialog
--z-toast: 300           toast 容器与 SW 更新提示
--z-overlay-top: 1000    搜索面板、性能悬浮窗
skip-link: 10000         保留特例（BaseLayout.astro:103，注释声明唯一性）
```

裸值与遗留变量迁移总表（每行一个消费点，grep 全量核对无遗漏；行内 1/2 的规则见注 2）：

| 现场点 | 现值 | 迁移目标 |
| --- | --- | --- |
| components.css:76（sticky 顶栏）与 home-layout.css:15（同款） | 100 | var(--z-header) |
| components.css:226（.mobile-nav 移动端底栏，fixed bottom 56px；components.css:210-227 实测） | 150 | var(--z-mobile-nav)（激活死令牌；相对序与今日同构：仍高于抽屉 30/遮罩 25，低于 feature-sheet 遮罩 150——今日 150<200 与明日 40<150 均为「遮罩盖底栏」） |
| components.css:324（.install-tip 头部下拉浮层） | 200 | var(--z-dropdown) |
| components.css:450（.feature-sheet-backdrop 全屏遮罩，components.css:444-451 实测） | 200 | var(--z-backdrop) |
| components.css:474（.feature-sheet 面板，bottom:56px 叠于底栏上方） | 210 | var(--z-modal)（200，必须高于自家遮罩 150） |
| shared/layout-components.css:676 / :1040 | 2 / 1 | 行内局部整数，保留（见注 2） |
| shared/layout-components.css:1444 | 1000 | var(--z-overlay-top) |
| shared/components.css:672（.fndx-toast-container） | 300 | var(--z-toast)（激活死令牌；toast 保持 300，不得升至 1000） |
| components/sw-update.css:7（SW 更新提示） | 90 | var(--z-toast) |
| components/breadcrumb.css:73 | 90 | var(--z-sticky) |
| islands/syntax-explorer.css:5（吸顶工具栏） | 30 | var(--z-sticky) |
| islands/syntax-explorer.css:237、:255 | var(--z-modal, 300) / calc(...+1) | var(--z-modal) / calc(var(--z-modal) + 1)，删 fallback（--z-modal 恒有定义，fallback 死码） |
| pages/learning-path.css:591（lp-tech-chips 吸顶） | 30 | var(--z-sticky) |
| pages/[module]/[slug].astro:241（文档头行吸顶） | 20 | var(--z-sticky) |
| pages/algorithms/index.astro:639（视图工具栏吸顶） | 60 | var(--z-sticky) |
| components/performance-monitor.css:15 | 9999 | var(--z-overlay-top) |
| BaseLayout.astro:103（skip-link） | 10000 | 保留（特例注释） |
| islands/playground.css:593（.pg-drawer-mask） | var(--fandex-z-overlay)=1200 | var(--z-backdrop)（150：遮罩语义，且不再压过搜索面板） |
| islands/playground.css:1075（.pg-sc-mask） | calc(var(--fandex-z-overlay, 50)+1) | calc(var(--z-backdrop) + 1) |
| islands/playground.css:367,389,425(2)、820(40)、873(30)、880(60) 等岛内值 | 2-60 | 保留岛内局部刻度，playground.css 顶部注释声明「局部 2-60，遮罩层除外（用全局 --z-backdrop）」 |
| shared/layout.css:120-123（.fndx-z-* 工具类） | 1/100/200/300 | 删除（零消费，grep 实证） |
| compat-fandex.css:56-63 + tailwind.css:156-172 | --fandex-z-* / 别名块 | 前者两消费点迁完后整段删除；后者整块删除（零消费 + theme 层死码） |
| 各页 z-index:1（index.css:16,261、error.css:17、learning-path.css:4,63,139,424、algorithms.css:355、[slug].astro:202、disclaimer.astro:328、ai.astro:353、breadcrumb 外行内等） | 1 | 保留（注 2） |
| pages/algorithms.css:369（.ap-card__marks 卡内标记，实测 z-index:2） | 2 | 保留（注 2，行内 2） |
| shared/layout-components.css:1197-1211（.fndx-mobile-nav 类及其 768px 隐藏块） | var(--z-mobile-nav) | 删除类块（零 markup 消费，grep pages/components/islands 实证；删除后 --z-mobile-nav 的唯一消费者为 components.css:226 的 .mobile-nav，令牌转活） |

注 1（终值裁定，不留现场选项）：--z-reading-progress 终值钉 **50**。顶栏由裸 100 降到 40 后进度条浮于头部上缘 3px——接受为终态：进度可见性属功能优先，3px 重叠可忽略，且任何低于遮罩带 25 的替代值都无法消除其与抽屉遮罩的既存穿透（今日 50 已如此，非新增问题）。8.1 按唯一基准 50 断言。
注 2（局部整数豁免规则）：处于已定位父级栈内、语义为「盖住同栈兄弟」的行内 1/2 保留整数并配注释；凡 fixed/sticky/绝对定位的**浮层、遮罩、吸顶、弹窗**一律必须消费 --z-* 令牌，禁止新裸值入册。
注 3（铁律锚点）：SceneBackdrop 必须 fixed + z-index:-1（SceneBackdrop.astro:5-13 注释、fx.css:17-18 事故记录），迁移时显式断言其不被任何改动触碰。
注 4（top-layer 豁免）：搜索面板是原生 <dialog>（src/lib/search-palette.ts:125 实测 createElement('dialog')），恒在浏览器 top layer，任何 z-index 都在其下——刻度只治理非 top-layer 元素间的秩序，层叠手测不得拿 top-layer 面板当参照物（见 8.1 修正后断言）。

### 4.3 断点纪律（P0，含恰 768px）

本轮实测：max-width:767.98px 共 31 处、min-width:768px 5 处、max-width:1023px 2 处、min-width:1024px 7 处、max-width:1024px 1 处（components/learning-path-map.css:727），另有 640px x4（shared/layout-components.css:165,185,1322,1367）、720px x2 与 860px（playground.css:744,788,1329）、algorithms.css:575 的 860px 为容器宽度非媒体查询。裁定：

1. 规范档：移动 <768 / 平板 768-1023 / 桌面 >=1024。成对查询必须同步：(max-width: 767.98px) 与 (min-width: 768px) 互补；(max-width: 1023px) 与 (min-width: 1024px) 互补。恰 768px 整数宽走桌面布局（现状语义，保持并成文）。
2. 孤儿断点归档（P1）：(a) learning-path-map.css:727 的 max-width:1024px 恰落在验证宽度上——与 7 处 min-width:1024 在恰 1024px 双命中（该查询语义是「不宽于 1024 收合地图页为单列」），裁定改写为 (max-width: 1023px)，恰 1024px 归桌面档单值命中，并列入 8.4 的恰 1024 视检断言；(b) 640/720/860 逐个核查——能归入规范档的归档；确属组件自身布局需要的（如 playground 双栏在 860 折叠）保留但注释声明理由。禁止新增规范档之外的断点。
3. 视检要求：恰 768px 与恰 1024px 宽度各截明暗两套；Playwright setViewportSize 不派发 resize 事件，resize 依赖逻辑须手动 dispatchEvent（constraints §4:51）。
4. TOC 的 1023/1024 对（layout-components.css:996,1006）随移动端目录改造（4.6）重写，是本轮唯一允许动这对查询的地方。

### 4.4 侧栏（P1）

1. 当前项指示：模块色 2px 左刻度 + 字重 600（若现态为浅色叠加则换刻度线，对齐 3.3 第 2 条的位置指示口径）。
2. hover 仅底色 --color-bg-hover；禁止指近位移型效果（typelex LineSidebar 模式已裁 avoid：长列表滚动每帧成本 + 干扰阅读定位）。
3. 条目命中区垂直外扩 6px（::before inset: -6px 0，typelex LineSidebar.css:57-63 近零成本细节）。
4. 抽屉态 z 随 4.2 刻度迁移，遮罩必须低于抽屉（layout-components.css:24-31 注释约束保持）。

### 4.5 面包屑（P2）

Breadcrumb.astro:31-44 的移动端省略号折叠保持；不引入 Docusaurus 式中间项下拉（层级固定 2-3 级，收益近零）。仅随 4.1 换壳时对齐高度与 --font-size-secondary。

### 4.6 目录与移动端目录（P0——全站最大 UX 差距）

现状：.fndx-toc 在 max-width:1023px 直接 display:none（layout-components.css:1006-1010），全站 2071 页移动端零页内导航；桌面右栏 TOC 已有分组折叠 + IntersectionObserver 高亮 + 持久化（TableOfContents.astro:26-28,199-311）。裁定（照 Starlight MobileTableOfContents 原生 details/summary 模式，基准调研 adopt-1）：

1. <1024px：.fndx-toc 重排为吸顶折叠条（sticky，top: calc(var(--nav-height) + 0px)，z-index --z-toc），summary 行高 2.5rem 显示「本页目录：{当前标题}」（当前标题复用既有 IntersectionObserver 的 active 态，仅回显文本）。
2. 展开 panel：绝对定位、max-height 85vh、overscroll-behavior contain、1px 边框 + --radius-modal 8px。层级规则（确定值，防实施分歧）：吸顶条整体 z-index: var(--z-toc)（20，低于 header 40）；展开面板作为吸顶条的子元素**不另设 z-index**——同一栈上下文内自然高于页面内容、低于头部；明令禁止消费 --z-overlay-top/--z-backdrop 等浮层令牌（目录不是模态）。
3. 关闭交互：选中链接、点击外部、Esc 三路关闭；astro:page-load 重新初始化（复用现有生命周期，constraints §3:37 清理模式）。
4. 桌面 >=1024 行为完全不变；TOC 尾部补「回到开头」行（基准调研 adopt-4），滚动 >2 屏后可用。
5. 新增 vanilla JS 预算 <= 1.5KB gz（并入现有 TOC 脚本文件，不新建 island）。

### 4.7 页脚（P2）

Footer.astro 链接组换 3.5 双层下划线；/ai/ 唯一入口链（Footer.astro:81）保持；全站壳统一后页脚在 HomeLayout/Layout/404/disclaimer 四处仅允许一份实现。

### 4.8 独立壳页与 SW 供旧（P0 纪律）

1. 404/disclaimer/ai/design-system 消费 shared/tokens 副本，令牌批次会自动带齐；视觉验收含此四页。
2. 视检前必须 SW 全 unregister + caches 全删 + reload（constraints §4:52），防新旧 CSS 混存假阴性；本轮改 CSS 面大，此协议为硬性前置。

---

## 5. 分域改造要点

### 5.1 shell（全局框架与导航）

1. P0 SiteHeader 抽取，两壳顶栏标记归一（4.1；移动底栏维持 Layout.astro 单点，见 4.1.2 修订）。
2. P0 z-index 刻度统一 + --fandex-z-* 退役 + 裸值迁移（4.2，逐点清单在 4.2.3）。
3. P0 断点纪律成文 + 孤儿断点核查（4.3）。
4. 字体加载（修订：preload 按需化**经评估后否决**）：原设想把 jetbrains-mono-400 preload（BaseLayout.astro:79-85，21,168B）改为按页声明以省非代码页请求。否决依据（实测）：fonts.css 本就全站异步加载（BaseLayout.astro:59-64，media=print onload 切换），且首页 module-card 的 .card-icon 消费 var(--font-family-mono)（components/module-card.css:75）——首页仍必然触发 mono 字体下载，摘 preload 只会把「预载」变成「CSS 应用后晚发现」（FOUT/CLS 陷阱），零净收益。**保留现状三连 preload 不动**；本条仅保留可落地的一半：为 IBM Plex Sans 增加 metric 兼容 fallback @font-face（size-adjust/ascent-override/descent-override，指系统栈，0 字节，压 swap CLS；数值须实现任务实测校准后写入 public/fonts/fonts.css）。改后必跑 LHCI（perf>=0.85）双验证。
5. P1 ThemeToggle 三态（light/dark/system）：bootstrap 对 system 走 matchMedia 并监听 change（ThemeLangBootstrap.astro:16-21 现仅首访读系统偏好，手动切过后永久偏离 OS）；~1KB 脚本。
6. P2 性能悬浮窗与 SW 提示样式随 --z-overlay-top 归拢（performance-monitor.css:15）。

### 5.2 home（首页与工作台门面）

1. P1 hero 主 CTA 换 3.6 双层滑动；entry-btn 中其余保持 ghost/secondary 语义。hero 标题拆字（index.astro:32 data-fx-split="pop"）与 stats reveal 保持现状（参数属既有艺术参数）。
2. P1 ModuleCard 圆角/角标归档（3.1 清理清单）；hover 语言保持顶线 scaleX + 边框 tint（module-card.css:24-46），新增规则禁止叠加第二种 hover 光效。
3. P1 分类横滑补 scroll-snap（x proximity）与自定义 scrollbar（细 1px 轨道）；不加两端 mask 渐隐（mask+fullPage 截图合成假象已知坑，constraints §4:51，且裁切暗示易误读）。
4. P2 CSS 归位：index.css 651 行被 syntax/learning-path 以 home-page--sub 共享（勘察 notes），抽 hero-sub 公共段到独立文件（styles/pages/home-shared.css），三页回归截图后删除耦合。
5.（修订：本期整体剔除，无候选件）marquee 循环带与 spotlight 跟随光斑自本期移除——marquee 需新增 @keyframes（与 6.2「新 keyframes 未经评审不入册」冲突）且其两端渐隐 mask 正是 5.2.3 明令规避的截图合成假象手法；spotlight 属跟随光效，与 1.4「不进入语言的光效」擦边。二者移入 7.2 放弃清单；若未来真有 ticker 内容需求，走一次独立设计评审再议。

### 5.3 docs（文档阅读页，2083 页单模板）

（口径注：2083 篇为勘察期 node 实测 doc-index.json 的文档数；constraints §1:17 的「2071+ 页」为构建页数旧统计。两者口径不同——文档页 + 模块页/功能页/壳页构成构建总量，以构建实测为准，本规格引用文档数处均指 2083 篇。）

1. P0 移动端目录（4.6 全套）。
2. P0 代码块 SSR 化 + Shiki transformers + 头栏（2.6 全套）。
3. P0 .prose 行宽帽 --size-prose-measure 68ch（2.4，含帽名单补齐）。
4. P1 表格三件：表头降噪 / tabular-nums / hover 刻度环（2.7）。
5. P1 标题 h4-h6 精修（2.5）+ TOC「回到开头」（4.6.4）。
6. P2 引用微调与 hr 细化（2.8/2.9）。

### 5.4 learnpath（学习路径与 48 张地图）

1. P1 地图岛水合维持 client:load：评估结论为否决改 client:visible——地图是该页首屏主内容（learning-path/[tech]/index.astro:130），visible 触发无收益且引入首帧延迟风险；此评估写入提交说明防重复议。
2. P1 明暗对比审计：MapNode/MapEdge/进度态（lp-progress-ui）在 #0A0A0A 底上按「文本 4.5:1、UI 线 3:1」核查；未达标节点边框/文字提档（neutral 阶梯内解决，不引新色相）。
3. P1 MapControls 按钮换 .fndx-icon-btn（含缩放/回中/全屏），DetailPanel 选中项换反色墨水（3.3）。
4. P2 两份页级 CSS（learning-path.css 783 行 + learning-path-map.css 761 行）中重复的暗色覆盖段合并；合并以 before/after 全量截图回归为前置。
5. P2 lp-canvas 坐标纸网格属功能性允许层（C4 白名单），维持现状不入动效预算。

### 5.5 playground（在线前端实验室）

1. P1 工具栏基元收敛：.fndx-button/.fndx-icon-btn 令牌替换（3.2.5 清单），行为脚本不动。
2. P1 岛内局部 z 刻度边界注释化 + 模态层对齐 --z-modal（playground.css:367-880 的 2-60 保留为局部刻度，4.2.4）。
3. P1 恰 768px 双栏折叠核查（720/860 断点归档结论落注释，4.3.2）。
4. 明令不动：pg-showcase.ts 21 处旧 #0a0e14（历史遗留，constraints 裁定勿清勿扩散）；CodeMirror 主题 { dark:false } 与 caretColor 钉死项（C7）。

### 5.6 features（语法速览与算法题库）

1. P1 syntax-explorer.css:237 的 --z-modal 300 裸默认改引全局 --z-modal；岛内其余层级随 4.2 归档。
2. P1 algorithms/index.astro 页内嵌 style 块（:636 起）迁入 styles/pages/algorithms.css，类名不变，消除样式归属碎片化。
3. P1 教程/题图鉴 ?view= 分段切换（algo-views.ts:5-31）选中段换反色墨水（3.3），默认视图 SSR 不变（无首帧闪烁要求保持）。
4. P2 题目详情页 problems/[slug]/index.astro 的题面/评论区宽度对齐 --size-prose-measure（文档正文同律）。

### 5.7 standalone（独立壳页与杂项）

1. P0 design-system.astro 升级为本规格的活体标本页：按钮四层级三尺寸、圆角五档、反色墨水选中、刻度线语言、字号阶梯、代码块（含 title/行高亮/diff/focus 各一例）、表格三件、移动 TOC 演示——它是第 8 节验收的目视基准，随各 P0/P1 交付同步更新（DesignSystemDemo.tsx + 该页保持 noindex 与 sitemap 排除，astro.config.ts:81）。
2. P1 404/disclaimer：ghost「返回首页」按钮 + 令牌化配色对齐；404 大数字用 Chakra Petch display 档；无 canvas（错误页不引 fx 脚本链）。
3. P2 error.css（260 行）随上述收敛删冗余。
4. 明令不动：offline.html:20 与 manifest 旧色值（历史遗留）；llms.txt/rss.xml 端点。

### 5.8 全域横切（令牌批次，P0 前置）

所有 P0/P1 的令牌变更合并为**一单 DTCG 批次**先行落地（shd-shared/tokens/ 改源 → `pnpm --filter @fandex/tokens build:css` → 手工同步 app-web/src/styles/shared/tokens.css → build 过 check-tokens-drift）：

1. semantic/radius.json：control/card/modal/badge 重映射（3.1 表）。
2. semantic/size.json：新增键 size.prose.measure = 68ch（生成名 --size-prose-measure，见 2.4.1 命名通道说明）。
3. semantic/font.json：补 CJK 12px 下限与灰阶使用纪律注释（零数值变更）。
4. 批量替换 needle 一律带右括号 `var(--name)`；脚本先统一路径分隔符再判 includes('shared/')（C3）。
5. **OD-1 待裁决项（编排者/用户拍板后方可执行，未拍板前实现任务不得触碰）**：暗色背景基色 --fx-scene-base 现值 #0A0E14（styles/variables.css:56，全库唯一暗色定义，fx.css:26 由 .fx-backdrop 实时消费）是被 C2 否决的冷青色，且紧邻注释 variables.css:54-55 自称「纯黑灰板（#0A0A0A 系）」——注释与值自相矛盾，证明值是裁定前的陈货；variables.css:57 的 --fx-scene-vignette rgba(2,6,10,0.55) 同为冷调。constraints §0:8 的遗留豁免清单（theme-color meta/offline/pg-showcase）并未包含此处，它是全站最显眼的背景层基色。裁决选项：(a) 推荐——本令牌批次内改 --fx-scene-base: #0A0A0A、--fx-scene-vignette: rgba(10,10,10,0.55)（中性黑化，与 C2 一致；不动 --fx-ambient-ink/--fx-ambient-accents，二者属 letter-glitch 邻接参数白名单），并在 8.1/8.8 加背景基色断言；(b) 用户若坚持保留冷调，则正式把 variables.css:56-57 写入明令不动清单并同步修正该处注释与 C2 表述。两个选项都成立，但不可维持现状的「注释说 A、值是 B」。

---

## 6. 动效预算

### 6.1 允许清单（每条含位置与降级）

| 动效 | 用在哪 | 参数 | 降级 |
| --- | --- | --- | --- |
| data-fx 体系（reveal/split/decrypt/count-up） | 静态页声明式标记 | 既有 art 参数不变 | [data-fx-ready] 门控 + 全局 reduced-motion 兜底（global.css:101-105）+ text.ts 自带 aria |
| hover 过渡（底色/边框/文字/下划线） | 全站 | instant 75ms / fast 150ms（motion 令牌） | transition 自动降级；禁 hover 改写 animation-duration（C7） |
| ModuleCard 顶线 scaleX + icon 提亮 | 模块卡 | normal 250ms out | 全局兜底 |
| 双层下划线 hover | 导航/页脚/卡片标题链接 | 150ms | 全局兜底 |
| CTA 双层文字滑动 | 每视图至多 1 枚 | fast 150ms | 全局兜底 |
| copy 反馈 copied 态 | 代码块 | 2s 回退 | 无 JS 时按钮 SSR 在但点击无效果，可接受 |
| view transitions 交叉淡化 | ClientRouter 默认 | 默认参数 | 浏览器不支持即直跳 |
| 阅读进度条宽度 | 功能性 | 跟随滚动 | 功能性，豁免装饰降级语义 |

氛围循环（4s-60s）属令牌体系外艺术参数（C5）：现存 hero 标题 background-clip 渐变平移（index.css:57-60，heroBgPan 12s）维持为**全站唯一** background-clip:text 连续动画实例，禁止新增同类；律动装饰（eq/orbit/note/trio/star/num，decor-config.ts）维持现状白名单。

### 6.2 禁止清单

第二个背景层（一切新 canvas/固定定位装饰并入 SceneBackdrop 或不做）；网格/点阵底纹；泛光光晕/柔光扫描带/流动光边（border-beam 类无限 offset-path）；玻璃拟态 blur 面板；磁吸按钮；dock；JS 版文字微光（fndx-shimmer CSS 版已存在）；hover 改写 animation-duration；未经 1.4 授权的点状装饰；新 @keyframes 未经本规格评审入册（现有 40 个自建 keyframes 为存量基线，新增须在本文件追加记录）。

### 6.3 降级总则

一切动画尊重 global.css:101-105 全局兜底，单文件不重复写 @media（C6）；每条新动效在 PR 描述声明「reduced-motion 下的表现」；功能性动效（进度条、地图 panzoom、抽屉开合）豁免装饰性降级语义但禁位移型装饰化。

---

## 7. 技术栈与性能决策

### 7.1 采纳（调研 → 决策）

| 决策 | 来源 | 落点 |
| --- | --- | --- |
| 移动端 TOC（Starlight details 模式） | 文档框架基准调研 adopt-1 | 4.6 |
| Shiki 构建期 transformers + SSR 代码框架 | 同上 adopt-2/3 | 2.6 |
| .prose 行宽帽 62-74ch 纪律 | typelex 调研 adopt-1 | 2.4 |
| 反色墨水选中态 | typelex adopt-5 | 3.3 |
| 表头降噪 + tabular-nums + 行 hover 环 | 基准调研 + typelex adopt-7 | 2.7 |
| 零依赖 CSS 双层下划线 / CTA 滑动 / bento 布局模式 | 组件库调研 adopt-2/3/5 | 3.5 / 3.6 / 5.2（bento 未单列，归入 5.2.4 页面结构精修可选；adopt-1 marquee 已否决，见 7.2.11） |
| IBM Plex metric fallback（mono preload 按需化部分已否决，见 7.2.13） | 性能调研 adopt-1 | 5.1.4 |
| spotlight 自写模式 | 组件库调研 adopt-4 | **否决移出**（评审修订：光效与 1.4 擦边，见 7.2.12） |
| WarmTooltip 暖提示 | typelex adopt-6 | **缓期至第 2 期**：本期交付面已满，且需新 island（约 200 行）；记入 backlog |
| registry:ui 单件引入工作流 | 组件库调研 adopt-6 | 引入任何第三方组件时的强制路径 |
| 字体维持自托管 latin 子集 + swap | 性能调研 adopt-2 | 2.1 |
| ClientRouter + astro:page-load 生命周期纪律 | 性能调研 adopt-4 | C7 维持 |

### 7.2 放弃（含实测理由）

1. **七个 3D 运行时全拒**（性能调研实测）：three@0.186.1 核心 104,624B gz（且双入口都要拉）；deck.gl@9.4.1 UMD 577,381B gz；hilo3d 112,619B gz；claygl 114,016B gz（且 2019 年停更）；hilo3d 2024-12 停更；babylon MB 级；playcanvas 无预打包 dist。对照 letter-glitch 已是零依赖手写 WebGL2（fx/layers/letter-glitch.ts），任何 3D 运行时都超全站客户端 JS 总和。
2. gsap 系（27,206B gz）与 fx/effects/text.ts 的 data-fx-split/decrypt 完全重复；ReactBits 新一代组件（Dock 47KB/SpotlightCard 12KB 源码级）为参数化动效引擎且许可为 MIT + Commons Clause 混合，整库不取；typelex PillNav 弹簧导航同涉 Commons Clause 源头且常驻 rAF，不取。
3. tsparticles（sparkles 依赖链）/ ogl（34,177B gz）shader 系：正面违反 C4。
4. magicui magic-card（next-themes 引入第二主题真源，与 ThemeLangBootstrap [data-theme] 机制冲突）；motion-primitives spotlight 实现（越权改父元素 style）——模式可借、实现必自写。
5. JS 驱动 text-shimmer / 动画网格底纹族：前者有 CSS 版，后者违反 C4。
6. 全站 motion/framer runtime（估计 +15-30KB gz 未实测）：岛内动效用 src/motion/presets.ts 拼装，motion ^14.4.0 维持仅 DesignSystemDemo 消费的现状隔离。
7. typelex 的 15px 正文（FANDEX 保持 16px 阅读基准）、3/5/8/11/14/18px 圆角阶（归 3.1 五档）、玻璃拟态材质、滚动容器底部 mask 渐隐（截图合成假象 + 阅读安全感）、单色相 aliases（会误伤 --module-color 机制）。
8. Docusaurus 面包屑下拉、Mintlify Twoslash（构建期 TS 编译链 + 主内容非 TS）、长代码块折叠、行号全局常开、画廊站霓虹/玻璃/3D 手法、低对比大字入正文。
9. VitePress 式「移动端砍 TOC」记为反例（恰是四基准唯一缺席者）。
10. LearningPathMap 改 client:visible（5.4.1 评估否决）。
11. marquee 循环带（评审修订剔除）：需新增 @keyframes 与 6.2 入册规则冲突，其两端渐隐 mask 与 5.2.3 的截图合成假象规避直接相抵；条件门「内容方提供数据即可」留得过宽，与本轮分寸原则不符。
12. spotlight 跟随光斑（评审修订剔除）：属光效语言，与 1.4「明确不进入语言的发光」擦边；且唯一收益场景（精选卡 hover）已由既有顶线 + 边框 tint 覆盖。
13. jetbrains-mono-400 preload 按需化（评审修订否决）：首页 module-card .card-icon 消费 var(--font-family-mono)（module-card.css:75）+ fonts.css 全站异步加载（BaseLayout.astro:59-64），摘 preload 仅把预载变晚发现，零净收益。

### 7.3 依赖增删清单

- 新增（devDependencies，构建期）：`@shikijs/transformers`，钉 4.5.0（2026-10-30 实查 registry.npmmirror.com：latest 4.5.0，deps @shikijs/core@4.5.0 + @shikijs/types@4.5.0，与项目 shiki ^4.5.0 同版本线，配对前提已核验；经 pnpm-workspace.yaml catalog 声明）。客户端体积影响 0。
- 删除：无。
- 维持不动：@pagefind/windows-x64（constraints §1:19）；pnpm overrides @lezer/common 1.5.3；motion ^14.4.0（隔离现状）；lucide-react 摇树消费。
- 运行时依赖净增：**0**。

### 7.4 冲突上报：KaTeX output（约束 vs 配置，须编排者裁决）

- 约束 §3:42 写明「KaTeX 已切 output:'mathml'（体积 1/5，勿改回 html）」，tests/smoke.spec.ts:33 用例名亦称 mathml。
- 但 astro.config.ts:109-112 实际为 `output: 'htmlAndMathml'`，且行内注释记载了刻意回退理由：「mathml 输出依赖浏览器内置数学字体，字号飘忽、占比不稳」。
- 两者矛盾。性能调研建议切回 mathml 省 katex.min.css 与字体请求，但配置注释表明该路线已被尝试并因渲染质量问题回退。
- **本期裁定：不动**。改此配置牵动 520 篇公式文档观感 + 冒烟用例 + LHCI，不属排版精修范畴。推荐编排者二选一：(a) 修订约束 §3:42 文本承认 htmlAndMathml 为现行决议（成本零）；(b) 立专项解决 mathml 字号校准后再切（收益：公式页甩掉 katex.min.css）。在裁决前，任何任务不得触碰该配置行。冒烟用例名与实现不符（断言 `.katex math` 在 htmlAndMathml 下同样满足）一并提请修订。

### 7.5 预算表

| 预算项 | 上限 | 校验方式 |
| --- | --- | --- |
| 新运行时依赖 | 0 | package.json diff 评审 |
| 新增客户端 vanilla JS | <= 1.5KB gz 合计（仅移动 TOC；代码块委托化改造为净减；marquee/spotlight 已剔除无 JS） | 构建产物前后对比 + ANALYZE_BUNDLE |
| island 点位 | 维持 6 个不增 | grep client: 计数 |
| 全站关键路径 CSS 净增 | <= +6KB gz（新增移动 TOC/代码头栏/表格三件，抵扣删除的客户端改写相关样式与角标） | 构建产物前后对比 |
| LHCI | perf >= 0.85（error 档）、LCP <= 2500ms、CLS <= 0.1（error 档）、字体 <= 300KB（app-web/lighthouserc.json:6-24 三 URL：/、/markdown/、/syntax/） | 改版全程每阶段跑 |
| 字体 | 零新字体文件；preload 三连维持现状（按需化已否决，见 7.2.13）；仅新增 0 字节 metric fallback @font-face | fonts.css diff 评审 |
| 构建时长 | 增幅 <= 10%（基线 16-17 分钟，constraints §1:17） | build 日志 |
| letter-glitch 参数 | 0 变更 | SceneBackdrop/fx 层 diff 评审 |
| 背景层数量 | 恒为 1（SceneBackdrop，z-index:-1） | DOM 探针（constraints §4:50） |

---

## 8. 验收清单（分域，供视检评审）

通用前置（每个域的视检都必须先执行）：

- [ ] 门禁序：lint 0 错 → typecheck 0 错 → qa 通过 → build 全绿（含 tokens-drift）→ playwright 冒烟 6 用例 → LHCI 三 URL perf >= 0.85。
- [ ] SW 供旧清除：navigator.serviceWorker 全 unregister + caches.keys 全删 + reload 后再检（constraints §4:52）。
- [ ] 明暗双主题各一遍；恰 768px 与恰 1024px 视口各一遍（resize 依赖手动 dispatchEvent）。
- [ ] 无 emoji 扫描（新增代码/文案 grep 命令：`node -e "process.exit(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(require('fs').readFileSync(process.argv[1],'utf8'))?1:0)" <file>` 抽检关键新文件）。

### 8.1 shell 域

- [ ] 三壳（文档页/首页/404）头部标记同源：DOM 结构对比，搜索/安装/主题按钮 data-* 属性一致；404 仅 ghost 返回按钮。
- [ ] z-index：fx-backdrop 探针 = -1；层叠手测参照物改为**性能悬浮窗 vs toast vs SW 提示**（性能悬浮窗 --z-overlay-top 1000 应盖过 toast 300 与 SW 提示 300；搜索面板是 top-layer dialog，search-palette.ts:125 实测，不参与 z-index 比较，禁止当参照物）；grep 断言五连：--fandex-z-* 零残留、tailwind.css 无 --z-index- 别名块、layout.css 无 .fndx-z-* 工具类且 .fndx-mobile-nav 死类已删、playground.css:593/1075 已改引 --z-backdrop、syntax-explorer.css:237 无 fallback 死码；--z-toast 消费者存在（.fndx-toast-container、sw-update）且值仍 300；.mobile-nav 底栏消费 --z-mobile-nav 且恰 768px 断点行为不变。
- [ ] 阅读进度条按钉死的 50 断言：浮于头部上缘 3px 为终态（注 1），无替代值；面包屑/语法工具栏/lp chips/文档头行吸顶条全部低于抽屉遮罩（开移动端抽屉时吸顶条被遮罩盖住）。
- [ ] OD-1 若裁 (a)：暗色主题 body 背景与 .fx-backdrop 基色 = #0A0A0A（取色器实测 hex），vignette 中性无冷调；若裁 (b)：确认 variables.css:56-57 零 diff 且注释与 C2 表述已同步修订。
- [ ] 恰 768px：顶栏与移动底栏切换无重叠、无横向滚动条。
- [ ] 字体：三连 preload 维持现状（按需化已否决）——首页/文档页 HTML head 的 mono preload 一致；新增 IBM Plex Sans metric fallback @font-face 生效（devtools 观察 swap 期间无布局跳动）。
- [ ] ThemeToggle 三态循环，system 态下改 OS 偏好页面跟随（手动 dispatch matchMedia change 验证）。

### 8.2 home 域

- [ ] hero 拆字/数字滚动在 reduced-motion 下直接呈现终态（无空白等待）。
- [ ] 主 CTA 双层滑动动画方向/回弹自然，键盘 focus 不触发位移错乱。
- [ ] ModuleCard：圆角 4px、hover 仅顶线+边框 tint+图标提亮（无第二种光效）；键盘 focus-visible 2px outline 可见。
- [ ] 分类横滑 scroll-snap 生效、滚动条 1px 细轨、触屏可滑。
- [ ] 首页 LHCI perf 维持 >= 0.85。

### 8.3 docs 域（抽查 4 页：普通短文 / algorithm/290-NetworkFlow 长文 / javascript/page/2 分页 / 含公式页）

- [ ] 桌面：正文行宽 30-40 全角字（量测 p 元素宽度 ≈ --size-prose-measure），代码块/表格/mermaid/图片全宽不被帽；提示块（admonition）、折叠块（details）、脚注区与段落同宽（无宽度锯齿）。
- [ ] 移动（<1024px）限有目录页面（headings >= 3：TableOfContents.astro:20-28 的 minCount=3 与 shouldRender 决定少标题页不渲染目录——抽查四页中的短文按「不渲染吸顶条」为正确行为断言，不按「吸顶条出现」断言防假阴性；长文页：吸顶条出现，summary 回显当前标题，展开/选链/外点/Esc 四路交互正确，panel 滚动不穿透 overscroll-behavior）。
- [ ] 代码块：HTML 源码即含 figure.code-block 与 copy 按钮（关 JS 仍可见框架与语言名）；{n} 行高亮/[!code ++]/[!code focus]/title 头栏各出一样例页验证；has-overflow 遮罩不与头栏打架。
- [ ] 表格：表头 8% tint + 2px cyan 底线；数字列 tabular-nums（列宽滚动前后稳定）；窄屏横向滚动正常（1294 页裸表抽查 3 页）。
- [ ] h4 刻度线样式落地且目录锚点/滚动高亮联动无回归（TOC IntersectionObserver 验证）。
- [ ] TOC 尾部「回到开头」行存在且滚动后可用。
- [ ] 全站文档页 CLS <= 0.1（LHCI /markdown/ URL）。

### 8.4 learnpath 域

- [ ] 明暗两套下节点文字/边线对比度抽查（文本 4.5:1、线条 3:1，取 3 张图各 5 节点）。
- [ ] MapControls 为 .fndx-icon-btn，hover/active/focus 态与全站一致；DetailPanel 选中项反色墨水。
- [ ] panzoom 拖拽/缩放在恰 768px 触屏模拟可用；进度态刷新后保持（lp-progress-ui 回归）。
- [ ] 总览页与地图页移动端无横向溢出。
- [ ] 恰 1024px 视口：地图页走桌面布局（lp-map__body 双列，learning-path-map.css:727 已改 1023px，无双命中）。

### 8.5 playground 域

- [ ] 工具栏按钮全量令牌化（grep 无脱离 --button-* 链的硬编码尺寸）；tooltip 正常。
- [ ] 岛内弹层（确认框/图鉴 lightbox）压在 --z-modal 刻度，与全局搜索面板无穿透。
- [ ] 恰 768px：编辑器/预览布局折叠符合 860/720 归档结论（无半 broken 中间态）。
- [ ] pg-showcase 旧色值 21 处零 diff（明令不动项核验）。

### 8.6 features 域

- [ ] syntax 岛模态层级随新刻度；搜索面板与速览浮层互不穿透。
- [ ] algorithms 双视图切换：选中段反色墨水、?view=problems 直达 SSR 无闪烁、URL 回退正常。
- [ ] 页内嵌 style 块已迁空（grep algorithms/index.astro 无 <style>），样式单源 algorithms.css。
- [ ] 题目详情页排版对齐 measure 帽；代码示例块走新代码体系。

### 8.7 standalone 域

- [ ] design-system 页含本规格全量标本（按钮/圆角/选中/刻度/字号/代码四例/表格），且与实物页面观感一致。
- [ ] 404/disclaimer：ghost 返回按钮、令牌配色、明暗两套、无 canvas 注入（网络面板零 fx 脚本请求）。
- [ ] 明令不动清单零 diff（1.3.4 全量入册五处：ThemeLangBootstrap.astro:29、offline.html:20、pg-showcase.ts 21 处、theme.ts:9、FrontendLab.tsx:51；manifest 旧色值同验）。

### 8.8 全域终检

- [ ] 全量 build 产物 diff 评审：无意外文件（doc-index.json 重写随带无妨，constraints §5）。
- [ ] OD-1 裁决留痕：规格 5.8.5 的裁决结果（a 改色 / b 入册不动）写入 PR 描述；未获裁决前该两项变量保持零 diff。
- [ ] ANALYZE_BUNDLE 产物前后对比：客户端 JS 总量不增；CSS 增量在预算内。
- [ ] 17 条 keyPages 全量走查一遍（明暗 x 移动/桌面抽样组合），截图入 .workflow-tmp/shots/ 留档。
- [ ] 本规格「明令不动」清单逐项零 diff 复核。

---

## 9. 优先级分期建议（供编排者排程）

- **P0**（先行，一次令牌批次 + 两大硬差距 + 结构债）：横切令牌批次（5.8）→ 三壳头部统一与 z 刻度（4.1/4.2，含 4.2 迁移总表逐行核对）→ 移动端 TOC（4.6）→ 代码块 SSR + transformers（2.6）→ 行宽帽（2.4，含帽名单补齐）→ design-system 标本页同步（5.7.1）→ lp-map 1024 断点改写（4.3.2a，恰 1024 验证前置）。
- **P1**（主体精修）：表格三件、标题精修、按钮收敛、反色墨水、链接/CTA 微交互、IBM Plex metric fallback、三态主题、各域令牌归档与样式归位。
- **P2**（收尾）：WarmTooltip（第 2 期）、引用/hr 微调、面包屑对齐、lp CSS 合并、error.css 收敛。（marquee/spotlight 已剔除，见 7.2.11-12）

---

## 10. 修订记录

- v1.1（2026-10-30，评审轮修订）：
  1. 4.2 整节重写：更正「两套刻度」前提（tailwind 别名块是 theme 层零消费死码，处置改为整块删除）；补全裸值清单（新增 components.css:226/324/450、layout-components.css:676/1040、breadcrumb.css:73、sw-update.css:7、syntax-explorer.css:5、learning-path.css:591、[slug].astro:241、algorithms/index.astro:639、home-layout.css:15、layout.css:120-123，全部本轮 grep 实测）；修正 300/toast 矛盾（裸 300 归 --z-toast，--z-toast 激活为真消费，搜索面板/SW/性能悬浮窗归 --z-overlay-top）；--fandex-z-* 仅有的两个真实消费点（playground.css:593 无 fallback、:1075 fallback 50）定向映射到 --z-backdrop；新增三枚令牌 --z-sticky/--z-dropdown/--z-overlay-top；成文局部整数豁免规则与进度条/顶栏倒置的观感变化决策。
  2. 2.4/5.8：令牌名改为 --size-prose-measure（DTCG size.* 键生成 --size-* 前缀，实测生成物佐证），并写明手工裸名会挂 drift 门禁。
  3. 4.6.2：展开面板层级改为确定规则（吸顶条整体 --z-toc 20、面板随栈上下文不另设值，禁浮层令牌），消除「低于 header 又用 1000」矛盾。
  4. 4.3：补 max-width:1024px 孤儿查询（learning-path-map.css:727），裁定改写 1023 并入恰 1024 验收。
  5. 过度约束裁剪：mono preload 按需化否决（首页 .card-icon 消费 mono 实证）；marquee/spotlight 剔除并移入放弃清单；行宽帽名单补齐 details/admonition/footnotes。
  6. 事实修正：2.8 tint 明档 8% 改 10%（typography.css:632 实测）；@shikijs/transformers 与 shiki 4.5.0 同版本线配对经 registry 实查确认。
- v1.2（2026-10-30，第二轮评审修订）：
  1. 新增 OD-1 待裁决项（5.8.5）：暗色背景基色 --fx-scene-base #0A0E14（variables.css:56 实测，fx.css:26 消费，注释自称 #0A0A0A 系）与 C2 冲突，推荐改 #0A0A0A + vignette rgba(10,10,10,0.55)，未拍板前禁触；1.3.4/8.1/8.8 同步挂条件断言。
  2. 明令不动清单补全至五处（新增 theme.ts:9 THEME_COLOR_DARK、FrontendLab.tsx:51 岛内示例串，均实测），8.7 零 diff 核验同步。
  3. 4.2 总表两行误标修正（实测 components.css:210-227/444-451/470-476）：:226 为 .mobile-nav 底栏改映 --z-mobile-nav（激活死令牌；并增行删除零 markup 消费的 .fndx-mobile-nav 死类 layout-components.css:1197-1211）；:450 为 .feature-sheet-backdrop 改映 --z-backdrop、:474 面板改映 --z-modal（高于自家遮罩）。
  4. 4.1.2 前提修正：mobile-nav 仅 Layout.astro:93 一处（HomeLayout grep 零命中），撤销 SiteMobileNav 抽取，首页不新增底栏。
  5. 注 1 终值钉死 --z-reading-progress=50，删除现场二选一；新增注 4 top-layer 豁免（search-palette.ts:125 实测原生 dialog），8.1 层叠参照物改为性能悬浮窗 vs toast/SW。
  6. 小疵清理：algorithms.css:369（z-index:2）移出行内 1 行单独成行；5.3 补 2083（doc-index 实测）与 2071+（构建旧统计）口径注；8.3 移动 TOC 验收限定 headings>=3 页面、短文按不渲染断言。

每期收尾按第 8 节对应域清单 + 通用前置执行，静态门禁全绿不等于通过（constraints §4）。
