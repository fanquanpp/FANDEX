---
order: 40
tags:
  - 'git'
  - 'design-patterns'
  - 'networking'
  - 'git-workflow'
difficulty: 'intermediate'
title: 'Git 分支管理'
module: 'git'
category: 'Git Basics'
description: 'Git 分支管理'
author: 'fanquanpp'
updated: 2026-05-03
---

## 1 目录

- [1. 分支概述](#1-分支概述)
- [2. 分支操作基础](#2-分支操作基础)
- [2.1 查看分支](#21-查看分支)
- [2.2 创建分支](#22-创建分支)
- [2.3 切换分支](#23-切换分支)
- [2.4 创建并切换分支](#24-创建并切换分支)
- [2.5 合并分支](#25-合并分支)
- [2.6 删除分支](#26-删除分支)
- [2.7 重命名分支](#27-重命名分支)
- [2.8 设置上游分支](#28-设置上游分支)
- [3. 分支命名规范](#3-分支命名规范)
- [4. 分支管理策略](#4-分支管理策略)
- [4.1 集中式工作流](#41-集中式工作流)
- [4.2 功能分支工作流](#42-功能分支工作流)
- [4.3 GitFlow 工作流](#43-gitflow 工作流)
- [4.4 Forking 工作流](#44-forking 工作流)
- [5. 解决分支冲突](#5-解决分支冲突)
- [6. 分支最佳实践](#6-分支最佳实践)
- [7. 总结](#7-总结)
  <a id="2"></a>

## 2 . 分支概述

分支是 Git 中非常重要的概念，它允许你在独立的环境中开发新功能或修复 bug，而不影响主分支的稳定性。
分支的核心特点：

- 分支是指向特定提交的指针
- 默认分支为 `master` 或 `main`
- 分支操作轻量快速
- 支持并行开发
- 便于代码审查和测试
  <a id="3"></a>

## 3 . 分支操作基础

<a id="3.1"></a>

### 3.1 查看分支

```bash
 # 查看本地分支
 git branch
 # 查看远程分支
 git branch -r
 # 查看所有分支（本地和远程）
 git branch -a
 # 查看分支及其最后一次提交
 git branch -v
```

<a id="3.2"></a>

### 3.2 创建分支

```bash
 # 创建新分支
 git branch <分支名>
```

<a id="3.3"></a>

### 3.3 切换分支

```bash
 # 切换分支
 git checkout <分支名>
 # 或 Git 2.23+ 推荐
 git switch <分支名>
```

<a id="3.4"></a>

### 3.4 创建并切换分支

```bash
 # 创建并切换分支
 git checkout -b <分支名>
 # 或 Git 2.23+ 推荐
 git switch -c <分支名>
```

<a id="3.5"></a>

### 3.5 合并分支

```bash
 # 合并分支到当前分支
 git merge <分支名>
 # 快速合并（Fast-forward）
 # 当主分支没有新提交时，会执行快速合并
 git checkout main
 git merge feature/login
 # 三方合并（3-way merge）
 # 当主分支有新提交时，会执行三方合并
 git checkout main
 git merge feature/payment
```

#### 3.5.1 合并策略

```bash
 # 使用策略合并
 git merge --strategy-option theirs feature/branch # 优先使用对方分支的修改
 git merge --strategy-option ours feature/branch # 优先使用当前分支的修改
 # 递归策略（默认）
 git merge --strategy recursive feature/branch
 # 章鱼策略（适合合并多个分支）
 git merge --strategy octopus feature1 feature2 feature3
```

<a id="3.6"></a>

### 3.6 删除分支

```bash
 # 删除分支（仅当分支已合并）
 git branch -d <分支名>
 # 强制删除分支（无论是否合并）
 git branch -D <分支名>
 # 删除远程分支
 git push <远程仓库名> --delete <分支名>
```

<a id="3.7"></a>

### 3.7 重命名分支

```bash
 # 重命名分支
 git branch -m <旧分支名> <新分支名>
```

<a id="3.8"></a>

### 3.8 设置上游分支

```bash
 # 设置分支的上游分支
 git branch --set-upstream-to=origin/<远程分支名> <本地分支名>
 # 首次推送时设置上游分支
 git push -u <远程仓库名> <本地分支名>
```

<a id="4"></a>

## 4 . 分支命名规范

| 分支类型     | 命名格式        | 示例                  | 说明                     |
| ------------ | --------------- | --------------------- | ------------------------ |
| 功能分支     | feature/功能名  | feature/login         | 用于开发新功能           |
| Bug 修复分支 | bugfix/问题描述 | bugfix/login-error    | 用于修复 bug             |
| 紧急修复分支 | hotfix/紧急修复 | hotfix/security-patch | 用于紧急修复生产环境问题 |
| 发布分支     | release/版本号  | release/v1.0.0        | 用于准备发布             |
| 开发分支     | develop         | develop               | 用于集成新功能           |
| 主分支       | main/master     | main                  | 保持稳定，只用于发布     |

<a id="5"></a>

## 5 . 分支管理策略

<a id="5.1"></a>

### 5.1 集中式工作流

- 所有开发者直接在主分支上工作
- 适合小型团队和简单项目
- 优点：简单直接
- 缺点：容易产生冲突，不利于代码审查
  <a id="5.2"></a>

### 5.2 功能分支工作流

- 为每个功能创建单独的分支
- 完成后合并到主分支
- 适合大多数项目
- 优点：隔离开发，便于代码审查
- 缺点：需要更多的分支管理
  <a id="5.3"></a>

### 5.3 GitFlow 工作流

GitFlow 是一种详细的分支管理策略，适合大型项目和复杂的发布周期。

#### 5.3.1 GitFlow 分支结构

- **main/master**：主分支，保持稳定，只用于发布
- **develop**：开发分支，集成所有功能分支
- **feature/**：功能分支，从 develop 分支创建
- **release/**：发布分支，从 develop 分支创建
- **hotfix/**：热修复分支，从 main 分支创建

#### 5.3.2 GitFlow 工作流程

1. **初始化**：创建 main 和 develop 分支
2. **功能开发**：从 develop 创建 feature 分支，完成后合并回 develop
3. **发布准备**：从 develop 创建 release 分支，进行测试和修复
4. **发布**：将 release 分支合并到 main 和 develop
5. **热修复**：从 main 创建 hotfix 分支，完成后合并到 main 和 develop

#### 5.3.3 GitFlow 示例

```bash
 # 初始化 GitFlow
 git flow init
 # 创建功能分支
 git flow feature start login
 # 完成功能分支
 git flow feature finish login
 # 创建发布分支
 git flow release start v1.0.0
 # 完成发布分支
 git flow release finish v1.0.0
 # 创建热修复分支
 git flow hotfix start security-patch
 # 完成热修复分支
 git flow hotfix finish security-patch
```

<a id="5.4"></a>

### 5.4 Forking 工作流

- 开发者 fork 远程仓库
- 在自己的 fork 中工作
- 通过 Pull Request 贡献代码
- 适合开源项目
- 优点：适合多人协作，权限管理简单
- 缺点：流程相对复杂
  <a id="6"></a>

## 6 . 解决分支冲突

当合并分支时，如果两个分支对同一文件的同一部分进行了不同修改，就会产生冲突。
解决冲突的步骤：

1. **查看冲突文件**：

```bash
 git diff
```

2. **手动编辑冲突文件**：
   冲突文件中会包含以下标记：

```
 <<<<<<<< HEAD
 当前分支的内容
 =======
 要合并的分支的内容
 >>>>>>> 分支名
```

手动编辑文件，保留需要的内容，删除冲突标记。3. **添加解决后的文件**：

```bash
 git add .
```

4. **完成合并**：

```bash
 git commit
```

5. **放弃合并**（如果需要）：

```bash
 git merge --abort
```

<a id="7"></a>

## 7 . 分支最佳实践

### 7.1 分支管理最佳实践

1. **主分支保持稳定**：

- 主分支只用于发布
- 不直接在主分支上开发
- 所有修改通过分支合并

2. **使用功能分支**：

- 为每个功能创建单独的分支
- 分支名清晰描述功能
- 分支生命周期与功能开发周期一致

3. **定期同步**：

- 定期将主分支合并到功能分支
- 减少冲突概率
- 确保功能分支包含最新代码

4. **及时清理**：

- 功能完成后删除对应的分支
- 保持分支列表整洁
- 定期清理远程分支

5. **分支策略选择**：

- 小型项目：集中式或功能分支工作流
- 中型项目：功能分支工作流
- 大型项目：GitFlow 工作流
- 开源项目：Forking 工作流

6. **代码审查**：

- 使用 Pull Request 进行代码审查
- 确保代码质量
- 多人参与审查

### 7.2 实际项目案例

#### 7.2.1 小型项目（个人或小团队）

```bash
 # 初始化仓库
 git init
 # 创建并切换到功能分支
 git checkout -b feature/login
 # 开发完成后合并到主分支
 git checkout main
 git merge feature/login
 # 删除功能分支
 git branch -d feature/login
```

#### 7.2.2 中型项目（团队协作）

```bash
 # 从远程仓库克隆
 git clone <远程仓库URL>
 # 创建功能分支
 git checkout -b feature/payment
 # 定期同步主分支
 git checkout feature/payment
 git pull origin main
 # 完成后推送到远程
 git push origin feature/payment
 # 创建 Pull Request 进行代码审查
 # 合并后删除本地分支
 git branch -d feature/payment
```

#### 7.2.3 大型项目（GitFlow）

```bash
 # 初始化 GitFlow
 git flow init
 # 创建功能分支
 git flow feature start user-profile
 # 开发完成
 git flow feature finish user-profile
 # 创建发布分支
 git flow release start v2.0.0
 # 完成发布
 git flow release finish v2.0.0
 # 紧急修复
 git flow hotfix start critical-bug
```

<a id="8"></a>

## 8 . 总结

分支管理是 Git 的核心功能之一，通过合理的分支管理，可以提高开发效率，减少冲突，确保代码质量。

- **分支操作**：掌握创建、切换、合并、删除分支的基本操作
- **分支命名**：遵循规范的分支命名约定
- **分支策略**：根据项目特点选择合适的分支管理策略
- **冲突解决**：掌握解决分支冲突的方法
- **最佳实践**：遵循分支管理的最佳实践
  通过熟练掌握分支管理，可以更好地组织代码开发流程，提高团队协作效率。
