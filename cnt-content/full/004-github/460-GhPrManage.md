---
order: 520
title: gh pr 实战：一条 PR 从创建到合并的全命令行操作
module: 'github'
category: 工具链
difficulty: intermediate
description: 以「给仓库修一个 bug 并合并」这个真实任务为线索，把 gh pr 的 create、view、checkout、checks、review、merge 六组命令串成完整闭环，覆盖 Conventional Commits 提交、自动合并、审查三态与合并策略选择。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'github/450-GhCliAuth'
  - 'github/180-PullRequestCompleteCollaborationFlow'
  - 'github/470-GhIssueManage'
prerequisites:
  - 'github/440-GitHubCLI'
  - 'github/180-PullRequestCompleteCollaborationFlow'
---

## 前置知识

- `gh` 已安装并登录（`gh auth status` 有输出，见 [gh 认证配置](/github/450-GhCliAuth)）；
- 经历过一次完整的 PR 流程，哪怕是在网页上点的（见 [Pull Request 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)）。

## 学习目标

读完全文你将能够：

1. 不开浏览器，完成「建分支、提交、开 PR、等 CI、回应审查、合并」整个闭环；
2. 记住一条能覆盖九成日常的最短命令链；
3. 分清三种审查结论的阻塞语义，选对三种合并策略；
4. 用 `--auto` 把「人肉盯 CI」这件事交给 GitHub。

## 1. 任务：修一个 bug，全程不碰浏览器

以 FANDEX 这类仓库为例：你在 `main` 上发现阅读器有个空指针问题，修完要提交。目标动作链：

```
切分支 → 提交 → push → gh pr create → CI 绿灯 → 审查通过 → squash 合并 → 删分支
```

先把分支和提交做出来（提交信息遵守 Conventional Commits，这是 PR 标题的来源）：

```bash
git checkout -b fix/reader-null-guard
# ……修改代码……
git add -A
git commit -m "fix(reader): 空数据时阅读器崩溃，补空值兜底"
git push -u origin fix/reader-null-guard
```

push 完终端通常会打印一条创建 PR 的链接，但直接用命令更快。

## 2. 创建 PR：gh pr create

```bash
# 交互式（首次推荐）：依次问目标仓库、base 分支、标题、正文
gh pr create

# 一步到位：用提交信息自动填充标题与正文
gh pr create --fill

# 完整参数版：指定目标分支、审查人、标签
gh pr create --base main --title "fix(reader): 空数据时阅读器崩溃，补空值兜底" \
  --body "修复 #102 报告的崩溃，附复现步骤" \
  --reviewer carol --label "type:bug"

# 草稿 PR：代码没写完先挂出来收意见
gh pr create --draft --fill
```

`--fill` 的逻辑：标题取第一条提交信息，正文取后续提交列表。所以只要你的 commit 写得规范，PR 几乎零输入——这就是「Conventional Commits + gh」组合的红利。

创建后先别走，PR 页面上会自动带上 CI 检查。

## 3. 看 PR、本地验证：list / view / checkout / diff

```bash
# 总览「与我相关」的三类 PR：等我审的、我开的、提到我的
gh pr status

# 列出开放的 PR，可按作者/标签过滤；@me 代指当前用户
gh pr list --author @me
gh pr list --label "type:bug"

# 单个 PR 详情：描述、审查状态、CI 概览；--web 进浏览器
gh pr view 42
gh pr view 42 --comments

# 审查别人的 PR 前，先拉到本地跑一遍
gh pr checkout 42
pnpm test
gh pr diff 42          # 相当于 git diff base...head
```

`gh pr checkout` 是审「真代码」的关键：网页上看 diff 只能读，本地才能跑测试、打断点。

## 4. 等 CI：gh pr checks

```bash
# 看一次当前状态
gh pr checks

# 阻塞等待直到所有检查结束（失败以非零码退出，可接脚本）
gh pr checks --watch
```

CI 绿灯之前不要催人审查，这是基本礼仪；`--watch` 让你提交完挂一个终端就够。

## 5. 审查结论：三种表态，一种会阻塞

```bash
gh pr review 42 --approve --body "逻辑清晰，测试覆盖到位"
gh pr review 42 --request-changes --body "第 3 处未处理空指针"
gh pr review 42 --comment --body "先讨论一下方案"
```

对应网页端 Approve / Request changes / Comment。关键语义：**request-changes 是阻塞式审查**，作者推送新提交后，原审查人要重新提交 review（或撤销 request-changes）才能解除阻塞。仓库若在分支保护里要求代码所有者批准，这条语义就是硬约束。

## 6. 合并：策略三选一，收尾带删分支

