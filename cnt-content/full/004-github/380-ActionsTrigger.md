---
order: 420
title: 'Actions 触发器：on 字段决定你的流水线什么时候跑'
module: 'github'
category: 工具链
difficulty: intermediate
description: 从「为什么改一行文档也触发了一次完整部署」这个真实浪费切入，动手为一个仓库写出 push / pull_request / schedule / workflow_dispatch 的完整触发配置，讲清过滤条件、pull_request_target 的安全边界与 GITHUB_TOKEN 不递归触发的机制。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'github/370-GitHubActionsCICD'
  - 'github/420-ActionsEnvironmentDeploy'
  - 'github/570-FAQTroubleshoot'
prerequisites:
  - 'github/370-GitHubActionsCICD'
---

## 前置知识

- 知道工作流文件放在 `.github/workflows/`、顶层有 `name` / `on` / `jobs` 三段（见 [GitHub Actions 与 CI/CD](/github/370-GitHubActionsCICD)）。

## 学习目标

读完全文你将能够：

1. 为一个仓库写出「push 到 main 部署、PR 预检、每周全量扫、手动可跑」的完整 `on:` 配置；
2. 用 branches / tags / paths 过滤器把无效触发砍掉，省下 CI 分钟数；
3. 说清 `pull_request` 与 `pull_request_target` 的区别，以及为什么后者危险；
4. 遇到「定时任务没跑」「找不到手动触发按钮」时知道查哪里。

## 1. 问题：改一行文档，触发了一次 15 分钟的部署

工作流写好默认是「躺平」的，`on:` 字段决定它什么时候起来干活。写得太宽，代价真实可见：仓库 CI 里全是「只改了 README 却跑完构建、测试、部署」的记录，排队把真正要紧的检查堵在后面。

先看一个真实仓库（FANDEX）的触发配置长什么样：

```yaml
# .github/workflows/deploy.yml（节选）
on:
  push:
    branches: [main]
    paths:
      - 'app-web/**'
      - 'cnt-content/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - '.github/workflows/deploy.yml'
  pull_request:
    branches: [main]
    paths:        # 与 push 相同清单
      - 'app-web/**'
      - 'cnt-content/**'
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

这份配置回答了四个问题：什么时候部署（push main 且相关路径变了）、什么时候预检（PR 改了相关路径）、怎么手动补跑（workflow_dispatch）、旧运行怎么让位（concurrency 取消进行中的 PR 运行）。本文就把 `on:` 的全部零件拆开讲。

## 2. 动手：四种高频触发器各配一遍

### push：CI 与部署的主力

```yaml
on:
  push:
    branches:
      - main
      - 'release/**'     # 通配：release/1.0、release/2.1 都算
    tags:
      - 'v*'             # 打 v 开头的标签时也触发（配合发版流程）
    paths:
      - 'src/**'
      - '!src/docs/**'   # 感叹号排除子目录
```

### pull_request：合并前的预检

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - main             # 只检查目标为 main 的 PR
```

`types` 是 PR 生命周期的子事件：`opened` 刚创建、`synchronize` 推了新提交、`ready_for_review` 草稿转正。默认全类型，明确列出来能省掉 closed、labeled 这类无意义运行。

### schedule：定时任务

```yaml
on:
  schedule:
    - cron: '0 2 * * *'   # 每天 UTC 02:00
```

cron 五个字段：分 时 日 月 周。四个必须记住的坑：

- 时区是 **UTC**：想在北京时间上午 10 点跑，写 `0 2 * * *`；
- 最小间隔 **5 分钟**，更短被忽略；
- 定时触发有延迟，不保证准点；
- 仓库 **60 天无活动**，schedule 会被自动禁用。

### workflow_dispatch：手动按钮

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: '部署环境'
        type: choice
        options: [staging, production]
        default: 'staging'
        required: true
