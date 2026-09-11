---
order: 470
title: GitHub CLI Issue 管理
module: 'github'
category: 工具链
difficulty: beginner
description: '用 gh 命令行管理 Issue 全流程：创建与模板、查询过滤、评论编辑、关闭原因、Issue 转分支、批量操作与治理命令。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'github/210-IssuesTemplateTagMilestone'
  - 'github/450-GhCliAuth'
  - 'github/460-GhPrManage'
prerequisites:
  - 'github/450-GhCliAuth'
---

## 0. 开始之前：Issue 是项目的"待办账本"

Issue 是 GitHub 上记录 Bug、功能需求和任务的单元，相当于项目的**公共待办账本**：谁发现的问题、谁负责修、修没修完，都记在这里。网页端操作直观，但当你一天要创建十几个 Issue、跨几十个仓库盘点待办时，`gh issue` 命令行工具效率高得多——它把账本的"记账、翻页、批注、销账"全部变成一条条可组合的命令。

前置知识：Issue 的模板、标签、里程碑等**机制**见 github/210-IssuesTemplateTagMilestone，本篇聚焦命令操作；开始前请完成 gh 认证（github/450-GhCliAuth）。

## 1. 创建 Issue：gh issue create

### 1.1 交互式创建

```bash
# 在当前仓库交互式创建：依次询问标题、正文，以及仓库模板（若配置了模板）
gh issue create
```

若仓库配置了 Issue 模板（见 github/210-IssuesTemplateTagMilestone），gh 会先让你从模板列表中选择，再进入正文编辑器——与网页体验一致。

### 1.2 一步到位

```bash
# 指定标题与正文
gh issue create \
  --title "Bug: 登录页面 500" \
  --body "复现步骤：打开 /login 后白屏，控制台报 TypeError"

# 指定经办人、标签、里程碑（多值用逗号分隔）
gh issue create \
  --title "性能优化：首页首屏超 3 秒" \
  --body "优化方案见内部文档" \
  --assignee @me,alice \
  --label "performance,priority:high" \
  --milestone "v2.0"

# 正文较长时从文件读取（Markdown 模板复用）
gh issue create --title "技术调研：引入消息队列" --body-file docs/rmq-proposal.md
```

`@me` 代指当前登录用户。`--body` 支持 Markdown；正文里写 `#42` 会自动引用 Issue 42。

## 2. 查询与检索：list 与 view

### 2.1 常用过滤

```bash
# 列出开放 Issue（默认前 30 条，--limit 控制数量）
gh issue list

# 按状态、经办人、作者、标签过滤
gh issue list --state closed
gh issue list --assignee @me          # 分配给我的
gh issue list --author bob            # bob 创建的
gh issue list --label "bug" --limit 50
```

### 2.2 结构化查询：--json 与 --jq

```bash
# 只取编号列表（供脚本消费）
gh issue list --label bug --json number --jq '.[].number'

# 标题包含"bug"的 Issue
gh issue list --json number,title \
  --jq '.[] | select(.title | test("bug"; "i"))'

# 组合 shell 管道做批量操作：关闭所有 stale 标签的 Issue
gh issue list --label stale --json number --jq '.[].number' \
  | xargs -I {} gh issue close {}
```

`--json` 接受逗号分隔的字段名（如 `number,title,author,labels`），`--jq` 直接执行 jq 表达式，免去二次解析。批量场景里"`list --json` + 管道 + 单条命令"是 gh 的标准组合拳。

### 2.3 查看详情

```bash
# 查看 Issue 正文与元信息
gh issue view 42

# 连评论一起看
gh issue view 42 --comments

# 浏览器打开
gh issue view 42 --web
```

## 3. 评论与修改：comment 与 edit

```bash
# 添加评论
gh issue comment 42 --body "已在 PR #57 中修复，等 CI 通过"

# 评论内容较长时从文件读取
gh issue comment 42 --body-file reply.md

# 修改标题、追加/移除经办人与标签、调整里程碑
gh issue edit 42 --title "Bug: 登录页面 500（已定位）"
gh issue edit 42 --add-assignee alice
gh issue edit 42 --remove-assignee bob
gh issue edit 42 --add-label "confirmed"
```

评论发出后如需修改或删除，网页端最方便；脚本场景可用 `gh api` 调 REST 接口完成（PATCH/DELETE 评论资源），详见 github/320-RESTGraphQLAPI。

## 4. 关闭与重开：close 与 reopen

