---
order: 105
title: Actions环境部署
module: github
category: toolchain
difficulty: advanced
description: 'GitHub Actions环境（Environments）详解：dev/test/staging/production环境保护规则与部署策略。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/Actions自托管运行器
  - github/Actions制品传递
prerequisites:
  - github/GitHub概述
---

## 1. 环境概述

### 1.1 什么是环境

GitHub Environments 为部署流程提供保护规则和密钥管理，确保代码在正确的时间、由正确的人、以正确的方式部署到目标环境。

```
代码提交 → CI 构建 → dev 部署 → test 验证 → staging 预发布 → production 生产
                      │           │             │                │
                      自动        自动          自动             需审批
```

### 1.2 环境层级

| 环境       | 用途               | 保护规则            |
| ---------- | ------------------ | ------------------- |
| dev        | 开发环境，快速验证 | 无或最少            |
| test       | 自动化测试环境     | 自动触发            |
| staging    | 预发布，模拟生产   | 自动触发 + 人工确认 |
| production | 生产环境           | 严格审批 + 分支限制 |

## 2. 环境配置

### 2.1 创建环境

在仓库 Settings → Environments → New environment 中创建，或通过 API：

```bash
gh api repos/OWNER/REPO/environments/production --method PUT
```

### 2.2 环境密钥

每个环境可以有独立的 Secrets：

```yaml
jobs:
  deploy:
    environment: production
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }} # 环境密钥
          DATABASE_URL: ${{ secrets.DATABASE_URL }} # 环境密钥
        run: ./deploy.sh
```

不同环境的同名密钥可以有不同值：

```
dev:
  DATABASE_URL: postgres://localhost:5432/dev
staging:
  DATABASE_URL: postgres://staging-db:5432/app
production:
  DATABASE_URL: postgres://prod-db:5432/app
```

### 2.3 环境变量

```yaml
jobs:
  deploy:
    environment:
      name: production
    runs-on: ubuntu-latest
    env:
      DEPLOY_ENV: production
    steps:
      - run: echo "Deploying to $DEPLOY_ENV"
```

## 3. 保护规则

### 3.1 必需审查者

```yaml
# 在 GitHub UI 中配置
# Settings → Environments → production → Required reviewers
# 添加 1-6 个审查者
```

工作流执行到该环境时会暂停，等待审查者批准：

```yaml
jobs:
  deploy-production:
    environment: production # 需要审批
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

审查者可在 Actions 页面点击 "Approve" 或 "Reject"。

### 3.2 等待计时器

```yaml
# Settings → Environments → staging → Wait timer
# 设置 0-43200 分钟（最多 30 天）的等待时间
```

### 3.3 分支限制

```yaml
# Settings → Environments → production → Deployment branches
# 仅允许特定分支部署到该环境
```

配置选项：

- **All branches**：任何分支都可部署
- **Protected branches**：仅受保护分支
- **Selected branches**：指定分支名模式

### 3.4 自定义分支保护规则

```
# 支持通配符
release/*     → 匹配 release/1.0, release/2.0
main          → 精确匹配 main
feature/*     → 匹配 feature/xxx
```

## 4. 部署工作流设计

### 4.1 多环境渐进部署

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  deploy-dev:
    needs: build
    environment: dev
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: ./deploy.sh dev

  deploy-staging:
    needs: deploy-dev
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: ./deploy.sh staging

  deploy-production:
    needs: deploy-staging
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: ./deploy.sh production
```

### 4.2 条件环境选择

```yaml
jobs:
  deploy:
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

### 4.3 手动触发指定环境

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        type: choice
        options:
          - dev
          - staging
          - production

jobs:
  deploy:
    environment: ${{ github.event.inputs.environment }}
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying to ${{ github.event.inputs.environment }}"
```

## 5. 部署保护与回滚

### 5.1 部署状态

```yaml
- name: Set deployment status
  uses: bobheadxi/deployments@v1
  id: deployment
  with:
    step: start
    token: ${{ secrets.GITHUB_TOKEN }}
    env: production

- name: Deploy
  run: ./deploy.sh

- name: Update deployment status
  if: success()
  uses: bobheadxi/deployments@v1
  with:
    step: finish
    token: ${{ secrets.GITHUB_TOKEN }}
    status: success
    deployment_id: ${{ steps.deployment.outputs.deployment_id }}
    env_url: https://app.example.com

- name: Update deployment status (failure)
  if: failure()
  uses: bobheadxi/deployments@v1
  with:
    step: finish
    token: ${{ secrets.GITHUB_TOKEN }}
    status: failure
    deployment_id: ${{ steps.deployment.outputs.deployment_id }}
```

### 5.2 回滚策略

```yaml
jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Get previous deployment
        id: prev
        run: |
          PREV_SHA=$(gh api repos/$REPO/deployments \
            --jq '[.[] | select(.environment == "production")] | .[1].sha')
          echo "sha=$PREV_SHA" >> $GITHUB_OUTPUT
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REPO: ${{ github.repository }}

      - name: Rollback
        run: |
          git checkout ${{ steps.prev.outputs.sha }}
          ./deploy.sh production
```

## 6. 环境与并发

### 6.1 环境级并发控制

```yaml
concurrency:
  group: deploy-${{ github.environment }}
  cancel-in-progress: false # 不取消正在运行的部署
```

这确保同一环境同时只有一个部署在进行。

### 6.2 分环境并发

```yaml
jobs:
  deploy:
    environment: ${{ matrix.env }}
    concurrency: deploy-${{ matrix.env }}
    strategy:
      matrix:
        env: [staging, production]
      fail-fast: false
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh ${{ matrix.env }}
```

## 7. 最佳实践

### 7.1 环境命名规范

```
dev / development     → 开发环境
test / testing        → 测试环境
staging / pre-prod    → 预发布环境
production / prod     → 生产环境
```

### 7.2 密钥管理

- 生产环境密钥仅存储在 production 环境中
- 使用最小权限原则配置密钥
- 定期轮换密钥
- 使用 OpenID Connect 替代长期密钥

```yaml
# 使用 OIDC 连接 AWS（无需存储 AK/SK）
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/github-actions
    aws-region: us-east-1
```

### 7.3 审批流程

```
推荐审批人数:
  dev:       0（自动）
  staging:   1（运维确认）
  production: 2（运维 + 负责人双重确认）
```
