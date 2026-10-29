# FANDEX web UI/UX 改版运行约束（本轮所有子代理必读）

版本：2026-10-30，由编排主控根据项目记忆蒸馏。与本文件冲突的旧习惯一律以本文件为准。

## 0. 最高约束

- **禁止 emoji**：代码、注释、文档、UI 文案、提交信息、PR 描述一律不得出现 emoji 及其变体选择器（含 U+2713 U+26A0 U+2605 U+2630 U+FE0F）。允许的符号仅纯文本箭头与数学符号（← → ↓ × ≡）。不确定时不用。
- **暗色模式底色裁定（用户裁定，勿回潮）**：纯黑灰板 neutral = #0A0A0A/#141414/#1F1F1F/#2A2A2A/#404040/#525252/#737373/#A3A3A3 + 青系 cyan-400/500/600 = #00BCD4/#00E5FF/#4FF2FF。冷青调 #0A0E14 系曾被用户否决（感知为"蓝色"）。亮色模式 = 冷雾灰板（#EBEFF3 系）+ cyan-100/200/300，已为终态。theme-color meta、offline.html、pg-showcase 尚有旧 #0a0e14 硬编码，属历史遗留，不要主动扩散到新代码。
- **令牌唯一真源**：shd-shared/tokens/（DTCG JSON 源）→ `pnpm --filter @fandex/tokens build:css` → 手工同步副本 app-web/src/styles/shared/tokens.css。check-tokens-drift.mjs 门禁挂在 dev/build 链。改令牌必须走 DTCG 源并同步副本，禁止只改副本。site.css 是样式单一入口；src/styles/shared/ 是同步副本，批量脚本必须排除（Windows 反斜杠路径下 includes('shared/') 会失效，先统一分隔符）。批量改 CSS 令牌时 needle 必须带右括号 `var(--name)`，裸前缀匹配会改坏长名。
- **fx 铁律（2026-10-25 用户视觉裁定，勿再加回）**：全站只允许一个背景层 = SceneBackdrop（fixed + z-index: -1）；禁止网格底纹、泛光光晕、柔光扫描带、波浪线海浪线条；letter-glitch 字符海为终态（fontSize 18、density 0.4、baseOpacity 0.16、flow 0.6、故障扫描概率 0.12，勿调参）。软渲染（swiftshader/llvmpipe 等）跳过画布层是刻意设计，禁止"修复"。允许保留：律动装饰（eq/orbit/note/trio/star/num）、暗角（压暗非发光）、letter-glitch、lp-canvas 功能性坐标纸网格。背景层 z-index 必须 -1（曾把无 transform 的侧栏整列遮黑）。
- **分寸原则**：本轮是排版/组件/导航/交互细节的系统性精修 + 性能优化，不是视觉爆炸。新增依赖必须论证体积与收益；默认不引入 Three.js/Babylon.js/deck.gl 等重型 3D 运行时（fx 体系已有 WebGL2 letter-glitch 承载科技感）；每处动效可解释、可降级、尊重全局 reduced-motion 兜底（global.css/reset.css 已对 * 置 0.01ms，单文件勿重复写 @media）。
- **设计语言（2026-10-30 用户放宽：不再严格遵循 fandex-design/ark-ui 旧语言）**：圆角档位、竖条标记、点状装饰禁令等 ark-ui 约束解除——设计者可在暗色纯黑灰板与 fx 铁律之内自主扩散设计分析、定义新的视觉语言，前提是全站自洽、有理由、可降级。仍保留：品牌字体 IBM Plex Sans / Chakra Petch（已自托管；换字体须给充分理由与体积论证）；motion 令牌双侧真源：shd-shared/styles/tokens.css 与 app-web/src/motion/tokens.ts，改动两处同步（--motion-duration-* 75/150/250/400/600/2000ms + easing + delay；4s~60s 氛围循环属艺术参数在令牌体系外）。

## 1. 工具链事实

- 本机无 pnpm 命令：一律用 `cmd /c npx pnpm@11.15.1 -C app-web <script>`（world.run/脚本里用 `cmd /c` 包装）。corepack enable 不可用（EPERM）。
- 全量构建 `pnpm -C app-web build` 约 16-17 分钟（2071+ 页；链路 = render-mermaid → content-sync → check-tokens-drift → build-stats → build-syntax → astro build → clean-prerender → pagefind）。
- npm 直连超时 → 加 `--registry=https://registry.npmmirror.com`；playwright 浏览器下载 → `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright`（直连不可用）。
- pagefind Windows 二进制 @pagefind/windows-x64 已入 devDependencies，勿删。
- Git Bash 坑：grep 是 ugrep 别名（复杂匹配用 node 写脚本）；终端把 UTF-8 中文显示成 GBK 乱码（验证中文要用 node 读文件字符串，勿信终端 cat/head）；WebFetch 证书报错时改用 curl 或 gh api。
- app-Android-* 与内容库（cnt-content/）不在本轮范围，勿动。

## 2. 门禁清单（按强度排序）

