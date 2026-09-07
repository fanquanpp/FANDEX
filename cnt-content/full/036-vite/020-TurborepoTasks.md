---
order: 200
title: Turborepo 任务编排
module: 'vite'
category: 前端技术
difficulty: intermediate
description: Turborepo 任务编排：turbo.json、tasks 配置、dependsOn 依赖与缓存机制
author: fanquanpp
updated: '2026-09-08'
related:
  - 'vite/017-WorkspaceSetup'
  - 'vite/022-MonorepoPractice'
prerequisites:
  - 'vite/017-WorkspaceSetup'
  - 'vite/016-PnpmCore'
---


## 1. 从"流水线工人"说起

### 1.1 一个工厂的困境

想象一个汽车工厂有多个车间（包）：发动机车间、车身车间、总装车间。总装依赖发动机和车身。

**没有智能调度时**：每次生产，所有车间都从头干一遍——哪怕发动机这个月根本没改过，也要重新生产一次。订单越多，等待越久，成本越高。

**pnpm 的 `-r --topological build` 就像"知道先总装后发动机的顺序"**：它能按依赖顺序构建，但不知道"发动机没改过、不用重新生产"——每次改动都会全量重跑所有包的任务。

**Turborepo 就是在 pnpm 之上加了"智能调度"**：

1. 知道任务的依赖关系（先发动机再总装）
2. 知道哪些车间"没改过、可以直接用上次的成品"（缓存）

### 1.2 为什么需要任务编排

随着包数量增长，CI 时间线性膨胀。pnpm 只管"安装依赖、按拓扑跑脚本"，**不知道构建产物是什么、是否可以被复用**。Turborepo 接管"跑什么、先跑谁、能否跳过"的决策，pnpm 仍负责依赖安装，二者分工互补。

## 2. 安装与初始化

```bash
pnpm add -D turbo -w
npx turbo init
```

**要点**：

- turbo 作为根包的 devDependencies 安装（`-w` 写到根 package.json）
- `turbo init` 生成最小化的 turbo.json

## 3. tasks 配置

turbo.json 中的 `tasks` 字段（Turbo 2.x 语法，旧版为 pipeline）声明每个任务的行为：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**字段解读**：

| 字段 | 含义 | 示例 |
| :--- | :--- | :--- |
| `dependsOn` | 该任务依赖的其他任务 | `["^build"]` 先构建依赖包 |
| `outputs` | 任务产生的文件（用于缓存恢复） | `["dist/**"]` |
| `cache` | 是否缓存（dev 长驻进程不缓存） | `false` |
| `persistent` | 标记为不退出任务（长驻） | `true` |

### 3.1 dependsOn 规则

| 写法 | 含义 |
| ---- | ---- |
| `dependsOn: []` | 无依赖，可并行 |
| `dependsOn: ["^build"]` | 先执行所有被依赖包（依赖我的）的 build |
| `dependsOn: ["build"]` | 先执行本包自己的 build |
| `dependsOn: ["^build", "lint"]` | 组合：先依赖包 build，再本包 lint |

**`^` 前缀的含义**：`^build` 中的 `^` 代表"依赖关系方向"——"所有依赖我的包的 build"（即我的上游依赖先构建）。

## 4. 缓存机制

### 4.1 本地缓存

turbo 以"任务输入指纹"决定是否命中缓存：**指纹包括源码文件内容、依赖版本、环境变量、turbo.json 配置等**。命中时直接从缓存目录恢复 `outputs` 声明的内容，跳过执行：

```bash
turbo run build         # 未变更的包显示 FULL TURBO，毫秒级完成
turbo run build --force # 强制全部重跑，忽略缓存
```

**直观体验**：第二次运行同一任务时，未改动的包直接命中缓存（输出 `FULL TURBO`），只有真正变更的包才执行——CI 提速可达数量级。

### 4.2 远程缓存

远程缓存把缓存产物上传到共享存储（Vercel Remote Caching、自建服务或任意支持该协议的对象存储），让 CI 与本地共享缓存：

```bash
turbo login            # 登录 Vercel 账号
turbo link             # 关联远程缓存
```

**价值**：团队每个成员的本地缓存互不共享；远程缓存让"CI 构建过的包，本地直接复用"成为可能。注意：远程缓存仅缓存构建产物，不涉及源码上传。

### 4.3 inputs 精确控制

```json
{
  "tasks": {
    "build": {
      "inputs": ["src/**", "tsconfig.json", "package.json"],
      "outputs": ["dist/**"]
    }
  }
}
```

**要点**：`inputs` 限定参与指纹计算的路径——例如 README 改动不影响 build 指纹。精确的 inputs 能提高缓存命中率，避免无效重跑。

## 5. 常用命令

```bash
turbo run build            # 运行所有包的 build（等效 turbo build）
turbo build test lint      # 一次运行多个任务
turbo run build --filter=@fandex/web   # 只跑指定包及其依赖的任务
turbo run build --affected # 只跑相对 base 分支有变更的包
turbo run dev --parallel   # 并行启动多个 dev 进程
turbo run build --dry      # 预览执行计划，不真正执行
```

**重点命令**：

- `--affected`：结合 Git 比较（默认 `--base` 指向 main）圈定变更范围，是 CI 按变更集构建的核心
- `--dry`：打印计划图，便于调试依赖关系

## 6. 与 pnpm 原生能力对比

| 能力 | pnpm -r | Turborepo |
| ---- | ---- | ---- |
| 依赖拓扑排序 | 支持 | 支持且更细粒度 |
| 任务缓存 | 无 | 本地 + 远程 |
| 并行调度 | 支持 | 支持 |
| 增量构建 | 无 | 缓存跳过 |
| 产物声明 | 无 | outputs |

**选择建议**：

- **小型 Monorepo（<10 包）**：pnpm 原生脚本足够，无需 turbo
- **超过 10 个包或 CI 变慢**：引入 Turborepo，收益明显
- 二者完全兼容：turbo 内部仍调用各包的 package.json scripts

## 7. 常见误区

**误区一：turbo 是 pnpm 的替代品。** → turbo 不管理依赖（那是 pnpm 的活），它只做"任务编排与缓存"，二者互补。

**误区二：缓存会导致"用了旧代码"。** → turbo 的指纹包含源码内容哈希，源码变了指纹就变、缓存自动失效。缓存只在"输入完全一致"时命中。

**误区三：`outputs` 可以不写。** → 不声明 outputs，缓存就无法恢复产物，turbo 只能"跳过执行但无法恢复文件"——缓存效果大打折扣。构建任务必须声明 outputs。

**误区四：dev 任务也应该缓存。** → dev 是长驻进程（persistent），不产生可复用产物，`cache: false` 是正确配置。
