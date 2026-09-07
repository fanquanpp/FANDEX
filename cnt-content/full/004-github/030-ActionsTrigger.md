---
order: 300
title: Actions 触发器
module: 'github'
category: 工具链
difficulty: intermediate
description: GitHub Actions触发器详解：以触发事件清单为主线，逐一讲解 push、pull_request、schedule、workflow_dispatch 等事件类型、过滤条件与触发优化技巧。
author: fanquanpp
updated: '2026-08-29'
related:
  - 'github/028-GitHubPagesMultiSolution'
  - 'github/029-GitHubActionsCICD'
  - 'github/031-FAQTroubleshoot'
  - 'github/032-ActionsMatrixBuild'
prerequisites:
  - 'github/001-GitHubOverview'
---

## 0. 开始之前：一个关于"闹钟"的故事

想象你家里有很多**定时触发装置**：早上 7 点的闹钟、门口感应灯、厨房的定时烤箱、还有你亲手按下按钮的咖啡机。它们平时静静躺着，但一旦"事件"发生（时间到了、有人经过、按下按钮），对应的装置就会立刻开始工作——有的会响、有的会亮、有的会烤面包。

GitHub Actions 的**触发器**就是工作流的"闹钟"。每个工作流（workflow）都在等一个特定的信号：可能是你推了一次代码（push），可能是有人开了个 Pull Request（pull_request），可能是每天凌晨 2 点的定时器（schedule），也可能是你在网页上手动按下的"Run workflow"按钮（workflow_dispatch）。

你写的 `.github/workflows/*.yml` 文件中的 `on:` 字段，就是给 GitHub 下达的"触发指令清单"：**什么信号来了，这个工作流才开始跑**。本文就按这份"触发事件清单"逐一讲解。

## 1. 触发器是什么：先直观理解，再看原理

### 1.1 直观理解

工作流本身是一套"要执行的活儿"（比如跑测试、构建、部署），触发器解决的是"**什么时候干**"的问题。两者配合，就像收音机等待特定频率的信号：信号对上了，节目就开始播放。

```yaml
name: CI
on: push   # 最简单的触发器：只要代码被推送到仓库，就运行
```

### 1.2 工作原理（官方流程）

根据 GitHub 官方文档，一次触发背后其实有三个步骤：

1. **事件发生**：仓库上发生某个活动（推送提交、打开 PR、创建 Issue 等），该事件带有对应的提交 SHA（commit SHA）和 Git 引用（ref）。
2. **搜索工作流文件**：GitHub 在该事件关联的 SHA 或 ref 中，查找仓库根目录 `.github/workflows` 文件夹下的工作流文件。
3. **匹配并运行**：凡是在 `on:` 中声明了与该事件匹配的工作流，都会启动一次运行（run）。每次运行使用的是事件关联提交中的工作流版本，同时 GitHub 会在运行器环境中注入 `GITHUB_SHA`（提交 SHA）和 `GITHUB_REF`（Git 引用）两个环境变量。

一个值得注意的细节（官方文档明确说明）：**使用仓库自带的 `GITHUB_TOKEN` 执行任务所触发的事件，除 `workflow_dispatch` 和 `repository_dispatch` 外，不会产生新的工作流运行**。这是为了防止"工作流触发工作流"造成无限递归。如果你确实需要从一个工作流里触发另一个，就得使用 GitHub App 安装令牌或个人访问令牌（PAT）。

## 2. 触发事件清单：逐一认识"闹钟"的种类

GitHub Actions 支持的触发事件非常丰富（详见官方"触发工作流的事件"页面）。下面按常用程度列出一张清单，然后逐一细讲：

| 事件 | 触发时机 | 使用频率 | 备注 |
| --- | --- | --- | --- |
| `push` | 推送提交或标签到仓库 | 极高 | CI 主力 |
| `pull_request` | 打开/更新/关闭 PR 等 | 极高 | PR 检查主力 |
| `pull_request_target` | 同上，但在基础分支上下文运行 | 较高 | 用于 fork 仓库，注意安全 |
| `schedule` | 按 cron 定时触发 | 中 | 定时任务 |
| `workflow_dispatch` | 手动点击按钮触发 | 中 | 支持带参数 |
| `release` | 发布 Release | 中 | 版本发布 |
| `repository_dispatch` | 外部 API 调用触发 | 低 | 系统集成 |
| `issue_comment` | 有人评论 Issue/PR | 低 | 可做斜杠命令 |
| `workflow_run` | 另一个工作流完成时 | 中 | 工作流间联动 |
| `workflow_call` | 被其他工作流调用 | 中 | 复用工作流 |

