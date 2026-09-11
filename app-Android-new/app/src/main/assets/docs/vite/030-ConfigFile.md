---
order: 30
title: Vite 配置文件详解
module: 'vite'
category: 前端技术
difficulty: beginner
description: 'vite.config.ts 详解：defineConfig、plugins、路径别名、开发服务器代理与构建选项，用"不配 vs 配 vs 配好"三段对比讲透'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vite/020-QuickStart'
  - 'vite/070-DevServerHMR'
  - 'vite/080-BuildSplit'
prerequisites:
  - 'vite/020-QuickStart'
---


## 1. 从汽车仪表盘与方向盘说起

想象你买了一辆新车。出厂时它就能开（这相当于 Vite 的"零配置开箱即用"），但你要真正舒适地驾驶，需要做三件事：

1. **看懂仪表盘**：速度表、油量表、故障灯——这些数据告诉你车当前的状态（对应 Vite 的启动日志、构建报告）；
2. **调整座椅和后视镜**：每个人的身高坐姿不同（对应端口、别名、代理等个性化设置）；
3. **设定行车电脑**：经济模式/运动模式的切换（对应开发环境与生产环境的差异化配置）。

如果什么都不调（不配），车能开，但未必顺心；如果调得乱七八糟（配错），可能比不配更糟；只有理解每一项的作用再动手（配好），才算真正掌控了这辆车。**vite.config.ts 就是这辆车的方向盘与仪表盘的集合**——它决定 Vite 在"哪个端口启动、如何解析路径、用哪些插件、构建产物长什么样"。

本文采用**对比驱动**的写法：每一节都用"不配 vs 配 vs 配好"三档来展示，让你不仅知道"怎么配"，更知道"为什么要配"。

## 2. 配置文件是什么

Vite 的几乎所有行为（端口、别名、插件、构建选项）都可以通过项目根目录下的配置文件控制。Vite 会自动加载以下位置之一的文件（按优先级从高到低）：

| 文件名 | 说明 |
| --- | --- |
| `vite.config.ts` | 推荐，TypeScript 编写，带完整类型提示 |
| `vite.config.mjs` | 纯 ESM 的 JS 配置 |
| `vite.config.js` | 普通 JS 配置（须为 ESM 或 CJS） |

官方推荐一律使用 `vite.config.ts`：配置文件本身就是 TS 文件，编辑器能给出全量选项的补全与校验，这是 Vite 开箱即用的开发者体验。

```bash
# 也可以显式指定配置文件位置（多项目共享配置时常用）
vite --config my-config.ts
```

讲解：配置文件的查找规则是"从进程当前工作目录向上查找"，通常放在项目根目录。修改配置文件后 Vite 会自动重启 dev server，无需手动操作（少数插件注册类变更除外，见第 8 节错误表）。

## 3. 第一组对比：不配 vs 配 vs 配好（defineConfig）

### 不配

```ts
// 不创建 vite.config.ts：Vite 以默认配置运行
// 默认端口 5173、默认根目录、默认构建输出 dist/
```

### 配（基础版）

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',          // 项目根目录（默认值就是当前目录）
  base: '/',          // 公共基础路径（部署到子路径时修改，见《Vite 静态资源处理》）
  plugins: [],        // 插件列表
})
```

### 配好（进阶版）

`defineConfig` 的实质是一个**透传函数**——它不改变对象内容，只是让 TypeScript 推断出配置对象的类型，从而获得补全与报错能力。它还支持接收**函数**，按环境返回不同配置：

```ts
import { defineConfig } from 'vite'

export default defineConfig(({ command, mode }) => {
  // command: 'serve'（pnpm dev）| 'build'（pnpm build）
  // mode: 'development' | 'production'，或自定义模式
  const isBuild = command === 'build'
  return {
    define: {
      // 把"是否构建"注入为全局常量，源码中可直接使用
      __BUILD__: JSON.stringify(isBuild),
    },
  }
})
```

讲解：函数形式适合"开发与构建行为差异较大"的项目。`command` 区分 dev/build，`mode` 对应环境变量模式（见第 7 节），两者是最常用的两个入参。记住一个原则：**配置要放在离它职责最近的地方**——全局行为用顶层选项，开发专属行为放 `server`，构建专属行为放 `build`。

## 4. plugins：给汽车加装设备

### 不配

```ts
export default defineConfig({
  // 不配插件：Vite 只处理原生能力（TS 转译、CSS、静态资源）
})
```

### 配（框架必须）

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'   // React 官方插件
import vue from '@vitejs/plugin-vue'       // Vue 官方插件（二选一）

export default defineConfig({
  plugins: [react()],
})
```

