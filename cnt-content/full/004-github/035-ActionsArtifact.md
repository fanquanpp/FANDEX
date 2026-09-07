---
order: 350
title: Actions 制品传递
module: 'github'
category: 工具链
difficulty: intermediate
description: 'GitHub Actions制品（Artifacts）流程驱动详解：按"上传→下载→过期管理"完整流程，讲透 upload-artifact、download-artifact 与跨 Job/跨工作流传递。'
author: fanquanpp
updated: '2026-08-29'
related:
  - 'github/033-ActionsCacheDependency'
  - 'github/034-ActionsSelfHostedRunner'
  - 'github/036-ActionsEnvironmentDeploy'
prerequisites:
  - 'github/001-GitHubOverview'
---

## 0. 开始之前：一个"快递驿站"的故事

小区里有个**快递驿站**。你在淘宝下单，快递员（构建 Job A）把包裹放到驿站（GitHub 存储），你在驿站取了包裹回家（测试 Job B / 部署 Job C 下载使用）。驿站还有三个特点：

1. **中转不保存**：驿站只是中转站，包裹放久了会被清退（保留期到了自动删除）。
2. **凭单取件**：驿站不代收现金，你的"取件码"就是制品名称（artifact name）。
3. **跨网点不行**：驿站在哪个小区，就只能服务这个小区的居民（制品归属于特定工作流运行，跨工作流取件需要特殊"凭证"）。

GitHub Actions 的**制品（Artifacts）** 就是 CI 世界的"快递驿站"：把构建产物、测试报告、日志等文件**存起来**，供同一个工作流里的后续 job 下载，或供你在 Actions 页面手动下载查看。本文按**"上传 → 下载 → 过期管理"**的完整流程展开。

## 1. 制品是什么：先直观理解

### 1.1 一个关键痛点

每个 job 都跑在**独立的运行器**上，job 之间的文件系统是隔离的：构建 job 编译出的 `dist/` 目录，测试 job 根本看不到。要传递数据，靠什么？

- **job 输出（outputs）**：只能传字符串，传不了文件。
- **制品（Artifacts）**：专为传递文件设计——上传到 GitHub 存储，下游 job 下载。

```mermaid
flowchart LR
    JA[Job A 构建<br/>编译代码<br/>上传制品] -->|制品| JB[Job B 测试<br/>下载制品 运行测试]
    JB -->|测试报告| JC[Job C 部署<br/>下载制品 部署]
```

### 1.2 官方对制品的定义

GitHub 官方文档的定义：制品是工作流运行过程中产生的**一个文件或一组文件**。例如：

- 日志文件与核心转储（core dumps）
- 测试结果、失败截图
- 二进制或压缩文件
- 压测性能输出与代码覆盖率结果

制品允许你在 job 完成后**持久化数据**，并与同一工作流中的其他 job 共享。默认情况下，GitHub 会**保留构建日志和制品 90 天**，保留期可自定义。

### 1.3 制品 vs 缓存：别把两种"存储"搞混

| 维度 | 制品（Artifacts） | 缓存（Caches） |
| --- | --- | --- |
| 目的 | 传递/交付文件 | 加速重复步骤 |
| 生命周期 | 默认保留 90 天 | 7 天未访问自动删除 |
| 典型用途 | 构建产物、测试报告、安装包 | npm/pip 依赖包 |
| 访问方式 | 显式上传/下载 | key 自动命中 |
| 最佳实践 | 每次运行按需上传 | 依赖不变就复用 |

一句话：**缓存省"重复下载"，制品做"传递交付"**。

## 2. 流程第一步：上传（actions/upload-artifact）

### 2.1 基本用法

```yaml
- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: dist-files            # 制品名称（同一工作流内唯一）
    path: |                     # 要上传的路径（支持多路径、glob）
      dist/
      package.json
    retention-days: 5           # 保留天数（1-90，默认跟随仓库设置 90 天）
    compression-level: 6        # 压缩级别 0-9（默认 6；大文件可选 0 提速）
    if-no-files-found: error    # 无匹配文件时的行为：warn | error | ignore
```

