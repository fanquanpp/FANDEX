---
order: 101
title: Actions矩阵构建
module: github
category: toolchain
difficulty: advanced
description: 'GitHub Actions矩阵策略详解：多操作系统、多版本、多配置的并行构建。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/Actions触发器
  - github/常见问题排查
  - github/Actions缓存依赖
  - github/Actions自托管运行器
prerequisites:
  - github/GitHub概述
---

## 1. 矩阵策略基础

### 1.1 基本概念

矩阵策略（Matrix Strategy）允许你通过变量组合创建多个并行 Job，一次配置即可在多种环境下测试。

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18, 20, 22]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
```

上述配置会生成 $3 \times 3 = 9$ 个并行 Job。

### 1.2 矩阵变量类型

| 类型   | 示例                          | 说明           |
| ------ | ----------------------------- | -------------- |
| 字符串 | `os: [ubuntu-latest]`         | 最常用         |
| 数字   | `node-version: [18, 20]`      | 自动转为字符串 |
| 布尔值 | `experimental: [true, false]` | 自动转为字符串 |
| 对象   | `include: [{...}]`            | 复杂配置       |

## 2. 矩阵组合

### 2.1 笛卡尔积

默认行为是所有变量的笛卡尔积：

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest] # 2 个值
    python: ['3.10', '3.11', '3.12'] # 3 个值
# 结果: 2 × 3 = 6 个 Job
```

### 2.2 include — 添加额外组合

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    python: ['3.11', '3.12']
    include:
      - os: macos-latest
        python: '3.12'
        experimental: true
      - os: ubuntu-latest
        python: '3.13-dev'
        experimental: true
# 基础: 2 × 2 = 4 + 2 = 6 个 Job
```

`include` 中的条目：

- 如果匹配已有组合，则**追加变量**
- 如果不匹配，则**新增一个 Job**

### 2.3 exclude — 排除组合

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    python: ['3.10', '3.11', '3.12']
    exclude:
      - os: windows-latest
        python: '3.10' # 不在 Windows + Python 3.10 上测试
      - os: ubuntu-latest
        python: '3.10' # 不在 Ubuntu + Python 3.10 上测试
# 结果: 6 - 2 = 4 个 Job
```

### 2.4 include 与 exclude 的执行顺序

```
1. 先计算笛卡尔积
2. 应用 exclude 排除组合
3. 应用 include 添加组合
```

## 3. 实战配置

### 3.1 多语言项目

```yaml
jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - language: typescript
            build: npm run build
            test: npm test
          - language: python
            build: pip install -e .
            test: pytest
          - language: go
            build: go build ./...
            test: go test ./...
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: ${{ matrix.build }}
      - name: Test
        run: ${{ matrix.test }}
```

### 3.2 浏览器兼容性测试

```yaml
jobs:
  e2e:
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
        shard: [1/4, 2/4, 3/4, 4/4]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx playwright test --project=${{ matrix.browser }} --shard=${{ matrix.shard }}
```

### 3.3 容器镜像构建

```yaml
jobs:
  docker:
    strategy:
      matrix:
        platform: [linux/amd64, linux/arm64]
    runs-on: ubuntu-latest
    steps:
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          platforms: ${{ matrix.platform }}
          push: true
          tags: myapp:latest-${{ matrix.platform == 'linux/amd64' && 'amd64' || 'arm64' }}
```

## 4. fail-fast 与并发控制

### 4.1 fail-fast

```yaml
strategy:
  fail-fast: true # 默认值，任一 Job 失败则取消其他 Job
  # fail-fast: false  # 所有 Job 都执行完毕
```

建议在 CI 场景设为 `false`，以便收集所有环境的失败信息。

### 4.2 max-parallel

```yaml
strategy:
  max-parallel: 4 # 最多同时运行 4 个 Job
  matrix:
    os: [ubuntu, macos, windows]
    node: [18, 20, 22]
# 9 个 Job，但最多 4 个并行
```

### 4.3 Job 级别并发

```yaml
concurrency:
  group: ci-${{ github.ref }}-${{ matrix.os }}-${{ matrix.node-version }}
  cancel-in-progress: true
```

## 5. 动态矩阵

### 5.1 使用 JSON 生成矩阵

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - id: set-matrix
        run: |
          echo "matrix={\"include\":$(ls packages/ | jq -R -s -c 'split("\n") | map(select(length > 0)) | map({"package": .})')}" >> $GITHUB_OUTPUT

  test:
    needs: setup
    strategy:
      matrix: ${{ fromJson(needs.setup.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - run: echo "Testing ${{ matrix.package }}"
```

### 5.2 基于文件变更的动态矩阵

```yaml
jobs:
  detect:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            auth: src/auth/**
            user: src/user/**
            order: src/order/**

  test:
    needs: detect
    if: needs.detect.outputs.services != '[]'
    strategy:
      matrix:
        service: ${{ fromJson(needs.detect.outputs.services) }}
    runs-on: ubuntu-latest
    steps:
      - run: npm test --workspace=src/${{ matrix.service }}
```

## 6. 矩阵中的条件逻辑

### 6.1 条件步骤

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - name: Linux only
        if: runner.os == 'Linux'
        run: sudo apt-get update

      - name: macOS only
        if: runner.os == 'macOS'
        run: brew update
```

### 6.2 环境变量差异化

```yaml
strategy:
  matrix:
    include:
      - os: ubuntu-latest
        env: { CC: gcc, CXX: g++ }
      - os: macos-latest
        env: { CC: clang, CXX: clang++ }
      - os: windows-latest
        env: { CC: cl, CXX: cl }
```

## 7. 最佳实践

### 7.1 矩阵规模控制

```
推荐矩阵大小: ≤ 20 个 Job
超过 20 个: 考虑拆分工作流或使用动态矩阵
超过 50 个: 必须使用动态矩阵 + 路径过滤
```

### 7.2 资源优化

```yaml
# 快速测试先跑，慢速测试后跑
jobs:
  quick-test:
    strategy:
      matrix:
        node: [22] # 仅最新版本
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  full-test:
    needs: quick-test # 快速测试通过后再跑完整矩阵
    strategy:
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, macos-latest, windows-latest]
```

### 7.3 调试技巧

```yaml
# 查看矩阵展开结果
- name: Debug matrix
  run: echo "${{ toJson(matrix) }}"
```
