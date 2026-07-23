---
order: 67
title: CODEOWNERS
module: github
category: GitHub
difficulty: intermediate
description: CODEOWNERS文件详解：代码所有权、自动审查与权限管理。
author: fanquanpp
updated: '2026-06-14'
related:
  - github/包管理服务
  - github/在线开发环境
  - github/社区健康文件
  - github/PullRequest完整协作流程
prerequisites:
  - github/GitHub概述
---

## 1. CODEOWNERS 概述

### 1.1 什么是 CODEOWNERS

`CODEOWNERS` 文件定义了仓库中**文件和目录的所有者**，当相关文件被修改时自动请求所有者审查。

### 1.2 核心功能

- PR 中自动添加审查者
- 保护关键代码的变更质量
- 明确代码维护责任

## 2. 文件格式

### 2.1 基本语法

```gitignore
# CODEOWNERS 文件

# 默认所有者
*       @org/default-team

# 按目录分配
/src/auth/    @org/auth-team
/src/api/     @org/api-team @org/backend-team

# 按文件类型分配
*.js          @org/frontend-team
*.py          @org/backend-team

# 按文件名分配
Dockerfile    @org/devops-team
Makefile      @org/devops-team

# 精确匹配
/docs/README.md  @org/docs-team
```

### 2.2 规则优先级

- 后面的规则优先级更高
- 更具体的路径优先级更高
- 每个匹配的规则都会添加审查者

```gitignore
# 所有 JS 文件
*.js          @org/frontend-team

# 但 auth 目录的 JS 文件由安全团队审查
/src/auth/*.js  @org/security-team @org/frontend-team
```

## 3. 文件位置

`CODEOWNERS` 可以放在以下位置（按优先级）：

1. `CODEOWNERS`（根目录）
2. `docs/CODEOWNERS`
3. `.github/CODEOWNERS`

推荐放在 `.github/CODEOWNERS`。

## 4. 所有者类型

| 类型     | 语法               | 说明        |
| :------- | :----------------- | :---------- |
| **用户** | `@username`        | 单个用户    |
| **团队** | `@org/team-name`   | GitHub 团队 |
| **邮箱** | `user@example.com` | 邮箱地址    |

## 5. 分支保护集成

### 5.1 要求审查

1. 仓库 Settings → Branches → Branch protection rules
2. 勾选 "Require a pull request before merging"
3. 勾选 "Require review from Code Owners"

### 5.2 效果

- CODEOWNERS 中的审查者必须批准后才能合并
- 即使其他审查者已批准，代码所有者的批准仍然必须

## 6. 实际示例

```gitignore
# .github/CODEOWNERS

# 默认
*                                              @myorg/core-team

# 前端
/src/components/                               @myorg/frontend-team
/src/styles/                                   @myorg/frontend-team
*.vue                                          @myorg/frontend-team
*.css                                          @myorg/frontend-team

# 后端
/src/api/                                      @myorg/backend-team
/src/services/                                 @myorg/backend-team
*.py                                           @myorg/backend-team

# 安全
/src/auth/                                     @myorg/security-team
.env.example                                   @myorg/security-team

# DevOps
Dockerfile                                     @myorg/devops-team
.github/workflows/                             @myorg/devops-team
docker-compose*.yml                            @myorg/devops-team

# 文档
/docs/                                         @myorg/docs-team
README.md                                      @myorg/docs-team
```

## 7. 最佳实践

- 保持团队和文件映射的合理性
- 避免单个人作为所有者（使用团队）
- 定期更新 CODEOWNERS 反映组织变化
- 与分支保护规则配合使用
- 在 PR 模板中提醒审查者
