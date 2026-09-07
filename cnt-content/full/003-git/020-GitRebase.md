---
order: 200
title: git-rebase
module: 'git'
category: 工具链
difficulty: advanced
description: git rebase详解：变基原理、交互式改写历史与安全实践。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'git/018-MergeConflictResolution'
prerequisites: []
---

## 1. rebase 概述

### 1.1 什么是 rebase

rebase（变基）将一系列提交**重新应用到**另一个基础提交之上，产生线性历史。

```
合并前:
  A---B---C main
       \
        D---E feature

merge 结果:
  A---B---C---M main
       \     /
        D---E

rebase 结果:
  A---B---C---D'---E' main, feature
```

### 1.2 rebase vs merge

| 特性       | merge        | rebase               |
| :--------- | :----------- | :------------------- |
| **历史**   | 保留分支结构 | 线性历史             |
| **提交**   | 创建合并提交 | 重写提交             |
| **可逆性** | 容易回退     | 需要 force push      |
| **冲突**   | 一次性解决   | 逐提交解决           |
| **适用**   | 合并到主分支 | 同步主分支到功能分支 |

## 2. 基本 rebase

### 2.1 标准变基

```bash
# 将 feature 变基到 main
git checkout feature
git rebase main

# 等价于
git rebase main feature
```

### 2.2 变基过程

```
1. 找到 feature 和 main 的共同祖先
2. 保存 feature 上的每个提交为补丁
3. 将 feature 指向 main 的最新提交
4. 逐个应用补丁（可能产生冲突）
5. 每个补丁生成新的提交（新哈希）
```

### 2.3 处理冲突

```bash
# rebase 过程中遇到冲突
git rebase main
# CONFLICT: ...

# 解决冲突后
git add .
git rebase --continue

# 跳过当前提交
git rebase --skip

# 放弃整个 rebase
git rebase --abort
```

## 3. 交互式 rebase

### 3.1 启动交互式 rebase

```bash
# 修改最近3个提交
git rebase -i HEAD~3

# 修改从分叉点以来的提交
git rebase -i main
```

### 3.2 编辑器内容

```text
pick abc1234 feat: add authentication
pick def5678 fix: resolve login bug
pick ghi9012 docs: update README

# Rebase instructions:
# p, pick = 使用提交
# r, reword = 使用提交，修改消息
# e, edit = 使用提交，暂停修改
# s, squash = 合并到前一个提交
# f, fixup = 合并到前一个提交，丢弃消息
# d, drop = 丢弃提交
```

### 3.3 常用操作

**修改提交消息**：

```text
reword abc1234 feat: add authentication
pick def5678 fix: resolve login bug
```

**合并提交**：

```text
pick abc1234 feat: add authentication
squash def5678 fix: resolve login bug
# 合并后编辑合并消息
```

**修改提交内容**：

```text
edit abc1234 feat: add authentication
pick def5678 fix: resolve login bug

# 保存后 Git 会暂停
# 修改文件
git add .
git commit --amend
git rebase --continue
```

**重新排序**：

```text
# 调整提交顺序
pick def5678 fix: resolve login bug
pick abc1234 feat: add authentication
```

**删除提交**：

```text
pick abc1234 feat: add authentication
drop def5678 fix: resolve login bug
```

## 4. 高级用法

### 4.1 rebase 到指定提交

```bash
# 变基到指定提交
git rebase --onto main abc1234 feature
# 将 abc1234..feature 范围的提交变基到 main 上
```

### 4.2 自动 squash

```bash
# 自动合并 fixup 提交
git rebase -i --autosquash
# 配合 git commit --fixup=abc1234 使用
```

### 4.3 保留合并提交

```bash
# 保留分支合并结构
git rebase -i --rebase-merges main
```

## 5. 黄金法则

### 5.1 不要 rebase 公共分支

```
 危险：rebase 已推送的提交
git checkout main
git rebase feature
git push --force  ← 会覆盖他人的提交历史

 安全：只 rebase 本地未推送的提交
git checkout feature
git rebase main
git push  ← 首次推送，无风险
```

### 5.2 force push 安全方式

```bash
# 使用 --force-with-lease（更安全）
git push --force-with-lease

# 它会检查远程是否有别人的新提交
# 如果有，拒绝 push，避免覆盖他人工作
```

## 6. 实际场景

### 6.1 同步主分支更新

```bash
# 功能分支保持与主分支同步
git checkout feature
git fetch origin
git rebase origin/main
```

### 6.2 清理提交历史

```bash
# 合并多个小提交为一个有意义的提交
git rebase -i HEAD~5
# 将 WIP 提交 squash 为最终版本
```

### 6.3 修复早期提交的 Bug

