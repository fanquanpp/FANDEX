---
order: 150
title: pnpm 与 Monorepo 工程化
module: 'vite'
category: 前端技术
difficulty: intermediate
description: pnpm 与 Monorepo 工程化：workspace、内容寻址存储、依赖隔离、catalog、任务编排与发布
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vite/010-ViteOverview'
  - 'devops/140-CICDPipeline'
prerequisites: []
---


> 本节为增量补充，帮助你选择 pnpm 版本。

- pnpm：11.x 为本仓库锁定的版本（11.15.1，要求 Node.js 22+），2026 年 pnpm 12 已成为最新稳定线；本篇与后续各篇介绍的 workspace、catalog、任务编排与发布用法在两个大版本间保持一致。
- 安装方式：`corepack enable pnpm` 或独立安装脚本；建议通过 packageManager 字段固定版本。
- Monorepo 场景：pnpm workspaces + Turborepo + Changesets 是当前企业主流组合。



## 1. 从"一个仓库装下所有项目"说起

### 1.1 多仓库的烦恼

想象一个公司有三个项目：Web 前端、后台管理系统、一套共享的 UI 组件库。最"自然"的做法是开三个 Git 仓库，各管各的：

```
repo-web/       # Web 前端
repo-admin/     # 后台管理
repo-ui/        # 共享 UI 组件库
```

刚开始一切正常。慢慢地，问题来了：

- 你在 UI 组件库里修了一个 bug，Web 和 Admin 都要用。于是你改完 UI 库 → 发版本 → 等 Web 升级依赖 → 再改 Admin——**一次改动，三套流程**。
- Web 和 Admin 各自声明了不同版本的 React，修一个样式要在两个项目里各改一遍。
- 新人入职想跑通整个产品，要 clone 三个仓库、装三份依赖、开三个终端——**"上手成本"高到劝退**。

### 1.2 Monorepo 的解法

**Monorepo（单仓库多包）**：把所有应用、共享库、工具链放进**同一个 Git 仓库**，用一个包管理器统一管理。

```
fandex-monorepo/
  apps/
    web/          # Web 前端
    admin/        # 后台管理
  packages/
    ui/           # 共享 UI 组件库
  pnpm-workspace.yaml
  package.json
```

Monorepo 带来的四个核心收益：

**收益一：原子提交。** 改 UI 库 + 升级 Web/Admin 的引用，可以**一次提交**完成。跨包的修改永远保持同步，不会出现"UI 库改了，引用它的项目还在用旧版"的撕裂状态。

**收益二：统一依赖。** 所有包共享一份 lockfile（`pnpm-lock.yaml`），React、TypeScript 的版本全仓库统一，杜绝"这个项目 React 18、那个项目 React 19"的漂移。

**收益三：代码复用无成本。** 共享包通过 `workspace:*` 协议直接引用本地源码（详见《workspace 协议与内部依赖》），改完立刻生效，**不需要发布到 npm 就能联调**。

**收益四：统一 CI。** 一次流水线就能构建/测试所有相关包，配合任务缓存（详见《Turborepo 任务编排》），CI 速度反而比多仓库更快。

### 1.3 代价是什么

Monorepo 不是银弹，它把"仓库管理"的复杂度转移到了"工具链管理"：

- 需要 workspace 管理（pnpm/yarn workspaces）
- 需要任务编排（turbo/nx），否则全量构建越来越慢
- 需要版本管理纪律（changesets），否则发版混乱

**所以**：2-3 个强关联项目用 Monorepo 非常合适；如果是几十个互不相关的项目硬塞进一个仓库，反而会互相拖累。**Monorepo 的核心是"它们确实需要一起演进"。**

### 1.4 为什么是 pnpm

Node 生态的包管理器有 npm、yarn、pnpm 三个主流选择。pnpm 之所以是 Monorepo 的事实标准，靠的是三套机制（详见《pnpm 核心特性》）：

| 机制 | 解决的问题 |
| :--- | :--- |
| 内容寻址存储 | 磁盘空间浪费（多项目重复安装） |
| 符号链接 node_modules | 幽灵依赖（项目用了没声明的包） |
| workspace 原生支持 | 多包统一管理（安装、过滤、拓扑） |

## 2. pnpm 的核心机制速览

### 2.1 内容寻址存储（Content-Addressable Store）

pnpm 把所有依赖包的内容存在一个**全局 store** 中，按内容哈希寻址。同一个版本的包，无论被多少项目引用，磁盘上只有一份；项目安装时通过**硬链接**把 store 中的文件链接到自己的 node_modules。