```bash
gh pr merge 42 --merge     # merge commit：保留全部提交
gh pr merge 42 --squash    # 压成一个提交：主线干净
gh pr merge 42 --rebase    # 变基后线性追加

# 最常用收尾组合：压平 + 删远程与本地功能分支
gh pr merge 42 --squash --delete-branch

# 自动合并：挂上之后，审查 + CI 满足即由 GitHub 代合
gh pr merge 42 --auto --squash
```

策略怎么选：开源和内容型项目几乎都偏好 `--squash`（一个 PR 对主线一个提交，revert 也干净）；强调过程可追溯的团队用 `--merge`；`--rebase` 只适合提交本身打磨到位的场景。FANDEX 的实践是 squash：`feat(web): xxx` 一条进 main，Pages 部署由 push main 触发，历史一目了然。

`--auto` 有个前提：仓库设置里允许 auto-merge；若仓库启用了 merge queue，`--auto` 会把 PR 排进队列统一调度。合并按钮能不能按，最终由[分支保护规则](/github/170-BranchModelBranchRule)说了算。

## 7. 生命周期收尾：ready / edit / close / reopen

```bash
gh pr ready 42                       # 草稿转正，否则不能合并
gh pr edit 42 --title "feat(web): 导出 PDF（含单测）"
gh pr edit 42 --add-reviewer carol --add-label "priority:high"
gh pr close 42 --comment "方案调整，由 #57 代替"
gh pr reopen 42
```

## 8. 底层机制：PR 的状态字段与 --auto 的工作方式

`gh pr view --json` 暴露的字段比网页直观，几个关键字段构成「能不能合」的完整判断：

```bash
gh pr view 42 --json state,isDraft,mergeable,mergeStateStatus \
  --jq '"state=\(.state) draft=\(.isDraft) mergeable=\(.mergeable) detail=\(.mergeStateStatus)"'
```

| 字段 | 取值 | 含义 |
| :--- | :--- | :--- |
| `state` | OPEN / MERGED / CLOSED | 生命周期三态；closed 且未合并即「废弃」 |
| `isDraft` | true / false | 草稿态禁止合并，`gh pr ready` 转正 |
| `mergeable` | MERGEABLE / CONFLICTING / UNKNOWN | 纯 Git 层面能不能无冲突合并；UNKNOWN 表示后台还在算 |
| `mergeStateStatus` | BLOCKED / UNSTABLE / BEHIND / CLEAN / DIRTY 等 | 带保护规则的综合判定：BLOCKED 是审查/必需检查没过，UNSTABLE 是有失败的非必需检查，BEHIND 是落后于 base（仓库开了要求分支最新），DIRTY 是冲突 |

`--auto` 的机制也就清楚了：它不是「盯着页面帮你点合并」，而是给 PR 挂一个**自动合并标记**，GitHub 服务端在每次事件（新检查完成、新审查提交）后重新评估 mergeStateStatus，一旦满足 CLEAN 就代为执行你指定的合并方式。所以开启它的前提是仓库设置允许 auto-merge；若仓库启用了 merge queue，`--auto` 的语义变为「加入合并队列」，由队列统一安排合入时机。

## 9. 与相邻知识的关系

- [Pull Request 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)：网页视角的同一条流程，本文是它的命令行投影；
- [分支模型与分支保护规则](/github/170-BranchModelBranchRule)：`mergeStateStatus` 里每个非 CLEAN 值的背后都是一条保护规则；
- [CODEOWNERS](/github/190-CODEOWNERS)：审查请求从哪来——`reviewRequests` 字段的源头；
- [gh release](/github/490-GhRelease)：合并进 main 之后，发布环节的命令行搭档。

## 10. 面试题思路

**「request-changes 之后阻塞怎么解除？」** 首先答对语义：作者推送新提交后，原审查人需要重新提交 review（approve 或再次 request-changes），或主动撤销阻塞；然后补充工程含义——这保证「提修改意见的人确认修改到位」，是审查闭环而非一次性表态。若仓库要求代码所有者批准，还要补上所有者的批准才满足门禁。

**「三种合并策略分别适合什么团队？」** 按历史价值答：`--squash` 把 PR 压成单提交，主线历史等于决策历史，revert 干净，适合开源与内容型项目；`--merge` 保留分支内全部过程提交，适合需要审计过程、且分支内提交本身规范的团队；`--rebase` 线性追加但每个提交都要经得起推敲。加分点：提到 squash 合并后原分支提交在 GitHub 页面仍可追溯。

