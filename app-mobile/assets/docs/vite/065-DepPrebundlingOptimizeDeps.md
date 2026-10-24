---
order: 70
title: 依赖预构建与 optimizeDeps
module: 'vite'
category: 前端技术
difficulty: beginner
description: Vite 预构建的机制层：CJS 到 ESM 的转换、缓存失效链、optimizeDeps include/exclude 调优与 monorepo symlink 故障排查
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Vite 依赖预构建（dep pre-bundling）与 `optimizeDeps` 配置，对应 vite.dev 的「Guide: Dep Pre-Bundling」与「Config: optimizeDeps」章节。
- **解决什么问题**：`pnpm dev` 启动时终端那句 `Pre-bundling dependencies...` 背后发生的事；以及它出错时的两类经典现场——`does not provide an export named 'xxx'`（CJS 互操作失败）与 monorepo 里的 React 双实例 `Invalid hook call`。这两类报错的根因都在预构建层，不了解机制就只能盲改。
- **什么时候用到**：引入一个老的 CommonJS 依赖；monorepo 里引用工作区内部包；预构建反复触发拖慢启动；第三方包同时被「预构建产物」和「源码直连」两个路径加载导致的状态错乱。
- **本篇不讲**：生产构建的代码分割（见 [生产构建与拆包](/vite/080-BuildSplit)）；dev server 与代理（见 [开发服务器与代理](/vite/070-DevServerAndProxy)）。

预计 30 到 45 分钟。

## 1. 预构建解决的两个问题

Vite 开发环境不打包业务代码，但**必须打包依赖**。预构建（pre-bundling）在 dev server 启动时把 `node_modules` 里的依赖提前处理一遍，解决两个独立的问题：

**问题一：格式转换。** 很多老依赖只发布 CommonJS（`module.exports = ...`），而浏览器只认 ESM（`export ...`）。不转换，浏览器加载时就报语法/导出错误。预构建把 CJS/UMD 转成 ESM，这就是「为什么 React 能直接 `import` 进来」的底层原因。

**问题二：请求数爆炸。** 一个纯 ESM 依赖可能由几百个小文件组成（如 lodash-es 的每个函数一个文件）。Vite 开发环境按需加载，浏览器要为每个小文件发一个请求——几百个请求直接把首屏拖死。预构建把整个依赖打包成单个文件，请求数从几百降到一。

```text
预构建前：
  import _ from 'lodash-es'
    -> 浏览器解析 ESM，递归请求 600+ 个小模块文件

预构建后：
  import _ from 'lodash-es'
    -> 请求 1 个文件：node_modules/.vite/deps/lodash-es.js
```

执行者在 Vite 8 中是 Rolldown（Vite 自研的 Rust 打包器），Vite 7 及以前是 esbuild——两者都是「比生产构建器快一个量级」的工具，因为预构建发生在每次冷启动，速度是第一要求。

## 2. 缓存失效链：什么时候会重新预构建

预构建结果缓存在 `node_modules/.vite/deps`。命中缓存时启动秒开；缓存失效时重新预构建，大依赖的项目会明显卡一下。Vite 按以下链条判断缓存是否可用：

| 判定输入 | 说明 |
| --- | --- |
| 锁文件哈希 | `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` 的内容哈希——装了新包、改了版本就会失效 |
| `patches/` 目录 | 打补丁的文件变化会失效（配合 `patchedDependencies`） |
| 相关配置字段 | `vite.config` 中影响预构建的字段（`optimizeDeps` 各项、相关 resolve 配置）变化会失效 |
| `NODE_ENV` | 切换 development/production 会失效 |

工程推论：

- 「改了锁文件 -> 重装依赖 -> 启动变慢」是正常现象，不是 Vite 坏了；
- 团队协作中每位成员的 `.vite` 缓存独立，首次拉代码启动慢一次属预期；
- 强制重新预构建：`vite --force`（或删 `node_modules/.vite`）。排查「预构建疑似有脏缓存」时这是第一动作；
- CI 中可用 `--frozen-lockfile` 保证锁文件判定稳定，避免每次 CI 都重新预构建。