### 2.2 参数详解

| 参数 | 说明 |
| --- | --- |
| `name` | 制品名称，默认 `artifact`；在同一工作流运行内应唯一 |
| `path` | 必填。文件、目录或通配符模式；路径基于运行器工作区解析 |
| `retention-days` | 保留天数，1-90，0 表示使用默认（仓库设置，通常 90 天） |
| `compression-level` | 压缩级别 0-9，默认 6；不易压缩的大文件建议 0 以显著加快上传 |
| `if-no-files-found` | `warn`（默认，警告不报错）/ `error`（报错）/ `ignore`（静默跳过） |
| `overwrite` | true 时同名制品会被删除后重新上传；false 时同名直接报错 |

### 2.3 v4 版本的重要变化（迁移须知）

官方已在 2024 年弃用 v3 及更早版本，请使用 **v4**。v4 的关键行为变化：

| 变更项 | v3 行为 | v4 行为 |
| --- | --- | --- |
| 制品名称冲突 | 同名自动覆盖 | 报错，必须唯一（除非 `overwrite: true`） |
| 跨工作流下载 | 默认可下载 | 需指定 `run-id` + `github-token` |
| 上传合并 | 同名自动合并 | 不再自动合并 |
| 下载默认行为 | 不带 name 下载全部并平铺 | 行为更严格，推荐显式指定 |

## 3. 流程第二步：下载（actions/download-artifact）

### 3.1 基本用法

```yaml
- name: Download build artifacts
  uses: actions/download-artifact@v4
  with:
    name: dist-files        # 指定制品名称
    path: dist/             # 下载到指定目录（默认解压到当前目录）
```

不指定 `name` 时下载该运行的所有制品（v4 起更推荐显式指定，避免歧义）。

### 3.2 同工作流内跨 Job 传递（最常见流程）

```yaml
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

  test:
    needs: build                      # 必须等 build 完成（上传先于下载）
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: ./deploy.sh
```

**易错点**：下载 job 必须用 `needs` 声明依赖上传 job，否则下载可能发生在上传之前，报"找不到制品"。

### 3.3 矩阵构建中的制品命名

矩阵的每个组合是独立 job，但共享同一运行内的制品命名空间——**同名制品会冲突**。解法：名称里带上矩阵变量：

```yaml
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.os }}    # 名称包含矩阵变量，避免冲突
          path: dist/
```

### 3.4 跨工作流下载（需要"取件凭证"）

制品归属于**特定工作流运行**。另一个工作流要取件，必须提供 `run-id`（来源运行 ID）与 `github-token`：

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          run-id: ${{ github.event.workflow_run.id }}   # 来源工作流运行 ID
          github-token: ${{ secrets.GITHUB_TOKEN }}     # 访问令牌
```

配合 `workflow_run` 触发器（监听"Build"工作流完成后自动触发）更常见：

```yaml
# deploy.yml
on:
  workflow_run:
    workflows: ['Build']      # 监听构建工作流
    types: [completed]        # 无论成败都触发（也可加 branches 过滤）

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          run-id: ${{ github.event.workflow_run.id }}
```

## 4. 流程第三步：过期与管理

### 4.1 保留期策略（官方默认 90 天）

- 默认保留 **90 天**，可通过 `retention-days` 单独设置（1-90）。
- 对 PR 而言，**每次向 PR 推送新提交，保留期会重新计时**。
- 制品存储占用仓库存储空间，私有仓库超出免费额度会按量计费——**默认 90 天几乎总是太长**。

按用途设置合理的保留期（社区实践参考）：

| 制品用途 | 建议保留期 |
| --- | --- |
| PR 构建产物（仅 job 间传递） | 1 天 |
| 测试报告、截图 | 3-5 天 |
| 失败调试快照 | 3 天 |
| main 分支构建产物（供回滚排查） | 7-14 天 |
| Release 交付包 | 30 天 |

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: temp-build
    path: dist/
    retention-days: 1          # 1 天后自动删除
```

