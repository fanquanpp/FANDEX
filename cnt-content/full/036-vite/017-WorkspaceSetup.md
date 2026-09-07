---
order: 170
title: 工作空间配置
module: 'vite'
category: 前端技术
difficulty: beginner
description: pnpm workspace 配置：pnpm-workspace.yaml、packages 模式与安装命令
author: fanquanpp
updated: '2026-09-08'
related:
  - 'vite/016-PnpmCore'
  - 'vite/018-WorkspaceProtocol'
  - 'vite/019-CatalogManagement'
prerequisites:
  - 'vite/016-PnpmCore'
---


## 1. 从"一个家几个房间"说起

### 1.1 工作空间是什么

想象一栋房子（一个 Git 仓库），里面有多个房间（多个包/项目）。每个房间功能不同：客厅接待访客（Web 应用）、书房办公（后台管理）、储藏室放杂物（工具库）。

**工作空间（workspace）就是"把这栋房子统一管理起来"的机制**：水电（依赖）统一接入、公共区域（共享代码）共用、整体规划（统一版本）。

在 pnpm 中，工作空间是**多包管理能力**：在同一个仓库里管理多个相互独立的包，这些包共享一份 `pnpm-lock.yaml`，依赖统一安装、统一解析。它是 Monorepo 工程模式的基石。

### 1.2 没有 workspace 时的问题

没有 workspace 时，每个子项目各自 `npm install`：

- 会产生 N 份重复的 node_modules（磁盘浪费）
- 每个项目单独管理依赖版本（版本漂移）
- 项目之间无法直接引用本地代码（只能发版或复制）

有了 workspace，pnpm 一次 `pnpm install` 即可为全部包生成依赖，并通过符号链接让包之间互相引用（详见 004 篇）。

### 1.3 最小工作空间的三个文件

一个 pnpm workspace 至少包含：

| 文件 | 作用 |
| :--- | :--- |
| `pnpm-workspace.yaml` | 声明哪些目录是包 |
| 根 `package.json` | 公共脚本与元数据 |
| `pnpm-lock.yaml` | 由 pnpm 自动生成，锁定依赖树（**必须提交**） |

## 2. 动手：从零搭建一个 workspace

### 2.1 初始化

```bash
# 1. 创建项目目录并进入
mkdir my-monorepo && cd my-monorepo

# 2. 创建根 package.json（-w 表示 workspace root）
pnpm init -w
```

生成的根 `package.json` 长这样：

```json
{
  "name": "my-monorepo",
  "version": "1.0.0",
  "private": true
}
```

### 2.2 创建 pnpm-workspace.yaml

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'          # 所有应用：apps/web、apps/docs
  - 'packages/*'      # 所有共享库：packages/utils、packages/ui
  - 'tools/*'         # 工具链
  - '!apps/legacy'    # 感叹号排除不需要纳入的目录
```

### 2.3 创建两个包

```bash
# 创建应用目录
mkdir -p apps/web
cd apps/web
pnpm init        # 生成 web 的 package.json
cd ../..

# 创建共享库目录
mkdir -p packages/utils
cd packages/utils
pnpm init
cd ../..
```

### 2.4 安装全部依赖

```bash
# 回到根目录，一次安装所有包
cd my-monorepo
pnpm install
```

此时你会发现：

- 生成了 `pnpm-lock.yaml`（整个工作空间的依赖锁）
- 所有包的依赖被统一管理
- 各包可以通过 `workspace:*` 协议互相引用（见 004 篇）

## 3. pnpm-workspace.yaml 详解

### 3.1 packages 模式

`packages` 字段用 glob 模式声明工作空间包含哪些目录：

```yaml
packages:
  - 'apps/*'          # 所有应用：apps/web、apps/docs
  - 'packages/*'      # 所有共享库：packages/utils、packages/ui
  - 'tools/*'         # 工具链
  - '!apps/legacy'    # 感叹号排除不需要纳入的目录
```

**glob 模式规则**：

| 写法 | 含义 |
| :--- | :--- |
| `*` | 匹配一层目录（apps/web） |
| `**` | 递归匹配多层（packages/**） |
| `!` | 排除指定目录 |

每个匹配到的目录都必须包含一个 `package.json`，否则 pnpm 会报错（告诉你是哪个目录缺 package.json）。

### 3.2 FANDEX 风格示例

```yaml
packages:
  - 'app-*'           # FANDEX 风格：app-web、app-desktop 等前缀匹配
  - 'shd-shared'      # 单目录
  - 'shd-shared/*'
  - 'thd-third-party/*'
