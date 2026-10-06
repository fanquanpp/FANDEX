---
order: 80
title: Vite 开发服务器与代理
module: 'vite'
category: 前端技术
difficulty: beginner
description: Vite dev server 的按需转换模型、server 配置、host 端口与 proxy 跨域代理的完整配置方法
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Vite dev server（开发服务器）——按需转换模型与 server/proxy 配置，对应 vite.dev 的「Guide: Dev Server」与「Config: server」章节。
- **解决什么问题**：本地开发的页面从哪来：谁把 TS/JSX 变成浏览器能跑的 JS；局域网手机怎么访问你的开发页；前后端分离时接口跨域怎么办。生产构建的行为不在此列（见 [生产构建与拆包](/vite/080-BuildSplit)）。
- **什么时候用到**：新项目初始化 dev server 配置；手机真机预览；对接后端接口需要开发期代理；排查「端口被占」「代理 404」这类日常故障。
- **本篇不讲**：HMR 热替换的原理与 `import.meta.hot` API（已拆为独立一篇，见 [HMR 原理与 import.meta.hot API](/vite/075-HmrMechanismAndHotApi)）；依赖预构建的机制与调优（见 [依赖预构建与 optimizeDeps](/vite/065-DepPrebundlingOptimizeDeps)）。

预计 25 到 40 分钟。

## 1. 认识 dev server：不只是"起个本地服务"

### 1.1 传统静态服务器 vs Vite dev server

用 `python -m http.server` 或 `http-server` 也能打开一个网页，但那是"纯静态"服务：文件是什么样就发什么样，不经过任何加工。Vite 的 dev server 是"智能加工厂"：

```text
浏览器请求 /src/main.ts
        ↓
Vite dev server 收到请求
        ↓
按需转换（TS -> JS、JSX -> JS、处理 import 路径）
        ↓
返回浏览器可直接执行的 ESM 代码
```

关键点：Vite 开发环境**不打包**，浏览器直接以原生 ES Module 的方式按需请求每个文件。这正是它冷启动快的原因——不需要像 Webpack 那样先把整个项目的依赖图构建一遍。

### 1.2 依赖预构建

dev server 启动时，Vite 会做一件重要的事：把 `node_modules` 里的依赖（如 React、Vue）预构建成 ESM，存放在 `node_modules/.vite/deps`。这一步在 Vite 8 中由 Rolldown 执行（Vite 7 及以前是 esbuild）。这样浏览器请求第三方库时，得到的是转换好、扁平化的 ESM，而不是层层嵌套的 CommonJS，加载速度大幅提升。

预构建的触发条件、缓存失效链与 include/exclude 调优是独立知识类别，见 [依赖预构建与 optimizeDeps](/vite/065-DepPrebundlingOptimizeDeps)。

### 1.3 冷启动与按需加载

Vite 只转换"浏览器当前真正请求到的文件"。项目有 1000 个文件，但你只打开了首页，那就只转换首页涉及的几十个文件。这就是"按需加载"：加载多少，转换多少。

## 2. server 配置总览

dev server 的行为全部通过 `vite.config.ts` 的 `server` 块配置：

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,           // 指定端口，被占用时自动加 1
    strictPort: false,    // true 时端口被占用直接报错，不再自动换端口
    host: 'localhost',    // 监听地址，见第 3 节
    open: true,           // 启动后自动打开浏览器
    cors: true,           // 允许跨域访问开发资源
    https: false,         // 需要 https 时配置证书对象
    proxy: {},            // 开发期请求代理，见第 4 节
  },
})
```

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `port` | `5173` | 开发服务器端口，被占用时自动 +1 |
| `strictPort` | `false` | 端口被占用时是否直接报错退出 |
| `host` | `localhost` | 监听的主机名或 IP，见第 3 节 |
| `open` | `false` | 启动后自动用默认浏览器打开页面 |
| `cors` | `true` | 允许跨域请求开发资源 |
| `proxy` | 无 | 请求代理配置，见第 4 节 |

注意：`vite preview`（预览构建产物）使用独立的 `preview` 配置块，语法与 `server` 相同但互不影响，例如 `preview.port` 默认 4173。

## 3. host 与端口：让局域网也能访问

`host` 决定 dev server 监听在哪张网卡上，直接影响"别人能不能访问到你的开发页面"：

```bash
# 仅本机可访问（默认）
pnpm dev --host localhost

# 暴露到局域网，手机/同事可访问
pnpm dev --host 0.0.0.0

# 监听全部网卡，并自动打开浏览器
pnpm dev --host 0.0.0.0 --open
```

讲解：默认 `localhost` 下，同一局域网的手机访问 `http://你的IP:5173` 会失败。改成 `0.0.0.0` 后，Vite 终端会输出 `Network: http://192.168.x.x:5173/`，其他设备即可访问。

两个常见的附加问题：

