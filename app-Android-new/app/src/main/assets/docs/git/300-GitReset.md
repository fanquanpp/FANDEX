---
order: 300
title: git-reset 三种重置模式
module: 'git'
category: 工具链
difficulty: advanced
description: git reset 三种模式详解：soft、mixed、hard 的精确语义、路径限位用法与恢复手段。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/080-GitRestoreFileOperation'
  - 'git/260-GitReflog'
  - 'git/310-GitRevert'
  - 'git/320-GitRevertResetComparison'
prerequisites:
  - 'git/060-ThreeTrees'
---

## 前置知识与学习目标

**前置知识**：理解工作区、暂存区、仓库（HEAD/分支）三棵树的分工（见 [三棵树模型](git/060-ThreeTrees)）。

学完本文你应当能够：

1. 精确说出 `--soft` / `--mixed` / `--hard` 各自动到哪几棵树；
2. 区分「分支级 reset」与「路径级 reset」两种完全不同的操作；
3. 知道 reset --hard 之后如何用 reflog 挽救，以及什么时候救不回来。

一个类比先行：把三棵树想象成**草稿纸（工作区）、装订夹（暂存区）、归档柜（仓库/分支）**。reset 就是把归档柜里的「当前卷宗」标签退回到某一页，至于是不是同时清空装订夹、撕掉草稿纸，由模式参数决定。

## 1. reset 到底移动了什么

`git reset <提交>` 做的核心动作只有一个：**把当前分支的指针移动到目标提交**（处于 detached HEAD 时则直接移动 HEAD）。分支指针变了，HEAD 指向分支，于是「当前位置」随之改变。至于暂存区和工作区要不要跟着变，就是三种模式的区别。

因此 reset 天生不会删除提交——旧提交只是不再被分支指着，但仍被 reflog 引用着，这就是恢复的理论基础。

三种模式总览：

| 模式               | 分支指针 | 暂存区           | 工作区           | 典型用途                     |
| :----------------- | :------- | :--------------- | :--------------- | :--------------------------- |
| `--soft`           | 移动     | 不变             | 不变             | 撤销提交、重新组织暂存       |
| `--mixed`（默认）  | 移动     | 重置到目标提交   | 不变             | 撤销提交、变更退回工作区     |
| `--hard`           | 移动     | 重置到目标提交   | 重置到目标提交   | 彻底丢弃已跟踪文件的本地改动 |

## 2. --soft：只退分支指针

### 2.1 效果

```text
重置前: A---B---C---D  (main, HEAD)

git reset --soft B

重置后: A---B---C---D
            ↑ main, HEAD
        C、D 的全部内容仍留在暂存区，随时可以重新提交
```

因为暂存区没动，`git status` 会显示 C 和 D 的所有改动都处于「已暂存」状态。

### 2.2 典型场景：合并最近几个提交

```bash
# 把最近 3 个提交压成 1 个（尚未推送时）
git reset --soft HEAD~3
git commit -m "feat: complete login feature"
```

这也常用于「提交完发现少了文件」：

```bash
git reset --soft HEAD~1   # 撤销提交，内容回到暂存区
git add forgotten.txt     # 补上遗漏的文件
git commit -m "feat: add login with config file"
```

## 3. --mixed：退指针并清暂存区（默认）

### 3.1 效果

```text
git reset B            # 等价于 git reset --mixed B

重置后: A---B---C---D
            ↑ main, HEAD
        C、D 的改动退回工作区，处于「未暂存」状态
```

### 3.2 两种用途

用途一：撤销提交，把变更退回工作区重新编辑。

```bash
git reset HEAD~1       # 撤销上一个提交，改动保留在未暂存状态
```

用途二：**路径级 reset**——取消暂存指定文件。当 reset 带了路径参数，它不再移动分支指针，语义完全变成「把该路径的暂存区条目从目标提交复制回来」：

```bash
# 把 app.js 移出暂存区（工作区内容不变）
git reset app.js
# 等价于
git reset HEAD -- app.js

# 按某个历史提交的版本重置该文件的暂存区
git reset v1.2 -- src/config.js
```

注意：路径级 reset **不允许** `--soft` / `--hard`，执行会直接报错 `fatal: Cannot do hard reset with paths`——因为这两个语义在「只动暂存区条目」的模型下没有定义。

### 3.3 现代替代：git restore（Git 2.23+）

取消暂存的现代写法是 `git restore --staged`，语义更单一、不易误操作：

```bash
git restore --staged app.js    # 对应 git reset app.js（取消暂存）
git restore app.js             # 丢弃工作区改动（对应旧写法 git checkout -- app.js）
```

详见 [git restore 与文件恢复](git/080-GitRestoreFileOperation)。

## 4. --hard：三棵树全部对齐

### 4.1 效果与不可逆边界