```bash
pnpm store path        # 查看全局 store 路径
pnpm store status      # 检查 store 与项目的链接状态
pnpm store prune       # 清理未被任何项目引用的孤儿包
```

### 2.2 严格依赖隔离

传统 npm 把依赖"扁平提升"到根 node_modules，导致项目可以 import **自己没有声明过的包**——这叫**幽灵依赖**。本地开发时"恰好能跑"，一旦某层依赖被移除或版本变化，干净环境（CI）突然报错，非常难排查。

pnpm 的 node_modules 是"符号链接 + 虚拟存储"结构：**只有 package.json 中显式声明的依赖对项目可见**，间接依赖藏在 `.pnpm` 深处，从结构上杜绝幽灵依赖。

```text
node_modules/
  .pnpm/              # 虚拟存储：所有真实包按版本存放
  my-app -> .pnpm/my-app@1.0.0/node_modules/my-app   # 直接依赖符号链接
```

### 2.3 workspace 协议

包之间通过 `workspace:*` 引用本地兄弟包：

```json
{
  "name": "@fandex/web",
  "dependencies": {
    "@fandex/utils": "workspace:*"
  }
}
```

开发时解析到**本地源码目录**（改完即生效），发布时自动替换为真实版本号（如 `1.2.3`）。这是 Monorepo 代码复用的"基础设施"。

## 3. 工程结构：一个真实 Monorepo 的样子

FANDEX 本身就是一个典型的 pnpm Monorepo：

```text
FANDEX/
  app-web/               # Web 应用（Astro + React）
  app-desktop/           # 桌面应用（Tauri + Expo）
  app-android/           # Android 应用（Expo）
  shd-shared/            # 共享层（tokens、utils、assets）
  tls-tools/             # 工具链（ID 分配、清单生成）
  thd-third-party/       # 第三方组件封装
  dcs-docs/              # 文档目录
  pnpm-workspace.yaml    # workspace 配置
  package.json
```

`pnpm-workspace.yaml` 声明哪些目录是"包"：

```yaml
packages:
  - 'app-*'
  - 'shd-shared'
  - 'shd-shared/*'
  - 'tls-tools'
  - 'thd-third-party/*'
```

**结构设计原则**：可部署的应用（app-*）与可复用的库（shd-shared、thd-third-party）分开；工具链单独（tls-tools）；glob 模式保证新增目录自动纳入管理。

## 4. catalog：依赖版本的"单一事实来源"

Monorepo 最头疼的问题之一是**版本漂移**：A 包用 `react@^18`，B 包用 `react@^19`。catalog 让版本定义集中到一处：

```yaml
# pnpm-workspace.yaml
catalog:
  react: ^19.0.0
  typescript: ^5.7.0
  vite: ^8.0.0
```

各包通过 `catalog:` 协议引用（详见《catalog 依赖目录管理》）：

```json
{
  "dependencies": {
    "react": "catalog:"
  }
}
```

升级版本只需改 `pnpm-workspace.yaml` 一处，全仓库同步。配合 `catalogMode: strict` 还能从工具层面**强制**所有包只能使用 catalog 中定义的版本。

## 5. 常用命令速查

```bash
pnpm install                     # 安装全部 workspace 依赖
pnpm install --frozen-lockfile   # CI：严格按 lockfile 安装
pnpm --filter @fandex/web dev    # 只操作指定包（-F 简写）
pnpm -r build                    # 递归构建所有包
pnpm -r --topological build      # 按依赖拓扑顺序构建（先依赖后应用）
pnpm -F @fandex/web add lodash   # 给指定包添加依赖
pnpm why react                   # 查看某个依赖的来源与版本
pnpm store prune                 # 清理全局 store 孤儿包
```

**三个最容易混淆的命令**：

| 命令 | 作用 | 什么时候用 |
| :--- | :--- | :--- |
| `pnpm -r <cmd>` | 对所有包执行 | 全量操作 |
| `pnpm -F <pkg> <cmd>` | 只对指定包执行 | 定向操作 |
| `pnpm -r --topological <cmd>` | 按依赖顺序执行 | 构建（先依赖后应用） |

## 6. 任务编排：pnpm 的边界与 turbo 的补位

### 6.1 pnpm 原生能力的边界

