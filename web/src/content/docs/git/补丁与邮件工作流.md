---
order: 74
title: 'git-format-patch'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git format-patch详解：生成补丁文件、邮件工作流与离线协作。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/子模块管理
  - git/稀疏检出
  - git/内容搜索
  - git/工作树管理
prerequisites:
  - git/语法速查
---

## 1. format-patch 概述

### 1.1 什么是 format-patch

`git format-patch` 将提交转换为**标准的电子邮件补丁格式**，适合通过邮件或文件交换代码变更。

### 1.2 补丁格式

```
From abc1234 Mon Sep 17 00:00:00 2001
From: Zhang San <zhang@example.com>
Date: Sat, 14 Jun 2026 10:00:00 +0800
Subject: [PATCH] feat: add authentication

---
 src/auth.ts | 20 ++++++++++++++++++++
 1 file changed, 20 insertions(+)

diff --git a/src/auth.ts b/src/auth.ts
...
```

## 2. 基本用法

### 2.1 生成补丁

```bash
# 最近1个提交的补丁
git format-patch -1

# 最近3个提交的补丁
git format-patch -3

# 指定范围
git format-patch HEAD~3..HEAD
git format-patch abc1234..def5678

# 指定输出目录
git format-patch -3 -o /tmp/patches/
```

### 2.2 应用补丁

```bash
# 应用补丁（保留提交信息）
git am < 0001-feat-add-auth.patch

# 应用多个补丁
git am /tmp/patches/*.patch

# 检查补丁是否能应用
git apply --check 0001-feat-add-auth.patch

# 只应用变更不提交
git apply 0001-feat-add-auth.patch
```

### 2.3 处理冲突

```bash
git am /tmp/patches/*.patch
# Applying: feat: add auth
# error: patch failed: ...

# 解决冲突
vim conflicted-file.js
git add .
git am --continue

# 跳过当前补丁
git am --skip

# 放弃
git am --abort
```

## 3. 高级用法

### 3.1 生成单个文件

```bash
# 所有补丁合并为一个文件
git format-patch -3 --stdout > all-patches.patch

# 应用
git am < all-patches.patch
```

### 3.2 指定范围

```bash
# 某分支独有的提交
git format-patch main..feature

# 两个标签之间
git format-patch v1.0.0..v1.1.0
```

### 3.3 添加前缀

```bash
git format-patch -3 --subject-prefix="PATCH v2"
# [PATCH v2 1/3] feat: add auth
```

## 4. 离线协作场景

```bash
# 开发者 A：生成补丁
git format-patch -1 -o /tmp/patches/
# 通过 U盘/邮件 发送给开发者 B

# 开发者 B：应用补丁
git am < /tmp/patches/0001-feat-add-auth.patch
```

## 5. 与 git diff 的区别

| 特性         | format-patch | diff        |
| :----------- | :----------- | :---------- |
| **格式**     | 邮箱格式     | 纯差异      |
| **提交信息** | 保留         | 不保留      |
| **作者信息** | 保留         | 不保留      |
| **应用方式** | `git am`     | `git apply` |
| **适用场景** | 邮件协作     | 临时补丁    |
