---
order: 330
title: git-format-patch
module: 'git'
category: 工具链
difficulty: intermediate
description: git format-patch详解：生成补丁文件、邮件工作流与离线协作。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
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
## 暂存文件

**基本用法:暂存改动**
`git add <路径>`

```bash
# 暂存单个文件
git add src/main.py

# 暂存整个目录
git add src/

# 暂存所有改动
git add .

# 暂存已跟踪文件(不含未跟踪)
git add -u
```

---

**基本用法:交互式暂存**
`git add -p`

```bash
# 逐块选择暂存(支持 y/n/s/e/q)
git add -p

# 交互模式主菜单
git add -i
```

---

**基本用法:按补丁暂存**
`git add --patch <文件>`

```bash
# 对指定文件逐块暂存
git add --patch src/utils.js
```

---

## 恢复工作区文件

**基本用法:丢弃工作区改动**
`git restore <文件>`

```bash
# 丢弃工作区改动(恢复到暂存区状态)
git restore src/main.py

# 恢复到指定提交的版本
git restore --source=HEAD~3 src/config.js

# 从暂存区取消暂存
git restore --staged src/main.py
```

---

**基本用法:用 checkout 恢复文件**
`git checkout -- <文件>`

```bash
# 旧写法:丢弃工作区改动
git checkout -- src/main.py

# 恢复指定提交的文件
git checkout a1b2c3d -- README.md
```

---

## 暂存区管理

**基本用法:取消暂存**
`git restore --staged <文件>`

```bash
# 把已暂存的文件移出暂存区
git restore --staged src/main.py

# 取消所有暂存
git restore --staged .
```

---

**基本用法:重置暂存区与工作区**
`git reset [选项] <提交>`

```bash
# 仅重置暂存区,保留工作区改动
git reset HEAD src/

# 软重置(保留改动到暂存区)
git reset --soft HEAD~1

# 混合重置(默认,保留改动到工作区)
git reset --mixed HEAD~1
```
