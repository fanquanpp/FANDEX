---
order: 70
title: 标签管理
module: git
category: 'Git Basics'
difficulty: intermediate
description: Git标签管理：轻量标签与附注标签的创建、操作与发布流程。
author: fanquanpp
updated: '2026-06-14'
related:
  - git/撤销提交
  - git/Git原理与对象模型
  - git/二分查找定位
  - git/子模块管理
prerequisites:
  - git/语法速查
---

## 1. 标签概述

### 1.1 什么是标签

标签（Tag）是指向特定提交的**固定引用**，用于标记重要的版本节点。

### 1.2 两种标签

| 类型         | 创建方式          | 存储             | 包含信息                   |
| :----------- | :---------------- | :--------------- | :------------------------- |
| **轻量标签** | `git tag v1.0`    | 文件存储提交哈希 | 仅提交引用                 |
| **附注标签** | `git tag -a v1.0` | 创建 tag 对象    | 作者、日期、消息、GPG 签名 |

## 2. 创建标签

### 2.1 轻量标签

```bash
# 在当前提交创建
git tag v1.0.0

# 在指定提交创建
git tag v0.9.0 abc1234
```

### 2.2 附注标签

```bash
# 创建附注标签
git tag -a v1.0.0 -m "Release version 1.0.0"

# 在指定提交创建
git tag -a v0.9.0 abc1234 -m "Release version 0.9.0"
```

### 2.3 语义化版本标签

```
v1.2.3
│ │ │
│ │ └── 修订号（Patch）：Bug 修复
│ └──── 次版本号（Minor）：向后兼容的新功能
└────── 主版本号（Major）：不兼容的变更
```

## 3. 查看标签

### 3.1 列出标签

```bash
# 列出所有标签
git tag

# 按模式过滤
git tag -l "v1.*"
git tag -l "v2.0*"

# 查看标签详情
git show v1.0.0
git cat-file -p v1.0.0
```

### 3.2 查看标签指向的提交

```bash
git rev-parse v1.0.0
git log v1.0.0 -1
```

## 4. 推送标签

### 4.1 推送单个标签

```bash
git push origin v1.0.0
```

### 4.2 推送所有标签

```bash
git push origin --tags
```

### 4.3 只推送附注标签

```bash
git push origin --follow-tags
```

## 5. 删除标签

### 5.1 删除本地标签

```bash
git tag -d v1.0.0
```

### 5.2 删除远程标签

```bash
git push origin --delete v1.0.0
# 或
git push origin :refs/tags/v1.0.0
```

## 6. 签名标签

### 6.1 GPG 签名

```bash
# 创建签名标签
git tag -s v1.0.0 -m "Release v1.0.0"

# 验证签名
git tag -v v1.0.0
```

### 6.2 SSH 签名

```bash
# Git 2.34+ 支持 SSH 签名
git tag -s v1.0.0 -m "Release v1.0.0"

# 配置 SSH 签名
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
```

## 7. 标签在 CI/CD 中的应用

```bash
# 基于标签触发部署
# .github/workflows/deploy.yml
# on:
#   push:
#     tags:
#       - 'v*'

# 创建发布标签
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
# → 触发自动部署
```
