---
order: 260
title: Markdown Frontmatter YAML
module: 'markdown'
category: 工具链
difficulty: intermediate
description: Markdown 文件头部的 YAML frontmatter：两套读者的心智模型、标量/数组/对象字段、类型陷阱、托管字段与工具链协作、遮代码自检实践。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'markdown/270-SpecDocumentWriting'
  - 'markdown/300-LintFormatTooling'
  - 'markdown/310-DocsSiteAndAutomation'
prerequisites:
  - 'markdown/010-SyntaxGuide'
---

> **Layer 2 专业层标注**：Frontmatter 用于文档工程化（本仓库的每篇教程就带 frontmatter），写普通笔记可以跳过本篇。
> 边界说明：frontmatter 本身不是"渲染给人看的 Markdown"，而是给静态站点生成器、文档工具读取的机器元数据；语法基础是 YAML。
> 强制练习：给一篇 md 文件加上 `title` 与 `tags` 两个 frontmatter 字段，用 Obsidian 的"属性"面板或站点构建验证是否被读取。

## 1. 什么是 frontmatter

frontmatter 是写在 Markdown 文件**最顶部**的一段元数据块，以两行 `---` 包裹，内部是 YAML 格式的键值对。渲染正文时它不会显示为内容，而是被工具读取用于标题、分类、日期、排序等：

```markdown
---
title: 文档标题
date: 2025-07-31
---
正文内容
```

### 1.1 心智模型：一份文档，两套读者

理解 frontmatter 的关键是意识到 Markdown 文件其实有**两套读者**：

| 读者 | 读的部分 | 用来做什么 |
| --- | --- | --- |
| 人 | 正文 | 阅读、学习 |
| 机器（站点生成器、构建脚本、搜索引擎） | frontmatter | 排序、分类、生成目录、做 SEO |

frontmatter 就是**文档的配置文件**：正文是货物，frontmatter 是贴在箱外的面单——收件方（构建工具）先读面单再决定货物怎么摆。想通这一点，很多实践问题就有了答案：

- 为什么 `title` 要写进 frontmatter，明明正文第一行也是标题？——正文标题给人看，frontmatter 的 title 给浏览器标签页、RSS、搜索结果用，两者可以措辞不同；
- 为什么字段要克制？——面单上每多一个字段，构建工具和协作者就多一个要理解的东西。**先确认"哪个工具会读它"，再决定加不加**；
- 为什么写错字段名不报错也没效果？——YAML 解析器只负责"读出键值对"，至于键是什么意思由下游工具决定。`titel: 拼错的` 解析成功、静默无效，是最隐蔽的一类 bug。

支持 frontmatter 的常见平台：Jekyll（发明者）、Hugo、Hexo、Astro、Docusaurus、MkDocs、Obsidian（属性面板）、Zola 等。注意 Hugo 默认用 `+++` 包裹的 TOML，也支持 YAML。

### 1.2 位置要求

frontmatter 必须是文件第一行：前面不能有空行、注释或 BOM 字符，否则不会被识别。

## 2. 基础字段类型

### 2.1 标量（字符串 / 数字 / 布尔 / 空值）

```yaml
title: 用户指南
version: 2.1
published: true
draft: false
featured: null
empty: ~        # ~ 等价 null
```

### 2.2 需要加引号的字符串

值里含 ASCII 冒号加空格、井号、首尾空格等特殊字符时必须加引号：

```yaml
title: "包含: 冒号的标题"
note: "key: value 含冒号"
hash: "#不是注释"
path: "a/b/c"
```

引号规则：值以数字、`[`、`{`、`&`、`*`、`!` 等开头，或包含 `: `（冒号空格）与 ` #`（空格井号）时，必须用引号包裹，否则 YAML 解析报错或被截断。

### 2.3 数组

行内写法适合短数组，块状写法适合长数组：

```yaml
tags: [js, ts, web]
authors:
  - Alice
  - Bob
```

### 2.4 对象与对象数组

```yaml
author:
  name: Alice
  email: alice@example.com

posts:
  - title: 第一篇
    date: 2025-01-01
  - title: 第二篇
    date: 2025-02-01
```

对象数组项的子键要对齐（`- ` 之后同列），错位会改变数据结构。

## 3. 多行文本

YAML 提供两种多行标量，frontmatter 中常用于 description、summary：

