---
order: 390
title: Actions 矩阵构建
module: 'github'
category: 工具链
difficulty: advanced
description: GitHub Actions矩阵策略原理详解：从一次配置多环境测试的痛点出发，深入 strategy.matrix 语法、include/exclude、fail-fast 与动态矩阵。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'github/380-ActionsTrigger'
  - 'github/570-FAQTroubleshoot'
  - 'github/400-ActionsCacheDependency'
  - 'github/430-ActionsSelfHostedRunner'
prerequisites:
  - 'github/010-GitHubOverview'
---

## 0. 开始之前：一条"批量生产线"的故事

想象一家饮料厂。过去，工厂里每种口味（橙汁、苹果汁、葡萄汁）都要**单独建一条生产线**，工人重复做同样的事：灌装、贴标、装箱。三倍口味 = 三倍设备、三倍人力、三倍维护成本。

后来工厂引进了一条**柔性生产线**：一条线上有一个"配方参数面板"，工人在面板上切换 `口味: [橙汁, 苹果汁, 葡萄汁]`、`包装: [瓶装, 罐装]`，机器就自动按每种组合各产一批。一套设备，同时覆盖 3×2=6 种产品。参数一变，全线跟着变，再也不用复制三套产线。

GitHub Actions 的**矩阵构建（Matrix Strategy）** 正是这条"柔性生产线"：你只写**一个 job 定义**，声明若干"配方参数"（操作系统、语言版本、浏览器……），GitHub 自动按所有组合生成多个并行的 job 实例。配置一份，处处运行。

## 1. 矩阵构建要解决的问题：先看清痛点

### 1.1 没有矩阵时的痛苦

假设你要在 Node.js 18、20、22 三个版本上跑测试。没有矩阵，你只能**复制粘贴三份 job**：

```yaml
jobs:
  test-node20:                 # 第一份：Node 20
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: '20' }
      - run: npm test

  test-node22:                 # 第二份：Node 22（几乎一样的代码）
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: '22' }
      - run: npm test

  test-node24:                 # 第三份：Node 24
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: '24' }
      - run: npm test
```

问题一目了然：

- **改一处要改三处**：想加 `--reporter=json` 要同步改三个 job，极易漏改。
- **难以扩展**：想再加 macOS/Windows 两个系统？组合变 3×2=6 份，复制粘贴灾难升级。
- **可读性差**：一个工作流文件几百行，一半是重复代码。

### 1.2 矩阵的解法

```yaml
jobs:
  test:
    strategy:
      matrix:                  # 声明两个"维度"
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [20, 22, 24]   # 24 为最新 LTS；18 已于 2025 年停止维护
    runs-on: ${{ matrix.os }}              # 读取当前组合的 os
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}  # 读取当前组合的 node-version
      - run: npm test
```

一份定义，GitHub 自动生成 **3 × 3 = 9 个并行 job**，分别对应每种 (os, node-version) 组合。

## 2. 原理：一次配置，多种环境

### 2.1 笛卡尔积：矩阵的数学内核

矩阵的本质是**笛卡尔积**：把每个维度（变量）的所有取值两两组合。`os: [A, B]`、`node-version: [X, Y, Z]` 会生成 2×3=6 种组合：

```
{os: A, node-version: X}   {os: A, node-version: Y}   {os: A, node-version: Z}
{os: B, node-version: X}   {os: B, node-version: Y}   {os: B, node-version: Z}
```

GitHub 官方文档确认了这一行为：**对矩阵中定义的每个变量组合，工作流都会运行一个 job**。

### 2.2 matrix 上下文：每个 job 如何知道自己该用哪个值

每个矩阵 job 运行时，`matrix` 上下文里装着**当前组合的完整取值**。通过 `${{ matrix.<变量名> }}` 引用：

```yaml
- name: 打印当前组合
  run: echo "正在 ${{ matrix.os }} 上测试 Node ${{ matrix.node-version }}"
```

这就像生产线上的工人看一眼参数面板，就知道这一批该灌什么口味。

