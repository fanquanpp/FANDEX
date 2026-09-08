---
order: 360
title: Actions 环境部署
module: 'github'
category: 工具链
difficulty: advanced
description: 'GitHub Actions环境（Environments）旅程驱动详解：按"开发→测试→预发布→生产"的环境旅程，讲透保护规则、必需审查者审批流、环境密钥与部署策略。'
author: fanquanpp
updated: '2026-09-08'
related:
  - 'github/034-ActionsSelfHostedRunner'
  - 'github/035-ActionsArtifact'
prerequisites:
  - 'github/001-GitHubOverview'
---

## 0. 开始之前：一次"考场分区"的旅程

一所学校办大型考试，考生要经过**四个教室**，每个教室的"门禁"不一样：

- **开发教室（dev）**：随便进，学生自己练习（自动部署，无门禁）。
- **测试教室（test）**：扫码自动进入，机器阅卷（自动化测试，自动放行）。
- **预演教室（staging）**：和正式考场一模一样，但要值班老师在场才能开门（自动触发 + 人工确认）。
- **正式考场（production）**：最难进——必须监考组长批条（审批）、考生名单限定（分支限制）、考场钥匙只能放保险柜（环境密钥）。

每一次代码发布，就像一批"考生"走过这趟旅程：**开发 → 测试 → 预发布 → 生产**。GitHub Actions 的**环境（Environments）** 就是这套"考场分区 + 发布许可门禁"系统。本文按这条"旅程"展开。

## 1. 环境是什么：先直观理解

### 1.1 官方定义

GitHub 官方文档的定义：环境用于描述一般的**部署目标**，如 `production`、`staging` 或 `development`。当工作流部署到某个环境时，该环境会显示在仓库主页上（部署历史一目了然）。

你可以用**保护规则（protection rules）**和**机密（secrets）**来配置环境。关键机制是：

> **引用环境的工作流作业，在运行或访问该环境的机密之前，必须先通过该环境的全部保护规则。**

一句话：**环境 = 部署目标 + 保护规则 + 独立密钥的三合一容器**。

### 1.2 环境旅程地图

```
代码提交 → CI 构建 → 部署 dev → 验证 test → 预发布 staging → 生产 production
                       │           │            │              │
                     自动部署      自动验证      人工确认        严格审批+分支限制
```

| 环境 | 用途 | 建议保护规则 |
| --- | --- | --- |
| dev | 开发环境，快速验证 | 无或最少 |
| test | 自动化测试环境 | 自动触发 |
| staging | 预发布，模拟生产 | 自动触发 + 人工确认 |
| production | 生产环境 | 必需审查者 + 分支限制（+ 等待计时器） |

### 1.3 适用计划说明

环境、环境机密与部署保护规则在**公共仓库**对所有现行 GitHub 计划开放；私有/内部仓库需要 **GitHub Pro、Team 或 Enterprise** 计划。

## 2. 创建环境：给旅程设"站点"

### 2.1 通过网页界面

仓库 **Settings → Environments → New environment**，输入环境名（如 `production`）创建。

### 2.2 通过 API / gh 命令

```bash
# 创建（或更新）名为 production 的环境
gh api repos/OWNER/REPO/environments/production --method PUT
```

### 2.3 在工作流中引用环境

```yaml
jobs:
  deploy:
    environment: production      # 引用环境：必须先过保护规则才能跑
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

## 3. 环境密钥与环境变量：每个考场的"保险柜"

### 3.1 环境密钥（Environment Secrets）

不同环境可以配置**同名的不同密钥值**——这是环境的核心价值：生产数据库密码绝不给 dev 用。

```yaml
jobs:
  deploy:
    environment: production
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}      # 生产环境专属密钥
          DATABASE_URL: ${{ secrets.DATABASE_URL }}  # 生产数据库地址
        run: ./deploy.sh
```

三个环境的"同名不同值"示意：

```
dev:
  DATABASE_URL: postgres://localhost:5432/dev
staging:
  DATABASE_URL: postgres://staging-db:5432/app
production:
  DATABASE_URL: postgres://prod-db:5432/app
```

### 3.2 密钥优先级（官方规则）

如果同一个密钥在**仓库级**和**环境级**都配置了，**环境级密钥自动覆盖仓库级密钥**。这正是安全边界所在：生产凭据只在满足所有保护规则的生产环境 job 中可见，其他分支、其他 job 都拿不到。

### 3.3 环境变量

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

## 4. 保护规则：旅程中的"门禁"

保护规则要求特定条件满足后，引用该环境的 job 才能继续。官方提供的规则包括：**必需审查者、等待计时器、部署分支限制、自定义保护规则（GitHub Apps）**。注意：仓库中可以安装任意数量的自定义保护规则，但**一个环境同时最多启用 6 条**。

### 4.1 必需审查者（Required Reviewers）：人工审批流

在 **Settings → Environments → production → Required reviewers** 中配置 1-6 个审查者（人或团队）。规则生效后：

- 工作流跑到引用该环境的 job 时**自动暂停**，等待审批。
- 审查者在 Actions 页面点击 **Approve**（批准）或 **Reject**（拒绝）。
- **只要其中一位必需审查者批准即可继续**（不必全员批准）。
- 审查者至少需要仓库的**读取权限**。

```yaml
jobs:
  deploy-production:
    environment: production      # 该 job 会等待人工审批
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

可选增强：启用"禁止自我审查"（prevent self-review），发起部署的人即使是指定审查者也不能自己批准自己，确保"部署的人 ≠ 批准的人"。

### 4.2 等待计时器（Wait Timer）：延迟放行

在环境设置中配置 0-43200 分钟（最长 30 天）的等待时间，job 会**先等待再开始**——适合给相关方留出最终检查窗口。

