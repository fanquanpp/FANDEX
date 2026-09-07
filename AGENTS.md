# FANDEX 仓库规则

## 通用工程规范

- 代码与对话中一律不使用 emoji 表情。
- 代码项目中的图形需求：优先使用 SVG 或 Mermaid 自行绘制，不引入位图素材。
- 界面装饰禁止使用点状元素（圆点、胶囊圆点、点阵等），统一改为 1-4px 宽的竖条
  或几何刻度线；按钮、徽章、状态指示器一律使用直角小圆角（`--radius-md` 以内）。
- 代码需有完善、简洁的中文注释。
- 每次任务完成后删除一次性脚本、废弃代码文件等临时产物。
- 文档内容统一存放于 `cnt-content/full`；`cnt-content/syntax` 为语法速览
  专用速查素材源（由 `app-web/scripts/build-syntax.mjs` 消费）。

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
  description/author/updated/related/prerequisites）；历史禁用字段
  （tags/created/quiz/references/etymology/estimatedReadingTime/
  lastReviewed/reviewer/readingTime/keywords）由 sync 自动删除，其他
  未知字段会被 audit 报告（low）。
- `related` / `prerequisites` 引用格式为 `模块id/文件名`（不带扩展名），
  死链与历史旧名由 sync 自动清理/归一。
- 模块文件夹命名 `NNN-模块id`（模块 id 为小写字母开头的 kebab-case），
  文档命名 `NNN-EnglishName.md`；编号 1-999，模块内不得重复。

### 模块 -> 分类映射

按 `module.json` 的主分类（`categories` 数组第一个元素）映射，分类中文
名由 `modules.json` 的 `categoryLabels` 定义（工具链 / 前端技术 / 后端
技术 / 数据库 / 计算机科学 / 数学 / 云与基础设施）。

### 版本发布

- `pnpm release`：自动 patch +1 并同步五处版本文件（根/app-web
  package.json、tauri.conf.json、app-desktop-portable/package.json、
  Android versionName）、versionCode 自动 +1、迁移 CHANGELOG「未发布」
  段、commit + tag + push，push 后 CI 自动构建并发布 GitHub Release。
- `pnpm release 4.5.0`：指定版本号（`4.5`、`5` 等缩写自动补全）；
  `pnpm release --no-push` 只改文件与提交不推送。

## 校验入口

- `app-web/scripts/content-sync.mjs`：内容自动同步（唯一自动化入口），
  补全托管字段、注册/回收模块、清理死链；构建链与 CI 全量接入。
- `app-web/src/content.config.ts`：Astro content schema，构建期兜底校验。
- `app-web/scripts/content-audit.mjs`：内容质量审计（正文长度、过时
  关键词、未知字段等 sync 无法判断的问题），HIGH 级问题阻断流水线。
