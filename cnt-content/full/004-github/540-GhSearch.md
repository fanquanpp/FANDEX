---
order: 540
title: gh search 搜索命令速查手册
module: 'github'
category: 工具链
difficulty: beginner
description: '问题驱动讲解 gh search：从"怎么快速找到想要的仓库、代码、Issue、PR、提交"等真实问题切入，涵盖 repos/code/issues/prs/commits 五类搜索与常用过滤选项，配以错误对策。'
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---


## 开篇：把 gh search 想成图书馆检索系统

图书馆很大，书架成千上万。直接逛，你永远找不到想要的书。但图书馆有一套**检索系统**：想找书，按"书名+作者+分类"查；想找某篇期刊文章，按关键词查；想找某位作者的全部著作，按作者查。检索系统的价值就是：**在浩如烟海的资料里，几秒钟锁定目标**。

GitHub 上有上亿个仓库、几十亿行代码。`gh search` 就是 GitHub 的"图书馆检索系统"：不用打开网页、不用一个个仓库翻，直接在终端里用一条命令，从全站范围内筛出你想要的仓库、代码、Issue、PR 甚至提交记录。

本文采用"问题驱动"写法：你想解决什么，就跳到对应小节找答案。

---

## 原理先讲清：搜索的两大要素

### 2.1 搜索范围（要搜什么）

`gh search` 下有 5 个子命令，对应 5 种"馆藏"：

| 子命令 | 搜索范围 | 典型问题 |
| --- | --- | --- |
| `gh search repos` | 仓库 | "想找某语言的开源项目" |
| `gh search code` | 代码内容 | "想找某段代码怎么写的" |
| `gh search issues` | Issue | "有没有人报过这个 bug" |
| `gh search prs` | 拉取请求 | "这个功能有没有人提过 PR" |
| `gh search commits` | 提交记录 | "某段逻辑是什么时候改的" |

### 2.2 搜索语法（怎么搜得更准）

GitHub 搜索由"关键词 + 限定符（qualifier）"组成。限定符就是 `xx:值` 形式的过滤条件，例如 `label:bug`、`author:octocat`、`stars:>1000`。`gh search` 支持两种写法：

- **用参数旗标**：`gh search repos --language=go --stars=">1000"`（每个限定符对应一个旗标，更易读）；
- **直接写语法**：`gh search issues label:bug author:monalisa state:open`（与网页端搜索框一致，灵活但需记语法）。

两者可以混用。建议新手先用旗标，熟悉后再用语法。

---

## 问题 1："我想找某个开源仓库/项目"

这是最常用的搜索：找库、找项目模板、找学习资料。

```bash
# 按关键词搜仓库（多个词之间是"与"关系）
gh search repos "react ui"

# 按编程语言过滤
gh search repos --language=typescript

# 按 star 数过滤（数字写法带引号）
gh search repos --stars=">1000" --language=go

# 按主题（topic）过滤，比如找"低代码"主题的项目
gh search repos --topic=low-code --limit 10

# 限定组织与可见性
gh search repos --owner=microsoft --visibility=public

# 找"适合新手入门"的项目（good first issue 数量 >= 10）
gh search repos --language=go --good-first-issues=">=10"

# 排除已归档仓库
gh search repos --archived=false

# 只搜仓库名（不匹配描述/README）
gh search repos --match=name "chatgpt"

# 按 star 数排序
gh search repos react --sort=stars --order=desc
```

`gh search repos` 典型输出：

```text
NAME                 DESCRIPTION                            STARS  UPDATED
facebook/react       The library for web and native...      229k   2h ago
vercel/next.js       The React Framework                     130k   1h ago
```

---

## 问题 2："我想找某段代码/某个 API 用法"

抄作业（参考优秀代码）是学习利器。`gh search code` 能搜全站公开仓库的代码内容。

```bash
# 搜索同时包含 useState 和 useEffect 的代码
gh search code "useState useEffect"

# 限定在某仓库内搜索
gh search code "TODO" --repo=owner/repo

# 限定文件名搜索（例如找所有 settings.py）
gh search code "DEBUG" --filename="*.py"

# 限定组织与语言
gh search code "config" --org=myorg --language=go
```

> 注意：代码搜索**默认只覆盖公开仓库**，且需要登录才能使用；私有仓库的代码需要额外权限。

---

## 问题 3："这个 bug/功能有没有人提过 Issue？"

写代码遇到报错，先搜 GitHub——大概率有人踩过坑，还能看到解决方案。

```bash
# 搜 open 状态、带 bug 标签的 issue
gh search issues "memory leak" --state=open --label=bug

# 搜分配给自己的 open issue（@me 表示"当前登录用户"）
gh search issues --assignee=@me --state=open

# 限定在某仓库搜
gh search issues --repo=owner/repo "crash"

# 搜自己创建的 issue
gh search issues --author=@me

# 同时搜索 issue 与 PR（--include-prs）
gh search issues --include-prs --owner=cli

# 找"没人认领、适合新手"的 issue（无 assignee + 有标签）
gh search issues --no-assignee --label="good first issue"

# 找评论数多的热门 issue
gh search issues --comments=">50"

# 找没有 bug 标签的 issue（排除语法，注意前面的 --）
gh search issues -- "-label:bug"
```

