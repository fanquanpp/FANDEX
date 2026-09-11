---
order: 380
title: React 与 Monorepo
module: 'react'
category: 前端技术
difficulty: advanced
description: 'React Monorepo 实战：pnpm workspaces 依赖机制、workspace/catalog 协议、Turborepo 任务编排与缓存、React 单例与共享组件库打包、常见陷阱与选型建议'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/360-ReactStorybook'
  - 'react/370-ReactCICD'
  - 'react/460-ReactViteToolchainCommand'
  - 'react/400-ServerClientComponents'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

Monorepo 就是把**多个相关的包（应用、组件库、工具库）放进同一个仓库**统一管理，用工作区（workspace）机制让它们互相引用源码或本地包。类比"中央厨房 + 连锁门店"：共享配方（组件库、类型、工具函数）集中在一处维护与测试，各家门店（Web 应用、文档站、小程序端）按需取用，配方一改全部门店同步升级。与之相对的 Polyrepo 是"每家门店自建厨房"——仓库边界清晰，但配方一旦复制就各自漂移。

React 生态是 Monorepo 的重度用户：你安装的 `react`、`@tanstack/react-query`、`vite` 本身都开发于 Monorepo。业务侧引入它的典型动机有三类：

| 动机 | 典型形态 |
| :--- | :--- |
| 设计系统 | 一个 `ui` 包 + 多个消费它的应用，Storybook 与文档站同仓（见[React 与 Storybook](/react/360-ReactStorybook)） |
| 全栈 TypeScript | 前端应用与服务端共享类型、常量、校验逻辑 |
| 多端产品 | 官网、管理后台、移动端壳共享鉴权与请求层 |

反过来说，单人小项目或"几个应用毫无共享代码"的团队，引入 Monorepo 只会平添构建编排的复杂度——它解决的是**共享与一致性问题**，不是速度问题。

## 2. 核心机制：pnpm workspaces 如何接住互相引用

Monorepo 的地基是包管理器的 workspace 能力，当前事实标准是 **pnpm**（速度快、磁盘省、依赖隔离最严格）。它与 npm/yarn 的根本差异在 `node_modules` 的组织方式：

```text
npm/yarn（hoisting 提升模式）          pnpm（符号链接 + 严格隔离）
node_modules/                          node_modules/
  react          <- 被提升到顶层          .pnpm/           <- 真实文件集中存放
  lodash         <- 谁都能直接 import     react -> .pnpm/...  <- 只链接声明过的依赖
  A/                                       A -> .pnpm/...
    node_modules/                        # A 没声明 lodash 就 import 不到
      lodash   <- 幽灵依赖的温床
```

两件事由这个结构直接决定：

- **幽灵依赖在 pnpm 下天然消失**：代码只能 import 自己 `package.json` 里声明过的依赖。从 npm/yarn 仓库迁移到 pnpm 后突然冒出一堆 "Module not found"，报的都是被提升机制掩盖多年的真实问题。
- **`workspace:` 协议让包互相引用**：`"ui": "workspace:*"` 表示"用本仓库内的那个包"，发布时由 pnpm 自动替换成真实版本号。

再配两个关键配置就是完整地基：

```yaml
# pnpm-workspace.yaml（仓库根目录）：声明哪些目录是包
packages:
  - 'apps/*'    # 应用：web、admin、docs
  - 'packages/*' # 共享包：ui、utils、tsconfig
```

```yaml
# pnpm 9.5 起支持 catalog：全仓统一第三方依赖版本
catalog:
  react: ^19.2.0
  react-dom: ^19.2.0
  vite: ^7.0.0
```

各包的 `package.json` 里写 `"react": "catalog:"` 即可引用统一版本——多应用项目最常见的"同一个库出现三个版本"就此根治。

## 3. 完整示例：组件库 + Web 应用的最小 Monorepo

下面是一个可直接落地的最小结构：`packages/ui` 是共享组件库，`apps/web` 是消费它的 Vite + React 应用，Turborepo 负责按依赖图编排构建与缓存。

### 3.1 目录结构

```text
my-repo/
  pnpm-workspace.yaml      # 第 2 节的 workspace 声明
  turbo.json               # Turborepo 任务编排
  package.json             # 根包：只放 devDeps 与统一脚本
  apps/
    web/                   # Vite + React 应用
  packages/
    ui/                    # 共享组件库
```

### 3.2 共享包：packages/ui

