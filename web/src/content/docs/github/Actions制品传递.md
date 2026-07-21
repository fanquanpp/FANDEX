---
order: 104
title: Actions制品传递
module: github
category: toolchain
difficulty: intermediate
description: 'GitHub Actions制品（Artifacts）详解：跨Job传递构建产物、上传下载与生命周期管理。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/Actions缓存依赖
  - github/Actions自托管运行器
  - github/Actions环境部署
prerequisites:
  - github/GitHub概述
---

## 1. 制品概述

### 1.1 什么是制品

制品（Artifacts）是工作流运行过程中产生的文件，如构建产物、测试报告、日志等。制品允许在 Job 之间传递数据，或在工作流完成后下载查看。

```
Job A (构建)          Job B (测试)          Job C (部署)
  │                     │                     │
  ├── 编译代码          ├── 下载制品          ├── 下载制品
  ├── 上传制品 ──────→  ├── 运行测试          ├── 部署
  │                     ├── 上传报告 ──→      │
  │                     │                     │
```

### 1.2 制品限制

| 限制项             | 值                  |
| ------------------ | ------------------- |
| 单个制品大小       | 最大 2 GB（压缩后） |
| 单个工作流制品总数 | 最大 10 个          |
| 仓库总制品大小     | 最大 80 GB          |
| 保留时间           | 默认 90 天          |

## 2. actions/upload-artifact 与 download-artifact

### 2.1 上传制品

```yaml
- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: dist-files # 制品名称（在同一工作流中唯一）
    path: | # 要上传的路径
      dist/
      package.json
    retention-days: 5 # 保留天数（默认 90）
    compression-level: 6 # 压缩级别 0-9（默认 6）
    if-no-files-found: error # 无文件时的行为: error|warn|ignore
```

### 2.2 下载制品

```yaml
- name: Download build artifacts
  uses: actions/download-artifact@v4
  with:
    name: dist-files # 指定制品名称
    path: dist/ # 下载到指定目录
```

下载所有制品：

```yaml
- name: Download all artifacts
  uses: actions/download-artifact@v4
  # 不指定 name，下载所有制品
```

### 2.3 v4 版本变更

`actions/upload-artifact@v4` 和 `actions/download-artifact@v4` 的关键变更：

| 变更项       | v3           | v4                   |
| ------------ | ------------ | -------------------- |
| 制品名称冲突 | 自动覆盖     | 报错，必须唯一       |
| 跨工作流下载 | 默认可下载   | 需指定 `run-id`      |
| 上传合并     | 同名自动合并 | 不再自动合并         |
| 性能         | -            | 显著提升（增量上传） |

## 3. 跨 Job 传递

### 3.1 同工作流内传递

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  test:
    needs: build
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
      - run: npm run deploy
```

### 3.2 多制品传递

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          npm run build:web
          npm run build:mobile
      - uses: actions/upload-artifact@v4
        with:
          name: web-build
          path: dist/web/
      - uses: actions/upload-artifact@v4
        with:
          name: mobile-build
          path: dist/mobile/

  test-web:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: web-build

  test-mobile:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: mobile-build
```

### 3.3 矩阵构建中的制品

```yaml
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.os }} # 名称包含矩阵变量
          path: dist/
```

## 4. 跨工作流传递

### 4.1 使用 download-artifact 下载其他工作流的制品

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          run-id: ${{ github.event.workflow_run.id }} # 指定工作流运行 ID
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 4.2 使用 workflow_run 触发器

```yaml
# deploy.yml
on:
  workflow_run:
    workflows: ['Build']
    types: [completed]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          run-id: ${{ github.event.workflow_run.id }}
```

## 5. 典型应用场景

### 5.1 测试报告

```yaml
- name: Run tests
  run: npm test -- --reporter=json --output=test-results.json

- name: Upload test results
  if: always() # 即使测试失败也上传
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: test-results.json
    retention-days: 7
```

### 5.2 代码覆盖率

```yaml
- name: Generate coverage
  run: npm run coverage

- name: Upload coverage report
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
    retention-days: 14
```

### 5.3 构建产物分发

```yaml
- name: Build all platforms
  run: npm run build:all

- name: Upload Linux binary
  uses: actions/upload-artifact@v4
  with:
    name: app-linux
    path: dist/app-linux

- name: Upload macOS binary
  uses: actions/upload-artifact@v4
  with:
    name: app-macos
    path: dist/app-macos

- name: Upload Windows binary
  uses: actions/upload-artifact@v4
  with:
    name: app-windows
    path: dist/app-windows
```

### 5.4 调试快照

```yaml
- name: Upload debug snapshot
  if: failure() # 仅在失败时上传
  uses: actions/upload-artifact@v4
  with:
    name: debug-snapshot-${{ github.run_id }}
    path: |
      logs/
      screenshots/
      cypress/videos/
    retention-days: 3
```

## 6. 制品管理

### 6.1 清理策略

```yaml
# 设置短保留期以节省空间
- uses: actions/upload-artifact@v4
  with:
    name: temp-build
    path: dist/
    retention-days: 1 # 1 天后自动删除
```

### 6.2 手动删除

```bash
# 使用 GitHub CLI 删除制品
gh api repos/OWNER/REPO/actions/artifacts \
  --jq '.artifacts[] | select(.name == "temp-build") | .id' | \
  xargs -I {} gh api repos/OWNER/REPO/actions/artifacts/{} --method DELETE
```

### 6.3 制品大小优化

```yaml
# 排除不必要的文件
- uses: actions/upload-artifact@v4
  with:
    name: build
    path: |
      dist/
      !dist/**/*.map    # 排除 source map
    compression-level: 9 # 最高压缩
```