**「mergeStateStatus 是 BLOCKED，怎么定位？」** 展示排查链：`gh pr checks` 看必需检查是否绿 → `gh pr view --json reviewRequests` 看审查是否齐 → 看是否 BEHIND（需要 update branch）→ 结合仓库保护规则逐条对账。这题考的是「用结构化字段代替肉眼刷网页」。

## 11. 坑点与自检

| 现象 | 原因 | 处理 |
| :--- | :--- | :--- |
| PR 要合到 develop | 分支推断或手误 | `gh pr edit 42 --base main` |
| `Could not resolve to a PullRequest` | 编号错，或不在仓库目录里 | `cd` 回仓库；`gh pr list` 核对编号 |
| merge blocked | 保护规则要的审查/CI 没满足 | `gh pr checks` + review 状态逐一核对 |
| 草稿合不了 | draft 状态禁止合并 | `gh pr ready` 转正 |
| `auto-merge not allowed` | 仓库没开 auto-merge 功能 | 仓库设置开启，或手动合并 |
| `resource not accessible` | token 缺 scope 或非成员 | `gh auth refresh -s repo` 或找管理员 |
| PR 太老合不了 | base 大幅前进 | `gh pr checkout` 后 rebase main 再 push |

自检三问：

1. 你能不看文档默写出「push 之后」的四条命令吗（create、checks、review、merge）？
2. request-changes 之后，阻塞靠什么解除？
3. 你的团队约定用哪种合并策略？为什么？

## 12. 练习

先看任务与提示，自己走完再看参考实现。

1. 在自己仓库完整走一遍「修 bug → squash 合并 → 删分支」闭环，全程不打开浏览器。

   提示：命令链是 checkout -b → commit → push -u → pr create --fill → pr merge --squash --delete-branch。

   参考实现：

   ```bash
   git checkout -b fix/demo-null-guard
   echo "guard" >> src/demo.js && git add -A
   git commit -m "fix(demo): 空数据兜底"
   git push -u origin fix/demo-null-guard
   gh pr create --fill
   gh pr checks --watch || true            # 等检查结束（无 CI 时跳过）
   gh pr merge --squash --delete-branch    # 删除远程与本地功能分支
   git checkout main && git pull
   ```

2. 开一个草稿 PR，用 `gh pr ready` 转正，观察状态变化。

   提示：`gh pr view --json isDraft,state` 前后各跑一次对照。

   参考实现：

   ```bash
   gh pr create --draft --fill
   gh pr view --json isDraft,state --jq '"draft=\(.isDraft) state=\(.state)"'
   gh pr ready
   gh pr view --json isDraft,state --jq '"draft=\(.isDraft) state=\(.state)"'
   # 预期：第一次 draft=true，第二次 draft=false，state 始终 OPEN
   ```

3. 用 `gh pr list --json number,title,headRefName --jq '.[] | "\(.number) \(.title)"'` 把仓库开放 PR 列成一行一个，体会结构化输出的用法。

4. 挑战题：写一个「CI 绿了自动 squash 合并」的收尾脚本，要求先核对 mergeStateStatus 再合并，失败时输出原因。

   提示：`gh pr checks --watch` 失败以非零码退出；合并前查 `mergeable` 与 `mergeStateStatus`，把 BLOCKED/DIRTY 翻译成人话。

   参考实现：

   ```bash
   #!/usr/bin/env bash
   # usage: ./auto-merge.sh <pr 编号>
   set -euo pipefail
   PR="${1:?用法: auto-merge.sh <pr 编号>}"

   echo "等待检查结束..."
   if ! gh pr checks "$PR" --watch; then
     echo "检查未全部通过，取消自动合并" >&2
     exit 1
   fi

   status="$(gh pr view "$PR" --json mergeable,mergeStateStatus \
     --jq '"\(.mergeable) \(.mergeStateStatus)"')"
   case "$status" in
     "MERGEABLE CLEAN") gh pr merge "$PR" --squash --delete-branch ;;
     *DIRTY*)           echo "存在冲突，请先解决" >&2; exit 1 ;;
     *BLOCKED*)         echo "审查或必需检查未满足，见 gh pr view $PR" >&2; exit 1 ;;
     *)                 echo "状态：$status，暂不合并" >&2; exit 1 ;;
   esac
   ```

   自检：仓库设置里开启 auto-merge 后，`gh pr merge --auto --squash` 一条命令就是服务端版的这个脚本——对比两者，体会「挂标记等事件」与「本机轮询」的差异。

## 下一步

- 网页视角的 PR 全流程与 review 语义：[Pull Request 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)
- 把 Issue 也搬进终端：[gh issue 管理](/github/470-GhIssueManage)
- `--auto` 被什么规则约束：[分支模型与分支保护规则](/github/170-BranchModelBranchRule)