```bash
# 在早期提交上修复 Bug
git rebase -i HEAD~3
# 将目标提交标记为 edit
# 修复后
git commit --amend
git rebase --continue
```
## 基本 rebase

**基本写法：标准变基**
`git rebase <基础分支>`
```bash
# 将 feature 分支变基到 main
git checkout feature;
git rebase main;
```

**基本写法：等价写法**
`git rebase <基础分支> <目标分支>`
```bash
# 等价于先 checkout feature 再 rebase main
git rebase main feature;
```

---

## 处理 rebase 冲突

**基本写法：触发 rebase**
`git rebase <基础分支>`
```bash
# rebase 过程中遇到冲突
git rebase main;
```

**基本写法：添加解决后的文件**
`git add .`
```bash
# 解决冲突后添加文件
git add .;
```

**基本写法：继续 rebase**
`git rebase --continue`
```bash
# 继续 rebase 流程
git rebase --continue;
```

**基本写法：跳过当前提交**
`git rebase --skip`
```bash
# 跳过当前冲突的提交
git rebase --skip;
```

**基本写法：放弃 rebase**
`git rebase --abort`
```bash
# 放弃整个 rebase 操作
git rebase --abort;
```

---

## 交互式 rebase

**基本写法：修改最近 N 个提交**
`git rebase -i HEAD~<n>`
```bash
# 修改最近 3 个提交
git rebase -i HEAD~3;
```

**基本写法：修改分叉点以来的提交**
`git rebase -i <基础分支>`
```bash
# 修改从 main 分叉以来的所有提交
git rebase -i main;
```

---

## 交互式 rebase 指令

**基本写法：指令格式**
`<指令> <提交哈希> <提交消息>`
```text
# 指令说明
# p, pick   使用提交
# r, reword 使用提交，修改消息
# e, edit   使用提交，暂停修改
# s, squash 合并到前一个提交
# f, fixup  合并到前一个提交，丢弃消息
# d, drop   丢弃提交
pick abc1234 feat: add authentication
pick def5678 fix: resolve login bug
```

**基本写法：修改提交消息**
`reword <提交哈希> <提交消息>`
```text
# 修改 abc1234 的提交消息
reword abc1234 feat: add authentication
pick def5678 fix: resolve login bug
```

**基本写法：合并提交**
`squash <提交哈希> <提交消息>`
```text
# 将 def5678 合并到 abc1234
pick abc1234 feat: add authentication
squash def5678 fix: resolve login bug
```

**基本写法：修改提交内容**
`edit <提交哈希> <提交消息>`
```text
# 标记 abc1234 为 edit 后保存退出
edit abc1234 feat: add authentication
pick def5678 fix: resolve login bug
```

**基本写法：修改暂停后的提交**
`git commit --amend`
```bash
# 修改提交内容
git commit --amend;
```

**基本写法：重新排序提交**
`pick <提交哈希> <提交消息>`
```text
# 调整提交顺序，def5678 在前
pick def5678 fix: resolve login bug
pick abc1234 feat: add authentication
```

**基本写法：删除提交**
`drop <提交哈希> <提交消息>`
```text
# 删除 def5678 提交
pick abc1234 feat: add authentication
drop def5678 fix: resolve login bug
```

---

## 高级 rebase

**基本写法：变基到指定提交**
`git rebase --onto <基础分支> <起始提交> <目标分支>`
```bash
# 将 abc1234..feature 范围的提交变基到 main 上
git rebase --onto main abc1234 feature;
```

**基本写法：自动 squash**
`git rebase -i --autosquash`
```bash
# 配合 git commit --fixup=abc1234 使用
git rebase -i --autosquash;
```

**基本写法：保留合并提交**
`git rebase -i --rebase-merges <基础分支>`
```bash
# 保留分支合并结构的交互式变基
git rebase -i --rebase-merges main;
```

---

## force push 安全方式

**基本写法：安全强制推送**
`git push --force-with-lease`
```bash
# 检查远程是否有新提交，有则拒绝推送
git push --force-with-lease;
```

---

## 实际场景

**基本写法：同步主分支更新**
`git rebase <远程仓库名>/<分支名>`
```bash
# 功能分支同步主分支更新
git checkout feature;
git fetch origin;
git rebase origin/main;
```

**基本写法：清理提交历史**
`git rebase -i HEAD~<n>`
```bash
# 合并最近 5 个提交
git rebase -i HEAD~5;
```

**基本写法：启动交互式 rebase 修复 Bug**
`git rebase -i HEAD~<n>`
```bash
# 启动交互式 rebase
git rebase -i HEAD~3;
```

**基本写法：修改提交**
`git commit --amend`
```bash
# 修复 Bug 后修改提交
git commit --amend;
```

**基本写法：继续 rebase**
`git rebase --continue`
```bash
# 继续 rebase 流程
git rebase --continue;
```
