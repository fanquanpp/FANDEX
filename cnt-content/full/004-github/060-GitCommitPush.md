---
order: 60
title: Git 提交与推送：小步提交，按节奏推上 GitHub
module: 'github'
category: 工具链
difficulty: beginner
description: 以「一个功能从写到推上 GitHub」的完整节奏讲 add / commit / push：暂存的挑选粒度（-p）、commit -am 陷阱、push -u 追踪关系、推送被拒的标准处置、force-with-lease 安全线，附 vim 卡住与 non-fast-forward 等七个真实报错对照表。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/050-GitBasicOperation'
  - 'git/070-GitDiffStagingOperation'
  - 'git/090-GitCommitAmend'
  - 'github/050-GitRepoInit'
prerequisites:
  - 'github/050-GitRepoInit'
---

## 前置知识

- 已完成 [本地仓库连接 GitHub](/github/050-GitRepoInit)：远程已接线，`git push -u origin main` 跑通过一次；
- 建议先读 [Git 基础操作](/git/050-GitBasicOperation)：add / commit 的原理篇在那边，本文讲的是日常节奏。

## 学习目标

读完本文你将能够：

1. 按「小步提交」的节奏推进一个功能，而不是攒一整天的改动一次梭哈；
2. 用 `git add -p` 只挑部分改动进暂存区，用 `commit -am` 时知道它漏掉什么；
3. 解释 `push -u` 建立的追踪关系，以及推送被拒（non-fast-forward）时的标准三步处置；
4. 对照七个真实报错的对策表，独立解决新手期 90% 的推送问题。

预计 40 分钟，全程动手。

## 1. 问题：攒了一天的大提交，谁都不敢合并

反例先看清楚。很多人一天的工作流是这样收尾的：

```bash
git add .
git commit -m "update"
git push
```

一天改了 8 件事，全挤在一个叫 "update" 的提交里。一个月后你发现某处 bug 是这天引入的——想回退，只能连 7 个没问题的改动一起丢；同事审查你的 PR，面对 800 行 diff 直接放弃细看。

成熟团队（包括本教程所在的 FANDEX 仓库）的节奏是反过来的：**每完成一件小事就提交一次**，提交信息说清「这次改了什么类型的事」（fix、feat、docs……）。本文带你把这条节奏跑顺，并顺手解决 push 环节的所有常见坑。

## 2. 动手：一个功能的完整节奏

场景：你在一个命令行工具项目里给搜索功能修 bug 并顺手补文档。开工前先拉最新（多人都推同一分支时必须）：

```bash
git pull
git status                # 确认工作区干净再开工
```

### 第 1 步：把一件事做完整，再挑拣提交

改完代码，别急着 `git add .`。先看清有什么：

```bash
git status -s
#  M src/search.ts
#  M src/search.test.ts
#  M README.md
# ?? debug.log
```

`debug.log` 是调试输出，不该进任何提交（忽略规则见 [.gitignore](/git/040-GitignoreDeepDive)）。这次提交只装「修 bug」这一件事：

```bash
git add src/search.ts src/search.test.ts
git commit -m "fix(search): 修正空关键词时的越界"
```

README 的文档改动是另一件事，单独一个提交：

```bash
git add README.md
git commit -m "docs: 补充搜索用法示例"
```

改动挤在同一个文件里、必须拆开时，用交互式暂存逐块挑选：

```bash
git add -p
# Git 逐块展示 diff，每块问你：y 暂存这块 / n 跳过 / s 把大块再拆小
```

### 第 2 步：提交前 30 秒自检

```bash
git diff --staged         # 暂存区就是即将提交的全部内容，看一眼再落笔
```

三个视图的分工（`git diff` / `--staged` / `HEAD`）见 [git diff 与暂存区](/git/070-GitDiffStagingOperation)，这里只留一句：`--staged` 看到什么，提交里就是什么。

### 第 3 步：推送

推送前先看输出会说什么。日常推送（追踪关系已建立时）：

```bash
git push
```

推送一个还没有远程副本的新分支时，才需要带 `-u`：

```bash
git push -u origin feat/search-fix
# * [new branch]      feat/search-fix -> feat/search-fix
# branch 'feat/search-fix' set up to track 'origin/feat/search-fix'.
```