### 2.1 push 触发器：最常见的"门铃"

只要有人把代码推送到仓库，就触发。但通常我们不希望任何推送都触发构建，所以要加**过滤条件**：

```yaml
on:
  push:
    branches:            # 仅这些分支的推送触发
      - main
      - 'release/**'     # 通配符：release/1.0、release/2.1 都匹配
    tags:                # 仅这些标签的推送触发（配合发布流程）
      - 'v*'             # 匹配 v1.0、v2.0.1
    paths:               # 仅这些路径下的文件变更才触发
      - 'src/**'
      - 'package.json'
      - '!src/docs/**'   # 排除 src/docs 目录
```

### 2.2 pull_request 触发器：代码合入前的"体检"

PR 生命周期里有很多个时刻（activity types），你可以选择在哪些时刻触发：

```yaml
on:
  pull_request:
    types:               # 事件子类型，决定 PR 的哪个动作触发
      - opened           # PR 刚创建
      - synchronize      # PR 分支有新提交被推送
      - reopened         # 被关闭的 PR 重新打开
      - ready_for_review # 从草稿（Draft）转为正式可审查
      - labeled          # PR 被添加标签
      - closed           # PR 被关闭（合并或拒绝）
    branches:
      - main             # 只检查合并目标为 main 的 PR
    paths:
      - 'src/**'         # 只检查改动涉及 src 的 PR
```

### 2.3 pull_request_target：fork 仓库的特殊按钮

当别人 fork 你的仓库并提交 PR 时，`pull_request` 事件运行的是**PR 分支的代码**，因此拿不到仓库 secrets（防止恶意代码偷密钥）。而 `pull_request_target` 运行的是**基础分支（目标仓库）的代码**，可以访问 secrets，但也因此有被注入攻击的风险。

| 维度 | pull_request | pull_request_target |
| --- | --- | --- |
| 代码来源 | PR 分支（fork 仓库的代码） | 基础分支（目标仓库的代码） |
| secrets 访问 | 不可访问 | 可访问 |
| 安全风险 | 低 | 高（需防范注入） |
| 适用场景 | 普通项目内 PR | fork 仓库的 PR（如自动化合并、生成检查报告） |

### 2.4 schedule 触发器：定时"闹钟"

```yaml
on:
  schedule:
    - cron: '0 2 * * *'     # 每天 UTC 02:00
    - cron: '30 4 1 * *'    # 每月 1 日 UTC 04:30
```

cron 表达式共 5 个字段，从左到右依次是：分钟（0-59）、小时（0-23）、日（1-31）、月（1-12）、星期（0-6，0 表示周日）。

使用 schedule 的几个官方注意事项：

- GitHub 使用 **UTC 时区**，中国用户需换算为北京时间（UTC+8）。
- 最小调度间隔为 **5 分钟**，更短的间隔会被忽略。
- 定时触发存在延迟，不保证精确到秒。
- 仓库 **60 天无活动**后，scheduled workflow 会被自动禁用。

### 2.5 workflow_dispatch 触发器：手动"按钮"

在仓库 Actions 页面点击 "Run workflow" 手动触发，还能通过 `inputs` 定义参数，让运行变得可交互：

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:          # 参数名
        description: '部署环境'
        required: true
        default: 'staging'
        type: choice        # 下拉选择
        options:
          - development
          - staging
          - production
      version:
        description: '部署版本号'
        required: true
        type: string        # 文本输入
      dry-run:
        description: '试运行（不真正部署）'
        required: false
        type: boolean       # 布尔开关
        default: false
```

在 job 中通过 `github.event.inputs.<参数名>` 读取用户填写的值。

### 2.6 其他常用触发器

**release**：发布版本时触发，常用于"打标签自动发版"。

```yaml
on:
  release:
    types: [published, created, edited]
```

**repository_dispatch**：由外部系统通过 REST API 调用触发，适合"CI 与外部平台联动"：

```bash
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/OWNER/REPO/dispatches \
  -d '{"event_type": "deploy", "client_payload": {"env": "production"}}'
```

**issue_comment**：有人评论时触发，可实现"在评论里输入 `/deploy` 就部署"的斜杠命令：

```yaml
on:
  issue_comment:
    types: [created]

jobs:
  command:
    if: github.event.issue.pull_request && startsWith(github.event.comment.body, '/deploy')
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy triggered by comment"
```

**workflow_run**：另一个工作流跑完（无论成功失败）后触发，常用于"构建完成后自动部署"：

```yaml
on:
  workflow_run:
    workflows: ['Build']   # 监听名为 Build 的工作流
    types: [completed]