```

工作流文件合入默认分支后，Actions 页面出现 Run workflow 按钮，`inputs` 变成表单。job 里用 `inputs.environment` 读取。

## 3. 讲原理：一次触发背后发生了什么

你在网页或命令行做的动作 → GitHub 侧的三步：

1. **事件发生**：推送、开 PR 等活动，携带 commit SHA 与 ref；
2. **查找工作流**：在该 SHA 对应的代码里找 `.github/workflows/` 下的文件——注意用的是**事件那次提交里的工作流版本**，不是默认分支的最新版；
3. **匹配运行**：`on:` 声明了该事件的工作流各启动一次 run，运行器里注入 `GITHUB_SHA` 和 `GITHUB_REF`。

两个由这个机制推导出的重要规则：

**GITHUB_TOKEN 触发的事件不会引起新运行**（`workflow_dispatch` 和 `repository_dispatch` 除外）。这是防「工作流触发工作流」无限递归的保护。如果你确实要 A 工作流跑完触发 B，要么用 `workflow_run` 事件，要么换 PAT / GitHub App 令牌。

**`pull_request` 事件运行的是 PR 分支的代码，拿不到仓库 secrets**——防止 fork 来的恶意 PR 偷密钥。它的兄弟事件 `pull_request_target` 运行的是**目标分支的代码**，有 secrets 访问权，也因此有注入风险。对比：

| 维度 | pull_request | pull_request_target |
| :--- | :--- | :--- |
| 运行的代码 | PR 分支（可能来自 fork） | 基础分支（你自己的） |
| secrets | 不可访问 | 可访问 |
| 风险 | 低 | 高：拿 secrets 跑不可信代码即注入 |

安全红线：`pull_request_target` 的 job 里**永远不要 checkout 并执行 fork PR 的代码**。规范做法是拆两个 job——受信 job 只做提权动作（加标签、发评论），不可信代码的构建测试走 `pull_request` 事件用制品接力。

## 4. 过滤与优化：把无效触发砍掉

### 过滤器语法

| 模式 | 匹配 | 说明 |
| :--- | :--- | :--- |
| `main` | main | 精确匹配 |
| `release/**` | release/1.0、release/a/b | `**` 任意深度 |
| `feature/*` | feature/a，不含 feature/a/b | `*` 只一层 |
| `!pattern` | 排除 | 否定模式 |

`branches` 与 `branches-ignore`、`tags` 与 `tags-ignore`、`paths` 与 `paths-ignore` 各自**互斥**，同时写会报 `Invalid workflow file`。正面清单（`branches: [main]`）和负面清单（`paths-ignore: ['**/*.md']`）二选一。

### 省分钟数的三个手法

```yaml
# 1. paths 过滤：文档改动不触发
on:
  push:
    branches: [main]
    paths-ignore: ['docs/**', '**/*.md']

# 2. 条件跳过重复运行（push main + 同代码 PR 会跑两次）
jobs:
  build:
    if: github.event_name != 'pull_request' || !github.event.pull_request.head.repo.fork

# 3. 提交信息跳过 CI（纯文档小改）
#   git commit -m "docs: 更新说明 [skip ci]"
```

注意 `[skip ci]` 会跳过**该推送触发的所有工作流**，连代码扫描也一起跳，别养成习惯性添加。

### 最小权限收尾

触发器管「何时跑」，`permissions` 管「跑起来能动什么」。每个工作流只声明需要的权限：

```yaml
permissions:
  contents: read
```

## 5. 坑点与自检

| 现象 | 原因 | 处理 |
| :--- | :--- | :--- |
| `Invalid workflow file` | 正负面清单同时出现 | `branches` / `branches-ignore` 二选一 |
| 定时任务时间不对 | cron 是 UTC | 北京时间减 8 小时 |
| 定时任务悄悄停了 | 仓库 60 天无活动 | 有提交活动后重新启用 |
| 找不到 Run workflow 按钮 | `workflow_dispatch` 没声明，或文件没合入默认分支 | 补声明并合入 main |
| fork PR 拿不到 secrets | `pull_request` 事件不暴露 secrets | 用 `pull_request_target` 时严防注入，或拆受信 job |
| 工作流互相触发停不下来 | 用 PAT 绕过了递归保护 | 改回 GITHUB_TOKEN 或 `workflow_run` |
| cron 写了秒位 | 表达式字段数错误 | 五字段：分 时 日 月 周 |

自检三问：

1. 你仓库现在每个 push 都在触发部署吗？看一眼 Actions 历史里有多少「其实不用跑」的运行。
2. 你的 `pull_request` 触发器写 `types` 了吗？
3. 如果明天有人在 PR 里塞恶意代码，你的工作流会拿着 secrets 跑它吗？

## 6. 练习

1. 照第 1 节给仓库写一份带 paths 过滤的 deploy 工作流，改一行 README 推上去，验证不触发。
2. 给现有工作流加 `workflow_dispatch` 和一个 choice 类型 input，在 Actions 页手动跑一次并读取参数。
3. 算一道换算题：要每周一北京时间 09:00 全量扫描，cron 怎么写（答案：`0 1 * * 1`）。

## 下一步

- 触发之后，一个 job 怎么在多个系统上并行跑：[Actions 矩阵构建](/github/390-ActionsMatrixBuild)
- 用 environment 给部署加人工审批门：[Actions 环境部署](/github/420-ActionsEnvironmentDeploy)
- FANDEX 真实仓库的部署配置全文：`.github/workflows/deploy.yml`

### 官方文档

- 触发工作流的事件：https://docs.github.com/zh/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows
- workflow_dispatch：https://docs.github.com/zh/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_dispatch