### 2.3 递进理解：从"复制"到"模板化"

| 阶段 | 做法 | 维护成本 |
| --- | --- | --- |
| 复制粘贴 | 每个环境写一个 job | 高，改一处要改 N 处 |
| 模板化 | 一个 job + 矩阵变量 | 低，改一处全线生效 |
| 动态矩阵 | 矩阵由前置 job 用 JSON 生成 | 极低，按需生成组合 |

## 3. 语法详解：strategy.matrix 全家桶

### 3.1 基础定义

```yaml
jobs:
  example:
    strategy:
      matrix:                  # 矩阵定义
        version: [10, 12, 14]  # 维度一：版本
        os: [ubuntu-latest, windows-latest]  # 维度二：系统
    runs-on: ${{ matrix.os }}
```

### 3.2 include：给矩阵"加料"

`include` 有两个作用（官方文档）：

- **给已有组合追加额外变量**：当 include 条目中的键值对与某个已有组合匹配时，只在该组合上追加新变量。
- **新增一个独立组合**：当 include 条目不匹配任何已有组合时，直接新增一个 job。

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node-version: [20, 22]
    include:
      # 场景一：匹配已有组合（ubuntu + node 20），追加 experimental 变量
      - os: ubuntu-latest
        node-version: 20
        experimental: true

      # 场景二：不匹配任何组合，新增一个独立 job（macos + node 22）
      - os: macos-latest
        node-version: 22
        experimental: true

      # 场景三：只写部分键，其余键取 include 条目中补充的默认值
      - node-version: 22
        os: ubuntu-latest
        flag: nightly
# 最终 job 数：基础 2×2=4 个 + include 新增 2 个 = 6 个
```

注意：`include` 条目匹配判断只针对**已存在的组合**（笛卡尔积 + 之前 include 新增的组合），这是新手最容易误解的点。

### 3.3 exclude：剔除不需要的组合

有些组合毫无意义（比如"Windows 上跑 Linux 专用脚本"）或已知不兼容，用 `exclude` 去掉：

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    python: ['3.10', '3.11', '3.12']
    exclude:
      # 不在 Windows 上测 Python 3.10
      - os: windows-latest
        python: '3.10'
      # 不在 Ubuntu 上测 Python 3.10
      - os: ubuntu-latest
        python: '3.10'
# 结果：2×3=6 个组合，剔除 2 个，剩 4 个 job
```

### 3.4 执行顺序（重要）

GitHub 处理矩阵的完整顺序：

```
1. 先计算所有维度的笛卡尔积，得到基础组合集合
2. 应用 include：为匹配的组合追加变量，或新增组合
3. 应用 exclude：从当前集合中剔除匹配的组合
```

官方文档特别说明：`exclude` 会剔除 include 之前或之后产生的组合，建议把"先 include 再 exclude"作为习惯，逻辑更清晰。

### 3.5 fail-fast 与 max-parallel：失败策略与并发闸门

```yaml
strategy:
  fail-fast: true     # 默认值：任一矩阵 job 失败，立即取消其余所有 job
  # fail-fast: false  # 所有组合都跑完，收集完整失败信息
  max-parallel: 4     # 最多同时运行 4 个矩阵 job
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    node: [18, 20, 22]
```

- **fail-fast: true**：某个组合一旦失败就"叫停全场"，省运行分钟数，适合发现根本性问题时快速止损。
- **fail-fast: false**：9 个 job 全部执行完毕，适合"想收集所有环境下的失败清单"的场景。CI 中常用 false。
- **max-parallel**：限制同时运行的 job 数，防止目标系统（如共享数据库）被并发打爆。

## 4. 实战配置示例

### 4.1 多操作系统 + 多版本测试（最典型）

```yaml
name: Test Matrix
on: [push, pull_request]
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false          # 收集所有环境的失败信息
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [20, 22, 24]   # 24 为最新 LTS；18 已于 2025 年停止维护
        exclude:                # Windows + Node 18 已知有问题，跳过
          - os: windows-latest
            node-version: 18
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
```

