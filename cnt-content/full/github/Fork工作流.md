---
order: 54
title: Fork工作流
module: github
category: GitHub
difficulty: intermediate
description: 'GitHub Fork工作流详解：开源贡献流程、同步策略与最佳实践。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/开源许可证选择
  - github/依赖安全选项
  - github/Projects看板
  - github/知识库
prerequisites:
  - github/GitHub概述
---

## 1. Fork 工作流概述

### 1.1 什么是 Fork

Fork 是在 GitHub 上创建仓库的**个人副本**，可以在副本中自由修改，不影响原始仓库。

```
原始仓库 (upstream)
    ↑ fork
个人仓库 (origin)
    ↑ clone
本地仓库
```

### 1.2 Fork vs Branch

| 特性      | Fork               | Branch       |
| :-------- | :----------------- | :----------- |
| **权限**  | 无需原始仓库权限   | 需要写权限   |
| **位置**  | 独立的 GitHub 仓库 | 同一仓库内   |
| **适用**  | 开源贡献           | 团队内部开发 |
| **CI/CD** | 各自独立           | 共享         |

## 2. 完整 Fork 工作流

### 2.1 一次性设置

```bash
# 1. 在 GitHub 上 Fork 仓库

# 2. 克隆你的 Fork
git clone https://github.com/YOUR_USERNAME/project.git
cd project

# 3. 添加上游仓库
git remote add upstream https://github.com/ORIGINAL_OWNER/project.git

# 4. 验证远程仓库
git remote -v
# origin    https://github.com/YOUR_USERNAME/project.git (fetch)
# origin    https://github.com/YOUR_USERNAME/project.git (push)
# upstream  https://github.com/ORIGINAL_OWNER/project.git (fetch)
# upstream  https://github.com/ORIGINAL_OWNER/project.git (push)
```

### 2.2 贡献流程

```bash
# 1. 同步上游
git fetch upstream
git checkout main
git merge upstream/main

# 2. 创建功能分支
git checkout -b feature/my-contribution

# 3. 开发并提交
git add .
git commit -m "feat: add new feature"

# 4. 推送到你的 Fork
git push origin feature/my-contribution

# 5. 在 GitHub 上创建 Pull Request
# 从你的 Fork → 原始仓库

# 6. 等待审查和合并
```

### 2.3 保持 Fork 同步

```bash
# 方法一：命令行
git fetch upstream
git checkout main
git merge upstream/main
git push origin main

# 方法二：GitHub 界面
# Fork 页面 → "Sync fork" 按钮

# 方法三：GitHub API
gh api repos/YOUR_USERNAME/project/merge-upstream \
  -f branch=main
```

## 3. 常见场景

### 3.1 解决冲突

```bash
# PR 有冲突
git fetch upstream
git checkout feature/my-contribution
git rebase upstream/main
# 解决冲突
git add .
git rebase --continue
git push origin feature/my-contribution --force-with-lease
```

### 3.2 多个 PR 并行

```bash
# 每个功能一个分支
git checkout main
git checkout -b feature/A
# ... 开发 ...

git checkout main
git checkout -b feature/B
# ... 开发 ...

# 分别推送和创建 PR
```

### 3.3 追踪上游变更

```bash
# 查看上游的变更
git fetch upstream
git log upstream/main --oneline -10

# 查看差异
git diff main..upstream/main
```

## 4. 最佳实践

- 始终从最新的上游创建分支
- 每个功能/修复一个分支
- PR 描述清晰，关联 Issue
- 遵循项目的贡献指南
- 定期同步 Fork
