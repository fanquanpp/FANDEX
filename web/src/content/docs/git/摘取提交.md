---
order: 63
title: 'git-cherry-pick'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git cherry-pick详解：选择性移植提交、跨分支应用与冲突处理。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/合并工具
  - git/变基操作
  - git/暂存工作区
  - git/远程跟踪分支
prerequisites:
  - git/语法速查
---

## 1. cherry-pick 概述

### 1.1 什么是 cherry-pick

`git cherry-pick` 将指定的提交**移植**到当前分支，创建新的提交（新哈希）。

```
原始状态:
  A---B---C main
       \
        D---E feature

cherry-pick D 到 main:
  A---B---C---D' main
       \
        D---E feature
```

### 1.2 适用场景

| 场景           | 说明                                 |
| :------------- | :----------------------------------- |
| **热修复**     | 将修复提交从开发分支移植到发布分支   |
| **选择性合并** | 只合并特定功能，不合并整个分支       |
| **补丁回移**   | 将维护分支的修复回移到主分支         |
| **误提交修正** | 将误提交到错误分支的提交移到正确分支 |

## 2. 基本用法

### 2.1 单个提交

```bash
git cherry-pick abc1234
```

### 2.2 多个提交

```bash
# 多个提交
git cherry-pick abc1234 def5678

# 提交范围
git cherry-pick abc1234..def5678    # 不包含 abc1234
git cherry-pick abc1234^..def5678   # 包含 abc1234
```

### 2.3 常用选项

```bash
# 只应用变更但不提交
git cherry-pick -n abc1234

# 保留原始作者信息
git cherry-pick -x abc1234    # 在消息中添加原始提交哈希

# 修改提交消息
git cherry-pick -e abc1234

# 保留提交的父提交信息（用于合并提交）
git cherry-pick -m 1 abc1234
```

## 3. 冲突处理

### 3.1 解决冲突

```bash
git cherry-pick abc1234
# CONFLICT: ...

# 解决冲突
vim conflicted-file.js
git add .
git cherry-pick --continue
```

### 3.2 跳过提交

```bash
git cherry-pick --skip
```

### 3.3 放弃 cherry-pick

```bash
git cherry-pick --abort
```

## 4. 实际场景

### 4.1 热修复

```bash
# 在 develop 分支修复了 Bug
git checkout develop
git commit -m "fix: resolve critical bug"

# 将修复移植到 release 分支
git checkout release/v2.0
git cherry-pick abc1234
```

### 4.2 误提交修正

```bash
# 误提交到 main
git checkout main
git log --oneline -3
# abc1234 feat: should be in feature branch

# 移植到正确分支
git checkout feature
git cherry-pick abc1234

# 从 main 移除
git checkout main
git revert abc1234
```

### 4.3 批量移植

```bash
# 将 feature 分支的最近3个提交移植
git checkout main
git cherry-pick feature~3..feature
```

## 5. 注意事项

- cherry-pick 创建**新提交**（新哈希），不是移动原提交
- 同一变更 cherry-pick 两次会产生重复提交
- 合并提交的 cherry-pick 需要指定父提交编号
- cherry-pick 后可能需要解决上下文冲突
