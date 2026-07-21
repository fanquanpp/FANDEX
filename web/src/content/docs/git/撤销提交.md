---
order: 69
title: 'git-revert'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git revert详解：安全撤销提交、生成反向提交与多人协作场景。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/修改提交
  - git/重置与回退
  - git/Git原理与对象模型
  - git/标签管理
prerequisites:
  - git/语法速查
---

## 1. revert 概述

### 1.1 什么是 revert

`git revert` 创建一个**新的反向提交**来撤销指定提交的变更，不修改历史。

```
原始: A---B---C---D (HEAD)
revert D: A---B---C---D---D' (HEAD)
                         ↑ D' 是 D 的反向操作
```

### 1.2 revert vs reset

| 特性       | revert              | reset                |
| :--------- | :------------------ | :------------------- |
| **历史**   | 新增提交，保留历史  | 删除提交，改写历史   |
| **安全性** | 安全，不影响他人    | 危险，影响已拉取的人 |
| **已推送** | 可安全使用          | 需要 force push      |
| **粒度**   | 按提交撤销          | 按范围重置           |
| **可逆性** | 容易（再次 revert） | 需要 reflog          |

## 2. 基本用法

### 2.1 撤销单个提交

```bash
git revert abc1234
# 打开编辑器编辑 revert 消息
```

### 2.2 不自动提交

```bash
git revert -n abc1234
# 变更放入暂存区，不自动提交
# 可以修改后再提交
```

### 2.3 撤销多个提交

```bash
# 撤销连续的多个提交
git revert abc1234..def5678

# 撤销多个不连续的提交
git revert abc1234 def5678 ghi9012
```

### 2.4 修改 revert 消息

```bash
git revert -m "revert: 回退认证功能" abc1234
```

## 3. 合并提交的 revert

### 3.1 指定父提交

合并提交有多个父提交，revert 时需要指定保留哪个：

```bash
# 查看合并提交的父提交
git cat-file -p abc1234
# parent def5678  ← 第一个父提交（主分支）
# parent ghi9012  ← 第二个父提交（合并分支）

# revert 保留第一个父提交（撤销合并分支的变更）
git revert -m 1 abc1234

# revert 保留第二个父提交（撤销主分支的变更）
git revert -m 2 abc1234
```

### 3.2 重新合并

revert 合并提交后，如果需要重新合并，需要先 revert 那个 revert 提交：

```bash
# 1. revert 合并提交
git revert -m 1 merge-commit

# 2. 后续需要重新合并
git revert revert-commit    # revert 那个 revert
git merge feature           # 重新合并
```

## 4. 冲突处理

### 4.1 revert 冲突

如果 revert 的提交之后有相关修改，可能产生冲突：

```bash
git revert abc1234
# CONFLICT: ...

# 解决冲突
vim conflicted-file.js
git add .
git revert --continue

# 或放弃
git revert --abort
```

## 5. 实际场景

### 5.1 回退已推送的功能

```bash
# 发现功能有严重 Bug，需要回退
git revert abc1234
git push origin main
```

### 5.2 回退发布

```bash
# 回退整个发布
git revert v1.0.0..v1.1.0
git push origin main
```

### 5.3 安全地撤销错误提交

```bash
# 错误提交已推送
git revert wrong-commit
# 在 revert 提交中说明原因
git commit -m "revert: 回退错误提交，原因：..."
```