```yaml
description: |
  第一行
  第二行
  保留所有换行
```

`|`（literal）保留换行符；`>`（folded）把换行折叠为空格，适合长段落摘要：

```yaml
summary: >
  这是一段长文本，
  换行会被折叠成空格。
```

末尾换行可用 `|-`（去掉末尾换行）与 `|+`（保留全部末尾换行）控制：

```yaml
desc: |-
  精确无末尾换行
```

注意块标记（`|`、`>`、`|-`）必须独占一行（冒号后即换行），内容写在下一行起——把内容跟在标记同一行是无效 YAML。

## 4. 日期类型

YAML 会把符合 ISO 8601 的值解析为日期对象（而非字符串）：

```yaml
date: 2025-07-31
datetime: 2025-07-31T10:30:00Z
```

若工具链期望字符串，加上引号：`date: "2025-07-31"`。

## 5. 高级特性与陷阱

### 5.1 锚点与引用（复用配置）

`&` 定义锚点，`*` 引用，`<<` 合并键：

```yaml
defaults: &def
  lang: zh
  draft: false
post1:
  <<: *def
  title: 第一篇
```

注意合并键 `<<` 属于 YAML 1.1 约定，部分严格的 1.2 解析器（一些 JS 实现）不支持，跨工具使用前先验证。

### 5.2 类型陷阱（最高频出错点）

- **`no` / `yes` / `on` / `off` 会被解析为布尔值**（YAML 1.1）：

  ```yaml
  country: no     # YAML 1.1 解析器读成 false，不是字符串 "no"
  country: "no"   # 正确：想存字符串就加引号
  ```

  陷阱深浅取决于解析器：YAML 1.2 的解析器（较新的 JS 实现）会把 `no` 当字符串，同一个文件换工具解析结果就变了。**对策是恒定的：可疑字符串一律加引号**，别赌解析器版本。

- **版本号、纯数字字符串**：`v1.0` 是字符串没问题，但 `version: 1.10` 是浮点数（1.1），语义被破坏，应写 `version: "1.10"`。
- **缩进必须用空格**：YAML 禁止用制表符缩进，一个 Tab 就能让整个文件解析失败。

### 5.3 YAML 锚点注释与 `---` 分隔符的冲突

`---` 在 YAML 中也是多文档分隔符。frontmatter 场景下，工具只读取**第一个** `---` 包裹的块，其后再次出现的 `---` 就是正文中的水平分隔线，不会再被当作元数据。

## 6. 托管字段：与工具链协作的边界

不同生态有各自的约定字段，举两类典型：

```yaml
# 博客类（Hexo / Jekyll 风格）
---
title: 文章标题
date: 2025-07-31
tags: [前端, JS]
categories: 教程
author: Alice
cover: /img/a.png
draft: false
summary: 简短摘要
---
```

```yaml
# 文档站点类（Docusaurus 风格）
---
title: API 文档
description: 接口说明文档
sidebar_position: 3
sidebar_label: 接口
slug: /api
---
```

当一个仓库有构建管线（content pipeline）时，frontmatter 字段会分成两类：

- **内容字段**：人类作者负责写的（title、description），决定这篇文档"是什么"；
- **托管字段**：管线自动生成与维护的（order、module、category、author、updated 这类派生数据），手写会在下次同步时被覆盖。

以本仓库为例：每篇文档的 `order` 来自"文件名的编号"（`NNN-Name.md`），`module` 来自所在文件夹，`updated` 由同步脚本维护——所以协作规范是**只手写 title 与 description，改顺序就改文件名编号，别直接编辑托管字段**。判断眼前字段属于哪类的方法只有一个：读仓库的内容协作指南（本仓库见根目录 CONTENT-GUIDE.md），别靠猜。

## 7. 常见陷阱汇总

1. **frontmatter 前有空行或内容**：识别失败，整段被当正文渲染出两条水平线。
2. **值含 `: ` 未加引号**：YAML 解析报错，构建中断。
3. **制表符缩进**：必须全部替换为空格。
4. **`no`/`on`/`off` 被吃成布尔**：可疑字符串一律加引号；不同 YAML 版本解析器行为不同，别赌。
5. **块标记与内容同行**：`desc: |- 文本` 是无效写法，标记必须独占一行。
6. **日期与字符串混淆**：确认目标工具期望的类型，必要时加引号显式声明。
7. **`---` 在正文中紧跟 frontmatter 闭合行**：部分工具会把第二个 `---` 也解析进元数据区，闭合行与正文之间留一个空行更稳。
8. **手写托管字段**：被管线静默覆盖或引发不一致，改内容字段之外的任何字段前先确认它的归属（见第 6 节）。

