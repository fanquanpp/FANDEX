---
order: 77
title: 'git-gc'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git gc垃圾回收详解：仓库清理、对象打包与性能优化。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/内容搜索
  - git/工作树管理
  - 'git/Git-Flow与GitHub-Flow对比'
  - git/交互式rebase
prerequisites:
  - git/语法速查
---

## 1. gc 概述

### 1.1 什么是 git gc

`git gc`（Garbage Collection）清理仓库中的**不可达对象**，打包松散对象，优化仓库性能。

### 1.2 gc 做什么

1. **打包松散对象**：将 `.git/objects/??/` 中的松散文件打包为 packfile
2. **删除不可达对象**：清理不再被任何引用指向的对象
3. **压缩 packfile**：合并多个 packfile 为一个
4. **清理 reflog**：移除过期的 reflog 条目

## 2. 基本用法

### 2.1 运行 gc

```bash
# 标准垃圾回收
git gc

# 激进模式（更彻底的压缩）
git gc --aggressive

# 自动模式（只在需要时运行）
git gc --auto

# 只打包不删除
git gc --no-prune

# 立即删除不可达对象
git gc --prune=now
```

### 2.2 查看仓库状态

```bash
# 查看对象数量
git count-objects -v
# count: 42           ← 松散对象数
# size: 128           ← 松散对象大小（KB）
# in-pack: 1234       ← 打包对象数
# packs: 2            ← packfile 数量
# size-pack: 4096     ← packfile 大小（KB）
# prune-packable: 0   ← 可清理的打包对象
# garbage: 0          ← 损坏的对象

# 查看仓库大小
du -sh .git
```

## 3. gc 触发时机

### 3.1 自动触发

Git 在以下操作后可能自动运行 `git gc --auto`：

- `git commit`
- `git merge`
- `git rebase`
- `git fetch`
- `git pull`

### 3.2 自动触发条件

```bash
# 默认配置
git config --get gc.auto
# 6700  ← 松散对象超过 6700 个时触发

git config --get gc.autoPackLimit
# 50   ← packfile 超过 50 个时触发
```

### 3.3 禁用自动 gc

```bash
# 禁用自动 gc
git config --global gc.auto 0

# 临时禁用
git -c gc.auto=0 commit -m "message"
```

## 4. 手动清理

### 4.1 清理 reflog

```bash
# 清理所有过期的 reflog
git reflog expire --expire=now --all

# 清理后运行 gc
git gc --prune=now
```

### 4.2 清理不可达分支

```bash
# 查看不可达的提交
git fsck --unreachable

# 清理
git gc --prune=now
```

### 4.3 重新打包

```bash
# 重新打包所有对象
git repack -a -d

# 只打包松散对象
git repack

# 增量打包
git repack -d -l
```

## 5. 性能优化

### 5.1 gc 策略配置

```bash
# 日常 gc（快速）
git gc

# 深度优化（慢但更彻底）
git gc --aggressive

# 差异：aggressive 会重新计算 delta 压缩
# 适合：大型仓库首次 gc 或重大变更后
```

### 5.2 推荐配置

```bash
# 定期运行 gc
git config --global gc.auto 256
git config --global gc.autopacklimit 20

# 优化 pack 窗口
git config --global pack.windowMemory 256m

# 优化 delta 压缩
git config --global pack.depth 50
git config --global pack.window 10
```

## 6. 常见问题

### 6.1 仓库体积过大

```bash
# 1. 清理 reflog
git reflog expire --expire=now --all

# 2. 运行 gc
git gc --prune=now --aggressive

# 3. 检查大文件
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print $3, $4}' | \
  sort -rn | head -20
```

### 6.2 清理历史中的大文件

```bash
# 使用 git filter-repo（推荐）
pip install git-filter-repo
git filter-repo --path large-file.bin --invert-paths

# 清理后
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```