```

## 3. 过滤条件详解：给"闹钟"加精细的开关

触发器配过滤条件，就像给闹钟设置"只在工作日响"。

### 3.1 通配符模式（官方语法）

| 模式 | 匹配示例 | 说明 |
| --- | --- | --- |
| `main` | `main` | 精确匹配 |
| `release/**` | `release/1.0`、`release/a/b` | `**` 匹配任意深度 |
| `feature/*` | `feature/a`，不匹配 `feature/a/b` | `*` 只匹配一层 |
| `v*` | `v1`、`v2.0.1` | `*` 可匹配任意字符 |
| `!pattern` | 排除匹配 | 否定模式，用于从结果中剔除 |

### 3.2 branches 与 branches-ignore / tags 与 tags-ignore

注意使用规则：`branches`（正面清单）与 `branches-ignore`（负面清单）**不能同时使用**，`tags` 与 `tags-ignore` 同理。

```yaml
# 正确：使用正面清单
on:
  push:
    branches: [main, develop]
    tags: ['v*']

# 正确：使用负面清单
on:
  push:
    branches-ignore: ['docs/**', 'experiment/*']

# 错误：两者同时出现会报错
on:
  push:
    branches: [main]
    branches-ignore: ['release/**']   # 语法错误
```

### 3.3 paths 与 paths-ignore：路径级过滤

`paths` 与 `paths-ignore` 同样**互斥**。它基于变更文件列表做判断：若存在与 `paths` 匹配的文件，则触发；若所有变更文件都被 `paths-ignore` 匹配，则不触发。

```yaml
# 只有 src/ 与根目录 package.json 变更时才触发
on:
  push:
    branches: [main]
    paths: ['src/**', 'package.json']

# 只改文档时不触发（省 CI 分钟数）
on:
  push:
    branches: [main]
    paths-ignore: ['docs/**', '*.md', 'README.md']
```

## 4. 多事件组合与触发优化

### 4.1 一个工作流响应多个事件

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:
```

### 4.2 避免冗余触发

同一份代码既推了 main 又发起了 PR，可能触发两次。可以用 `if` 条件跳过重复：

```yaml
jobs:
  build:
    # PR 来自 fork 或同仓库时只跑一次构建
    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.fork == false
    runs-on: ubuntu-latest
    steps:
      - run: npm ci && npm test
```

### 4.3 提交信息里"跳过 CI"

在 commit message 中写入 `[skip ci]` 或 `[ci skip]`，本次推送不会触发工作流——适合纯文档、纯注释的改动：

```bash
git commit -m "docs: 更新说明文档 [skip ci]"
```

### 4.4 用权限控制触发后的动作

触发器只管"何时跑"，跑起来能做什么由 `permissions` 决定。遵循最小权限原则，只授予本次工作流需要的权限：

```yaml
permissions:
  contents: read
  issues: write
  pull-requests: write
```

## 5. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| `branches` 与 `branches-ignore` 同时使用 | `Unable to resolve action` 或语法校验失败 | 正负面清单互斥 | 只保留其中一个，改用 `!` 否定模式 |
| `paths` 与 `paths-ignore` 同时使用 | 校验失败 | 互斥配置 | 二选一，或拆分为两个工作流 |
| schedule 不按预期时间执行 | 触发时间与本地时间不符 | GitHub 使用 UTC 时区 | 换算为 UTC 时间，北京时间减 8 小时 |
| 手动触发后找不到按钮 | Actions 页面没有 "Run workflow" | 工作流文件不在默认分支，或未声明 `workflow_dispatch` | 确认 `on: workflow_dispatch` 已声明且文件已合入默认分支 |
| fork 的 PR 触发后拿不到 secrets | secrets 为空 | `pull_request` 事件运行 fork 代码，不暴露 secrets | 改用 `pull_request_target`（注意防注入），或把需要密钥的步骤放受控环境 |
| 工作流无限互相触发 | 运行数量异常增长 | 工作流 A 触发 B、B 又触发 A | 使用 `GITHUB_TOKEN` 时不会递归；必须跨工作流触发时换用 PAT/GitHub App 令牌 |
| cron 写了秒或 5 分钟以内间隔 | 定时不触发或很晚才触发 | 最小调度间隔 5 分钟，且调度有延迟 | 调整 cron，至少间隔 5 分钟，并接受延迟 |

## 7. 一句话记忆

**触发器是工作流的"闹钟"：在 `on:` 里声明事件清单和过滤条件，信号对了，工作流才开始跑。**
