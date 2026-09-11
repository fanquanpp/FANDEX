# FANDEX 仓库规则

本文件是工程规范的事实源，面向 AI 助手与协作者：仓库组成、通用工程约束、
分支与推送规则、内容管线约定、web 端代码约定、校验入口与发版流程。
仓库结构与三端介绍见 [README.md](README.md)，面向人的协作教程见
[CONTRIBUTING.md](CONTRIBUTING.md)，内容写作实操见 [CONTENT-GUIDE.md](CONTENT-GUIDE.md)。

## 仓库组成

- `cnt-content/full`：全部学习内容的唯一来源，三端共享；
  `cnt-content/syntax` 为语法速览专用速查素材源（由
  `app-web/scripts/build-syntax.mjs` 消费）；各端应用内的生成产物
  （Android assets、桌面端内嵌产物）一律禁止手改；
- `app-web`：Astro 网站端（GitHub Pages 部署，桌面端内嵌其构建产物）；
- `app-desktop` / `app-desktop-portable`：Tauri Windows 桌面端（主开发与
  便携版打包）；
- `app-Android-new` / `app-Android-old`：Android 双端（纯 Gradle 工程，不参与
  pnpm workspace；构建前由 `generate-content.mjs` 自动生成内容 assets）；
- `shd-shared`：共享层——`metadata/modules.json`（模块注册表、分类色与
  分类中文名 `categoryLabels`）、`styles/tokens.css`（设计与动效语义令牌）
  及 tokens / utl-utils / assets 子包；
- 依赖版本统一由 `pnpm-workspace.yaml` 的 catalog 管理，子包以 `catalog:`
  协议引用，禁止在子包内写死版本；
- `scripts/release.mjs`：发版脚本（`pnpm release`）。

## 通用工程规范

- 代码与对话中一律不使用 emoji 表情。
- 代码项目中的图形需求：优先使用 SVG 或 Mermaid 自行绘制，不引入位图素材。
- 界面装饰禁止使用点状元素（圆点、胶囊圆点、点阵等），统一改为 1-4px 宽的竖条
  或几何刻度线；按钮、徽章、状态指示器一律使用直角小圆角（`--radius-md` 以内）。
- 界面动效一律消费 `--motion-*` 语义令牌（时长、缓动、错峰延迟），禁止写死
  魔法数字；所有动画必须提供 `prefers-reduced-motion: reduce` 降级路径。
- 代码需有完善、简洁的中文注释。
- 每次任务完成后删除一次性脚本、废弃代码文件等临时产物。

## 分支与推送

- `main` 是受保护的发布主线（网页部署、Release、版本 tag 均以它为基准），
  只接受 Pull Request，直接 push 会被拒绝；`dev` 是协作集成分支，开放推送，
  是协作者日常工作的落点。
- 变更路径：协作者的小改动可直接推送 `dev`，较大改动走特性分支 PR（命名
  `feat/<描述>` 等前缀 + 小写中划线）；外部贡献者经 fork 向 `dev` 发 PR；
  维护者的 PR 可直接指向 `main`。合并使用 merge commit，与仓库历史一致。
- **CI 触发事实**：全部构建工作流（deploy / android-build / desktop-build）
  只在 push `main` 与指向 `main` 的 PR 上触发，且带路径过滤；push 到 `dev`
  不触发任何 CI。因此 web 构建验证发生在「指向 `main` 的 PR / 发版」时，
  本地推送前不要求跑 `pnpm build:web`（见「校验入口」）。
- 提交信息遵循 Conventional Commits：`<type>(<scope>): 中文描述`，type 取
  feat / fix / docs / content / refactor / chore / ci / perf / test，描述
  动词开头、结尾不加句号。
- 推送前本地校验：运行 `pnpm sync`（幂等）；内容类改动再跑
  `node app-web/scripts/content-audit.mjs` 确认无 HIGH 级问题。
- **派生产物不得混入功能提交**：sync / build-syntax 等管线脚本会批量校正
  frontmatter `updated`、重写 `app-web/src/data/syntax-index.json` 等派生
  文件，这类变更仅随发版提交；平时留在工作区或 `git checkout --` 还原，
  不与功能、文档改动混在一个 commit。

## 文档内容规范（约定优先，自动补全）

`cnt-content/full` 下的内容维护遵循「作者只写内容，元数据自动补全」原则：
`app-web/scripts/content-sync.mjs`（零依赖、幂等）会在本地构建与全部 CI
构建（web / Android / 桌面）之前自动运行，扫描模块文件夹与文档并补全、
修正一切派生元数据。**提交符合约定的 md 文件即完成全部工作**，无需手工
维护 modules.json、order 编号、分类、日期等任何配置。

### 作者需要做的事（也只有这些）

1. **新增/修改文档**：把 `NNN-EnglishName.md` 放进对应模块文件夹
   （`cnt-content/full/<NNN-模块id>/`）。frontmatter 可全部省略：
   - 推荐手写：`title`（缺省取正文首个 H1，否则取文件名）、
     `description`（一句话，可省）、`difficulty`（缺省 `beginner`）、
     `related` / `prerequisites`（学习关联，死链会被自动删除）。
   - 文件名编号 `NNN-` 即学习顺序（可省略，省略时按文件名字母序排尾）。
2. **新增模块**：在 `cnt-content/full/` 下建模块文件夹（`<模块id>/` 或
   `<NNN-模块id>/` 均可，裸 id 会被自动分配编号并重命名），并写入模块
   信息文件 `module.json`（见下）；然后在其中正常添加文档。