`gh search issues` 典型输出：

```text
NUMBER  TITLE                    STATE  LABELS         UPDATED
#4521   Fix memory leak in X     open   bug           2d ago
#4498   Crash on startup         open   bug, priority 5h ago
```

---

## 问题 4："这个功能有没有人提过 PR？"

```bash
# 搜自己已合并的 PR
gh search prs --merged --author=@me

# 搜需要自己审查的 PR（很实用）
gh search prs --review-requested=@me --open

# 搜某仓库的已合并 PR
gh search prs --repo=owner/repo --merged

# 搜未合并、带 review 标签的 PR
gh search prs --reviewed-by=@me --state=open

# 搜被标记为 draft（草稿）的 PR
gh search prs --draft --repo=owner/repo
```

---

## 问题 5："某段代码是什么时候引入的？"

```bash
# 按提交信息搜索
gh search commits "fix memory leak" --repo=owner/repo

# 按作者搜索提交
gh search commits --author=zhangsan

# 限定组织范围
gh search commits "bump version" --org=myorg
```

---

## 通用技巧：让结果更可控

### 5.1 控制输出

```bash
# 限制条数（默认 30）
gh search repos react --limit 50

# 按 star 数升序
gh search repos react --sort=stars --order=asc

# 输出 JSON 供脚本处理
gh search repos react --json fullName,stargazersCount

# 配合 jq 只取名字
gh search repos react --json fullName --jq '.[].fullName'

# 在浏览器中打开搜索结果页面
gh search repos react --web
```

### 5.2 排除限定符（重点技巧）

网页端支持 `-label:bug` 这样的"排除"语法，但终端里 `-` 开头的字符串会被 shell 当成参数。解决方法是加一个 `--` 分隔符，告诉 shell"后面是查询串，不是参数"：

```bash
# Unix 系（bash/zsh/macOS）用法
gh search issues -- "-label:bug"

# PowerShell 用法（需要 --% 停止解析）
gh --% search issues -- "-label:bug"
```

---

## 通用技巧：读懂搜索结果与常用字段

`--json` 输出的字段取决于搜索类型，掌握常用字段可让脚本化处理事半功倍：

| 搜索类型 | 常用 JSON 字段 | 说明 |
| --- | --- | --- |
| repos | `fullName`、`description`、`stargazersCount`、`language`、`isArchived` | 仓库全名、描述、star 数、语言、是否归档 |
| issues | `number`、`title`、`state`、`labels`、`assignees`、`isPullRequest` | 编号、标题、状态、标签、指派者、是否为 PR |
| prs | `number`、`title`、`state`、`isDraft`、`mergeable` | 编号、标题、状态、是否为草稿、是否可合并 |
| code | `repository`、`path`、`name` | 所在仓库、文件路径、文件名 |
| commits | `sha`、`message`、`author`、`date` | 提交哈希、提交信息、作者、日期 |

结合 `--jq` 可以拼出任意格式：

```bash
# 输出"仓库名: 描述"格式
gh search repos "react" --json fullName,description --jq '.[] | "\(.fullName): \(.description)"'

# 只看 star 数前 5 的仓库全名
gh search repos --language=python --sort=stars --limit 5 --json fullName --jq '.[].fullName'
```

> 提示：所有 `gh search` 子命令都支持 `--json` 与 `--jq`，想了解某类搜索的全部字段，可在任意仓库执行 `gh search repos --json <Tab>` 或查看官方手册对应页面。

---

## 常见错误与对策

| 新手常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 排除语法直接写 `-label:bug` | 报 `unknown flag: -label` | 减号被 shell 当成参数 | 查询前加 `--`：`gh search issues -- "-label:bug"` |
| 数字条件不加引号 | `stars:>1000` 报错或行为怪异 | `>` 被 shell 重定向 | 加引号：`--stars=">1000"` |
| 未登录就搜代码 | `code search requires authentication` | 代码搜索必须登录 | 先 `gh auth login` |
| 搜索词含空格被拆开 | 结果对不上 | 多个词被视为"与"关系 | 想搜短语加引号：`gh search repos "vim plugin"` |
| 用 --repo 但值写错 | 结果为空 | 仓库名格式错误 | 用 `owner/repo` 完整格式 |
| 搜私有仓库代码 | 结果为空 | 默认只搜公开仓库 | 确认有权限且在设置中开启代码搜索授权 |
| 分不清 issues 与 prs | 结果混入另一类 | `gh search issues` 默认不含 PR | 需要同时搜加 `--include-prs`；只搜 PR 用 `gh search prs` |

---

## 一句话记忆

**`gh search` 是 GitHub 的"检索台"：找库用 `repos`，找代码用 `code`，找讨论用 `issues/prs`，找历史用 `commits`；记住"关键词 + 限定符 + `--` 排除 + `--json` 输出"四板斧，检索又快又准。**
