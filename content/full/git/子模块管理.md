---
order: 72
title: 'git-submodule'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git submodule详解：子模块的添加、更新、管理与常见问题。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/标签管理
  - git/二分查找定位
  - git/稀疏检出
  - git/补丁与邮件工作流
prerequisites:
  - git/语法速查
---

## 1. submodule 概述

### 1.1 什么是 submodule

子模块允许在一个 Git 仓库中**嵌入另一个 Git 仓库**作为子目录，保持独立的版本控制。

```
主仓库/
├── src/
├── lib/          ← 子模块（独立的 Git 仓库）
│   └── .git
├── .gitmodules   ← 子模块配置
└── .git/
    └── modules/
        └── lib/  ← 子模块的实际 Git 数据
```

### 1.2 适用场景

| 场景             | 说明                     |
| :--------------- | :----------------------- |
| **共享库**       | 多个项目共用同一库       |
| **组件库**       | 前端项目引用 UI 组件库   |
| **第三方代码**   | 引入第三方仓库而非复制   |
| **大型项目拆分** | 将大仓库拆分为多个子仓库 |

## 2. 基本操作

### 2.1 添加子模块

```bash
git submodule add https://github.com/user/shared-lib.git lib/shared
# 1. 克隆子模块到指定路径
# 2. 创建 .gitmodules 文件
# 3. 将子模块添加到暂存区

git commit -m "feat: add shared-lib submodule"
```

### 2.2 克隆含子模块的仓库

```bash
# 方式一：递归克隆
git clone --recurse-submodules https://github.com/user/main-repo.git

# 方式二：先克隆再初始化
git clone https://github.com/user/main-repo.git
cd main-repo
git submodule init
git submodule update

# 方式三：一步到位
git submodule update --init --recursive
```

### 2.3 更新子模块

```bash
# 更新到子模块远程仓库的最新提交
git submodule update --remote

# 更新指定子模块
git submodule update --remote lib/shared

# 更新所有子模块到最新
git submodule update --remote --merge
```

### 2.4 删除子模块

```bash
# 1. 取消注册
git submodule deinit -f lib/shared

# 2. 删除文件
rm -rf .git/modules/lib/shared

# 3. 从 Git 中移除
git rm -f lib/shared

# 4. 提交
git commit -m "chore: remove shared-lib submodule"
```

## 3. .gitmodules 文件

```ini
[submodule "lib/shared"]
    path = lib/shared
    url = https://github.com/user/shared-lib.git
    branch = main          # 跟踪的分支（可选）
```

## 4. 常见问题

### 4.1 子模块处于分离 HEAD

子模块默认检出特定提交，处于**分离 HEAD 状态**：

```bash
cd lib/shared
git checkout main    # 切到分支
git pull             # 拉取更新
cd ../..
git add lib/shared
git commit -m "chore: update submodule"
```

### 4.2 子模块脏状态

```bash
# 忽略子模块的修改
git config submodule.lib/shared.ignore dirty

# 强制更新（丢弃子模块的修改）
git submodule update --force
```

### 4.3 子模块冲突

```bash
# 合并时子模块冲突
# 选择一方的版本
git checkout --ours lib/shared
# 或
git checkout --theirs lib/shared
git add lib/shared
```

## 5. 替代方案

| 方案          | 特点               | 适用场景         |
| :------------ | :----------------- | :--------------- |
| **submodule** | 独立仓库，精确版本 | 第三方库         |
| **subtree**   | 合并到主仓库       | 更简单的依赖管理 |
| **npm/pip**   | 包管理器           | 语言生态内的依赖 |
| **Monorepo**  | 单一仓库           | 紧密耦合的项目   |

### 5.1 git subtree

```bash
# 添加 subtree
git subtree add --prefix=lib/shared https://github.com/user/shared-lib.git main --squash

# 更新 subtree
git subtree pull --prefix=lib/shared https://github.com/user/shared-lib.git main --squash
```
