---
order: 101
title: 交互式rebase
module: git
category: toolchain
difficulty: advanced
description: Git交互式rebase详解：reword、squash、fixup、drop等操作改写提交历史。
author: fanquanpp
updated: '2026-06-14'
related:
  - git/垃圾回收
  - 'git/Git-Flow与GitHub-Flow对比'
  - 'git/git-revert与reset对比'
  - 'git/Code-Review流程与最佳实践'
prerequisites:
  - git/语法速查
---

## 1. 交互式 rebase 基础

### 1.1 启动交互式 rebase

```bash
# 修改最近 3 个提交
git rebase -i HEAD~3

# 修改从某个提交之后的所有提交
git rebase -i abc1234

# 修改从根提交开始的所有提交
git rebase -i --root
```

启动后 Git 会打开编辑器，显示待修改的提交列表：

```
pick f7f3f6d feat: add user model
pick 310154e fix: correct validation logic
pick a5f4a0d docs: update README

# Rebase abc1234..a5f4a0d onto abc1234
#
# Commands:
# p, pick <commit> = use commit
# r, reword <commit> = use commit, but edit the commit message
# e, edit <commit> = use commit, but stop for amending
# s, squash <commit> = use commit, but meld into previous commit
# f, fixup [-C | -c] <commit> = like "squash" but keep only the previous
#                    commit's log message, unless -C is given, in which case
#                    keep only this commit's message
# x, exec <command> = run command (the rest of the line) using shell
# b, break = stop here (continue rebase later with 'git rebase --continue')
# d, drop <commit> = remove commit
# l, label <label> = label current HEAD with a name
# t, reset <label> = reset HEAD to a label
# m, merge [-C <commit> | -c <commit>] <label> [# <oneline>]
```

### 1.2 执行顺序

提交列表**从上到下**对应**从旧到新**的时间顺序。修改命令后，Git 按新顺序依次执行。

## 2. reword — 修改提交信息

### 2.1 使用场景

- 修正拼写错误
- 补充遗漏的上下文
- 使提交信息符合约定式提交规范

### 2.2 操作流程

将 `pick` 改为 `reword`（或 `r`）：

```
pick f7f3f6d feat: add user model
reword 310154e fix: corret validation logic  # 拼写错误
pick a5f4a0d docs: update README
```

保存退出后，Git 会为 reword 的提交打开编辑器，让你修改提交信息：

```
fix: correct validation logic

# 原始信息有拼写错误，修正为 correct
```

### 2.3 非交互式 reword

```bash
# 修改最近一个提交的信息
git commit --amend -m "fix: correct validation logic"

# 修改指定提交的信息（需要 rebase）
GIT_SEQUENCE_EDITOR="sed -i 's/pick abc1234/reword abc1234/'" git rebase -i abc1234^
```

## 3. squash — 合并提交

### 3.1 使用场景

- 将细碎提交合并为有意义的原子提交
- 将"修复上一个提交的提交"合并进去
- 保持提交历史整洁

### 3.2 操作流程

```
pick f7f3f6d feat: add user model
squash 310154e fix: correct validation in user model
squash a5f4a0d refactor: clean up user model code
```

保存后，Git 会打开编辑器让你编辑合并后的提交信息：

```
# This is a combination of 3 commits.
# This is the 1st commit message:

feat: add user model

# This is the commit message #2:

fix: correct validation in user model

# This is the commit message #3:

refactor: clean up user model code

# 请编辑为最终合并后的信息
```

合并结果：

```
# 之前
f7f3f6d feat: add user model
310154e fix: correct validation in user model
a5f4a0d refactor: clean up user model code

# 之后
b4a2c1d feat: add user model with validation and cleanup
```

### 3.3 squash 顺序

squash 将当前提交合并到**前一个**提交。因此第一个提交必须是 `pick`：

```
# 正确
pick   A  feat: add feature
squash B  fix: typo in feature
squash C  refactor: clean up feature

# 错误 — 第一个不能是 squash
squash A  feat: add feature
pick   B  fix: typo in feature
```

## 4. fixup — 静默合并

### 4.1 与 squash 的区别

