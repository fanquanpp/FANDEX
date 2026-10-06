---
order: 460
title: Actions 环境部署：生产密钥为什么要单独锁一个门
module: 'github'
category: 工具链
difficulty: advanced
description: 从「生产数据库密码躺在仓库级 Secrets 里，任何 job 都能读」这个真实隐患切入，动手创建 environment、配保护规则和审批流，讲清环境级密钥覆盖规则、多环境渐进部署工作流与并发防踩踏。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'github/380-ActionsTrigger'
  - 'github/410-ActionsArtifact'
  - 'github/430-ActionsSelfHostedRunner'
prerequisites:
  - 'github/370-GitHubActionsCICD'
---

## 前置知识

- 会写基本的 workflow（`on` / `jobs` / `steps`，见 [GitHub Actions 与 CI/CD](/github/370-GitHubActionsCICD)）；
- 知道仓库级 Secrets 怎么配（见 [gh CLI 认证配置](/github/450-GhCliAuth)里的 `gh secret` 用法）。

## 学习目标

读完全文你将能够：

1. 创建 environment，并用保护规则（必需审查者、分支限制、等待计时器）给它装上门禁；
2. 把生产凭据从仓库级下沉到环境级，理解「环境级覆盖仓库级」的优先级规则；
3. 写一个 build → staging → production 的渐进部署工作流；
4. 用 environment 级 concurrency 防止两个部署同时改生产。

## 1. 问题：仓库级 Secrets 是「谁都能读」的

一个常见的安全盲区：你把生产数据库密码存在**仓库级** Secrets 里。表面上 `secrets.X` 不会打进日志，但任何 job——包括将来某个被攻破的第三方 Action、某次手滑改坏的工作流——都能把它读出来发到外面。

环境（Environments）就是为此设计的：

> 引用环境的 job，在运行或访问该环境密钥之前，必须先通过该环境的全部保护规则。

**环境 = 部署目标 + 保护规则 + 独立密钥**，三合一容器。顺带一个你可能在用的实例：用 Actions 部署 GitHub Pages 时，GitHub 会自动创建一个 `github-pages` 环境——FANDEX 的 deploy.yml 部署 Pages 后，仓库主页 Environments 里就能看到这条部署记录。环境不是大型企业专属，单人文档站也已经在用它。

计划说明：公开仓库全功能免费；私有仓库的环境与保护规则需要 Pro / Team / Enterprise。

## 2. 动手：创建环境并装上门禁

### 第一步：创建

```
Settings → Environments → New environment → 输入 production
```

或命令行：

```bash
gh api repos/OWNER/REPO/environments/production --method PUT
```

### 第二步：配三条保护规则

在环境设置页：

1. **Required reviewers**：加 1 到 6 个审查者。生效后，引用该环境的 job 跑到这里自动暂停，等审查者在 Actions 页面点 Approve；**任一审查者批准即可继续**。建议开启「阻止自我批准」，做到部署的人和批准的人不是同一个。
2. **Deployment branches**：选 Selected branches，填 `main` 或 `release/*`——其他分支的 job 根本没有资格部署到生产。
3. **Wait timer**：0 到 43200 分钟的强制等待，给相关方留最后检查窗口。

### 第三步：工作流里引用

```yaml
jobs:
  deploy:
    environment: production   # 这一行就是门禁
    runs-on: ubuntu-24.04
    steps:
      - run: ./deploy.sh
```

### 第四步：把生产密钥放进环境

```
环境页 → Environment secrets → Add secret → DATABASE_URL
```

然后删掉仓库级里的同名生产密钥。工作流代码不用改，`secrets.DATABASE_URL` 照常取——但只有通过了 production 门禁的 job 拿得到值。

## 3. 讲原理：密钥优先级与安全边界

同名密钥的优先级规则：**环境级覆盖仓库级**。这个规则反过来用才是正解——

- 仓库级只放共享、低敏的配置；
- 生产凭据**只**存在于 production 环境；
- dev / staging 配同名密钥但值不同，一套工作流三处部署：

