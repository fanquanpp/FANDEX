---
order: 62
title: 'GitHub-CLI'
module: github
category: GitHub
difficulty: intermediate
description: 'GitHub CLI（gh）详解：命令行操作仓库、PR、Issue与Actions。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/密钥扫描
  - github/CodeQL代码扫描
  - 'github/REST与GraphQL-API'
  - github/Web钩子
prerequisites:
  - github/GitHub概述
---

## 1. GitHub CLI 概述

### 1.1 什么是 gh

GitHub CLI（`gh`）是 GitHub 官方命令行工具，在终端中直接操作 GitHub 功能。

### 1.2 安装

```bash
# macOS
brew install gh

# Linux
sudo apt install gh

# Windows
winget install GitHub.cli

# 验证
gh --version
```

### 1.3 认证

```bash
gh auth login
# 选择 GitHub.com
# 选择认证方式（浏览器 / Token）
gh auth status
```

## 2. 仓库操作

```bash
# 创建仓库
gh repo create my-project --public --clone
gh repo create my-project --private

# 克隆仓库
gh repo clone user/repo

# 查看仓库信息
gh repo view user/repo

# Fork 仓库
gh repo fork user/repo --clone

# 列出仓库
gh repo list
gh repo list --limit 50
gh repo list user --language TypeScript
```

## 3. Pull Request

```bash
# 创建 PR
gh pr create --title "feat: add auth" --body "描述内容"
gh pr create --fill    # 使用 commit 信息自动填充

# 查看 PR
gh pr list
gh pr list --state open
gh pr view 123

# 检出 PR
gh pr checkout 123

# 审查 PR
gh pr review 123 --approve
gh pr review 123 --request-changes -b "需要修改"

# 合并 PR
gh pr merge 123 --merge
gh pr merge 123 --squash
gh pr merge 123 --rebase
```

## 4. Issue

```bash
# 创建 Issue
gh issue create --title "Bug: login fails" --body "描述"
gh issue create --title "Bug" --body-file bug-template.md

# 查看 Issue
gh issue list
gh issue list --label bug
gh issue view 123

# 关闭 Issue
gh issue close 123

# 重新打开
gh issue reopen 123
```

## 5. Actions

```bash
# 查看 Workflows
gh workflow list

# 触发 Workflow
gh workflow run ci.yml
gh workflow run ci.yml --ref feature-branch

# 查看 Run
gh run list
gh run view 123456
gh run watch       # 实时监控

# 查看 Logs
gh run view 123456 --log
gh run view 123456 --log-failed
```

## 6. 其他命令

```bash
# Gist
gh gist create file.txt
gh gist list

# Release
gh release create v1.0.0 --title "v1.0.0" --notes "Release notes"
gh release list
gh release download v1.0.0

# API 调用
gh api repos/user/repo/issues
gh api graphql -f query='{ viewer { login } }'

# 扩展
gh extension install github/gh-copilot
gh extension list
```

## 7. 别名配置

```bash
# 设置别名
gh alias set pc 'pr create --fill'
gh alias set pm 'pr merge --squash'
gh alias set il 'issue list'

# 使用别名
gh pc    # 等价于 gh pr create --fill
```