## 3. optimizeDeps.include / exclude / interopDefault

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: ['esm-dep > deep-entry'], // 强制预构建：Vite 扫描发现不了的依赖
    exclude: ['my-linked-package'],    // 豁免预构建：保持源码直连
    interopDefault: true,              // CJS 默认导出互操作（默认 true）
  },
})
```

**include：把扫描发现不了的依赖提前拉进预构建。** 典型场景是动态 import——`import('./locales/' + name + '.json')` 这类运行时拼接的路径，Vite 启动时的静态扫描看不到，等浏览器运行时请求到才触发「发现新依赖 -> 二次预构建 -> 页面重新加载」。把已知的动态依赖写进 include，启动时一次备齐，避免开发中途的二次预构建打断。

**exclude：把某个依赖留在预构建体系之外。** 典型场景是 monorepo 里 symlink 进来的工作区包：它本身是源码（会随你的修改热更新），预构建反而会把它「冻结」成快照，改了不生效。exclude 后 Vite 保持对源文件的直接引用。

**interopDefault：CJS 的 default 形状之争。** CJS 模块没有真正的 default 导出，`module.exports = fn` 转成 ESM 后，`fn` 应该出现在 default 还是命名空间上取决于互操作策略。`interopDefault: true`（默认）会把 CJS 的导出同时映射到 default 与命名导出，兼容 `import x from` 与 `import { y } from` 两种写法。排查 `does not provide an export named` 类报错时，先确认该值未被手动改成 false。

## 4. 工程场景：两类经典报错的完整排查实录

### 场景一：`does not provide an export named 'default'`

真实背景：老项目引入一个 2019 年的 CJS 日期库 `old-date-util`，保存后浏览器报错：

```text
Uncaught SyntaxError: The requested module '/node_modules/.vite/deps/old-date-util.js?v=xxx'
does not provide an export named 'default'
```

排查实录（按序执行）：

1. **确认依赖格式**：打开包的 `package.json`，无 `exports`/`module` 字段、`main` 指向 CJS——确认是 CJS 包，理论上预构建应该转换它；
2. **查 exclude**：全局搜索 `vite.config` 里是否有人为兼容另一个问题把它 exclude 了——正是本例根因：exclude 后浏览器拿到的是未转换的 CJS，ESM 的 `import x from` 自然找不到 default；
3. **修复决策**：若该包不再需要 exclude，移除即可；若必须 exclude（例如它 import 了需要保持源码直连的工作区包），改写 import 侧做适配：
   ```ts
   // interop 缺失时的手动兜底
   import * as oldDateNs from 'old-date-util'
   const OldDate = (oldDateNs as any).default ?? oldDateNs
   ```
4. **验证**：`vite --force` 清缓存重启，确认报错消失且 HMR 正常。

不这么排查会发生什么：最常见的错误修法是「在 import 处加 `?commonjs` 之类的猜测试参数」或「给整个 optimizeDeps 关掉」，前者不存在这样的参数，后者会让所有 CJS 依赖集体报错——理解「exclude 把包踢出转换管线」这一个机制，比十次盲试有效。

### 场景二：monorepo 的 React 双实例 `Invalid hook call`

真实背景：pnpm workspace 中 `apps/web` 与 `packages/ui` 共存，`ui` 以 workspace 协议被 `web` 引用。启动后点击任何组件报错：

```text
Warning: Invalid hook call. Hooks can only be called inside of the body of a function component.
```

排查实录：

1. **验证双实例**：在 `web` 的代码里打印两个来源的 React：
   ```ts
   import * as ReactA from 'react'
   console.log('web 的 react:', (ReactA as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED)
   ```
   再在 `ui` 包里打印同一来源，若对象引用不同——确认两份 React 实例并存（两份实例各自维护一份 hook 调用栈，跨实例调用 hook 即触发此报错）；
2. **定位原因**：`ui` 未被预构建（symlink 源码直连），其内部 `import 'react'` 从自己包目录解析到了**另一份** react；或两端 semver 不同（`web` 用 19.x、`ui` 声明 18.x），pnpm 各装了一份；
3. **修复**：统一版本（两端 `react` 依赖对齐到同一精确版本）；确保 `ui` 的 react 由宿主提供（peerDependencies 声明）；必要时 `optimizeDeps.include: ['react']` 强制单份预构建产物；
4. **验证**：重启后 `console.log` 两处引用一致，hook 报错消失。

预防优于排查：monorepo 里凡是被多个包共享的「单例库」（react、vue、状态库），都按「宿主唯一实例」设计——依赖声明用 peerDependencies + workspace 对齐，这正是预构建机制与包管理机制交汇处的纪律（pnpm 侧见 [Workspace 依赖协议](/vite/180-WorkspaceProtocol)）。

### 场景三：二次预构建打断开发（发现式刷新）

真实背景：中台项目首页正常，点到某个懒加载路由时页面突然整页刷新，终端多出一段 `new dependencies optimized: heavy-chart-lib, reloading`。这是「发现新依赖 -> 二次预构建 -> 重新加载」的运行时链路：浏览器请求到扫描期未发现的依赖时，Vite 中断请求、重新预构建、通知浏览器重载。

修复思路（按成本从低到高）：

1. 找到懒加载路由的第一跳 import，把其中的重依赖加进 `optimizeDeps.include`，让它在启动扫描期就位；
2. 无法枚举时（动态拼接路径），把整组依赖写入 include 数组；
3. 纯观测需求可用 `optimizeDeps.holdUntilCrawlEnd`（控制爬取窗口行为）感知发现进度，但生产规范项目应以 include 白名单为正解。

## 5. 动手实践

任务：在一个干净 Vite 项目里亲手触发并修复「导出缺失」报错，建立机制直觉。

1. `pnpm add fast-deep-equal@3`（该版本是 CJS 包），在 `main.ts` 里 `import equal from 'fast-deep-equal'` 并调用，验证正常——先建立「预构建自动转换 CJS」的基线体感；
2. 在 `vite.config.ts` 给 `optimizeDeps.exclude` 加上 `fast-deep-equal`，重启，观察浏览器报出的 `does not provide an export named 'default'`；
3. 按 4 节场景一的路径修复（移除 exclude 或改写 import），用 `vite --force` 验证；
4. 改动锁文件（`pnpm add lodash-es`）后重启，观察终端是否重新预构建，对应第 2 节的缓存失效链。

<details>
<summary>参考要点（先自己试，再展开对照）</summary>

第 2 步现象：exclude 后 dev server 直接把 `node_modules/fast-deep-equal/index.js`（CJS）以 `?import` 形式返回给浏览器，`module.exports` 在 ESM 上下文中不构成 default 导出，报错信息里的路径不再带 `.vite/deps`——报错路径本身就是「有没有经过预构建」的判据。

第 3 步修复二（保留 exclude）：

```ts
import * as equalNs from 'fast-deep-equal'
const equal = (equalNs as any).default ?? equalNs
```

第 4 步现象：终端先输出 `Re-optimizing dependencies because lockfile has changed` 再 ready——锁文件哈希进判定链的直接证据。这个体感能帮你在「启动变慢」时第一时间判断是不是缓存失效引起的。

</details>

## 6. 常见错误与对策

| 现象 / 报错信息 | 常见原因 | 解决办法 |
| --- | --- | --- |
| `does not provide an export named 'xxx'` | CJS 包被 exclude（未经转换）或互操作配置被改 | 检查 `optimizeDeps.exclude` 与 `interopDefault`，`--force` 重启 |
| `Outdated Optimize Dep` / 504 | 依赖在二次预构建期间被旧页面请求 | 忽略一次自动刷新；频发则把该依赖加入 include |
| 开发中页面突然整页刷新 | 发现新依赖触发二次预构建 | 重依赖预先写入 `optimizeDeps.include` |
| `Invalid hook call`（monorepo） | React 双实例：symlink 包未被预构建或版本不对齐 | 版本对齐 + peerDependencies + include 强制单份 |
| 改了工作区包代码不生效 | workspace 包被预构建冻结成快照 | `optimizeDeps.exclude` 该包，保持源码直连 |
| 每次启动都很慢 | 缓存持续失效（锁文件/配置频繁变动） | 稳定锁文件；CI 用 `--frozen-lockfile`；排查动态拼接 import |

## 7. 一句话记忆

预构建是 dev server 的「依赖备菜」：CJS 转成 ESM、几百个小文件并成一个，缓存在 `.vite/deps`，锁文件一变就重做——`include` 备齐扫描看不到的，`exclude` 放过要直连源码的。

## 参考与致谢

本文预构建机制、`optimizeDeps` 配置语义与缓存失效条件参考 Vite 官方文档（Dep Pre-Bundling、optimizeDeps 配置、Troubleshooting 页），按 MIT 许可使用并重新组织改写。来源：https://vite.dev/guide/dep-pre-bundling （License: https://github.com/vitejs/vite/blob/main/LICENSE）。
