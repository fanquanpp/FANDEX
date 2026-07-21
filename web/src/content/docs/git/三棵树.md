---
order: 53
title: 三棵树
module: git
category: 'Git Basics'
difficulty: intermediate
description: Git三棵树模型：工作区、暂存区、本地仓库的状态管理与转换。
author: fanquanpp
updated: '2026-06-14'
related:
  - git/对象模型
  - 'git/SHA-1哈希完整性校验'
  - 'git/git-diff与暂存区操作'
  - 'git/git-restore与文件操作'
prerequisites:
  - git/语法速查
---

## 1. 三棵树模型

### 1.1 概念图

```
工作区 (Working Directory)
    │  git add
    ▼
暂存区 (Staging Area / Index)
    │  git commit
    ▼
本地仓库 (Repository)
    │  git push
    ▼
远程仓库 (Remote)
```

### 1.2 三棵树的定义

| 树           | 位置           | 内容           | 操作                |
| :----------- | :------------- | :------------- | :------------------ |
| **工作区**   | 文件系统       | 实际文件       | 编辑、创建、删除    |
| **暂存区**   | `.git/index`   | 下次提交的快照 | `git add`、`git rm` |
| **本地仓库** | `.git/objects` | 所有提交历史   | `git commit`        |

## 2. 工作区

### 2.1 文件状态

工作区中的文件有四种状态：

```
未跟踪 (Untracked)
    │  git add
    ▼
已暂存 (Staged)
    │  git commit
    ▼
已提交 (Committed)
    │  修改文件
    ▼
已修改 (Modified)
    │  git add
    ▼
已暂存 (Staged)
```

### 2.2 查看状态

```bash
git status
# On branch main
# Changes to be committed:        ← 已暂存
#   modified:   index.js
#
# Changes not staged for commit:  ← 已修改未暂存
#   modified:   README.md
#
# Untracked files:                ← 未跟踪
#   new-feature.js
```

### 2.3 简洁输出

```bash
git status -s
# M  index.js       ← 已暂存的修改
#  M README.md      ← 未暂存的修改
# ?? new-feature.js ← 未跟踪
# A  added.js       ← 新添加到暂存区
# D  deleted.js     ← 已删除（暂存区）
#  D removed.js     ← 已删除（工作区）
# MM both.js        ← 暂存区和工作区都有修改
```

## 3. 暂存区

### 3.1 Index 文件

暂存区存储在 `.git/index` 文件中，是一个**二进制文件**，记录了下次提交的文件快照：

```bash
# 查看暂存区内容
git ls-files -s
# 100644 abc1234 0    README.md
# 100644 def5678 0    src/index.js
# 100644 ghi9012 0    package.json
```

### 3.2 暂存操作

```bash
# 添加文件到暂存区
git add file.txt           # 添加单个文件
git add .                  # 添加所有变更
git add -p file.txt        # 交互式添加部分变更
git add -u                 # 添加已跟踪文件的修改

# 从暂存区移除
git rm --cached file.txt   # 移除跟踪但保留文件
git reset file.txt         # 取消暂存

# 查看暂存区与仓库的差异
git diff --staged
git diff --cached          # 同上
```

### 3.3 部分暂存

```bash
# 交互式添加
git add -p
# Stage this hunk [y,n,q,a,d,/,s,e,?]?
# y - 暂存此块
# n - 不暂存
# s - 分割成更小的块
# e - 手动编辑
```

## 4. 本地仓库

### 4.1 提交到仓库

```bash
# 提交暂存区的内容
git commit -m "feat: add user authentication"

# 提交所有已跟踪文件的修改（跳过 git add）
git commit -a -m "fix: resolve login bug"

# 修改上一次提交
git commit --amend -m "feat: add user auth with tests"
```

### 4.2 查看仓库状态

```bash
# 查看提交历史
git log --oneline -5

# 查看当前提交的 tree
git ls-tree -r HEAD

# 查看引用
git show-ref
```

## 5. 三棵树之间的差异

### 5.1 diff 命令矩阵

| 命令                   | 比较对象         | 说明               |
| :--------------------- | :--------------- | :----------------- |
| `git diff`             | 工作区 vs 暂存区 | 未暂存的修改       |
| `git diff --staged`    | 暂存区 vs 仓库   | 已暂存待提交的修改 |
| `git diff HEAD`        | 工作区 vs 仓库   | 所有未提交的修改   |
| `git diff --name-only` | 仅文件名         | 快速查看变更文件   |

### 5.2 状态转换图

```
                    git add                    git commit
工作区 ──────────────────────→ 暂存区 ──────────────────────→ 仓库
  │                               │                               │
  │  git diff                     │  git diff --staged            │
  │  (工作区 vs 暂存区)            │  (暂存区 vs 仓库)              │
  │                               │                               │
  │  git checkout -- file         │  git reset HEAD file          │
  │  ←────────────────            │  ←────────────────            │
  │  (丢弃工作区修改)              │  (取消暂存)                    │
  │                               │                               │
  │                                                               │
  │  git diff HEAD (工作区 vs 仓库)                                │
  │  git checkout HEAD -- file (恢复到仓库版本)                     │
  │  ←────────────────────────────────────────                    │
```

## 6. 常见操作流程

### 6.1 标准工作流

```bash
# 1. 修改文件
vim src/index.js

# 2. 查看状态
git status

# 3. 查看差异
git diff

# 4. 暂存修改
git add src/index.js

# 5. 确认暂存
git diff --staged

# 6. 提交
git commit -m "feat: add new feature"

# 7. 推送
git push origin main
```

### 6.2 修正错误

```bash
# 暂存了错误的文件
git reset HEAD wrong-file.js    # 取消暂存

# 工作区修改错误（未暂存）
git checkout -- file.js         # 恢复到暂存区版本
git restore file.js             # Git 2.23+ 推荐方式

# 提交后发现遗漏
git add forgotten-file.js
git commit --amend --no-edit    # 追加到上次提交

# 完全重置到上次提交
git reset --hard HEAD           # 丢弃所有未提交的修改
```