- **HTTPS**：浏览器对局域网 HTTP 环境下的敏感 API（摄像头、麦克风、蓝牙）有限制。可用 `server.https` 配置自签证书，或使用 `@vitejs/plugin-basic-ssl` 插件一键开启。
- **HMR 连接**：公司网络环境下 HMR 的 WebSocket 连接可能被拦截，`server.hmr` 的相关选项可以解决（该主题见 [HMR 原理与 import.meta.hot API](/vite/075-HmrMechanismAndHotApi)）。

## 4. 代理 proxy：解决开发跨域

前后端分离开发时，前端在 `5173` 端口，后端接口在 `8080` 端口，浏览器直接请求必然遇到跨域。推荐方案是**开发代理**而不是去改后端的 CORS：

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      // 前端请求 /api/xxx -> 转发到 http://localhost:8080/xxx
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // 简写形式：无 rewrite 需求时直接写目标地址
      '/socket': 'ws://localhost:3000',
    },
  },
})
```

讲解：

- `/api` 开头的请求由 dev server 转发到目标地址，**浏览器看到的仍是同源请求**（页面和接口都来自 5173），从而绕过跨域。
- `changeOrigin: true` 会把请求头中的 `Host` 改为目标地址——后端按 Host 做鉴权或路由时需要开启。
- `rewrite` 用于路径改写：去掉 `/api` 前缀、添加前缀、替换路径片段都行。
- 代理基于 http-proxy 实现，天然支持 WebSocket（`ws://` 协议）。

| 场景 | 配置要点 |
| --- | --- |
| 转发 REST API | `target` + `changeOrigin` + `rewrite` |
| 转发 WebSocket（如 HMR、聊天） | `target` 用 `ws://` 协议 |
| 转发到 HTTPS 后端 | `target` 填 https 地址 + `secure: false`（自签证书时） |
| 仅开发环境生效 | 放在 `server.proxy` 中，构建产物不受影响 |

## 5. 常见错误与对策

| 现象 / 报错信息 | 常见原因 | 解决办法 |
| --- | --- | --- |
| 端口被占用且 `strictPort: true` | 端口冲突 | 换端口，或 `lsof -i:5173` 查占用进程后处理 |
| 代理不生效、接口 404 | 请求没走代理前缀，或 `rewrite` 误删了路径 | 确认请求路径以 `/api` 开头，检查 `rewrite` 正则 |
| 手机访问 `Network` 地址失败 | host 还是默认 localhost，未监听局域网网卡 | `--host 0.0.0.0`，确认防火墙放行该端口 |
| `pnpm dev` 报 port already in use 且自动 +1 | strictPort 为默认 false，Vite 换了端口而你访问旧端口 | 看终端实际输出的 Local 地址；要固定端口就开 strictPort |
| 代理后端报 Host 校验失败 | 未开启 changeOrigin，后端按 Host 鉴权 | 加 `changeOrigin: true` |
| 自签 HTTPS 后端转发失败 | Node 不信任自签证书 | 代理项加 `secure: false` |

## 6. 动手实践

任务：给自己的项目做一次「dev server 体检」。

1. 启动 dev server，用手机连同一局域网访问 `Network` 地址；若失败，按第 3 节排查 host 与防火墙，成功后截图记录；
2. 把一个真实接口接入 `server.proxy`（没有现成后端就用 `https://jsonplaceholder.typicode.com` 当 target，配 `/api` 前缀与 rewrite），在浏览器 Network 面板确认请求仍是同源（5173）而数据来自目标站；
3. 把 `strictPort` 打开，再起第二个 dev server 实例，观察报错形态与默认行为的差异。

<details>
<summary>参考要点（先自己试，再展开对照）</summary>

第 2 题参考配置：

```ts
proxy: {
  '/api': {
    target: 'https://jsonplaceholder.typicode.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
},
```

前端 `fetch('/api/todos/1')`，浏览器 Network 里 URL 是 `http://localhost:5173/api/todos/1`（同源），dev server 把 `/api` 前缀剥掉后转发为 `https://jsonplaceholder.typicode.com/todos/1`。若忘了 rewrite，请求会打到 `https://jsonplaceholder.typicode.com/api/todos/1` 返回 404——正是对策表第 2 条的成因。

第 3 题：默认行为下第二个实例输出 `Port 5173 is in use, trying another one...` 并落在 5174，容易让"终端 A 与终端 B 谁在服务哪个页面"产生混淆；strictPort 下直接以错误退出，CI 或容器环境应开启它让端口冲突尽早暴露。

</details>

## 7. 一句话记忆

dev server 是"智能加工厂"：按需把源码转换成 ESM 端给浏览器，不打包；server 块管监听（host/port），proxy 块管转发（target/rewrite）——跨域问题在开发期交给代理，别去改后端 CORS。

## 参考与致谢

本文 server 配置项、proxy 行为与 preview 配置说明参考 Vite 官方文档（Config: server、Dev Server 指南），按 MIT 许可使用并重新组织改写。来源：https://vite.dev/config/server-options （License: https://github.com/vitejs/vite/blob/main/LICENSE）。
