---
order: 64
title: 'git-stash'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git stash详解：暂存工作进度、多栈管理与典型应用场景。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/变基操作
  - git/摘取提交
  - git/远程跟踪分支
  - 'git/Git-Flow与GitHub-Flow'
prerequisites:
  - git/语法速查
---

## 1. stash 概述

### 1.1 什么是 stash

`git stash` 将工作区和暂存区的修改**临时保存**到栈中，恢复工作区到干净状态。

```
工作区（有修改） → git stash → 工作区（干净）
                      ↓
                  stash 栈
                  ┌───────┐
                  │stash@{2}│
                  │stash@{1}│
                  │stash@{0}│ ← 最新
                  └───────┘
```

## 2. 基本用法

### 2.1 创建 stash

```bash
# 保存所有已跟踪文件的修改
git stash

# 保存时添加消息
git stash push -m "WIP: feature auth"

# 包含未跟踪的文件
git stash -u
git stash --include-untracked

# 包含被忽略的文件
git stash -a
git stash --all

# 只暂存部分文件
git stash push -p          # 交互式选择
git stash push file.txt    # 指定文件
```

### 2.2 查看 stash

```bash
# 查看所有 stash
git stash list
# stash@{0}: On main: WIP: feature auth
# stash@{1}: WIP on main: abc1234 fix: bug

# 查看 stash 内容
git stash show             # 最新 stash 的摘要
git stash show -p          # 最新 stash 的差异
git stash show stash@{1}   # 指定 stash 的摘要
git stash show -p stash@{1}
```

### 2.3 恢复 stash

```bash
# 恢复并删除 stash
git stash pop              # 恢复最新的 stash
git stash pop stash@{1}    # 恢复指定 stash

# 恢复但保留 stash
git stash apply            # 恢复最新的 stash
git stash apply stash@{1}  # 恢复指定 stash

# 恢复暂存区状态
git stash apply --index    # 同时恢复暂存区
```

### 2.4 删除 stash

```bash
# 删除指定 stash
git stash drop stash@{1}

# 删除所有 stash
git stash clear
```

## 3. 高级用法

### 3.1 从 stash 创建分支

```bash
# 基于 stash 创建新分支
git stash branch feature-from-stash stash@{0}
# 1. 创建新分支
# 2. 恢复 stash 内容
# 3. 删除 stash
```

### 3.2 部分暂存

```bash
# 交互式选择暂存内容
git stash push -p
# Stash this hunk [y,n,q,a,d,/,s,e,?]?
```

### 3.3 查看 stash 中的文件

```bash
# 查看 stash 中某个文件的内容
git show stash@{0}:src/index.js

# 比较 stash 和当前工作区
git diff stash@{0}
```

## 4. 典型场景

### 4.1 紧急修复

```bash
# 正在开发功能，需要紧急修复 Bug
git stash -m "WIP: feature"
git checkout main
git checkout -b hotfix/bug-123
# ... 修复 Bug ...
git commit -m "fix: resolve bug 123"
git checkout feature
git stash pop
```

### 4.2 切换分支

```bash
# 需要切换分支但不想提交半成品
git stash
git checkout other-branch
# ... 完成其他工作 ...
git checkout feature
git stash pop
```

### 4.3 多任务并行

```bash
# 多个 WIP 进度
git stash push -m "feature A"
# ... 工作 ...
git stash push -m "feature B"

# 查看所有进度
git stash list

# 恢复特定进度
git stash apply stash@{1}
```

## 5. 注意事项

- `git stash pop` 如果有冲突，stash 不会被删除
- stash 是**本地**的，不会推送到远程
- 默认不保存未跟踪文件，需加 `-u`
- 长期不用的 stash 应及时清理
