---
order: 73
title: 'sparse-checkout'
module: git
category: 'Git Basics'
difficulty: advanced
description: 'git sparse-checkout详解：部分克隆与稀疏检出，优化大型仓库工作流。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/二分查找定位
  - git/子模块管理
  - git/补丁与邮件工作流
  - git/内容搜索
prerequisites:
  - git/语法速查
---

## 1. sparse-checkout 概述

### 1.1 什么是 sparse-checkout

sparse-checkout 允许只检出仓库的**部分目录**，而非整个仓库。适用于大型 monorepo 场景。

### 1.2 适用场景

- **Monorepo**：只检出自己负责的模块
- **大型仓库**：减少磁盘占用和克隆时间
- **CI/CD**：只检出构建所需的文件

## 2. 基本用法

### 2.1 cone 模式（推荐）

```bash
# 初始化
git clone --filter=blob:none --sparse https://github.com/user/monorepo.git
cd monorepo

# 启用 sparse-checkout
git sparse-checkout init --cone

# 添加需要的目录
git sparse-checkout set apps/web packages/ui

# 添加更多目录
git sparse-checkout add apps/api

# 查看当前配置
git sparse-checkout list
```

### 2.2 完整流程

```bash
# 从零开始
git clone --filter=blob:none --sparse https://github.com/user/monorepo.git
cd monorepo
git sparse-checkout init --cone
git sparse-checkout set apps/web

# 只会检出 apps/web 目录
ls
# apps/

# 需要其他目录时
git sparse-checkout add packages/shared
```

### 2.3 禁用 sparse-checkout

```bash
# 检出所有文件
git sparse-checkout disable

# 重新启用
git sparse-checkout enable
```

## 3. 模式对比

### 3.1 cone 模式

```bash
git sparse-checkout init --cone
git sparse-checkout set apps/web packages/ui
```

只检出指定目录及其内容，性能最优。

### 3.2 非 cone 模式

```bash
git sparse-checkout init
git sparse-checkout set <<EOF
apps/web/*
!apps/web/tests/*
packages/ui/src/*
EOF
```

支持 glob 模式，但性能较差。

## 4. 与 shallow clone 配合

```bash
# 浅克隆 + 稀疏检出
git clone --depth=1 --filter=blob:none --sparse \
  https://github.com/user/monorepo.git

# 效果：
# - 只下载最近1次提交
# - 不下载文件内容（按需获取）
# - 只检出指定目录
```

## 5. 性能对比

| 操作         | 完整克隆 | sparse-checkout |
| :----------- | :------- | :-------------- |
| **克隆时间** | 长       | 短              |
| **磁盘占用** | 全部     | 仅指定目录      |
| **网络传输** | 全部     | 按需            |
| **Git 操作** | 正常     | 正常            |
| **切换目录** | 无需     | 需要配置        |

## 6. 注意事项

- 需要服务端支持（GitHub、GitLab 已支持）
- cone 模式下目录名不支持 glob
- 切换分支时可能需要更新 sparse-checkout
- CI/CD 中可利用 sparse-checkout 加速构建