- 快：`pnpm -C app-web lint`（eslint 10 flat config；0 错误放行）
- 快：`pnpm -C app-web typecheck`（astro check）
- 中：`pnpm -C app-web qa`（scripts/qa-check.mjs）
- 强：`pnpm -C app-web build`（含 tokens-drift 门禁、content-sync、pagefind）
- 强：`pnpm -C app-web exec playwright test`（冒烟 6 用例，跑前需 build；无头 Chrome 截图验证必须带独立 --user-data-dir，否则挂到用户运行中的浏览器）
- LHCI：lighthouserc.json（perf >= 0.85，3 URL）；静态服务器 scripts/lhci-server.mjs（剥离 /FANDEX/ 前缀，LHCI 与 Playwright 共用）
- audit:content / audit:learning-path 仅内容变更相关，本轮 UI 改造一般无需。

## 3. 前端工程规矩

- Astro 7 预渲染期会求值页面脚本模块：新增客户端 lib 的顶层 DOM 访问必须加 `if (!import.meta.env.SSR && typeof document !== 'undefined')` 守卫，否则构建报 "document is not defined"。
- island 组件无 props 必须写空接口（`Record<string, never>` 会被 client:* 属性校验拒绝）。
- astro:before-swap 清理模式见 src/lib/mermaid-render.ts（Set 登记 observers）与 stat-count-up（pendingTimers/pendingFrames）。
- 站点 base 为 /FANDEX/：绝对链接一律 `new URL(path, Astro.site).href`（字符串直拼会双斜杠）；文档正文站内链接写根相对 /module/slug（remark-internal-links 构建期补前缀+尾斜杠）。
- dev 路由必须带尾斜杠（/playground/editor/ 通过，无斜杠 404）。
- dialog 自定义 display 时必须显式写关闭态 display:none 与 [open]{display:flex}。
- CodeMirror 光标：自定义主题 .cm-content 必须显式 caretColor: var(--color-accent-base)（不写不等于原生，PR #130 教训）；CodeMirrorBox 主题声明 { dark: false } 恒挂 cm-light 类。
- KaTeX 已切 output:'mathml'（体积 1/5，勿改回 html）；mermaid 渲染钉 layout dagre + look classic（src/lib/mermaid-render.ts，勿删，删了 520 篇文档观感全变；mermaid 12 默认是 ELK/neo）。
- 禁止在 hover 时改写 animation-duration（进度重映射导致跳帧）。
- rolldown 可能整树摇掉"纯副作用导入"的脚本模块——功能缺失先 grep 产物 HTML 再查 JS 资产。
- remark/rehype 插件在 astro.config 加载期执行，import.meta.env 在该上下文不可靠，配置必须由 config 顶层常量显式传参。
- Mimosa 安全扫描误报：Math.random()（动画用途）与 localStorage 键名（非凭据）会被告警，属可豁免项。

## 4. 视检验证协议（每个 UI 任务收尾必须执行，静态检查全绿不等于通过）

- 首选 Playwright 无头 chromium（已安装；坏了用上面的镜像重装）。起服务：dist 用 `astro preview` 或 scripts/lhci-server.mjs；迭代轮用 `astro dev`（4321，dev 路由要尾斜杠）。逐页：goto → 核对 URL → DOM 探查（fx-backdrop 是否 z-index:-1、letter-glitch canvas 是否挂载、导航元素存在性）→ 截图，明暗主题两套（主题机制读 src/components/ThemeLangBootstrap.astro 确认，[data-theme]/localStorage）。
- browser-use/IAB 备选坑：标签页在两次调用间重置（每单元格完成 goto→探查→截图全流程）；宿主窗口失焦时 rAF 冻结（动画停中间态，用 DOM 探针验证挂载与参数）；cua.scroll 会挂起 30s（改 PageDown/End 键或加高视口 375x1700/2000）；background-clip:text 元素 clip 截图有幻影残影（以全视口截图为准）；fullPage 截图会把 fixed 头部画在滚动中途（合成假象，勿据此报 bug，用加高视口法看下方内容）；setViewportSize 不派发 window resize 事件（resize 依赖逻辑要手动 dispatchEvent 验证）。
- dev/预览 SW 供旧：截图前页内 `navigator.serviceWorker.getRegistrations()` 全 unregister + `caches.keys()` 全删 + reload，否则假阴性（新旧 HTML/CSS 混存）。
- 检查项：布局遮挡、层级覆盖（尤其 fx-backdrop 与侧边目录栏）、目标效果是否真实渲染、明暗两套、移动端窄视口（恰 768px 历史上错过）、表格在窄屏的表现（1294 页裸表曾被漏）。

## 5. Git 与 PR 规矩

- main 受保护：禁止直推 main。本轮工作分支在运行时由编排器创建（从 main 切出）。
- 提交信息用 Conventional Commits + 中文描述。
- 仓库 delete_branch_on_merge=true：合并后头分支自动删除；勿复用已删分支名，从 main 切全新分支。
- PR 合并用 `gh pr merge <N> --merge`（仓库惯例 merge commit）。
- app-web/src/data/doc-index.json 是 content-sync 生成物，构建会重写，随提交带上无妨。
- .workflow-tmp/ 是本轮中间产物目录（设计规格、截图、PR body 等），已加入 .git/info/exclude，不入库。
- 纯内容库提交与 Android 端不在本轮范围。