| 操作     | 合并提交信息               | 交互式编辑 |
| -------- | -------------------------- | ---------- |
| squash   | 合并所有提交信息           | 是         |
| fixup    | 丢弃当前提交信息           | 否         |
| fixup -C | 保留当前提交信息替代之前的 | 否         |
| fixup -c | 保留当前提交信息替代之前的 | 是         |

### 4.2 使用场景

适用于"修前一个提交的小问题"的场景，不需要保留中间提交信息：

```bash
# 开发过程中
git commit -m "feat: add login form"
# 发现遗漏
git add forgotten-file.js
git commit -m "fix: forgot to add file"  # 这个提交信息无保留价值
```

交互式 rebase 时：

```
pick   abc1234 feat: add login form
fixup  def5678 fix: forgot to add file
```

结果只保留 `feat: add login form`，第二个提交的信息被丢弃。

### 4.3 fixup -C 保留后者的信息

```
pick   abc1234 WIP: add login form
fixup -C def5678 feat: add login form with validation
```

结果保留 `feat: add login form with validation`，前者信息被丢弃。

### 4.4 自动 fixup 标记

在提交时使用 `--fixup` 预标记：

```bash
git commit --fixup=abc1234 -m "fix: typo in login form"
```

rebase 时使用 `--autosquash` 自动排列：

```bash
git rebase -i --autosquash HEAD~3
```

编辑器自动显示：

```
pick   abc1234 feat: add login form
fixup  def5678 fix: typo in login form  # 自动标记为 fixup
```

## 5. drop — 删除提交

### 5.1 使用场景

- 移除误提交的调试代码
- 删除不再需要的功能提交
- 清理中间产物

### 5.2 操作方式

方式一：将 `pick` 改为 `drop`：

```
pick   abc1234 feat: add user model
drop   def5678 debug: add console.log statements
pick   ghi9012 feat: add user service
```

方式二：直接删除该行：

```
pick   abc1234 feat: add user model
pick   ghi9012 feat: add user service
# def5678 行已删除
```

### 5.3 注意事项

删除提交可能导致后续提交产生冲突，因为后续提交可能依赖于被删除提交的代码。

## 6. edit — 拆分提交

### 6.1 拆分流程

```
pick   abc1234 feat: add user model and service
edit   def5678 feat: add user controller
```

当 rebase 在 `edit` 处暂停时：

```bash
# 1. 回退当前提交但保留更改
git reset HEAD^

# 2. 分多次提交
git add src/models/user.js
git commit -m "feat: add user model"

git add src/services/user.js
git commit -m "feat: add user service"

# 3. 继续 rebase
git rebase --continue
```

### 6.2 修改提交内容

在 `edit` 暂停时修改文件：

```bash
# 修改文件
vim src/models/user.js

# 追加到当前提交
git add src/models/user.js
git commit --amend

# 继续
git rebase --continue
```

## 7. rebase 冲突处理

### 7.1 冲突解决流程

```bash
# rebase 过程中出现冲突
git rebase -i HEAD~5
# CONFLICT (content): Merge conflict in src/app.js

# 1. 手动解决冲突
vim src/app.js

# 2. 标记为已解决
git add src/app.js

# 3. 继续 rebase
git rebase --continue
```

### 7.2 跳过或中止

```bash
# 跳过当前提交（等效于 drop）
git rebase --skip

# 完全放弃 rebase，恢复原始状态
git rebase --abort
```

### 7.3 使用 git rerere 复用冲突解决方案

```bash
# 启用 rerere
git config --global rerere.enabled true

# Git 会记住之前的冲突解决方案
# 下次遇到相同冲突时自动应用
```

## 8. 安全实践

### 8.1 黄金法则

**永远不要对已推送到远程的公共分支执行 rebase。**

```
# 危险！
git rebase -i main  # 如果 main 是共享分支

# 安全
git rebase -i HEAD~3  # 仅修改自己的本地提交
```

### 8.2 强制推送的替代方案

如果必须 rebase 已推送的分支，使用 `--force-with-lease`：

```bash
git push --force-with-lease origin feature/xxx
# 比 --force 更安全，会检查远程是否有他人新提交
```

### 8.3 rebase 前备份

```bash
# 创建备份分支
git branch backup-before-rebase

# rebase 失败时恢复
git reset --hard backup-before-rebase
```