```bash
# 关闭（默认原因为 completed）
gh issue close 42

# 关闭并说明原因
gh issue close 42 --comment "下一版本发布后自动关闭，见里程碑 v2.0"

# 显式指定关闭原因：已完成 / 未计划（如放弃修复）
gh issue close 42 --reason completed
gh issue close 99 --reason "not planned"

# 误关重开
gh issue reopen 42
```

`--reason` 对应网页关闭弹窗的两个选项：`completed`（已解决）与 `not planned`（不做）。区分二者对项目的"完成率"统计有意义，销账时别随手乱选。

## 5. Issue 变分支：gh issue develop

`gh issue develop` 把"从 Issue 开始干活"变成一条命令——在仓库里创建一个**与 Issue 关联的分支**（linked branch），后续推送到该分支的 PR 会自动带上 Issue 引用：

```bash
# 为 Issue 42 创建关联分支（分支名按 issue+编号自动生成）
gh issue develop 42

# 指定自定义分支名，并创建后立即切换过去
gh issue develop 42 -b fix/login-500 --checkout
```

关联分支在 Issue 页面右侧"Development"区块可见，是"一个 Issue 一个分支"工作流的最短路径。

## 6. 治理命令：转仓库、置顶、锁定、删除

```bash
# 把 Issue 转移到另一个仓库（编号保留语义、评论随行）
gh issue transfer 42 owner/other-repo

# 置顶 / 取消置顶（仓库首页公告常用）
gh issue pin 101
gh issue unpin 101

# 锁定讨论（防止无关回复继续涌入），可附原因
gh issue lock 42 --reason resolved
# 可选原因：off-topic / resolved / spam / too heated

# 解锁
gh issue unlock 42

# 删除（危险操作，需要 --yes 二次确认）
gh issue delete 42 --yes
```

锁定常与"关闭"配合用于吵架现场或已解决的公告帖；`transfer` 适合"报错仓库"的场景——问题其实出在依赖库，转过去让对的团队处理。

## 7. 实战场景：每周 issue 清扫

```bash
# 1. 盘点分配给自己的未完成事项
gh issue list --assignee @me --state open

# 2. 给上周没动静、带 awaiting-response 标签的 Issue 批量补标签
gh issue list --label awaiting-response --json number --jq '.[].number' \
  | xargs -I {} gh issue edit {} --add-label "stale"

# 3. 从最高优先级 Issue 直接开分支进入开发
gh issue develop 42 -b fix/login-500 --checkout
```

## 8. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 找不到 Issue | `GraphQL: Could not resolve to an Issue` | 编号写错，或编号其实是 PR | Issue 与 PR 共用编号序列，`gh issue view` 换 `gh pr view` 试试 |
| --jq 无输出 | 列表为空但网页明明有 | 默认只查 open 且前 30 条 | 加 `--state all` 与 `--limit`；确认标签拼写 |
| 创建缺少权限 | `resource not accessible` | token 缺 `repo`/`public_repo` | `gh auth refresh -s repo` 补授权 |
| close 后还想补充 | Issue 已锁定或已关闭无法评论 | 维护者关闭时锁定 | 用 `gh issue unlock`（有权限时）或开新 Issue 关联 |
| 批量误操作 | 一批 Issue 被错误关闭 | 过滤条件过宽就跑了 xargs | 先跑 `gh issue list ...` 不接管道确认清单，再接管道 |
| milestone 不生效 | --milestone 报找不到 | 里程碑名称与仓库中的不完全一致 | 名称需精确匹配（区分大小写），或使用网页端核对 |

## 9. 小结

**初学者要点**

- 创建三板斧：交互式 `gh issue create`、参数齐全版、`--body-file` 长文版。
- 查询先记 `--state/--assignee/--label/--limit`，脚本场景换 `--json` + `--jq`。
- 关闭带原因（completed / not planned）；误关用 `gh issue reopen`。

**进阶注意**

- Issue 与 PR 共享编号序列，脚本处理编号时注意甄别类型。
- 批量操作务必先"干跑"过滤命令确认清单，再接管道执行。
- `gh issue develop` 建立的 linked branch 让 Issue → 分支 → PR 全程自动互相引用，是团队规范化的利器。
- 子任务（sub-issues）与任务列表目前主要在网页端管理，gh 侧可通过查看 `trackedIssues` 等字段间接读取。

### 延伸阅读

- Issue 模板、标签与里程碑机制，见 github/210-IssuesTemplateTagMilestone。
- PR 的命令行管理，见 github/460-GhPrManage。
- 标签批量管理命令，见 github/550-GhLabel。
