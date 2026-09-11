---
order: 300
title: 格式化与检查工具
description: 'Markdown 工程化工具链：markdownlint 结构检查、Prettier 统一格式、MDX 组件化写作与 CI 集成。'
module: 'markdown'
category: 工具链
difficulty: intermediate
author: fanquanpp
updated: '2026-09-12'
related:
  - 'markdown/010-SyntaxGuide'
  - 'markdown/330-PRCollaboration'
  - 'markdown/310-AdvancedSyntaxDocumentAutomation'
prerequisites:
  - 'markdown/010-SyntaxGuide'
---

> **认知导入（Layer 2 专业层）**
> 前置知识：001 语法总览；有团队协作或文档站点经验更佳。
> 边界说明：本篇讲"Markdown 即代码"的工具链——lint 管结构规范、格式化工具管风格统一、MDX 管组件化内容。三者都不改变 Markdown 语法本身，而是约束"怎么写"。
> 强制练习：在一个含混用列表符号（`-` 与 `*` 混用）和缺语言代码块的 md 文件上跑一次 `npx markdownlint-cli2`，观察输出。

## 1. 为什么 Markdown 也需要 lint 和格式化

单人写笔记时 Markdown 的宽容是优点；多人协作时同一份文档里 `-` 与 `*` 混用、有的代码块标语言有的不标、行尾有的带两个空格有的带四个——这种风格噪音与代码里的缩进混战本质相同。文档即代码（Docs as Code）的应对方式也相同：

| 角色 | 工具 | 解决的问题 |
| :--- | :--- | :--- |
| 结构检查（lint） | markdownlint | 层级跳级、缺语言、尾随空格、裸 URL 等规范问题 |
| 风格统一（format） | Prettier | 列表符号、表格对齐、代码块内嵌代码的缩进 |
| 组件化内容 | MDX | 文档里直接使用 React/Vue 组件（Docusaurus 等） |

三者与 CI 结合后，"文档不符合规范"会像"测试失败"一样在 PR 阶段被拦截。

## 2. markdownlint

### 2.1 安装与运行

```bash
# 命令行（推荐 markdownlint-cli2，配置体系更现代）
npx markdownlint-cli2 "**/*.md"

# VS Code：安装 DavidAnson.vscode-markdownlint 扩展后，编辑时即时划线提示
```

每条规则一个编号（MD001、MD013……），输出形如 `README.md:12 MD040/fenced-code-language Fenced code blocks should have a language specified`，即"文件、行号、规则、原因"。

### 2.2 高频规则速查

| 编号 | 规则 | 常见处理 |
| :--- | :--- | :--- |
| MD001 | 标题层级递进（不跳级） | 改标题层级 |
| MD004 | 无序列表符号统一 | 交给 Prettier 或手改 |
| MD009 | 禁行尾空格 | 配置 `br_spaces: 2` 保留硬换行，或改用行尾 `\` |
| MD013 | 行长度上限（默认 80） | 中文文档常直接关闭或放宽 |
| MD024 | 重复标题 | 允许兄弟重复：`siblings_only: true` |
| MD033 | 禁行内 HTML | 允许 `<details>`/`<kbd>` 等白名单标签 |
| MD034 | 裸 URL 加尖括号 | `<https://example.com>` |
| MD040 | 代码块标语言 | 补语言标识；纯文本可标 `text` |
| MD041 | 首行须为顶级标题 | 有 frontmatter 的项目通常关闭 |
| MD055 | 表格分隔行风格统一 | `---` 或 `:---` 选一种 |
| MD058 | 表格前后留空行 | 补空行 |

### 2.3 配置

项目根目录放 `.markdownlint.json`（或 `.markdownlint.jsonc` 支持注释）：

```json
{
  "MD013": false,
  "MD033": { "allowed_elements": ["details", "summary", "kbd"] },
  "MD024": { "siblings_only": true },
  "MD009": { "br_spaces": 2, "list_item_empty_lines": false }
}
```

忽略目录用 `.markdownlintignore`（语法同 `.gitignore`）。单文件临时跳过用行内注释，适合放行"确实需要违反"的位置：

```markdown
<!-- markdownlint-disable MD013 -->
这一行故意很长，不要报告。
<!-- markdownlint-enable MD013 -->
```

## 3. Prettier

### 3.1 它对 Markdown 做什么

Prettier 是"无配置分歧"的格式化工具，对 Markdown 的核心动作：

