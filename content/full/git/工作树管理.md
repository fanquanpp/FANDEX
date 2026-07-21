---
order: 76
title: 'git-worktree'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git worktree详解：多工作树并行开发，无需频繁切换分支。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/补丁与邮件工作流
  - git/内容搜索
  - git/垃圾回收
  - 'git/Git-Flow与GitHub-Flow对比'
prerequisites:
  - git/语法速查
---

## 1. worktree 概述

### 1.1 什么是 worktree

`git worktree` 允许从同一仓库**检出多个工作目录**，每个目录对应不同分支，共享 .git 数据。

```
主工作树: ~/project/           → main 分支
工作树2:  ~/project-feature/   → feature 分支
工作树3:  ~/project-hotfix/    → hotfix 分支

共享: ~/project/.git/
```

### 1.2 优势

| 优势           | 说明               |
| :------------- | :----------------- |
| **无需 stash** | 不同分支在不同目录 |
| **并行开发**   | 同时在多个分支工作 |
| **快速切换**   | 不需要切换分支     |
| **节省空间**   | 共享 .git 数据     |

## 2. 基本用法

### 2.1 创建工作树

```bash
# 基于现有分支创建
git worktree add ../project-feature feature

# 基于新分支创建
git worktree add -b new-feature ../project-new-feature main

# 创建分离 HEAD 的工作树
git worktree add --detach ../project-v1 v1.0.0
```

### 2.2 管理工作树

```bash
# 列出所有工作树
git worktree list
# /home/user/project            abc1234 [main]
# /home/user/project-feature    def5678 [feature]
# /home/user/project-hotfix     ghi9012 [hotfix/bug]

# 在工作树中工作
cd ../project-feature
git log
git commit -m "feat: add new feature"

# 删除工作树
git worktree remove ../project-feature

# 强制删除（有未提交修改）
git worktree remove --force ../project-feature
```

### 2.3 清理工作树

```bash
# 清理已删除目录的工作树引用
git worktree prune

# 查看将被清理的
git worktree prune --dry-run
```

## 3. 实际场景

### 3.1 紧急修复

```bash
# 正在 feature 分支开发
# 需要紧急修复 Bug

# 不需要 stash，直接创建工作树
git worktree add ../hotfix -b hotfix/bug-123 main
cd ../hotfix
# 修复 Bug
git commit -m "fix: resolve bug 123"
git push origin hotfix/bug-123
cd ../project
git worktree remove ../hotfix
```

### 3.2 代码审查

```bash
# 检出同事的 PR 到独立工作树
git worktree add ../review-pr -b review origin/colleague/feature
cd ../review-pr
# 测试和审查
```

### 3.3 对比版本

```bash
# 同时查看两个版本的代码
git worktree add ../v1-compare v1.0.0
# 在两个目录间对比
diff -r src/ ../v1-compare/src/
```

## 4. 注意事项

- 同一分支不能同时在多个工作树中检出
- 工作树共享 .git 目录，操作互不影响
- 删除工作树目录后需 `git worktree prune`
- 工作树中的子模块需要单独初始化