```

**注意**：`shd-shared` 与 `shd-shared/*` 同时出现，表示共享层自身的 package.json 及其子包都纳入工作空间——这样可以精确控制"哪些目录算包"。

## 4. 根 package.json 的职责

### 4.1 关键字段

```json
{
  "name": "fandex-monorepo",
  "private": true,
  "packageManager": "pnpm@11.0.0",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "build": "pnpm -r --topological build",
    "dev:web": "pnpm --filter @fandex/web dev"
  }
}
```

| 字段 | 作用 |
| :--- | :--- |
| `private: true` | 防止根包被误发布到 npm |
| `packageManager` | 配合 Corepack 固定 pnpm 版本，保证团队与 CI 使用同一版本 |
| `engines.node` | 声明 Node 最低版本 |
| `scripts` | 公共命令入口（新人只记根命令即可） |

### 4.2 根目录不要放业务依赖

根 package.json **只放工程级依赖**（构建、lint、类型检查等开发工具），业务依赖应归属到具体包。

**为什么**：根目录的依赖会暴露给所有包（提升），滥用会导致依赖职责混乱——"这个包到底依赖什么"变得说不清。好习惯：**根目录只放"整个仓库级"的工具，业务依赖进各自的包**。

## 5. 安装命令 pnpm install

### 5.1 首次安装与增量安装

```bash
pnpm install            # 安装所有包的依赖，生成/更新 pnpm-lock.yaml
pnpm install -w         # 给根包安装开发依赖（-w 表示 workspace root）
```

`-w`（--workspace-root）把依赖加到根 package.json；不带参数时 pnpm 会读取全部包的依赖一次性安装。

### 5.2 冻结安装（CI 必用）

```bash
# CI 或生产环境：严格按照 lockfile 安装，任何偏差直接报错
pnpm install --frozen-lockfile
```

`--frozen-lockfile` 不修改 pnpm-lock.yaml，若 lockfile 与 package.json 不一致则安装失败。

**为什么 CI 必须用**：保证团队与线上环境依赖完全一致，防止"本地能跑、CI 挂"的幽灵依赖问题（见 002 篇）。

### 5.3 pnpm-lock.yaml 必须入库

pnpm-lock.yaml 记录了整个工作空间解析后的**精确依赖树**，是"可复现安装"的唯一依据：

- 它应提交到 Git，**不要加入 .gitignore**
- 合并冲突时可运行 `pnpm install` 自动修复（lockfile 冲突通常可直接重新生成局部差异）

## 6. 常用脚本与过滤

### 6.1 递归执行：-r

```bash
pnpm -r build               # 对所有包执行 build
pnpm -r --topological build # 按依赖拓扑顺序：先依赖后应用
pnpm -r --parallel lint     # 并行执行互不依赖的 lint
```

| 选项 | 作用 |
| :--- | :--- |
| `-r` | 递归到所有包执行 |
| `--topological` | 按依赖拓扑排序（先构建被依赖的包） |
| `--parallel` | 忽略拓扑关系并行执行（适合 lint 等无依赖任务） |

**为什么需要 `--topological`**：如果应用先构建，而它依赖的共享库还没构建，应用就会因为找不到依赖产物而失败。拓扑排序保证"先依赖后应用"。

### 6.2 按包过滤：--filter / -F

```bash
pnpm -F @fandex/web dev          # 只运行 web 包的 dev
pnpm -F @fandex/utils add lodash # 给 utils 包添加依赖
pnpm -F @fandex/web --filter "…{@fandex/utils}…" test  # 连同依赖一起
```

**花括号过滤语法**：

| 写法 | 含义 |
| :--- | :--- |
| `@{包}…` | 该包及其所有依赖 |
| `…{包}` | 所有依赖该包的包 |
| `@{包}…{包2}` | 两个方向都包含 |

### 6.3 常用命令速查

| 命令 | 作用 |
| ---- | ---- |
| `pnpm -r build` | 所有包构建 |
| `pnpm -F <pkg> dev` | 单包开发 |
| `pnpm why <dep>` | 查看某个依赖的来源与版本 |
| `pnpm list -r` | 列出所有包及依赖 |
| `pnpm update` | 更新 lockfile 中的依赖版本 |
| `pnpm remove <dep> -F <pkg>` | 移除指定包依赖 |

## 7. 常见问题与陷阱

**陷阱一：目录没有 package.json。** pnpm 报"目录 X 在 workspace 中，但缺少 package.json"。→ 检查 pnpm-workspace.yaml 的 glob 是否匹配了不该匹配的目录。

**陷阱二：root 加依赖忘了 -w。** `pnpm add typescript`（在根目录）会把依赖加到某个包的 package.json 而不是根。→ 根目录加依赖必须 `pnpm add -w`。

**陷阱三：lockfile 冲突。** 多人同时改 package.json 导致 pnpm-lock.yaml 冲突。→ 不要手改 lockfile，直接运行 `pnpm install` 自动修复。

**陷阱四：`--frozen-lockfile` 报错。** CI 上报"lockfile 与 package.json 不一致"。→ 说明有人改了 package.json 没重新 install，本地先执行 `pnpm install` 提交新的 lockfile。

**陷阱五：glob 模式写错。** `apps/*` 只匹配一层，`apps/**` 匹配多层。→ 根据目录深度选择合适的写法。
