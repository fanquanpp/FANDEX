---
order: 59
title: HEAD指针与分支本质
module: git
category: 'Git Basics'
difficulty: intermediate
description: HEAD指针机制与Git分支的本质：引用、符号引用与分支操作原理。
author: fanquanpp
updated: '2026-06-14'
related:
  - git/引用日志
  - git/代码追溯
  - git/Git钩子与GitLFS
  - git/合并冲突解决
prerequisites:
  - git/语法速查
---

## 1. HEAD 指针

### 1.1 什么是 HEAD

HEAD 是一个**符号引用**（symbolic reference），指向当前分支的最新提交。它告诉 Git "你现在在哪里"。

```bash
# 查看 HEAD 指向
cat .git/HEAD
# ref: refs/heads/main    ← 指向分支引用

# 查看解析后的值
git rev-parse HEAD
# 9a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t
```

### 1.2 HEAD 的两种状态

**附着的 HEAD（Attached HEAD）**：

```
HEAD → refs/heads/main → commit abc1234
```

- HEAD 指向一个分支名
- 提交时分支指针自动前进

**分离的 HEAD（Detached HEAD）**：

```
HEAD → commit abc1234（不指向任何分支）
```

- HEAD 直接指向一个提交
- 提交时不会更新任何分支

```bash
# 进入分离 HEAD 状态
git checkout abc1234
# Note: switching to 'abc1234'.
# You are in 'detached HEAD' state.

# 在分离 HEAD 下提交
git commit -m "temp work"
# 提交成功，但没有分支指向这个新提交
# 切换分支后可能丢失
```

### 1.3 分离 HEAD 的场景

| 场景     | 命令                   | 说明               |
| :------- | :--------------------- | :----------------- |
| 检出提交 | `git checkout abc1234` | 查看历史版本       |
| 检出标签 | `git checkout v1.0.0`  | 查看发布版本       |
| rebase   | `git rebase -i`        | 交互式变基过程中   |
| 子模块   | 子模块目录中           | 子模块处于分离状态 |

## 2. 分支的本质

### 2.1 分支是什么

Git 分支本质上是一个**指向提交的可移动指针**，存储在 `.git/refs/heads/` 目录中：

```bash
# 查看分支文件
cat .git/refs/heads/main
# 9a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t

# 这只是一个40字节的文本文件！
```

### 2.2 分支创建的 O(1) 特性

创建分支只是创建一个新文件，写入当前提交的哈希值：

```bash
# 创建分支
git branch feature
# 等价于：
echo abc1234 > .git/refs/heads/feature

# 时间复杂度：O(1)
# 无论仓库有多少文件、多少提交，创建分支都是瞬间完成
```

### 2.3 分支指针的移动

```
初始状态:
  A ← B ← C ← main
                ↑ HEAD

提交后:
  A ← B ← C ← D ← main
                    ↑ HEAD

分支指针自动前进到新提交
```

## 3. 引用体系

### 3.1 引用类型

| 类型         | 路径                 | 说明         |
| :----------- | :------------------- | :----------- |
| **分支**     | `.git/refs/heads/`   | 本地分支     |
| **远程分支** | `.git/refs/remotes/` | 远程跟踪分支 |
| **标签**     | `.git/refs/tags/`    | 标签引用     |
| **HEAD**     | `.git/HEAD`          | 当前位置     |

### 3.2 引用规范

```bash
# 完整路径
refs/heads/main
refs/remotes/origin/main
refs/tags/v1.0.0

# 简写
main                    → refs/heads/main
origin/main             → refs/remotes/origin/main
v1.0.0                  → refs/tags/v1.0.0
```

### 3.3 打包引用

当引用数量很多时，Git 会将它们打包到 `.git/packed-refs` 文件中：

```bash
# 查看 packed-refs
cat .git/packed-refs
# 9a1b2c3d refs/heads/main
# def5678e refs/heads/feature
# abc1234f refs/tags/v1.0.0
```

## 4. 分支操作原理

### 4.1 创建分支

```bash
git branch feature
# 1. 创建 .git/refs/heads/feature
# 2. 写入当前 HEAD 的哈希值
```

### 4.2 切换分支

```bash
git checkout feature
# 1. 更新 HEAD 指向 feature
# 2. 更新工作区和暂存区到 feature 指向的提交
# 3. 更新索引文件
```

### 4.3 删除分支

```bash
git branch -d feature
# 1. 删除 .git/refs/heads/feature
# 2. 提交对象仍然存在（通过 reflog 可恢复）
```

### 4.4 合并分支

```bash
git merge feature
# 1. 找到两个分支的共同祖先
# 2. 执行三方合并
# 3. 创建合并提交（或快进移动指针）
```

## 5. 实用命令

```bash
# 查看所有引用
git show-ref

# 查看引用指向的提交
git rev-parse main
git rev-parse HEAD
git rev-parse v1.0.0

# 查看引用日志
git reflog show main

# 比较两个引用
git log main..feature --oneline

# 查看分支的创建点
git merge-base main feature
```