```text
dev:        DATABASE_URL = postgres://localhost:5432/dev
staging:    DATABASE_URL = postgres://staging-db:5432/app
production: DATABASE_URL = postgres://prod-db:5432/app（且有审批门）
```

安全边界的意义在于：即使某个工作流被注入（比如 fork PR 加 `pull_request_target` 的经典组合，见 [Actions 触发器](/github/380-ActionsTrigger)），攻击者没过 production 的审批门，就触达不到环境密钥。这是把凭据下沉的核心收益，不只是流程好看。

补充：连接云厂商时优先用 **OIDC** 短期凭据，连密钥都不用存：

```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/github-actions
    aws-region: us-east-1
```

## 4. 多环境渐进部署工作流

```yaml
name: Deploy Pipeline
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
      - run: pnpm install --frozen-lockfile && pnpm build:all
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  deploy-staging:
    needs: build
    environment: staging
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/download-artifact@v4
        with: { name: build-output, path: dist/ }
      - run: ./deploy.sh staging

  deploy-production:
    needs: deploy-staging
    environment: production          # 停下等审批
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/download-artifact@v4
        with: { name: build-output, path: dist/ }
      - run: ./deploy.sh production
```

构建产物用[制品传递](/github/410-ActionsArtifact)在 job 间接力，保证三个环境部署的是**同一份产物**。两个常用变体：

```yaml
# 按分支自动选环境
environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}

# 手动触发选环境（配合 workflow_dispatch inputs）
environment: ${{ inputs.environment }}
```

### 并发防踩踏

```yaml
concurrency:
  group: deploy-${{ github.environment }}
  cancel-in-progress: false   # 部署排队，不互相取消
```

同一环境同时只允许一个部署在跑，第二个排队。注意和 [Actions 触发器](/github/380-ActionsTrigger)里 PR 预检的 `cancel-in-progress: true` 语义相反：预检可以取消，部署必须排队。

## 5. 坑点与自检

| 现象 | 原因 | 处理 |
| :--- | :--- | :--- |
| job 里环境密钥是空 | job 没写 `environment:`，或门禁未过 | 显式声明 environment |
| job 卡在 waiting | 必需审查者还没批 | Actions 页点 Approve |
| 非允许分支部署被拒 | Deployment branches 限制 | 核对通配符与分支名 |
| 取到意外的密钥值 | 环境级覆盖了仓库级同名密钥 | 检查两层是否同名不同值 |
| 保护规则加不上 | 单环境最多同时启用 6 条 | 精简，或拆环境 |
| 两个部署同时改生产 | 没配 environment 级 concurrency | 补 `concurrency.group` |
| 私有仓库找不到 Environments | 计划不含该功能 | 升级计划或用公开仓库 |

自检三问：

1. 你的生产凭据现在存在仓库级还是环境级？
2. production 环境的审批人里有你自己吗（能自己批自己吗）？
3. 两个部署同时触发时，谁在跑谁在等，你说得清吗？

## 6. 练习

1. 给自己的仓库建 `preview` 环境，配一条分支限制（只允许 `main`），在部署 job 里引用并验证。
2. 在环境和仓库各配一个同名 secret（值不同），job 里打出来对比，亲眼确认覆盖顺序后删掉。
3. 给 production 环境加一个必需审查者，触发部署并观察 job 停在 waiting 的样子，再批准放行。

## 下一步

- 制品在 job 间怎么传递：[Actions 制品传递](/github/410-ActionsArtifact)
- 自建机器跑任务：[Actions 自托管运行器](/github/430-ActionsSelfHostedRunner)
- 触发器与并发取消的细节：[Actions 触发器](/github/380-ActionsTrigger)

### 官方文档

- Using environments for deployment：https://docs.github.com/zh/actions/how-tos/write-workflows/choose-where-workflows-run/use-environments-for-deployment
- 环境保护规则与密钥：https://docs.github.com/zh/actions/reference/security/using-secrets-in-github-actions