最后一行就是 `-u` 的作用：登记「本地 feat/search-fix 追踪 origin/feat/search-fix」。此后这个分支上裸 `git push` / `git pull` 就够了。

其余推送形态按需取用：

```bash
git push origin v1.2.0            # 推送指定标签（默认 push 不带标签）
git push --tags                   # 推送全部本地标签
git push origin --delete old-branch  # 删除远程分支（本地分支要另删）
```

## 3. 为什么：提交是本地记账，推送是同步副本

理解节奏的关键是分清两步的职责。`git commit` 只写本地历史——不联网、不影响任何人，**小步提交的成本是零**，所以不必吝啬；`git push` 才把本地副本同步到 GitHub，这一步别人看得见，也因此有了校验。

最重要的校验就是 non-fast-forward 拒绝：如果远程分支上已经有你本地没有的提交（同事先推了），Git 拒绝覆盖，宁可报错：

```text
! [rejected] main -> main (non-fast-forward)
```

这不是故障，是保护。标准处置三步：

```bash
git pull --rebase     # 1. 把远程新提交拿下来，自己的提交垫到它后面
# 2. 若有冲突，逐文件解决后 git add（完整流程见 [冲突解决](/github/100-GitConflictResolve)）
git push              # 3. 再推，这次必然成功
```

同理可推知强制推送的定位：`git push --force-with-lease` 绕过保护、改写远程历史。它只属于两种场合——改写了自己独占分支的历史（amend、rebase 之后），或确认远程就是错的。`--force-with-lease` 比裸 `-f` 多一道「远程还在我上次看到的位置吗」的检查；**main 这类共享分支永远不强制推**。

## 4. 坑点与自检

新手期最常见的七个坑：

| 现象 | 原因 | 对策 |
| :--- | :--- | :--- |
| `nothing to commit, working tree clean` | 没 add 就 commit，或本来就没改动 | `git status -s` 确认；有改动先 add |
| commit 后卡在 vim 出不来 | 没带 `-m`，Git 打开编辑器等输入 | 按 `i` 进入输入，写完按 `Esc`，输入 `:wq` 回车保存退出 |
| 提交里没有刚才的修改 | add 之后又改了文件，暂存区还是旧快照 | 重新 `git add` 再 commit；已跟踪文件可用 `git commit -am "..."`（注意它**不含新文件**） |
| push 被拒 `non-fast-forward` | 远程有你没有的提交 | 按第 3 节三步：pull --rebase、解决冲突、再推 |
| `Authentication failed` / 反复要密码 | GitHub 不收账号密码 | `gh auth login` 或配置 SSH / PAT（见 [SSH 与 HTTPS](/github/040-SSHHTTPS)） |
| amend 后 push 被拒 | 已推送的提交被 amend，历史分叉 | 个人分支与团队确认后 `--force-with-lease`；详见 [commit --amend](/git/090-GitCommitAmend) |
| push 长时间无响应 | 网络或代理问题 | 检查代理配置后重试；`git config --global --get http.proxy` 查看当前代理 |

自检四问：

1. 这次提交只装了一件事吗？（`git diff --staged` 见分晓）
2. 提交信息能回答「改了什么类型的事」吗？
3. push 前先 pull 了吗？
4. 我要推的分支，是我独占的吗？

## 5. 练习

1. 基础：在一个练习仓库里复刻第 2 节的节奏——同一批文件改动，拆成 fix 与 docs 两个提交，各自写出规范的提交信息。
2. 挑拣：制造「一个文件里两处不相关改动」的局面，用 `git add -p` 只提交其中一处，用 `git diff` 与 `git diff --staged` 验证拆分结果。
3. 排错：让同伴（或在另一台目录）向同一分支推一个提交，然后你本地直接 push，复现 non-fast-forward 并按三步处置走通。
4. 复盘：用 `git log --oneline --author="你的名字" -10` 看自己最近十条提交信息，按「能否一眼看出改了什么」打分，低于三条的回去翻 [Conventional Commits 速记](/git/090-GitCommitAmend)。

## 下一步

- [git pull 与 fetch](/github/080-GitPullFetch)：本文只用了 `pull --rebase` 一招，拉取的完整机制在那一篇；
- [Git 冲突解决](/github/100-GitConflictResolve)：pull 之后红字扑面而来时的完整预案；
- [Pull Request 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)：推送之后，改动如何进入主干。