```jsonc
// packages/ui/package.json
{
  "name": "@acme/ui",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js" // ESM 入口
    }
  },
  "scripts": { "build": "tsc -p tsconfig.build.json" },
  "peerDependencies": {
    // 关键：React 声明为 peer 而非 dependencies，
    // 保证全仓只有应用注入的那一份 React 实例
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "dependencies": {
    // 库自己的依赖（不依赖 React 的）才放这里
    "clsx": "catalog:"
  }
}
```

```tsx
// packages/ui/src/index.tsx
import { clsx } from 'clsx';

// 共享按钮：应援色主题作为可配置主题色的示例
export function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className={clsx('inline-block px-2 py-0.5 text-sm')}
      style={{ borderLeft: `4px solid ${color}` }} // 直角小圆角由全局样式统一
    >
      {children}
    </span>
  );
}
```

### 3.3 应用：apps/web

```jsonc
// apps/web/package.json（节选）
{
  "name": "web",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@acme/ui": "workspace:*", // 指向本仓库的 ui 包
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

```tsx
// apps/web/src/App.tsx：消费共享组件
import { Badge } from '@acme/ui';

export default function App() {
  return <Badge color="#7C6BFF">初音应援色</Badge>;
}
```

开发期通常不希望"改一行 ui 就要先全量构建它"——让 Vite 直接把源码编进应用即可（在 `apps/web/vite.config.ts` 中）：

```ts
// vite.config.ts：ui 包开发期走源码，跳过它的构建产物
export default defineConfig({
  resolve: {
    alias: { '@acme/ui': path.resolve(__dirname, '../../packages/ui/src/index.tsx') },
  },
});
```

### 3.4 编排：turbo.json（Turborepo 2.x 格式）

```jsonc
{
  "tasks": {
    "build": {
      // "^build"：先构建它的直接依赖包（ui 的 build 先于 web 的 build）
      "dependsOn": ["^build"],
      // 缓存产物；漏写这个字段该任务就不会缓存
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"], // 测试前保证依赖包已构建
      "outputs": []
    },
    "dev": {
      "cache": false, // 长驻进程不缓存
      "persistent": true
    }
  }
}
```

运行与预期行为：

```bash
pnpm install                # 根目录一次安装所有包的依赖
turbo run build             # 按依赖图排序：先 packages/ui 后 apps/web
turbo run build --filter=web # 只构建 web 及其依赖
turbo run dev               # 并行启动所有应用的 dev server
```

首次 `turbo run build` 真实执行；改一行 `apps/web` 代码后再跑，Turborepo 对 `web` 直接命中缓存（日志显示 `FULL TURBO`，秒级完成），而 `ui` 因输入变化会重跑——这就是"只做必要的事"的增量构建。

## 4. Turborepo 缓存的工作原理

Turborepo 把每个任务抽象成纯函数：**输入（源码哈希 + 环境变量 + 依赖产物）决定输出（声明的 outputs 目录）**。执行前计算哈希，本地或远程缓存里命中就直接回放日志、还原产物。推论有三条：

1. **没声明的输入不参与哈希**：构建中读了 `process.env.API_URL` 却没在 `inputs`/`env` 里声明，换值也不会重跑——"缓存返回了旧环境的结果"的怪象多源于此。
2. **没声明的输出不会被缓存**：忘了 `outputs: ["dist/**"]`，任务照跑但产物不存，缓存永远只有"跳过计算"没有"还原文件"。
3. **远程缓存把 CI 也提速**：团队共享一个缓存服务（Vercel Remote Cache 或自托管），同事构建过的结果你在本地与 CI 都能命中；与 CI 流水线的结合方式见[React 与 CI/CD](/react/370-ReactCICD)。

## 5. 工具选型速写

| 工具 | 定位 | 适合 |
| :--- | :--- | :--- |
| pnpm workspaces | 依赖管理地基（必有） | 所有 Monorepo |
| Turborepo | 构建编排 + 缓存，零侵入（各包脚本不变） | 已有构建脚本的仓库，上手最快 |
| Nx | 编排 + 代码生成 + 依赖图分析 + 插件体系 | 大型仓库、需要强约束与生成器 |
| Lerna | 老牌发布工具，2023 年起由 Nx 团队接管维护 | 以"npm 发版"为核心诉求的旧仓库 |

主流新仓库的默认组合是 **pnpm + Turborepo**：前者管依赖，后者管"按依赖图跑任务与缓存"，职责清晰。Nx 功能更全但约定更多；两者都支持远程缓存。若仓库只做"npm 包发布编排"，Lerna 仍有存量价值，但新项目很少作为首选。

## 6. 常见陷阱

- **双 React 实例（最高频翻车）**：症状是 "Invalid hook call. Hooks can only be called inside the body of a function component"。根因几乎都是共享包把 `react` 写进了 `dependencies`（或应用锁死了不同大版本），导致打包产物里出现两份 React。修法：库包一律 `peerDependencies`，应用是唯一提供者；用 `pnpm why react` 排查多版本。
- **幽灵依赖**：代码 import 了没声明的包，npm/yarn 下侥幸能跑，pnpm 下直接报错。把报错当作"补声明清单"的机会，而不是降级回 npm 的理由。
- **循环依赖**：`packages/a` 引用 `packages/b`，`b` 又引用 `a`。workspace 下依赖图有环会让构建排序与缓存失效；把公共部分下沉为第三个包 `packages/shared`。
- **库包改了，应用却不重构建**：`apps/web` 的 build 任务没声明 `dependsOn: ["^build"]`，或 ui 包直接发布源码而应用没配 `include`/alias 覆盖——任务图与真实依赖不一致，缓存与排序全部失真。
- **catalog 与 peer 范围漂移**：catalog 统一的是"安装版本"，peerDependencies 的范围声明是给"消费者"的契约，两者要一起更新（React 19.2 发布时三处都要动）。
- **pnpm 10 的生命周期脚本白名单**：pnpm 10 起默认不执行依赖包的 `postinstall` 等脚本（安全考量），`esbuild` 等需要脚本配合的包要在根 `package.json` 的 `pnpm.onlyBuiltDependencies` 里显式放行，否则构建工具行为异常。
- **tsconfig 各自为政**：推荐根目录放 `packages/tsconfig` 基础配置，各包 `extends` 它；跨包类型引用交给包的 `types` 导出，不要用手写 `paths` 映射硬连。
- **把 Monorepo 当银弹**：仓库越大首次迁移成本越高（依赖声明补全、脚本对齐、CI 改造）。渐进路线是先把共享最多的两个包迁进来，跑通缓存与发布，再逐步收拢。

## 7. 小结

初学者要点：

- Monorepo = 一个仓库管多个包，pnpm workspaces 是地基：`workspace:` 协议互相引用，严格 `node_modules` 杜绝幽灵依赖。
- 共享 React 组件库的三要素：`peerDependencies` 声明 React、`exports` 定义入口、应用端保证单例。
- 新项目默认组合 pnpm + Turborepo；`turbo run build` 自动按依赖图排序并缓存，改谁就重跑谁的链路。

进阶注意：

- 缓存正确性取决于"输入与输出的声明完整性"：环境变量、动态读取的文件都要显式进 `inputs`/`env`，产物目录必须写进 `outputs`。
- catalog（pnpm 9.5+）治版本漂移，`pnpm why <pkg>` 治多实例；两者是排查"改了没生效/报 Invalid hook call"的第一站。
- 与微前端（运行时集成多个独立仓库的产物，见[React 与微前端](/react/310-ReactMicroFrontend)）解决的是不同层面的问题：Monorepo 管"开发期的共享与一致"，微前端管"运行期的组装与隔离"，不要混为一谈。

## 速查

**workspace 基础**

```bash
pnpm init && pnpm install              # 根目录初始化并安装全部包依赖
pnpm add react --filter web            # 只给 web 包添加依赖
pnpm -r run build                      # 递归执行所有包的 build（无缓存）
turbo run build --filter=web...        # 构建 web 及其全部依赖（...后缀）
turbo run build --filter=...web        # 构建 web 及依赖它的包（前缀...）
```

```jsonc
// 包间引用（packages/ui 的 package.json）
"dependencies": { "@acme/utils": "workspace:*" }, // 本地包
"peerDependencies": { "react": "^19.0.0" }        // 宿主提供
```

**catalog 统一版本（pnpm 9.5+）**

```yaml
# pnpm-workspace.yaml
catalog:
  react: ^19.2.0
  typescript: ^5.9.0
```

```jsonc
// 任意 package.json
"dependencies": { "react": "catalog:" }
```

**turbo.json 任务模板**

```jsonc
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "lint": {},                       // 无依赖、无产物
    "dev": { "cache": false, "persistent": true }
  }
}
```

**双 React 排查**

```bash
pnpm why react        # 谁引入了哪几个版本
pnpm dedupe           # 尝试收敛重复依赖
```
