---
order: 57
title: 'git-reflog'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git reflog详解：引用日志的工作原理、恢复误操作与安全网机制。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'git/git-restore与文件操作'
  - 'git/git-log详解'
  - git/代码追溯
  - git/HEAD指针与分支本质
prerequisites:
  - git/语法速查
---

## 1. reflog 概述

### 1.1 什么是 reflog

reflog（Reference Log）记录了**本地引用的变更历史**，包括 HEAD、分支指针的每次移动。它是 Git 的**安全网**，即使执行了看似破坏性的操作，也可以通过 reflog 恢复。

### 1.2 reflog 与 log 的区别

| 特性               | `git log`    | `git reflog` |
| :----------------- | :----------- | :----------- |
| **记录内容**       | 提交历史     | 引用移动历史 |
| **范围**           | 所有可达提交 | 仅本地操作   |
| **包含已删除提交** |              |              |
| **共享**           | 推送到远程   | 仅本地       |
| **过期**           | 永久         | 默认90天     |

## 2. 基本用法

### 2.1 查看引用日志

```bash
# 查看 HEAD 的 reflog
git reflog
# 9a1b2c3 HEAD@{0}: commit: feat: add auth
# def4567 HEAD@{1}: checkout: moving from feature to main
# abc1234 HEAD@{2}: commit: fix: resolve bug
# ...

# 查看指定分支的 reflog
git reflog show main
git reflog show feature

# 查看所有引用的 reflog
git reflog show --all
```

### 2.2 reflog 条目解读

```
9a1b2c3 HEAD@{0}: commit: feat: add auth
│       │          │        │
│       │          │        └── 提交消息
│       │          └── 操作类型（commit/checkout/reset等）
│       └── 相对索引（0=最近）
└── 提交哈希
```

### 2.3 常见操作类型

| 操作              | reflog 记录                        |
| :---------------- | :--------------------------------- |
| `git commit`      | `commit: feat: xxx`                |
| `git checkout`    | `checkout: moving from A to B`     |
| `git reset`       | `reset: moving to HEAD~3`          |
| `git merge`       | `merge feature: Merge made by ...` |
| `git rebase`      | `rebase: checkout main`            |
| `git cherry-pick` | `cherry-pick: fix: xxx`            |
| `git pull`        | `pull: Fast-forward`               |
| `git clone`       | `clone: from https://...`          |

## 3. 恢复误操作

### 3.1 恢复 reset --hard

```bash
# 误操作：重置了3个提交
git reset --hard HEAD~3

# 恢复：通过 reflog 找到重置前的提交
git reflog
# abc1234 HEAD@{0}: reset: moving to HEAD~3    ← 重置操作
# def5678 HEAD@{1}: commit: feat: add auth     ← 重置前的提交

# 恢复到重置前的状态
git reset --hard def5678
# 或使用相对索引
git reset --hard HEAD@{1}
```

### 3.2 恢复误删的分支

```bash
# 误删分支
git branch -D feature

# 查找分支最后的提交
git reflog
# 9a1b2c3 HEAD@{5}: checkout: moving from feature to main  ← feature 的最后提交

# 重新创建分支
git branch feature 9a1b2c3
# 或
git checkout -b feature 9a1b2c3
```

### 3.3 恢复 rebase 失败

```bash
# rebase 过程中出错
git rebase main
# ... 冲突处理失败 ...

# 查找 rebase 前的状态
git reflog
# abc1234 HEAD@{2}: rebase: checkout main  ← rebase 开始前

# 放弃 rebase
git rebase --abort

# 或恢复到 rebase 前
git reset --hard HEAD@{2}
```

### 3.4 恢复 amend 之前的提交

```bash
# 误操作：amend 修改了提交
git commit --amend -m "new message"

# 查找 amend 前的提交
git reflog
# def5678 HEAD@{0}: commit (amend): new message
# abc1234 HEAD@{1}: commit: old message  ← amend 前的提交

# 恢复
git reset --soft abc1234
```

## 4. reflog 过期机制

### 4.1 默认过期时间

| 引用类型       | 过期时间 | 配置项                       |
| :------------- | :------- | :--------------------------- |
| **HEAD**       | 90 天    | `gc.reflogExpire`            |
| **可达提交**   | 90 天    | `gc.reflogExpire`            |
| **不可达提交** | 30 天    | `gc.reflogExpireUnreachable` |

### 4.2 配置过期时间

```bash
# 设置永不过期
git config --global gc.reflogExpire never

# 设置30天过期
git config --global gc.reflogExpire 30.days

# 设置不可达提交7天过期
git config --global gc.reflogExpireUnreachable 7.days
```

### 4.3 手动清理

```bash
# 删除所有过期的 reflog 条目
git reflog expire --expire=now --all

# 配合 gc 清理不可达对象
git reflog expire --expire=now --all && git gc --prune=now
```

## 5. 高级用法

### 5.1 按时间查找

```bash
# 查看指定时间点的 HEAD 位置
git reflog --date=iso
git show HEAD@{2026-06-10}

# 查看昨天的 HEAD
git show HEAD@{yesterday}
```

### 5.2 diff 比较

```bash
# 比较当前状态和3步前的差异
git diff HEAD@{3}

# 比较两个 reflog 条目
git diff HEAD@{5} HEAD@{3}
```

### 5.3 查看文件历史版本

```bash
# 查看文件在某个 reflog 点的内容
git show HEAD@{3}:src/index.js
```