### 配好（按需叠加）

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer' // 构建体积分析

export default defineConfig({
  plugins: [
    react(),
    // 体积分析插件：构建后生成 dist/stats.html，可视化每个 chunk 的体积
    visualizer({ open: true }),
  ],
})
```

讲解：插件的常见用途——`@vitejs/plugin-react`（React Fast Refresh 热刷新）、`@vitejs/plugin-vue`（Vue 单文件组件支持）、`@vitejs/plugin-legacy`（旧浏览器兼容，转换语法并注入 polyfill）、`visualizer`（产物体积可视化）。Vite 8 中 `@vitejs/plugin-react` 已基于 Oxc 实现（不再依赖 Babel，依赖体积从约 45MB 降至约 8MB）。寻找更多插件可以浏览官方插件目录 registry.vite.dev。

## 5. resolve：路径解析的"导航系统"

### 不配

```ts
// 不配别名：所有相对路径 import，层级深了会出现 ../../../../ 地狱
import Header from '../../../../components/Header'
```

### 配（基础版：路径别名）

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      // '@' 指向 src 目录，从此告别相对路径
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
  },
})
```

### 配好（Vite 8 原生 tsconfig paths + 双端同步）

Vite 8 新增了**原生 tsconfig 路径解析**：不再需要安装 `vite-tsconfig-paths` 插件，直接在配置中开启即可自动读取 `tsconfig.json` 的 `paths`：

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    // 开启后自动解析 tsconfig.json 中的 paths（Vite 8 新特性）
    // 注意：有轻微性能开销，官方默认关闭，按需开启
    tsconfigPaths: true,
  },
})
```

**关键联动**：无论用哪种方式，都要保证 Vite 与 TypeScript"两套机制同步"。Vite 的别名影响运行与构建，不影响类型检查；`tsconfig.json` 的 `paths` 影响类型检查。二者缺一不可：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"]
    }
  }
}
```

讲解：`resolve.alias` 的值使用**文件系统绝对路径**（相对路径不会按预期工作）。别名生效后，`import Header from '@/components/Header'` 等价于相对路径引入。`tsconfig.json` 的 `paths` 与 Vite 的 `alias` 是两套独立机制，修改任一处都要记得同步另一处——这是初学者最常见的报错来源之一。

## 6. server：开发服务器的"行车电脑"

### 不配

```ts
// 不配 server：端口 5173、仅本机可访问、跨域请求直接失败
```

### 配（基础版：端口与自动打开）

```ts
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,     // 指定开发端口（被占用时仍会自动顺延）
    open: true,     // 启动后自动打开浏览器
  },
})
```

### 配好（代理解决跨域 + 局域网访问）

```ts
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    open: true,
    host: true,     // 监听所有网卡，允许局域网设备访问
    proxy: {
      // 开发环境代理：解决前端调后端接口的跨域问题
      // 浏览器请求 /api/xxx -> 转发到 http://localhost:8080/xxx
      '/api': {
        target: 'http://localhost:8080',  // 后端服务地址
        changeOrigin: true,               // 修改请求头中的 Origin
        rewrite: (path) => path.replace(/^\/api/, ''), // 去掉 /api 前缀
      },
    },
  },
})
```

讲解：代理是开发期跨域的官方解法——浏览器同源策略会拦截 `http://localhost:3000` 页面直连 `http://localhost:8080` 的接口，而通过 Vite 代理，浏览器只请求同源的 `/api/xxx`，由 Vite 在服务端转发，绕开同源限制。Vite 8 还新增 `server.forwardConsole`：把浏览器控制台日志转发到终端（对使用 AI 编程助手时自动开启，方便在终端看到客户端报错）。注意：代理只在开发环境生效，生产环境需由 nginx 等反向代理配置。