3. **删除模块/文档**：直接删除文件/文件夹即可，modules.json、学习路径
   索引等派生数据会在下一次 sync 时自动回收。

### module.json（模块信息文件）

存放于模块文件夹根部，是模块元数据的手写事实源；`modules.json` 的
`modules[]` 与 `modulePrerequisites` 由它派生（sync 自动重建）：

```json
{
  "title": "Docker",
  "icon": "Dk",
  "description": "容器化与镜像构建",
  "categories": ["cloud"],
  "prerequisites": ["devops"],
  "officialDocs": [{ "label": "官方文档", "url": "https://...", "type": "docs" }]
}
```

- `title` 必填；其余可省：`icon` 缺省取 id 前两字符大写、`description`
  缺省同 `title`、`categories` 缺省 `["tools"]`、`prerequisites` 为模块
  先修 id 数组、`officialDocs` / `updatePriority` / `updateNote` 透传。
- 缺失 `module.json` 时 sync 会自动生成（存量模块从 modules.json 反拆，
  全新模块生成最小骨架），请随后补写完善。

### frontmatter 托管字段（sync 自动生成，手写值会被校正或覆盖）

- `order`：由文件名编号顺序派生（10 起步长 10），手写无效；调整顺序请
  重命名文件编号。
- `module`：恒等于所在文件夹的模块 id。
- `category`：模块主分类（`module.json` 的 `categories[0]`）对应的中文名。
- `author`：缺省 `fanquanpp`。
- `updated`：`max(手写值, git 最后提交日期)`，均无则当天；手写更晚日期
  时保留手写。

### 约束（audit 兜底校验）

- frontmatter 仅允许 10 个标准字段（order/title/module/category/difficulty/
  description/author/updated/related/prerequisites）；`difficulty` 合法值
  为 beginner / intermediate / advanced。
- 历史禁用字段（tags/created/quiz/references/etymology/estimatedReadingTime/
  lastReviewed/reviewer/readingTime/keywords/slug/lang/layout/date）由 sync
  自动删除；其余未知字段会被 audit 报告（low）。
- `related` / `prerequisites` 引用格式为 `模块id/文件名`（不带扩展名），
  死链与历史旧名由 sync 自动清理/归一。
- 模块文件夹命名 `NNN-模块id`（模块 id 为小写字母开头的 kebab-case），
  文档命名 `NNN-EnglishName.md`；编号 1-999，模块内不得重复。

### 模块 -> 分类映射

按 `module.json` 的主分类（`categories` 数组第一个元素）映射，分类中文
名由 `modules.json` 的 `categoryLabels` 定义（工具链 / 前端技术 / 后端
技术 / 数据库 / 计算机科学 / 数学 / 云与基础设施）。

## Web 端代码约定（app-web）

- 客户端逻辑抽离到 `src/lib/*.ts`，由组件末尾的 `<script>` 引入；浏览器
  专属代码在模块顶层执行时以
  `if (!import.meta.env.SSR && typeof document !== 'undefined')` 守卫，
  避免构建期求值报错。
- 遵循 ClientRouter 生命周期约定：`astro:page-load` 时重绑 + `dataset`
  标记防重入；`astro:before-swap` 时清理（取消 requestAnimationFrame、
  移除监听器），避免页面切换后内存泄漏与重复绑定。
- 新增依赖一律走 `pnpm-workspace.yaml` catalog（见「仓库组成」）；web 端
  可选依赖的 Windows 二进制（如 pagefind）缺失时，显式安装对应平台包。

## 版本发布

- `pnpm release`：自动 patch +1 并同步五处版本文件（根/app-web
  package.json、tauri.conf.json、app-desktop-portable/package.json、
  Android versionName）、versionCode 自动 +1、迁移 CHANGELOG「未发布」
  段、commit + tag + push，push 后 CI 自动构建并发布 GitHub Release。
- `pnpm release 4.5.0`：指定版本号（`4.5`、`5` 等缩写自动补全）；
  `pnpm release --no-push` 只改文件与提交不推送。

## 校验入口

- `app-web/scripts/content-sync.mjs`（`pnpm sync`）：内容自动同步（唯一
  自动化入口），补全托管字段、注册/回收模块、清理死链；`--check` 只报告
  不写盘。已接入全部本地构建链（web build / desktop build-desktop.mjs /
  Android 构建工作流）与 CI。
- `app-web/scripts/build-stats.mjs`：生成文档统计基线；`doc-stats.json` 被
  gitignore、仅在构建期生成，`astro check` 依赖它——全新 clone 先跑一次
  `pnpm dev:web` 或 `pnpm build:web` 再执行 typecheck。
- `app-web/src/content.config.ts`：Astro content schema，构建期兜底校验。
- `app-web/scripts/content-audit.mjs`：内容质量审计（正文长度、过时
  关键词、未知字段等 sync 无法判断的问题），HIGH 级问题以非零退出码阻断；
  已作为 deploy.yml 门禁步骤运行。
- `app-web/scripts/qa-check.mjs`（`pnpm --filter @fandex/web qa`）：构建
  产物质量门禁（页面结构、SEO 资产、console.log 残留等），FAIL 项阻断；
  deploy 与 desktop 工作流已接入。
- `app-web/scripts/audit-learning-path.mjs`（`pnpm --filter @fandex/web
  audit:learning-path`）：学习路径结构与死链审计，手动运行。
- `pnpm typecheck`：并行执行各子包类型检查（app-web `astro check` 与
  shd-shared/tokens `tsc --noEmit`）；deploy.yml 在构建前执行。
