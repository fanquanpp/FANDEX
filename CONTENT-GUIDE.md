# 内容协作指南

本指南面向教学内容的作者与协作者：怎么新增、修改、移动文档与模块，
本地怎么预览。写作风格、篇幅、组织方式由作者自行决定——仓库只负责
让管线把你的 Markdown 变成三端可读的页面。

相关文档：

- [README.md](README.md)：仓库是什么、三端应用与构建入口；
- [CONTRIBUTING.md](CONTRIBUTING.md)：协作流程（分支模型、PR、发版）；
- [AGENTS.md](AGENTS.md)：全项目唯一强约束——不使用 emoji。

## 内容管线总览

你只写 Markdown，其余派生数据由管线在构建前自动补全：

```mermaid
flowchart LR
    A["作者写 Markdown<br/>cnt-content/full"] --> B["content-sync.mjs<br/>（本地构建与 CI 构建前自动运行）"]
    B --> C["modules.json<br/>模块注册与回收"]
    B --> D["app-web<br/>Astro 构建期加载"]
    B --> E["app-Android-new<br/>generate-content.mjs"]
    D --> F["网页 GitHub Pages"]
    D --> G["Windows 桌面端<br/>（内嵌 web 产物）"]
    E --> H["Android assets/docs"]
```

三端消费方式对照：

| 端 | 内容来源 | 生成方式 |
| --- | --- | --- |
| app-web | `cnt-content/full` | Astro Content Collections 构建期加载 |
| app-desktop | 内嵌 web 构建产物 | `build-desktop.mjs` 先跑 `pnpm build:web`，再由 Tauri 打包 |
| app-Android-new | `cnt-content/full` | `generate-content.mjs` 生成 `assets/docs` 与元数据 |
| app-Android-old（已冻结） | `cnt-content/full` | `generate-legacy-content.mjs` 生成 `assets/dist-mobile` |

**不要直接修改三端应用内的生成产物（`assets/`、`dist/` 目录）**，
它们是管线的输出，下次构建会被覆盖。

## 环境准备

纯内容贡献可以跳过本节，直接在 GitHub 网页端编辑并提 PR（CI 会完成校验）。
本地开发需要：

- Node.js >= 22 与 pnpm >= 10（版本以根 `package.json` 的 `packageManager`
  字段为准；本机没有 pnpm 时先 `npm install -g pnpm`）；
- Android / Windows 桌面端的构建工具链仅在需要构建对应端时安装
  （见 [CONTRIBUTING.md](CONTRIBUTING.md)「环境准备」）。

```bash
git clone https://github.com/fanquanpp/FANDEX.git
cd FANDEX
pnpm install --frozen-lockfile    # 在仓库根执行
```

## 操作教程

### 教程一：新增一篇文档（最常用）

1. **选定模块**：找到文档所属的模块文件夹，如
   `cnt-content/full/015-go/`。不确定归属时，看相邻文档的主题与
   `module.json` 的 `description`。
2. **命名**：`NNN-EnglishName.md`，编号 `NNN-` 决定它在模块内的
   学习顺序。编号不需要连续（历史裁剪会留下空洞，属正常现象），选一个
   插入后顺序合理的数字即可，如 `017-GoroutineAndChannel.md`。
3. **写 frontmatter（可少不可错）**：推荐只手写 `title` 与 `description`：

   ```markdown
   ---
   title: Goroutine 与 Channel
   description: goroutine 的调度模型与 channel 的通信模式
   ---
   ```

   其余字段（`order` / `module` / `category` / `author` / `updated`）由
   sync 自动生成，手写会被覆盖。唯一的全局内容约束：不使用 emoji。
4. **写正文**：代码块标注语言以获得高亮；图示用 Mermaid；公式用
   LaTeX（`$...$` 行内、`$$...$$` 独立），构建期会渲染成最终效果。
5. **补全元数据并预览**：

   ```bash
   pnpm sync        # 幂等；新文档的 frontmatter 会被补全，新模块会被注册
   pnpm dev:web     # 开发服务器，边改边看
   ```

### 教程二：新增一个模块

1. 在 `cnt-content/full/` 下建模块文件夹：`<NNN-模块id>/`，模块 id 用
   小写字母开头的 kebab-case（如 `030-docker`）；编号可省略，sync 会自动
   分配并把文件夹重命名。
2. 写模块信息文件 `cnt-content/full/<模块id>/module.json`（`title` 必填，
   其余可省）：

   ```json
   {
     "title": "Docker",
     "icon": "Dk",
     "description": "容器化与镜像构建",
     "categories": ["cloud"],
     "prerequisites": ["devops"]
   }
   ```

3. 按「教程一」往里添加文档，然后 `pnpm sync`。模块会自动注册进
   `modules.json` 与学习路径索引，分类色由主分类（`categories[0]`）决定。

### 教程三：调整学习顺序或重命名

- **调整文档顺序**：重命名文件编号即可，不要手改 `order` 字段；
- **移动文档到别的模块**：直接移动文件（编号可保留），`module` 字段会被
  sync 自动改写；
- **重命名模块（谨慎）**：sync 只对内置历史别名做引用归一
  （network -> networking、math / getting-started -> cs-fundamentals）。
  改名其他模块时，指向旧 id 的 `related` / `prerequisites` 引用需要你
  同步更新全部引用方，或先在
  `app-web/scripts/content-sync.mjs` 的 `MODULE_ALIASES` 中登记新旧 id
  映射再改名。

批量操作后先跑 `pnpm sync`（或 `node app-web/scripts/content-sync.mjs
--check` 预览）确认改动符合预期，再提交。

### 教程四：删除文档或模块

直接删除文件或文件夹。`modules.json`、学习路径索引等派生数据会在下一次
sync 时自动回收，无需手工清理。删除后如果有其他文档通过 `related` /
`prerequisites` 引用它，死链同样会被 sync 自动删除。

### 教程五：提交前自检

```bash
pnpm sync                                   # 补全元数据（幂等）
pnpm --filter @fandex/web audit:content     # 校验 frontmatter 可解析
```

推送前至少跑 `pnpm sync`；完整构建验证由 CI 在「指向 main 的 PR 与发版」时
执行（本地预览可随时运行 `pnpm build:web`）。提交与 PR 流程（分支命名、
Conventional Commits、PR 目标分支）见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 进阶：学习路径地图与语法速查素材

这两类内容同样只提交源文件，派生数据由管线生成：

**学习路径地图**（`shd-shared/metadata/learning-path/`）：每个模块一个
`<模块id>.json`，描述阶段化的学习路线；`index.json` 的 `order` 数组决定
路径展示顺序。地图文件结构：

```json
{
  "version": "1.0.0",
  "module": "algorithm",
  "summary": "一句话概述这条路径。",
  "stages": [
    {
      "id": "data-structure",
      "title": "数据结构基础",
      "subtitle": "复杂度分析与线性/树形结构",
      "nodes": [
        { "id": "algorithm-001", "title": "算法分析基础", "doc": "001-AlgorithmAnalysisBasics" }
      ]
    }
  ]
}
```

`nodes[].doc` 指向模块内文档的文件名（不带扩展名）；新模块的骨架地图由
sync 自动生成，已有地图不会被覆盖。结构合法性由
`node app-web/scripts/audit-learning-path.mjs` 校验。

**语法速查素材**（`cnt-content/syntax/`）：独立于教学文档的速查专用源，
按模块分文件夹。构建时每个 H2 小节取第一个语法点生成速查卡片（由
`app-web/scripts/build-syntax.mjs` 消费）。

---

发现本指南与实际行为不符时，以仓库脚本为准，并欢迎提 PR 修正本文。