### 4.2 只在需要时上传（省存储）

测试报告只有失败时才有用，用 `if: failure()` 条件上传：

```yaml
- name: Upload debug snapshot
  if: failure()                # 仅在失败时上传
  uses: actions/upload-artifact@v4
  with:
    name: debug-${{ github.run_id }}
    path: |
      logs/
      screenshots/
    retention-days: 3
```

### 4.3 手动删除

```bash
# 用 GitHub CLI 删除指定名称的制品
gh api repos/OWNER/REPO/actions/artifacts \
  --jq '.artifacts[] | select(.name == "temp-build") | .id' | \
  xargs -I {} gh api repos/OWNER/REPO/actions/artifacts/{} --method DELETE
```

### 4.4 体积优化

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: build
    path: |
      dist/
      !dist/**/*.map            # 排除 source map
    compression-level: 9        # 最高压缩（更慢上传但更省空间）
```

## 5. 典型应用场景

### 5.1 测试报告 + 覆盖率（配合 always()）

```yaml
- name: Run tests
  run: npm test -- --reporter=json --output=test-results.json

- name: Upload test results
  if: always()                  # 测试失败也要上传，便于排查
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: test-results.json
    retention-days: 7

- name: Upload coverage report
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
    retention-days: 14
```

### 5.2 多平台安装包分发

```yaml
- name: Build all platforms
  run: npm run build:all

- name: Upload Linux binary
  uses: actions/upload-artifact@v4
  with: { name: app-linux, path: dist/app-linux }

- name: Upload macOS binary
  uses: actions/upload-artifact@v4
  with: { name: app-macos, path: dist/app-macos }

- name: Upload Windows binary
  uses: actions/upload-artifact@v4
  with: { name: app-windows, path: dist/app-windows }
```

### 5.3 E2E 失败视频/截图快照

```yaml
- name: Upload E2E failure artifacts
  if: failure()                 # 只在失败时上传，省空间
  uses: actions/upload-artifact@v4
  with:
    name: e2e-failures-${{ github.run_id }}
    path: |
      cypress/videos/
      cypress/screenshots/
    retention-days: 3
```

## 6. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 上传后提示无文件 | `Warning: No files were found with the provided path: dist/` | 上传路径基于运行器工作区解析，可能与前一步 `cd subdir` 后的实际路径不符 | 确认路径写的是工作区相对路径；必要时先 `ls` 验证产物位置 |
| 下载 job 报找不到制品 | `Error: Unable to find artifact 'build-output'` | 下载先于上传发生（未用 `needs` 建立依赖） | 下载 job 加 `needs: build` |
| 矩阵 job 制品互相覆盖/冲突 | v4 直接报错 | 所有矩阵组合共用同一命名空间，同名制品冲突 | 制品名带矩阵变量，如 `name: build-${{ matrix.os }}` |
| 跨工作流下载失败 | 提示权限不足或找不到 | 制品归属于来源运行，跨工作流需 `run-id` + `github-token` | 补全 `run-id` 与 `github-token` 参数 |
| 存储空间被占满 | `Artifact storage quota has been hit` | 每次运行都上传大制品 + 默认 90 天保留期过长 | 设置合理 `retention-days`、用 `if: failure()` 条件上传、压缩级别调优 |
| 升级 v3 → v4 后行为异常 | 同名覆盖变报错、下载行为变化 | v4 对命名冲突与下载做了更严格限制 | 按 v4 迁移指南调整：名称唯一或用 `overwrite: true`，显式指定 name |

## 8. 一句话记忆

**制品是 CI 的"快递驿站"：上传（upload-artifact）寄存、下载（download-artifact）取件、过期自动清退；同工作流靠名称取件，跨工作流要 run-id 加令牌。**