```text
git reset --hard B

重置后: A---B
            ↑ main, HEAD
        C、D 引入的、以及工作区所有【已跟踪文件】的改动全部还原
```

`--hard` 会把暂存区和工作区**已被跟踪的文件**强制还原到目标提交的样子。但有一条重要的安全边界：**未跟踪文件（untracked）不受影响**。想连它们一起清掉需要 `git clean`：

```bash
git reset --hard origin/main   # 已跟踪文件与远程对齐
git clean -fd                  # 另行删除未跟踪的文件与目录（先 -n 预览！）
```

### 4.2 经典用法：丢弃本地一切，与远程对齐

```bash
git fetch origin
git reset --hard origin/main
```

这会抛弃本地分支上所有未推送的提交与改动，属于「我本地已经乱了，以远程为准」的急救操作。

## 5. reset --hard 之后如何挽救

### 5.1 已提交的内容：reflog 必救

reset 本身会写进 HEAD 的 reflog，找回重置前的位置轻而易举：

```bash
git reset --hard HEAD~3        # 误操作

git reflog
# 5f6a7b8 HEAD@{0}: reset: moving to HEAD~3
# 9c8d7e6 HEAD@{1}: commit: feat: real work    ← 重置前所在提交

git reset --hard HEAD@{1}      # 回到重置前
# 或者一步到位：reset 会把旧位置记入 ORIG_HEAD
git reset --hard ORIG_HEAD
```

原理与更多案例（恢复被删分支、rebase 悔棋）见 [git reflog](git/260-GitReflog)。

### 5.2 未提交但 add 过的内容：fsck 找悬空 blob

这是多数人不知道的救命通道：只要文件曾被 `git add` 过，其内容就已经作为 blob 写入对象库。reset --hard 之后这些 blob 变成「悬空对象」，仍可找回：

```bash
git fsck --lost-found
# Checking object directories: 100% (256/256), done.
# dangling blob 8d0e4123...

git cat-file -p 8d0e4123       # 查看内容，确认后手动恢复
```

### 5.3 从未 add 过的内容：救不回来

既没提交也没 add 的修改只存在于工作区文件里，`--hard` 覆盖后 Git 层面没有任何副本。此时只能求助于编辑器本地历史、IDE 的 Local History、或系统快照。执行 `--hard` 前用 `git stash` 兜底是好习惯（见 [git stash](git/120-GitStash)）。

## 6. reset 与近亲命令的边界

| 需求                                   | 推荐命令                            |
| :------------------------------------- | :---------------------------------- |
| 取消暂存某文件                         | `git restore --staged <file>`       |
| 丢弃工作区某文件改动                   | `git restore <file>`                |
| 撤销未推送的提交（本地）               | `git reset --soft/--mixed HEAD~1`   |
| 撤销已推送的提交（共享分支）           | `git revert <commit>`               |
| 丢弃全部本地改动与远程对齐             | `git fetch && git reset --hard origin/main` |
| 把已推送的分支历史改写对齐远程         | 不要 reset + force push，先沟通     |

共享分支上「撤销」务必用 revert（生成反向提交、不改写历史），原因见 [git revert](git/310-GitRevert) 与 [revert/reset 对比](git/320-GitRevertResetComparison)。

## 7. 陷阱与调试

- **`reset --hard` 后工作区「多了」文件**：那是未跟踪文件，reset 不碰它们；需要 `git clean -nd` 先预览再删。
- **`--soft` 后 status 显示一大堆已暂存改动**：这是特性不是故障，改动正等你重新提交。
- **路径写法顺序**：现代写法建议把路径放最后并用 `--` 分隔：`git reset <commit> -- <path>`；`git reset <path>` 若与分支名同名会有歧义风险，加 `--` 可消除。
- **reset 后 push 被拒**：本地历史已被改写、落后于远程。共享分支请 revert；确要覆盖用 `--force-with-lease` 并知会协作者（见 [git rebase 的黄金法则](git/270-GitRebase)）。
- **以为 `HEAD~3` 是「第三个提交」**：`HEAD~n` 沿第一父提交回溯 n 步；合并提交的「另一条腿」要用 `HEAD^2`（第二父），不要混淆。

## 小结

**初学者要点**

- `--soft` 只退分支指针，`--mixed`（默认）再清暂存区，`--hard` 连工作区一起还原。
- 取消暂存优先用 `git restore --staged`，语义比 reset 清晰。
- reset 不会真正删除提交，reflog 是后悔药。

**进阶注意**

- 路径级 reset 只动暂存区条目，且与 `--soft` / `--hard` 互斥。
- `--hard` 不影响未跟踪文件；add 过未提交的内容可用 `git fsck --lost-found` 找回悬空 blob；从未 add 的内容无法找回。
- 共享分支撤销用 revert；`ORIG_HEAD` 与 `HEAD@{1}` 是 reset 悔棋的两个快捷入口。