`pnpm -r --topological build` 能按依赖顺序构建，但它**不知道构建产物是什么、能不能复用**——每次改动都会全量重跑所有包的任务。包的数量超过 10 个后，CI 时间会线性膨胀。

### 6.2 Turborepo：缓存 + 依赖图编排

Turborepo 在 pnpm 之上增加两层能力（详见《Turborepo 任务编排》）：

- **任务依赖图**：`dependsOn: ["^build"]` 声明"先构建依赖包"
- **哈希缓存**：按输入文件内容计算指纹，未变更的包直接复用缓存（`FULL TURBO`）

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test":  { "dependsOn": ["build"], "outputs": [] }
  }
}
```

### 6.3 怎么选

- **小型 Monorepo（<10 包）**：pnpm 原生脚本足够，无需 turbo
- **中型以上（10+ 包）或 CI 变慢**：引入 Turborepo，收益明显
- 二者完全兼容：turbo 内部仍然调用各包的 package.json scripts

## 7. 版本管理与发布：changesets

Monorepo 发版和单仓库完全不同——改一个共享包可能牵动多个包。手工维护版本号极易出错：漏改依赖引用、CHANGELOG 缺失、版本冲突。

**Changesets**（详见《changesets 版本管理与发布》）把发版拆成两个环节：

1. **开发期**：每个 PR 附带一个"变更集文件"（记录改了哪个包、什么级别 major/minor/patch）
2. **发版期**：CI 统一计算各包新版本、生成 CHANGELOG、按拓扑顺序发布到 npm

```bash
pnpm changeset add        # 记录变更（交互式选择包与级别）
pnpm changeset version    # 更新版本号与 CHANGELOG
pnpm changeset publish    # 发布到 npm
```

**关键认知**：发版是"自动化的"而不是"手工的"。人的判断力应该花在"这次变更是什么级别"上，而不是"版本号改成几"上。

## 8. CI 最佳实践

Monorepo 的 CI 配置有几个关键点：

```yaml
# GitHub Actions 片段
steps:
  - uses: pnpm/action-setup@v4
    with:
      version: 11
  - uses: actions/setup-node@v4
    with:
      node-version: 22
      cache: pnpm          # 缓存 pnpm store，安装秒级
  - run: pnpm install --frozen-lockfile   # 严格按 lockfile
  - run: turbo run lint test build --affected  # 只构建变更相关
```

| 实践 | 为什么 |
| :--- | :--- |
| `--frozen-lockfile` | 保证 CI 与本地依赖完全一致，防止"本地能跑 CI 挂" |
| `cache: pnpm` | 缓存全局 store，安装从分钟级降到秒级 |
| `--affected` | 只跑变更涉及的包，未变更的命中 turbo 缓存 |
| pnpm 版本固定（action-setup） | 团队与 CI 使用同一 pnpm 版本，避免行为差异 |

## 9. 常见陷阱

**陷阱一：幽灵依赖。** 代码 import 了未声明的包，本地能跑、干净环境失败。→ 用 pnpm 的严格隔离，谁使用谁声明。

**陷阱二：构建顺序错误。** 应用先于依赖构建，找不到共享包产物。→ 用 `--topological` 或 turbo 的 `dependsOn: ["^build"]`。

**陷阱三：忽略 lockfile 提交。** 团队环境不一致，依赖解析结果不同。→ `pnpm-lock.yaml` 必须入库。

**陷阱四：版本漂移。** 各包直接写不同版本的同一依赖。→ 用 catalog + `catalogMode: strict`。

**陷阱五：循环依赖。** 包间互相引用，拓扑构建死循环。→ 重新设计分层，抽取共同依赖下沉。

**陷阱六：大仓库 CI 慢。** 全量任务重复跑。→ 用 turbo 缓存与 `--affected` 模式。

## 10. 小结

pnpm + Monorepo 是现代前端工程化的主流组合，它的价值可以浓缩成四句话：

1. **一个仓库管理所有包**（workspace）——原子提交、统一依赖、零成本复用
2. **底层机制保证正确**（内容寻址存储 + 严格隔离）——省磁盘、杜绝幽灵依赖
3. **catalog 统一版本**——版本漂移从工具层面被消灭
4. **turbo 加速 + changesets 自动化发版**——大规模仓库的 CI 保持在分钟级

**学习建议**：不要一次性掌握所有工具。先跑通"workspace + `workspace:*` + 基本命令"的最小闭环，再逐步引入 catalog → turbo → changesets。工程化是渐进式推进的（见 039-engineering-practices《工程实践概述》）。