### 4.2 多语言多命令组合（include 充当"配置表"）

用 include 直接定义"每种语言的构建/测试命令"，一条 job 通吃多语言：

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
      - uses: actions/checkout@v6
      - name: Build
        run: ${{ matrix.build }}
      - name: Test
        run: ${{ matrix.test }}
```

### 4.3 浏览器测试分片（并发放大）

E2E 测试很慢，用矩阵把测试**分片**并行跑：

```yaml
jobs:
  e2e:
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
        shard: [1/4, 2/4, 3/4, 4/4]     # 4 个分片
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: npx playwright test --project=${{ matrix.browser }} --shard=${{ matrix.shard }}
```

### 4.4 容器多架构构建

```yaml
jobs:
  docker:
    strategy:
      matrix:
        platform: [linux/amd64, linux/arm64]
    runs-on: ubuntu-latest
    steps:
      - uses: docker/setup-qemu-action@v3   # 模拟其他 CPU 架构
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          platforms: ${{ matrix.platform }}
          push: true
          tags: myapp:latest-${{ matrix.platform }}
```

## 5. 动态矩阵：让矩阵自己长出来

静态矩阵在组合数量固定时很好用；但组合数量不确定（比如 monorepo 里包越来越多）时，可以用**动态矩阵**：先跑一个"探测 job"，把矩阵 JSON 输出，再让下游 job 用 `fromJSON` 消费它。

### 5.1 基于目录列表生成矩阵

```yaml
jobs:
  setup:                              # 探测 job：读取 packages/ 下的包名
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}   # 输出 JSON 给下游
    steps:
      - id: set-matrix
        run: |
          echo "matrix={\"include\":$(ls packages/ | jq -R -s -c 'split("\n") | map(select(length > 0)) | map({"package": .})')}" >> $GITHUB_OUTPUT

  test:                               # 消费 job：按 JSON 生成矩阵
    needs: setup
    strategy:
      matrix: ${{ fromJson(needs.setup.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - run: echo "Testing package ${{ matrix.package }}"
```

### 5.2 基于文件变更生成矩阵

配合 `dorny/paths-filter`，只有被改动的模块才进入测试矩阵，省下大量分钟数：

```yaml
jobs:
  detect:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v6
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

### 5.3 调试技巧：查看矩阵展开结果

在 step 里把矩阵 JSON 打印出来，一目了然：

```yaml
- name: Debug matrix
  run: echo "${{ toJson(matrix) }}"
```

## 6. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| include 条目没生效 | 期望新增的 job 不存在 | include 条目恰好匹配了某个已有组合，只追加了变量而未新增 job | 检查匹配逻辑；想让 include 条目不匹配现有组合，可用不同的变量值 |
| exclude 顺序理解错误 | 被排除的组合仍在运行 | exclude 放在 include 之前或组合规则混乱 | 记住顺序：笛卡尔积 → include → exclude |
| 矩阵组合数爆炸 | 一次运行几十上百个 job，分钟数耗尽 | 多维变量全排列组合过大 | 控制矩阵规模（建议不超过 20 个 job），用 exclude 剔除无意义组合，或改用动态矩阵 |
| Windows 上跑 Linux 命令失败 | `Command not found` | 没按系统区分命令 | 用 `if: runner.os == 'Windows'` 等条件分支，或使用跨平台写法 |
| fail-fast 导致信息丢失 | 第一个失败后其余 job 全被取消 | fail-fast 默认为 true | CI 场景显式设置 `fail-fast: false` |
| 在 `runs-on` 中引用错误变量名 | job 无法启动 | `${{ matrix.os }}` 与矩阵定义中变量名不一致 | 核对矩阵变量名与引用处拼写一致 |

## 8. 一句话记忆

**矩阵 = 一条柔性生产线：一份 job 定义 + 多个维度变量，GitHub 按笛卡尔积自动生成并行的多环境 job，include 加料、exclude 减料、fail-fast 控止损。**
