---
order: 53
title: 依赖安全选项
module: github
category: GitHub
difficulty: intermediate
description: 'GitHub依赖安全功能：Dependabot alerts、安全更新与依赖审查。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/Gitignore配置
  - github/开源许可证选择
  - github/Fork工作流
  - github/Projects看板
prerequisites:
  - github/GitHub概述
---

## 1. 依赖安全概述

### 1.1 为什么关注依赖安全

现代项目平均使用数百个依赖，其中任何一个都可能存在安全漏洞。GitHub 提供多种工具帮助管理依赖安全。

### 1.2 GitHub 安全功能矩阵

| 功能                            | 免费版 | 说明        |
| :------------------------------ | :----- | :---------- |
| **Dependabot Alerts**           |        | 漏洞告警    |
| **Dependabot Security Updates** |        | 自动修复    |
| **Dependabot Version Updates**  |        | 版本更新    |
| **Dependency Review**           |        | PR 依赖审查 |
| **Dependency Graph**            |        | 依赖图谱    |

## 2. Dependabot Alerts

### 2.1 工作原理

```
仓库代码 → GitHub 扫描依赖清单 → 匹配漏洞数据库 → 生成告警
```

### 2.2 支持的依赖清单

| 生态系统   | 文件                                |
| :--------- | :---------------------------------- |
| **npm**    | `package.json`、`package-lock.json` |
| **pip**    | `requirements.txt`、`Pipfile.lock`  |
| **Maven**  | `pom.xml`                           |
| **Gradle** | `build.gradle`                      |
| **Go**     | `go.mod`、`go.sum`                  |
| **Cargo**  | `Cargo.toml`、`Cargo.lock`          |
| **NuGet**  | `*.csproj`、`packages.config`       |

### 2.3 配置告警

1. 仓库 Settings → Code security and analysis
2. 启用 Dependabot alerts
3. 可选：启用自动安全更新

## 3. Dependabot Security Updates

### 3.1 自动修复

当发现漏洞时，Dependabot 自动创建 PR 修复：

```markdown
# Dependabot 创建的 PR

## Security Update: lodash

Bumps lodash from 4.17.15 to 4.17.21 to fix:

- CVE-2021-23337: Command injection
- CVE-2020-28500: ReDoS vulnerability

## CVSS Score: 7.2 (High)
```

### 3.2 配置

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
    reviewers:
      - 'security-team'
    labels:
      - 'security'
      - 'dependencies'
```

## 4. Dependency Review

### 4.1 PR 中的依赖审查

在 PR 中自动检查新增依赖的安全性：

```yaml
# .github/workflows/dependency-review.yml
name: Dependency Review
on: [pull_request]

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: moderate
          deny-licenses: GPL-3.0, AGPL-3.0
```

### 4.2 审查内容

- 新增依赖的已知漏洞
- 许可证合规性
- 依赖变更的影响范围

## 5. 依赖图谱

### 5.1 查看依赖图谱

仓库 → Insights → Dependency graph

### 5.2 依赖图谱信息

- 直接依赖和传递依赖
- 每个依赖的版本
- 已知漏洞标记
- 依赖关系树

## 6. 最佳实践

- 始终提交锁定文件（`package-lock.json`、`yarn.lock`）
- 启用 Dependabot alerts 和 security updates
- 在 CI 中集成依赖审查
- 定期更新依赖版本
- 审查 Dependabot 创建的 PR 后再合并