## 8. 动手实践：遮代码自检

先只读任务与提示，自己写完再对照参考实现。

**任务一**：为你的笔记写一段 frontmatter，要求同时满足——标题里含冒号；三个标签用行内数组；draft 用布尔；发布日期是字符串而不是日期对象（工具链只认字符串）；summary 用折叠多行（换行折叠成空格）。写完先口头说出每个值解析后的类型，再验证。

**提示**：五个要求对应本文五个小节——引号规则（2.2）、行内数组（2.3）、布尔（2.1）、字符串化日期（第 4 节）、`>` 标记独占一行（第 3 节）。

**参考实现**（先自己写完再看）：

```yaml
---
title: "部署手册: 从零到上线"
tags: [devops, deploy, linux]
draft: false
date: "2026-10-05"
summary: >
  覆盖环境准备、构建、发布与回滚，
  全程可复制粘贴。
---
```

验证方式（任选其一）：本仓库内跑 `pnpm sync`，frontmatter 解析失败会直接报错；或用仓库工具链的解析器读回来看类型——

```bash
# 在带 node_modules 的工程目录下（本仓库 app-web/ 已带 gray-matter）
node -e "console.log(require('gray-matter')('---\ntitle: \"a: b\"\nno: no\n---').data)"
# 输出 {"title":"a: b","no":"no"}——注意此解析器（YAML 1.2 系）把 no 当字符串，
# 换 Python 的 PyYAML（1.1 系）会得到 False：再次印证「可疑字符串一律加引号」
```

**任务二**：下面这段 frontmatter 有三处错误，先找出来再改正：

```yaml
---
	titel: 我的笔记
date: 2026-10-05
description: 札记: 关于 YAML 的坑
---
```

**提示**：逐行检查——第一行的缩进字符、键的拼写、description 的值里有什么危险字符。

**参考实现**（先自己写完再看）：

```yaml
---
title: 我的笔记
date: 2026-10-05
description: "札记: 关于 YAML 的坑"
---
```

三处错误：第一行用了制表符缩进（陷阱 3，且 frontmatter 键必须顶格）；`titel` 拼错（陷阱的隐蔽形态——解析成功但下游读不到 title，见 1.1）；description 含 `: ` 未加引号（陷阱 2）。

## 9. 与之前和之后的知识的关系

- 往前：[代码块语法](/markdown/090-CodeBlockSyntaxHighlight) 解释了本文 YAML 示例为什么用 ```yaml 围栏；[表格](/markdown/100-Table) 的"两套读者"思想同源——分隔行也是给机器的信号；
- 横向：[代码块中的转义与嵌套围栏](/markdown/090-CodeBlockSyntaxHighlight) 是展示"frontmatter 源码"而不触发解析的标准手段；
- 往后：[规范文档写作](/markdown/270-SpecDocumentWriting) 与 [文档自动化](/markdown/310-DocsSiteAndAutomation) 把 frontmatter 当作自动化管线的输入；[Lint 与格式化工具](/markdown/300-LintFormatTooling) 能在提交前拦住本文第 7 节的大部分陷阱。

## 小结

- 初学者要点：frontmatter 是文件最顶部 `---` 包裹的 YAML 元数据块，不渲染为正文；字段形式就四种——标量、数组、对象、多行文本；值含冒号加空格或 `#` 时加引号。
- 进阶注意：心智模型是"一份文档两套读者"——正文给人看，frontmatter 给机器看，字段先问"哪个工具读它"再加；YAML 类型系统比看上去激进（`no` 是 false、日期自动解析，且 1.1/1.2 解析器行为不同），可疑值都加引号；缩进只能用空格；`|` 保留换行、`>` 折叠换行、`|-` 去末尾换行且标记必须独占一行；`<<` 合并键在部分解析器不可用；有构建管线的仓库区分"内容字段"与"托管字段"，托管字段交给工具维护（本仓库只手写 title 与 description）；Hugo 用户注意它默认是 TOML（`+++`）。