- **统一列表符号**：`*` 与 `+` 统一成 `-`；
- **缩进归一**：嵌套列表按规则重排空格（对"缩进决定层级"的 Markdown 来说，这一步同时是正确性保障）；
- **表格对齐**：按内容宽度对齐源码列（纯美观，不影响渲染）；
- **代码块内嵌格式化**：```` ```js ```` 块会按 JS 规则格式化（可按语言关闭）；
- **散文换行**（proseWrap）：见 3.2。

### 3.2 关键配置

```json
{
  "proseWrap": "preserve",
  "embeddedLanguageFormatting": "auto"
}
```

- `proseWrap`：`preserve`（不动换行，默认）、`always`（按 printWidth 硬折行）、`never`（段落并成一行）。中文文档推荐 `preserve`——`always` 会按英文空格断词逻辑折行，对中文几乎无效且制造大量无意义 diff；
- 行内代码与链接默认不折行，表格过于宽时 Prettier 会放弃对齐而不是破坏表格。

### 3.3 与 markdownlint 的分工与冲突

分工：Prettier 管"格式长什么样"，markdownlint 管"结构对不对"。多数 MD0xx 规则与 Prettier 不冲突，但两类重叠点需要约定：

- MD004（列表符号统一）：直接交给 Prettier 处理，markdownlint 侧可关闭；
- MD013（行长）：Prettier 的 `proseWrap: always` 与 MD013 才是配套方案；选 `preserve` 就应关闭 MD013；
- 运行顺序固定为"先 Prettier 后 markdownlint"，避免格式化结果再被 lint 报告。

## 4. MDX

### 4.1 是什么

MDX = Markdown + JSX：正文里可以直接 import 和渲染组件。Docusaurus、Next.js 生态的文档站点大量使用：

```mdx
import { Badge } from './Badge';

## 新功能

此特性当前为 <Badge label="Beta" /> 状态。
```

它是编译型格式：MDX 2+ 会把整篇文档编译成组件，因此**比 Markdown 严格得多**。

### 4.2 迁移陷阱

把现成 `.md` 接入 MDX 站点时，高频报错点：

1. **`<` 开头的行**：会被当作 JSX 标签解析，`< 5 的数` 这类文本直接编译失败，需转义为 `&lt;` 或改写；
2. **`{` 花括号**：被当作 JS 表达式求值，`{a, b}` 之类的文本要写成 `{'{a, b}'}` 或 `\{`；
3. **HTML 注释失效**：`<!-- 注释 -->` 不再可用，改用 JSX 注释 `{/* 注释 */}`；
4. **组件与正文之间留空行**：紧贴 JSX 标签的 Markdown 行内文本可能不被解析为 Markdown；
5. **大写开头的标签必须是组件**：`<Foo>` 会被当作组件解析，纯展示用小写标签或转义。

### 4.3 何时不用 MDX

内容只做"文档"没有交互需求时，MDX 的严格性是纯负担——同样的内容在纯 Markdown 渲染器上零成本，在 MDX 上要逐个排雷。选 MDX 的正当理由是"内容里真的需要组件"，而不是"框架默认是 MDX"。

## 5. 其他生态成员

- **remark-lint**：unified 生态的 Markdown linter，规则体系与 markdownlint 相当，优势是能与 remark 的转换管线（解析、改写、生成）共用一套插件，适合本身就用 unified 做内容管线的项目；
- **markdown-link-check / lychee**：死链检查，与 lint 互补（结构规范之外的内容正确性）；
- **Vale**：自然语言层面的风格与术语检查（可读性、禁用词、品牌用词），属于比语法更进一步的文档质量门禁。

## 6. CI 集成

在 GitHub Actions 中把格式化与 lint 变成 PR 门禁：

```yaml
name: docs-lint
on:
  pull_request:
    paths: ['**/*.md']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      # 先检查格式是否已按 Prettier 统一
      - run: npx prettier --check "**/*.md"
      # 再跑结构规范
      - run: npx markdownlint-cli2 "**/*.md"
```

落地建议：存量仓库先提交一次"纯格式化"的 Prettier 提交（与功能改动分开，diff 可审查），再开启 CI 门禁；规则从宽到严逐步收紧，避免第一天就把所有 PR 挡住。

## 小结

- 初学者要点：markdownlint 检查结构规范（编号规则 + `.markdownlint.json` 配置），Prettier 统一格式（列表符号、表格对齐），两者配合时先 format 后 lint。
- 进阶注意：MD013/MD009 这类与写作习惯强相关的规则要团队显式约定（尤其硬换行与行长）；`proseWrap: preserve` 是中文文档的稳妥默认；MDX 是编译型格式，`<`、`{`、HTML 注释都是迁移雷区，没有组件需求就别用；CI 门禁先格式化存量、再拦截增量。