## 7. 环境变量与模式：多套配置一键切换

### 不配

```ts
// 不配环境变量：所有环境共用一份配置，无法区分开发/测试/生产
```

### 配（.env 系列文件）

在项目根目录创建 `.env` 系列文件，Vite 启动时自动加载：

```bash
# .env                # 所有环境都生效
VITE_APP_TITLE=FANDEX
VITE_API_BASE=/api

# .env.development    # 仅 dev 生效（mode 为 development）
VITE_DEBUG=true

# .env.production     # 仅 build 生效（mode 为 production）
VITE_APP_TITLE=FANDEX-Prod
```

### 配好（代码中使用 + 类型声明 + 配置读取）

```ts
// 任意源码文件
const apiBase = import.meta.env.VITE_API_BASE   // 自定义变量
const isProd = import.meta.env.PROD             // 内置：是否生产环境
const isDev = import.meta.env.DEV               // 内置：是否开发环境
const mode = import.meta.env.MODE               // 内置：当前模式名
```

讲解：只有以 `VITE_` 前缀开头的变量会暴露给客户端代码，其余变量只在配置文件中可见。这是刻意设计的安全边界——**密钥、Token 等敏感信息绝不能放进 VITE_ 变量**，否则会原样出现在最终产物中。`import.meta.env` 由 Vite 在编译时**静态替换**为实际值，因此必须使用完整字面量写法（不能写成 `import.meta.env[key]` 动态取值，那样无法被替换）。

为自定义变量补充类型提示（新建 `src/vite-env.d.ts`）：

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

若**配置文件本身**（如代理目标、CDN 地址）也需要读取环境变量，用 `loadEnv` 手动加载：

```ts
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // 从项目根目录加载 .env 系列文件（含 .env.[mode] 覆盖基础文件）
  const env = loadEnv(mode, process.cwd(), '')
  return {
    server: {
      proxy: {
        // 代理目标从环境变量读取，实现"一套配置、多环境切换"
        '/api': {
          target: env.VITE_API_BASE,
          changeOrigin: true,
        },
      },
    },
  }
})
```

自定义模式构建"测试环境"产物：

```bash
# 构建时使用 .env.staging（需提前创建该文件）
vite build --mode staging
```

讲解：`--mode staging` 会加载 `.env.staging` 与 `.env`（基础文件始终加载），同时 `import.meta.env.MODE` 变为 `'staging'`。多环境部署（dev / staging / prod）通常用这种方式管理。

## 8. 常见错误与对策表

| 序号 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 1 | 编辑器报"找不到模块 '@/xxx'" | Vite 的 `alias` 与 `tsconfig.json` 的 `paths` 未同步 | 同时配置两处；Vite 8 可直接用 `resolve.tsconfigPaths: true` 统一管理 |
| 2 | 改了 `.env` 不生效 | 环境变量在 dev server 启动时读取 | 修改 `.env` 后重启 `pnpm dev` |
| 3 | `import.meta.env.VITE_X` 拿到 undefined | 变量未加 `VITE_` 前缀，或用动态访问 `import.meta.env[key]` | 变量加前缀；使用完整字面量写法 |
| 4 | 配置修改后行为未变化 | 某些插件注册类变更需要手动重启 | 重启 `pnpm dev`（加 `--force` 可顺带重置依赖缓存） |
| 5 | 局域网手机访问不了开发页面 | `host` 未开启或防火墙拦截 | `server.host: true` 后检查防火墙放行端口 |
| 6 | 生产环境接口请求仍报跨域 | `server.proxy` 只在开发环境生效 | 生产环境在 nginx/网关配置反向代理 |
| 7 | 自定义变量在代码中无类型提示 | 未在 `vite-env.d.ts` 声明 | 按第 7 节方式补充 `ImportMetaEnv` 接口 |

## 9. 一句话记忆

**vite.config.ts 是 Vite 的方向盘：`defineConfig` 拿类型提示，`plugins` 装能力，`resolve` 管寻路，`server` 管开发，`build` 管产物，`VITE_` 前缀管环境——所有配置都遵循"默认可用、按需调整、两套机制同步"**。
