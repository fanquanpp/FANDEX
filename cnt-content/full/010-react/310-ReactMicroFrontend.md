---
order: 310
title: React 与微前端
module: 'react'
category: 前端技术
difficulty: advanced
description: React 微前端架构：适用场景与三大流派（Module Federation、single-spa/qiankun、iframe）、Webpack Module Federation 完整配置、共享 React 单例、样式与状态隔离、落地陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/290-ReactWebSocket'
  - 'react/300-ReactGraphQL'
  - 'react/320-ReactAccessibility'
  - 'react/380-ReactMonorepo'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

微前端是把一个大型 Web 应用拆成**多个可独立开发、独立构建、独立部署**的子应用，由一个"容器应用"（主应用）在运行时把它们组装到一个页面里。类比商场与专柜：统一入口（主应用）、统一收银规则（共享依赖与鉴权），但每个专柜（子应用）自主进货、自主装修。它解决的是**组织问题而非技术问题**——几十人团队、多个技术栈、发布节奏互相牵制时才有必要；小团队引入微前端只会把"一次构建"的简单问题，换成"运行时集成"的十个新问题。

## 2. 三大流派

| 流派 | 原理 | 优点 | 代价 |
| :--- | :--- | :--- | :--- |
| Module Federation（Webpack 5 / Rspack / Vite 插件） | 构建期声明共享模块，运行时按需加载远程模块 | 依赖共享精细、性能好、无额外运行时框架 | 绑定打包器，版本协调要设计 |
| single-spa / qiankun（沙箱框架） | 注册子应用生命周期，框架负责加载与 JS/样式沙箱 | 技术栈无关、成熟生态 | 多一层运行时，沙箱有边界情况 |
| iframe（原生隔离） | 每个子应用一个 iframe | 隔离最彻底，几乎零改造 | 路由/弹窗/通信都跨文档，体验割裂 |

当前 React 生态的默认答案是 **Module Federation**：它由构建器原生支持，把"共享 React 单例"这一最大痛点变成配置声明。

## 3. Module Federation 完整示例

场景：主应用（host）远程加载"订单"子应用（remote）暴露的页面组件，两者共享同一份 React。

```js
// remote（子应用）webpack.config.js 关键段
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'orders',
      filename: 'remoteEntry.js', // 子应用的入口清单
      exposes: {
        './OrderPage': './src/OrderPage', // 对外暴露的模块
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' }, // 单例：全站一份 React
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
  ],
};
```

```js
// host（主应用）webpack.config.js 关键段
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    orders: 'orders@https://orders.example.com/remoteEntry.js', // 指向子应用清单
  },
  shared: {
    react: { singleton: true, requiredVersion: '^19.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
  },
}),
```

```tsx
// host/src/App.tsx：懒加载远程组件
import { lazy, Suspense } from 'react';

// 类型可以由 remote 侧导出的 .d.ts 镜像包提供
const OrderPage = lazy(() => import('orders/OrderPage')); // 远程模块

export default function App() {
  return (
    <>
      {/* 必须用 Fragment 包裹：JSX 只能返回一个根元素 */}
      <nav>主应用导航（不变）</nav>
      <Suspense fallback={<p>订单模块加载中...</p>}>
        <OrderPage />
      </Suspense>
    </>
  );
}
```

预期行为：访问主应用时首屏只含 host 资源；进入订单路由才拉取 `remoteEntry.js` 与订单代码块；`OrderPage` 渲染在主应用布局内，与本地组件共用同一个 React 实例（DevTools Components 面板里可以看到完整的一棵组件树）。子应用团队独立发布新版，主应用刷新后即生效——这就是"独立部署"的价值。

TypeScript 下远程模块的类型：在 host 的 `declare module 'orders/OrderPage'` 中声明，或用构建脚本从 remote 拉取类型包，避免 `any` 泄漏。

## 4. 单例与版本协调：federation 的核心纪律

`shared` 配置的三条规则必须想清楚：

- **`singleton: true` 用于 React/ReactDOM**：两份 React 并存时 Hooks 会直接报错（`Invalid hook call`），且 Context 跨不过去——这是微前端第一大事故源。
- **`requiredVersion` 显式声明**：子应用各自升级到 React 大版本不同时，singleton 只保留先加载的一份，另一个不兼容就会运行时崩溃；团队间用"共享依赖版本公约"约束。
- **公共库酌情共享**：UI 库、请求库共享可显著减包，但共享面越大，"一个子应用升级拖累全场"的耦合越强；共享清单要收敛。

