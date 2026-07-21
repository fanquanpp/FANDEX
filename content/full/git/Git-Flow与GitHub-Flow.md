---
order: 66
title: 'Git-Flow与GitHub-Flow'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'Git Flow与GitHub Flow分支模型对比：工作流程、适用场景与最佳实践。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/暂存工作区
  - git/远程跟踪分支
  - git/修改提交
  - git/重置与回退
prerequisites:
  - git/语法速查
---

## 1. 分支模型概述

### 1.1 为什么需要分支模型

分支模型定义了团队如何使用分支进行协作，核心解决：

- 如何组织功能开发
- 如何管理发布
- 如何处理热修复
- 如何保持主分支稳定

## 2. Git Flow

### 2.1 分支结构

```
main ────────────────────────────────────
  │                                      │
  └── release/1.0 ────┘                  │
       │            │                    │
develop ──────────────────────────────────
  │       │        │      │
  └─feature/A─┘    └─feature/B─┘
```

| 分支        | 命名        | 生命周期 | 用途         |
| :---------- | :---------- | :------- | :----------- |
| **main**    | `main`      | 永久     | 生产版本     |
| **develop** | `develop`   | 永久     | 开发集成分支 |
| **feature** | `feature/*` | 临时     | 功能开发     |
| **release** | `release/*` | 临时     | 发布准备     |
| **hotfix**  | `hotfix/*`  | 临时     | 紧急修复     |

### 2.2 工作流程

```bash
# 1. 从 develop 创建功能分支
git checkout -b feature/auth develop

# 2. 开发并提交
git commit -m "feat: add login"

# 3. 完成后合并回 develop
git checkout develop
git merge --no-ff feature/auth
git branch -d feature/auth

# 4. 准备发布
git checkout -b release/1.0 develop
# 修复 Bug、更新版本号
git commit -m "chore: bump version to 1.0"

# 5. 合并到 main 和 develop
git checkout main
git merge --no-ff release/1.0
git tag -a v1.0.0
git checkout develop
git merge --no-ff release/1.0
git branch -d release/1.0

# 6. 热修复
git checkout -b hotfix/bug-123 main
git commit -m "fix: resolve critical bug"
git checkout main
git merge --no-ff hotfix/bug-123
git tag -a v1.0.1
git checkout develop
git merge --no-ff hotfix/bug-123
git branch -d hotfix/bug-123
```

### 2.3 Git Flow 工具

```bash
# 安装 git-flow
brew install git-flow        # macOS
sudo apt install git-flow    # Linux

# 初始化
git flow init

# 功能开发
git flow feature start auth
git flow feature finish auth

# 发布
git flow release start 1.0
git flow release finish 1.0

# 热修复
git flow hotfix start bug-123
git flow hotfix finish bug-123
```

## 3. GitHub Flow

### 3.1 分支结构

```
main ─────────────────────────────────────
  │        │            │               │
  └─feature/A──┘  └─feature/B──┘       │
```

| 分支        | 命名        | 生命周期 | 用途         |
| :---------- | :---------- | :------- | :----------- |
| **main**    | `main`      | 永久     | 始终可部署   |
| **feature** | `feature/*` | 临时     | 所有开发工作 |

### 3.2 工作流程

```bash
# 1. 从 main 创建分支
git checkout -b feature/auth main

# 2. 开发并提交
git commit -m "feat: add authentication"

# 3. 推送并创建 Pull Request
git push -u origin feature/auth
# 在 GitHub 上创建 PR

# 4. 代码审查
# 团队成员审查代码

# 5. 合并到 main
# 通过 GitHub 合并 PR
# 自动部署到生产环境

# 6. 删除分支
git branch -d feature/auth
git push origin --delete feature/auth
```

### 3.3 核心原则

- `main` 分支**始终可部署**
- 所有开发在功能分支进行
- 通过 Pull Request 进行代码审查
- 合并后立即部署

## 4. 模型对比

| 特性         | Git Flow           | GitHub Flow      |
| :----------- | :----------------- | :--------------- |
| **复杂度**   | 高                 | 低               |
| **分支数量** | 5种                | 2种              |
| **发布节奏** | 计划发布           | 持续部署         |
| **适用团队** | 大团队、版本化产品 | 小团队、Web 应用 |
| **学习成本** | 较高               | 较低             |
| **热修复**   | 专用 hotfix 分支   | 从 main 创建分支 |
| **版本管理** | 明确的版本标签     | 持续交付         |

## 5. 其他模型

### 5.1 Trunk-Based Development

```
main ────────────────────────────────
  │  │  │  │  │  │  │  │  │  │
  频繁提交，小步前进
  功能开关控制未完成功能
```

- 所有开发者在 main 上直接提交
- 使用功能开关（Feature Flag）控制
- 极短的分支生命周期（<1天）
- 适合 CI/CD 成熟的团队

### 5.2 选型建议

| 场景              | 推荐模型                  |
| :---------------- | :------------------------ |
| **Web/SaaS 应用** | GitHub Flow               |
| **移动应用**      | Git Flow                  |
| **开源项目**      | GitHub Flow               |
| **嵌入式/固件**   | Git Flow                  |
| **微服务**        | GitHub Flow / Trunk-Based |
| **大型团队**      | Git Flow                  |
| **初创团队**      | GitHub Flow               |
