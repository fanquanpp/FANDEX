---
order: 30
title: Vite 配置文件详解
module: 'vite'
category: 前端技术
difficulty: beginner
description: 'vite.config.ts 详解：defineConfig、plugins、路径别名、开发服务器代理与构建选项，用"不配 vs 配 vs 配好"三段对比讲透'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'vite/020-QuickStart'
  - 'vite/070-DevServerAndProxy'
  - 'vite/080-BuildSplit'
prerequisites:
  - 'vite/020-QuickStart'
---


## 知识点地图

- **知识类别**：Vite 配置文件（`vite.config.ts`）——配置的结构、加载机制与最高频的配置项，对应 vite.dev 的「Config」章节。
- **解决什么问题**：零配置能跑但跑不顺心——端口冲突、路径地狱、跨域失败、多环境混乱都要在配置文件里解决；同时配置本身有两套同步机制（Vite 的 alias 与 tsconfig 的 paths）和两种形态（对象与函数），形态选错会埋雷。
- **什么时候用到**：项目初始化时定基线；接框架插件；配路径别名；接后端接口配代理；多环境（staging/prod）切换的入口层。
- **本篇主线**：每节用「不配 vs 配 vs 配好」三档对比建立「默认可用、按需调整、两套机制同步」的心智；重点深挖两个真实痛点——alias 双源对齐（第 5 节）与条件配置（第 3 节函数形态）。环境变量与模式只留概览（第 7 节），深水区在专篇。
- **本篇不讲**：环境变量与模式的完整规则（见 [Vite 环境变量与模式](/vite/050-ViteEnvModes)）；server/proxy 逐项细节（见 [开发服务器与代理](/vite/070-DevServerAndProxy)）。

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

讲解：配置文件的查找规则是"从进程当前工作目录向上查找"，通常放在项目根目录。修改配置文件后 Vite 会自动重启 dev server，无需手动操作（少数插件注册类变更除外，见第 9 节错误表）。

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

**对象写法的前缀误伤陷阱**：上面的对象形式 `{ '@': src }` 是**前缀替换**语义，`import Button from '@ant-design/icons'` 中的 `@ant-design` 也会被命中替换，导致包解析失败。两种修复：

```ts
export default defineConfig({
  resolve: {
    alias: [
      // 数组写法：用正则锚定「@/ 后紧跟内容」的精确形态
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, 'src') + '/$1' },
      // 或者继续用对象，但把项目别名换成不易撞包名的前缀
      // { '@~': path.resolve(__dirname, 'src') },
    ],
  },
})
```

双源对齐的完整检查清单（团队项目按此自查）：

1. `vite.config` 的 alias 与 `tsconfig.json` 的 paths 逐条对得上（含正则形态）；
2. Vite 8 项目优先 `resolve.tsconfigPaths: true` 单一事实源，从根上消灭「两处不同步」；
3. 测试环境（Vitest/Jest）的 moduleNameMapper 是**第三套**解析机制，别名配置要三处同查——只对齐前两处，「跑测试才报找不到模块」的现场就来了。

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

## 7. 环境变量与模式：概览与指路

多套环境（开发/测试/生产）的配置切换靠 `.env` 系列文件与 `--mode` 参数。与 050 专篇重叠的完整规则不再展开，本节只立三条必须刻进肌肉记忆的心智，细节见 [Vite 环境变量与模式](/vite/050-ViteEnvModes)：

1. **前缀即安全边界**：只有 `VITE_` 前缀的变量会暴露给客户端产物，其余仅在配置文件（Node 侧）可见——密钥、Token 绝不能放进 `VITE_` 变量，否则原样出现在最终产物里；
2. **编译期静态替换**：`import.meta.env.VITE_X` 在构建时被替换为字面值，必须完整字面量访问（`import.meta.env[key]` 动态取值无法被替换，拿到 undefined）；
3. **配置文件读环境用 `loadEnv`**：`defineConfig(({ mode }) => { const env = loadEnv(mode, process.cwd(), '') })`——配置运行在 Node 侧，`import.meta.env` 那时还不存在。