## 5. 隔离与通信

**样式隔离**：全站 CSS 同池，类名冲突、全局样式覆盖是常态事故。手段：CSS Modules / CSS-in-JS 天然局部化；设计 token（CSS 变量）由主应用统一下发；残存的全局样式用 `postcss-prefixwrap` 等加前缀。

**跨应用通信**，从轻到重：

```tsx
// 1) 状态上移：把共享状态放进主应用，通过 props/Context 传给子应用（首选）
<AuthProvider><Suspense fallback={null}><OrderPage /></Suspense></AuthProvider>

// 2) 自定义事件：松耦合通知，适合"广播"类场景
window.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: 3 } }));
window.addEventListener('cart:updated', handler); // 子应用卸载时记得移除

// 3) 共享 store 单例：通过 shared 暴露 Zustand 等模块（强耦合，慎重）
```

原则：通信越少越健康。子应用之间不应直接通信，所有跨域协作经主应用中转，否则"独立演进"就是空话。

**路由集成**：子应用路由挂在前缀下（如 `/orders/*`），用 basename 配置对齐；主应用只认前缀，不解析子应用内部路由。主应用做前缀分发，子应用内部自管嵌套路由。

## 6. 常见陷阱

- **双 React 事故**：某个子应用没把 react 声明为 singleton 或没进 shared，打包进自己代码块，运行时 `Invalid hook call` / 事件系统错乱；用 `webpack-bundle-analyzer` 与运行时探测（`window.__REACT_VERSION__`）排查。
- **iframe 方案低估集成成本**：弹窗只圈 iframe、路由不同步、登录态要重复传递、滚动/缩放体验割裂——iframe 适合"完全独立的小工具"，不适合深度集成的页面。
- **共享依赖版本漂移**：主应用锁 React 19，某子应用偷偷升 20，singleton 加载顺序决定谁被使用，故障随机出现；CI 里加"共享依赖版本一致性检查"。
- **子应用间直接 import**：绕过 federation 接口直接耦合内部模块，独立部署立刻失效；子应用对外只暴露声明好的 exposes。
- **全局对象污染**：`window.xxx` 互踩、事件监听不清理；沙箱框架（qiankun）能缓解 JS 隔离，但纪律仍是第一道防线。
- **为了微前端而微前端**：三五人团队、一套技术栈、周级发布，用 monorepo（见[React 与 Monorepo](/react/380-ReactMonorepo)）+ 模块边界就够了；微前端的收益以"团队自治"为单位，不以模块为单位。

## 7. 小结

初学者要点：

- 微前端解决"多团队独立部署"的组织问题；三大流派里 React 生态默认 Module Federation。
- host 通过 `remotes` 引用，remote 通过 `exposes` 暴露，`shared + singleton` 保证全站一份 React。
- 页面级集成（子应用 = 路由前缀下的页面）比"任意组件级拼装"更可控。

进阶注意：

- 版本公约 + CI 检查守住共享依赖；样式靠局部化方案 + 设计 token 消毒。
- 通信从轻：props/Context 上移 > 事件广播 > 共享 store；子应用互不直连。
- iframe 只用于天然隔离场景；single-spa/qiankun 在多技术栈共存时与 federation 并用。

## 速查

**Module Federation 关键配置**

```js
new ModuleFederationPlugin({
  name: 'orders',                       // remote 名
  filename: 'remoteEntry.js',           // 入口清单
  exposes: { './OrderPage': './src/OrderPage' },
  remotes: { orders: 'orders@https://orders.example.com/remoteEntry.js' }, // host 侧
  shared: { react: { singleton: true, requiredVersion: '^19.0.0' },
            'react-dom': { singleton: true, requiredVersion: '^19.0.0' } },
})
```

**加载远程组件**

```tsx
const OrderPage = lazy(() => import('orders/OrderPage'));
<Suspense fallback={<p>加载中...</p>}><OrderPage /></Suspense>
```

**跨应用事件**

```tsx
window.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: 3 } }));
window.addEventListener('cart:updated', handler); // 卸载时 removeEventListener
```

**健康检查清单**

- react / react-dom 是 singleton 且版本一致
- 子应用间无直接 import，只走 exposes
- 样式全部局部化或有前缀
- 事件监听、定时器在卸载时清理
- CI 有共享依赖版本一致性检查
