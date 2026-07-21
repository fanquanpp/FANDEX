---
order: 100
title: Actions触发器
module: github
category: toolchain
difficulty: intermediate
description: 'GitHub Actions触发器详解：push、pull_request、schedule、workflow_dispatch等事件类型与条件配置。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/GitHubPages多站点方案
  - github/GitHubActions与CICD
  - github/常见问题排查
  - github/Actions矩阵构建
prerequisites:
  - github/GitHub概述
---

## 1. 触发器概述

GitHub Actions 工作流通过 `on` 关键字定义触发条件。触发器决定了工作流何时执行，是 CI/CD 流水线的入口。

```yaml
name: CI
on: push # 最简单的触发器
```

## 2. push 触发器

### 2.1 基本用法

```yaml
on:
  push:
    branches:
      - main
      - 'release/**' # 通配符匹配 release/1.0, release/2.1
    tags:
      - 'v*' # 匹配 v1.0, v2.0.1
    paths:
      - 'src/**' # 仅 src 目录变更时触发
      - '!src/docs/**' # 排除 src/docs 目录
```

### 2.2 过滤模式

| 模式         | 匹配示例                          | 说明         |
| ------------ | --------------------------------- | ------------ |
| `main`       | 精确匹配 `main`                   | 字面匹配     |
| `release/**` | `release/1.0`, `release/a/b`      | 任意深度通配 |
| `feature/*`  | `feature/a`, 不匹配 `feature/a/b` | 单层通配     |
| `v*`         | `v1`, `v2.0.1`                    | 前缀匹配     |
| `!pattern`   | 排除匹配                          | 否定模式     |

### 2.3 paths 与 paths-ignore 互斥

```yaml
# 正确：使用 paths
on:
  push:
    branches: [main]
    paths: ['src/**', 'package.json']

# 正确：使用 paths-ignore
on:
  push:
    branches: [main]
    paths-ignore: ['docs/**', '*.md']

# 错误：paths 和 paths-ignore 不能同时使用
on:
  push:
    paths: ['src/**']
    paths-ignore: ['docs/**'] # 语法错误
```

## 3. pull_request 触发器

### 3.1 事件类型

```yaml
on:
  pull_request:
    types:
      - opened # PR 创建
      - synchronize # PR 有新提交推送
      - reopened # PR 重新打开
      - ready_for_review # PR 从草稿变为可审查
      - labeled # PR 被添加标签
      - closed # PR 关闭（合并或拒绝）
```

### 3.2 分支与路径过滤

```yaml
on:
  pull_request:
    branches:
      - main
      - 'develop/**'
    paths:
      - 'src/**'
      - 'tests/**'
    types: [opened, synchronize]
```

### 3.3 pull_request_target

```yaml
on:
  pull_request_target:
    branches: [main]
```

与 `pull_request` 的关键区别：

| 维度         | pull_request         | pull_request_target  |
| ------------ | -------------------- | -------------------- |
| 代码来源     | PR 分支（fork 仓库） | 基础分支（目标仓库） |
| secrets 访问 | 不可访问             | 可访问               |
| 安全风险     | 低                   | 高（需防范注入）     |
| 适用场景     | 普通项目内 PR        | fork 仓库的 PR       |

## 4. schedule 触发器

### 4.1 cron 语法

```yaml
on:
  schedule:
    - cron: '0 2 * * *' # 每天 UTC 2:00
    - cron: '0 2 * * 1-5' # 工作日 UTC 2:00
    - cron: '30 4 1 * *' # 每月1日 UTC 4:30
```

cron 字段含义：

```
┌──────── 分钟 (0-59)
│ ┌────── 小时 (0-23)
│ │ ┌──── 日 (1-31)
│ │ │ ┌── 月 (1-12)
│ │ │ │ ┌ 星期 (0-6, 0=周日)
│ │ │ │ │
* * * * *
```

### 4.2 常见调度模式

| 表达式         | 含义                |
| -------------- | ------------------- |
| `*/15 * * * *` | 每 15 分钟          |
| `0 * * * *`    | 每小时整点          |
| `0 2 * * *`    | 每天 UTC 2:00       |
| `0 2 * * 1`    | 每周一 UTC 2:00     |
| `0 0 1 * *`    | 每月1日 UTC 0:00    |
| `0 0 1 1 *`    | 每年1月1日 UTC 0:00 |

### 4.3 注意事项

- GitHub 使用 **UTC 时区**，需换算本地时间
- 最小调度间隔为 **5 分钟**，更短的间隔会被忽略
- schedule 触发有延迟，不保证精确到秒
- 仓库 60 天无活动后，scheduled workflow 会自动禁用

## 5. workflow_dispatch 触发器

### 5.1 手动触发

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: '部署环境'
        required: true
        default: 'staging'
        type: choice
        options:
          - development
          - staging
          - production
      version:
        description: '部署版本'
        required: true
        type: string
      dry-run:
        description: '试运行模式'
        required: false
        type: boolean
        default: false
```

### 5.2 输入类型

| 类型          | 说明     | 示例                    |
| ------------- | -------- | ----------------------- |
| `string`      | 字符串   | 版本号、分支名          |
| `boolean`     | 布尔值   | 开关选项                |
| `choice`      | 下拉选择 | 环境选择                |
| `environment` | 环境     | 关联 GitHub Environment |

### 5.3 在工作流中使用输入

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: |
          echo "Deploying to ${{ github.event.inputs.environment }}"
          echo "Version: ${{ github.event.inputs.version }}"
          echo "Dry run: ${{ github.event.inputs.dry-run }}"
```

## 6. 其他触发器

### 6.1 repository_dispatch

```yaml
on:
  repository_dispatch:
    types: [deploy, rollback]
```

通过 API 触发：

```bash
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/owner/repo/dispatches \
  -d '{"event_type": "deploy", "client_payload": {"env": "production"}}'
```

### 6.2 issue_comment

```yaml
on:
  issue_comment:
    types: [created]
```

可用于实现斜杠命令：

```yaml
jobs:
  command:
    if: github.event.issue.pull_request && startsWith(github.event.comment.body, '/deploy')
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy triggered by comment"
```

### 6.3 release

```yaml
on:
  release:
    types: [published, created, edited]
```

### 6.4 多触发器组合

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

## 7. 触发条件优化

### 7.1 避免冗余触发

```yaml
# 问题：PR 中的 push 也会触发 push 事件
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# 解决：使用条件判断跳过重复
jobs:
  build:
    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.fork == false
```

### 7.2 跳过 CI

```bash
# 提交信息中包含 [skip ci] 或 [ci skip] 可跳过触发
git commit -m "docs: update README [skip ci]"
```

### 7.3 触发器与权限

```yaml
permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'CI passed!'
            })
```