`vite-env.d.ts` 的 `ImportMetaEnv` 类型声明、`.env.[mode]` 优先级、自定义模式与 CI 的配合，全部见专篇。

## 8. 动手实践

任务：给一个新项目搭出「符合团队规范」的配置基线，并亲手验证三个易错点。

1. **双源对齐验证**：按第 5 节配好 alias（只用对象形式 `{ '@': src }`），然后在代码里 `import { add } from '@utils/math'`（tsconfig paths 配了 `@utils/*`）与 `import dayjs from 'dayjs'`——观察哪个能跑、哪个报错，再用数组正则形态修复；
2. **条件配置体感**：把第 3 节的函数形态配置落地，`pnpm dev` 与 `pnpm build` 各跑一次，在终端打印 `command` 与 `mode`，确认同一份配置在两个命令下走了不同分支；
3. **安全边界实测**：往 `.env` 写 `SECRET_TOKEN=abc123` 与 `VITE_API_BASE=/api`，执行 `pnpm build` 后在 `dist/` 里全文搜索两个值，记录哪个出现在产物里。

<details>
<summary>参考要点（先自己试，再展开对照）</summary>

第 1 题现象：`@utils/math` 在 dev 页面报「Failed to resolve import」——对象形式的 `@` 别名把 `@utils` 当成了 `@` 前缀替换（替换后路径指向 `src` 下不存在的位置）；dayjs 正常，因为它不以 `@` 开头。这就是前缀误伤的现场：**你的别名 `@` 越短，撞上 `@scope/xxx` 官方包名的概率越高**。修复用数组正则 `/^@\/(.*)/` 只命中「@ 斜杠开头」的项目内路径。

第 2 题打印方式：

```ts
export default defineConfig(({ command, mode }) => {
  console.log('[vite-config]', { command, mode })
  // ...
})
```

dev 时 command 是 `serve`、mode 是 `development`；build 时是 `build` + `production`。第三步安全实测的结论：`abc123` 出现在 `dist/assets/*.js` 里吗——不出现在才对（无前缀不暴露），`/api` 出现（VITE_ 前缀已注入）。亲手搜过一次，「密钥不能加 VITE_ 前缀」就从背诵变成了直觉。

</details>

## 9. 常见错误与对策表

| 序号 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 1 | 编辑器报"找不到模块 '@/xxx'" | Vite 的 `alias` 与 `tsconfig.json` 的 `paths` 未同步 | 同时配置两处；Vite 8 可直接用 `resolve.tsconfigPaths: true` 统一管理 |
| 2 | 改了 `.env` 不生效 | 环境变量在 dev server 启动时读取 | 修改 `.env` 后重启 `pnpm dev` |
| 3 | `import.meta.env.VITE_X` 拿到 undefined | 变量未加 `VITE_` 前缀，或用动态访问 `import.meta.env[key]` | 变量加前缀；使用完整字面量写法 |
| 4 | 配置修改后行为未变化 | 某些插件注册类变更需要手动重启 | 重启 `pnpm dev`（加 `--force` 可顺带重置依赖缓存） |
| 5 | 局域网手机访问不了开发页面 | `host` 未开启或防火墙拦截 | `server.host: true` 后检查防火墙放行端口 |
| 6 | 生产环境接口请求仍报跨域 | `server.proxy` 只在开发环境生效 | 生产环境在 nginx/网关配置反向代理 |
| 7 | 自定义变量在代码中无类型提示 | 未在 `vite-env.d.ts` 声明 | 按第 7 节方式补充 `ImportMetaEnv` 接口 |

## 10. 一句话记忆

**vite.config.ts 是 Vite 的方向盘：`defineConfig` 拿类型提示，`plugins` 装能力，`resolve` 管寻路，`server` 管开发，`build` 管产物，`VITE_` 前缀管环境——所有配置都遵循"默认可用、按需调整、两套机制同步"**。