### 4.3 部署分支限制（Deployment Branches）：限定"考生名单"

配置允许部署到该环境的分支：

- **All branches**：任何分支都能部署。
- **Protected branches**：仅受保护分支。
- **Selected branches**：指定分支名模式（支持通配符）。

```
release/*     → 匹配 release/1.0、release/2.0
main          → 精确匹配 main
feature/*     → 匹配 feature/xxx
```

### 4.4 自定义保护规则（GitHub Apps）

官方支持通过 GitHub App 实现第三方保护规则，用于接入可观测性系统、变更管理系统、代码质量系统等——在部署安全落地前评估就绪度。

## 5. 部署工作流设计：多环境渐进部署

### 5.1 完整渐进式部署（build → dev → staging → production）

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

  deploy-dev:                       # 第一站：开发环境（无门禁）
    needs: build
    environment: dev
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: build-output, path: dist/ }
      - run: ./deploy.sh dev

  deploy-staging:                   # 第二站：预发布（可能有人工确认）
    needs: deploy-dev
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: build-output, path: dist/ }
      - run: ./deploy.sh staging

  deploy-production:                # 第三站：生产（严格审批 + 分支限制）
    needs: deploy-staging
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: build-output, path: dist/ }
      - run: ./deploy.sh production
```

### 5.2 条件选择环境

```yaml
jobs:
  deploy:
    # main 分支 → production，其他分支 → staging
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

### 5.3 手动触发指定环境

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: '目标环境'
        type: choice
        options: [dev, staging, production]

jobs:
  deploy:
    environment: ${{ github.event.inputs.environment }}
    runs-on: ubuntu-latest
    steps:
      - run: echo "部署到 ${{ github.event.inputs.environment }}"
```

## 6. 部署状态记录与回滚

### 6.1 记录部署状态（Deployment API）

环境部署会在 GitHub 上产生**部署记录**（关联到具体提交与操作者），形成可审计的部署历史。可用社区 Action 标记部署起止状态：

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

- name: Mark deployment success
  if: success()
  uses: bobheadxi/deployments@v1
  with:
    step: finish
    token: ${{ secrets.GITHUB_TOKEN }}
    status: success
    deployment_id: ${{ steps.deployment.outputs.deployment_id }}
    env_url: https://app.example.com
```

### 6.2 回滚策略

```yaml
jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Get previous deployment SHA
        id: prev
        run: |
          PREV_SHA=$(gh api repos/${{ github.repository }}/deployments \
            --jq '[.[] | select(.environment == "production")] | .[1].sha')
          echo "sha=$PREV_SHA" >> $GITHUB_OUTPUT
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Rollback to previous version
        run: |
          git checkout ${{ steps.prev.outputs.sha }}
          ./deploy.sh production
```

## 7. 环境与并发控制

### 7.1 环境级并发（同一环境同时只允许一个部署）

```yaml
concurrency:
  group: deploy-${{ github.environment }}   # 按环境分组
  cancel-in-progress: false                 # 不取消正在进行的部署（排队等待）
```

### 7.2 分环境并发矩阵

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

## 8. 最佳实践

### 8.1 环境命名规范

```
dev / development       → 开发环境
test / testing          → 测试环境
staging / pre-prod      → 预发布环境
production / prod       → 生产环境
```

### 8.2 密钥管理

- 生产环境密钥只存在 production 环境中，仓库级不放生产凭据。
- 按最小权限原则配置密钥。
- 定期轮换密钥。
- 云厂商场景优先用 **OIDC** 替代长期密钥（无需存储 AK/SK）：

```yaml
# 使用 OIDC 连接 AWS（无需在仓库存储长期密钥）
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/github-actions
    aws-region: us-east-1
```

### 8.3 审批强度建议

```
dev:         0 人（自动）
staging:     1 人（运维确认）
production:  2 人（运维 + 负责人双重确认）
```

### 8.4 安全边界认知

环境保护规则的意义不止于"流程规范"：**即使某个工作流被攻破（如恶意 Action、fork 的 pull_request_target），只要目标环境配置了必需审查者等规则，攻击者也无法在未通过门禁前触达环境密钥**。这是把生产凭据从仓库级下沉到环境级的核心收益。

## 9. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 环境密钥取不到 | job 中 secrets 为空 | job 未声明 `environment`，或保护规则未通过前无法访问环境密钥 | 在 job 中显式写 `environment: production`；确认保护规则已通过 |
| 部署 job 一直"等待" | job 卡在 pending/waiting | 环境配置了必需审查者，等待批准 | 审查者在 Actions 页面点击 Approve；或调整审查者配置 |
| 从非允许分支部署被拒 | job 失败或跳过 | 环境配置了部署分支限制 | 检查 Deployment branches 规则与通配符是否匹配当前分支 |
| 私有仓库无法配置环境 | 功能不可用 | 私有仓库需要 Pro/Team/Enterprise 计划 | 升级计划，或确认公共仓库场景 |
| 环境密钥与仓库密钥同名混淆 | 取到意外值 | 环境级密钥自动覆盖仓库级密钥 | 明确环境级优先规则，避免在仓库级存同名生产密钥 |
| 保护规则超过 6 条 | 无法启用更多 | 单环境最多同时启用 6 条保护规则 | 精简规则，把规则分散到多个环境 |
| 并发部署互相踩踏 | 两个部署同时改生产 | 未配置环境级并发 | 用 `concurrency.group` 按环境分组，`cancel-in-progress: false` |

## 11. 一句话记忆

**环境 = 部署旅程中的"考场分区"：job 声明 environment 才会进入对应站点，必须先过保护规则（审查者/等待计时器/分支限制）才能跑任务、读环境密钥；生产凭据只放在生产环境的保险柜里。**
