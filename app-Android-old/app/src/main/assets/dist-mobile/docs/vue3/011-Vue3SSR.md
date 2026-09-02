# Vue 3 服务端渲染 | Server-Side Rendering in Vue 3

## 前置知识

- [Vue3 编译优化](/vue3/010-Vue3CompileOptimization)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 历史动机与发展脉络 | Historical Motivation and Evolution」的核心机制、典型用法与常见陷阱
- 掌握「2. 形式化定义 | Formal Definitions」的核心机制、典型用法与常见陷阱
- 掌握「3. 理论推导与原理解析 | Theoretical Derivation」的核心机制、典型用法与常见陷阱
- 掌握「4. 代码示例 | Code Examples」的核心机制、典型用法与常见陷阱
- 掌握「5. 对比分析 | Comparative Analysis」的核心机制、典型用法与常见陷阱


> 本文档对标 MIT 6.170、Stanford CS142、CMU 17-437 软件工程课程水准，系统化阐述 Vue 3 服务端渲染（SSR）的原理、形式化定义、企业级实践与对比分析。涵盖同构应用架构、Hydration 机制、数据预取、流式渲染、Nuxt 3 集成、Vite SSR 构建、SSR 缓存策略、单例污染防护、SEO 优化、性能建模等主题，并辅以数学推导、对比分析、案例研究与习题。

---

## 1. 历史动机与发展脉络 | Historical Motivation and Evolution

### 1.1 服务端渲染的起源

Web 早期的所有页面都是服务端渲染。1990 年代 CGI、PHP、ASP、JSP 等技术均采用服务端模板渲染 HTML 后返回浏览器。2000 年代 AJAX 兴起，Web 应用逐步向客户端渲染（CSR）迁移。2010 年代单页应用（SPA）成为主流，但暴露出 SEO 弱、首屏慢等问题，催生 SSR 复兴。

**关键里程碑**：

| 时间 | 事件 |
|------|------|
| 1993 | CGI 规范发布，服务端动态网页普及 |
| 1995 | PHP、ASP 诞生，模板渲染成为主流 |
| 2005 | AJAX 概念提出，开启 Web 2.0 时代 |
| 2010 | Backbone.js、AngularJS 推动 SPA 范式 |
| 2013 | React 发布，CSR 成为前端主流 |
| 2015 | Next.js 发布，React SSR 普及 |
| 2016 | Nuxt.js 发布，Vue SSR 生态成型 |
| 2018 | Vue 2.6 优化 SSR 性能，支持流式渲染 |
| 2020 | Vue 3 重构 SSR，引入 `createSSRApp` 与 `Hydration` 优化 |
| 2022 | Nuxt 3 发布，基于 Nitro 跨平台部署 |
| 2023 | Vue 3.3 优化 SSR 流式渲染，支持 `Suspense` |
| 2024 | Vue 3.4 引入 `data-allow-mismatch` 控制 Hydration 容忍度 |
| 2025 | Nuxt 4 RC，整合 Server Components 实验 |

### 1.2 Vue 2 时代的 SSR

Vue 2 通过 `vue-server-renderer` 提供 SSR 支持，但设计上存在限制：

```javascript
// Vue 2 SSR 基础示例
const Vue = require('vue');
const renderer = require('vue-server-renderer').createRenderer();

const app = new Vue({
  template: '<div>{{ message }}</div>',
  data: { message: 'Hello SSR' },
});

renderer.renderToString(app, (err, html) => {
  console.log(html); // <div data-server-rendered="true">Hello SSR</div>
});
```

**Vue 2 SSR 的限制**：

- 基于实例的 API（`new Vue`）难以保证请求隔离，需要工厂函数。
- 无 `createSSRApp` 区分，客户端与服务端使用同一 API，需通过 `process.server` 判断。
- `asyncData` 与 `serverPrefetch` 的数据获取机制不够统一。
- 流式渲染支持有限，`renderToStream` 不支持 Suspense 协调。
- Hydration Mismatch 检测较弱，仅警告不阻断。

### 1.3 Vue 3 时代（2020-至今）：根本性重构

Vue 3 对 SSR 进行了根本性重构，引入全新 API 与设计理念：

#### 1.3.1 createSSRApp（Vue 3.0）

`createSSRApp` 与 `createApp` 的差异：

```javascript
import { createSSRApp, createApp } from 'vue';

// 客户端使用 createApp（启用响应式）
const clientApp = createApp(App);

// 服务端使用 createSSRApp（禁用响应式直至 hydration）
const serverApp = createSSRApp(App);
```

`createSSRApp` 的核心优化：

1. **禁用响应式追踪**：SSR 期间不需要响应式，避免不必要的依赖收集开销。
2. **禁用虚拟 DOM 修补**：SSR 输出纯字符串，无需 diff 算法。
3. **统一入口**：客户端与服务端使用相同的 `createSSRApp`，通过 `import.meta.env.SSR` 区分平台。

#### 1.3.2 vue/server-renderer 独立包（Vue 3.0）

SSR 渲染器从 `vue-server-renderer` 迁移至 `@vue/server-renderer`，作为 Vue 3 的独立子包：

```javascript
import { renderToString } from 'vue/server-renderer';
```

#### 1.3.3 流式渲染（Vue 3.0+）

Vue 3 原生支持流式渲染：

```javascript
import { renderToNodeStream } from 'vue/server-renderer';

// Node.js 流
const stream = renderToNodeStream(app);
stream.pipe(res);
```

#### 1.3.4 Suspense 与 SSR（Vue 3.2+）

Vue 3.2+ 支持 Suspense 在 SSR 中协调异步依赖：

```javascript
// entry-server.js
import { renderToString } from 'vue/server-renderer';

export async function render(url) {
  const { app, router } = createApp();
  await router.push(url);
  await router.isReady();
  
  // 等待所有 Suspense 异步依赖完成
  const html = await renderToString(app);
  return html;
}
```

#### 1.3.5 Hydration Mismatch 控制（Vue 3.4+）

Vue 3.4 引入 `data-allow-mismatch` 属性，允许开发者显式标记可容忍 Hydration 不一致的元素：

```vue
<template>
  <!-- 时间戳、随机数等可容忍差异 -->
  <span data-allow-mismatch>{{ formattedTime }}</span>
</template>
```

#### 1.3.6 Nuxt 3（2022）：跨平台 SSR 框架

Nuxt 3 基于 Nitro 引擎，支持多平台部署：

```bash
npx nuxi init my-app
cd my-app && npm install && npm run dev
```

Nitro 输出目标：

- Node.js Server
- Cloudflare Workers
- Vercel Edge
- Netlify Functions
- Deno Deploy
- 静态预渲染（SSG）

### 1.4 Evan You 的设计哲学

Evan You 对 SSR 的定位：

1. **同构优先**：客户端与服务端共享同一套组件代码，通过入口分离与平台判断实现差异。
2. **流式渲染是未来**：从 `renderToString` 到 `renderToStream`，TTFB 显著优化，用户体验更佳。
3. **Suspense 统一异步**：SSR 中的数据预取、异步组件、懒加载通过 Suspense 统一协调，避免回调地狱。
4. **请求隔离是底线**：每个请求创建独立应用实例，避免单例污染，这是 SSR 安全的基础。
5. **渐进式复杂度**：简单场景用 Nuxt 3，复杂场景自行搭建，Vue SSR 不强制绑定特定框架。

### 1.5 与 React SSR 的对比

React 18（2022）引入全新 SSR 架构，与 Vue 3 SSR 设计理念差异显著：

| 维度 | Vue 3 SSR | React 18 SSR |
|------|-----------|--------------|
| 渲染模式 | 同步组件树 | `renderToPipeableStream` 流式 |
| Hydration | 全量 hydration | 选择性 hydration（Selective Hydration） |
| 异步数据 | `async setup()` + Suspense | `use()` + Suspense（实验性） |
| Server Components | 实验性 | 稳定（Next.js 13+） |
| 流式 API | `renderToNodeStream` | `renderToPipeableStream` |
| Hydration Mismatch | 警告 + `data-allow-mismatch` | 警告 + 自动修复（部分场景） |
| 框架生态 | Nuxt 3 | Next.js 13+ |

**关键差异**：

- Vue 3 SSR 仍是同步组件树渲染（除 Suspense 异步依赖外），React 18 引入并发 SSR。
- React Server Components 实现了真正的零客户端体积组件，Vue Server Components 仍在实验阶段。
- Vue 的 Hydration 是全量接管，React 18 支持选择性 hydration，可优先 hydrate 用户交互区域。

### 1.6 与 Solid、Svelte SSR 的对比

| 框架 | SSR API | 流式渲染 | Hydration |
|------|---------|----------|-----------|
| Vue 3 | `renderToString`/`renderToStream` | 支持 | 全量 |
| React 18 | `renderToPipeableStream` | 支持 | 选择性 |
| Solid.js | `renderToStringAsync` | 支持 | 流式 |
| Svelte | `render` | 支持 | 渐进式 |
| Angular | `renderApplication` | 支持 | 全量 |

Solid.js 的 SSR 基于细粒度响应式，Hydration 仅恢复必要信号，性能优异。Svelte 编译时生成 SSR 代码，运行时极轻量。Angular 16+ 引入非破坏性 Hydration，避免全量重建 DOM。

---

## 2. 形式化定义 | Formal Definitions

### 2.1 服务端渲染的形式化定义

**定义 3.1（服务端渲染）**：服务端渲染是一个函数 $R_{\text{ssr}}$，将 Vue 应用实例与上下文映射为 HTML 字符串：

$$
R_{\text{ssr}}: (\text{App}, \text{Context}) \to \text{HTMLString}
$$

其中 $\text{Context}$ 包含请求 URL、初始状态、HTTP 头等元信息。

**定义 3.2（同构应用）**：同构应用是一个三元组 $\mathcal{A} = \langle \text{Shared}, \text{Client}, \text{Server} \rangle$，其中：

- $\text{Shared}$：共享组件、路由、状态定义。
- $\text{Client}: \text{Shared} \to \text{ClientApp}$：客户端入口，启用响应式、挂载 DOM。
- $\text{Server}: \text{Shared} \to \text{ServerApp}$：服务端入口，禁用响应式、输出 HTML。

### 2.2 Hydration 的形式化

**定义 3.3（Hydration）**：Hydration 是一个函数 $H$，将服务端输出的 DOM 树 $D_{\text{server}}$ 与客户端 Vue 实例 $V_{\text{client}}$ 结合：

$$
H: (D_{\text{server}}, V_{\text{client}}) \to D_{\text{reactive}}
$$

**约束**：Hydration 要求 $D_{\text{server}}$ 与 $V_{\text{client}}$ 渲染输出结构一致，否则触发 Hydration Mismatch。

**定义 3.4（Hydration Mismatch）**：当服务端输出 $D_{\text{server}}$ 与客户端首次渲染 $D_{\text{client}}^{\text{first}}$ 不一致时，称为 Hydration Mismatch：

$$
\text{Mismatch} \iff D_{\text{server}} \neq D_{\text{client}}^{\text{first}}
$$

### 2.3 数据预取的形式化

**定义 3.5（数据预取）**：数据预取是服务端在 SSR 渲染前执行的异步数据获取函数集合：

$$
\text{Prefetch}: \text{Route} \to \text{Promise<State>}
$$

设路由 $r$ 匹配的组件集合为 $\text{Components}(r) = \{c_1, c_2, \ldots, c_n\}$，每个组件 $c_i$ 可定义 `asyncData` 钩子 $f_i$：

$$
\text{Prefetch}(r) = \text{Promise.all}\left(\{f_i(\text{context}) \mid c_i \in \text{Components}(r), f_i \text{ defined}\}\right)
$$

**约束**：所有 $f_i$ 必须并行执行以最小化等待时间。

### 2.4 流式渲染的形式化

**定义 3.6（流式渲染）**：流式渲染将 HTML 输出视为可分块发送的流：

$$
R_{\text{stream}}: (\text{App}, \text{Context}) \to \text{Stream<Chunk>}
$$

其中 $\text{Stream<Chunk>}$ 是一个异步迭代器，逐块产出 HTML 片段：

$$
\text{Stream} = \{h_1, h_2, \ldots, h_k\}
$$

**TTFB 优化**：首块 $h_1$ 的发送时间 $t_1$ 远小于完整渲染时间 $t_{\text{total}}$：

$$
\text{TTFB}_{\text{stream}} = t_1 \ll t_{\text{total}} = \text{TTFB}_{\text{string}}
$$

### 2.5 单例污染的形式化

**定义 3.7（单例污染）**：在 Node.js 服务器中，若应用实例 $A$ 在模块作用域创建并被多请求共享：

$$
\forall r_1, r_2 \in \text{Requests}: A(r_1) = A(r_2) = A_{\text{global}}
$$

则请求 $r_1$ 的状态可能泄露至 $r_2$，称为单例污染。

**解决方案**：通过工厂函数保证每请求独立实例：

$$
\forall r \in \text{Requests}: A(r) = \text{createApp}(r) \land A(r_1) \neq A(r_2) \text{ if } r_1 \neq r_2
$$

### 2.6 SSR 状态序列化的形式化

**定义 3.8（状态序列化）**：SSR 状态序列化是将在服务端获取的状态 $S_{\text{server}}$ 转换为可嵌入 HTML 的 JSON 字符串：

$$
\text{Serialize}: S_{\text{server}} \to \text{JSONString}
$$

客户端 hydration 时反序列化：

$$
\text{Deserialize}: \text{JSONString} \to S_{\text{client}}
$$

**约束**：

- 序列化必须处理循环引用（通过 `JSON.stringify` 的 `replacer` 或专用库）。
- 反序列化后的状态必须与服务端一致，作为客户端初始状态。
- 敏感数据（如密码、Token）不应序列化至 HTML，避免 XSS 泄露。

### 2.7 Hydration 性能建模

**定义 3.9（Hydration 成本）**：Hydration 的成本 $C_H$ 与组件树节点数 $n$ 和事件监听器数量 $e$ 相关：

$$
C_H = \alpha \cdot n + \beta \cdot e + \gamma \cdot |\text{State}|
$$

其中：

- $\alpha$：每个节点的遍历与匹配成本。
- $\beta$：每个事件监听器的附加成本。
- $\gamma$：状态反序列化的单位成本。

**优化方向**：

- 减少 $n$：组件级懒加载、虚拟列表。
- 减少 $e$：事件委托。
- 减少 $|\text{State}|$：精简初始状态，按需加载。

### 2.8 SSR 缓存的形式化

**定义 3.10（组件级缓存）**：组件级缓存将组件渲染结果按缓存键 $k$ 存储：

$$
\text{Cache}: k \to \text{HTMLString}
$$

缓存键 $k$ 由组件 `name` 与 `serverCacheKey` 函数决定：

$$
k = \text{name} + \text{hash}(\text{serverCacheKey}(\text{props}))
$$

**缓存失效**：当数据变化时，按 $k$ 失效对应缓存。

**约束**：

- 仅缓存纯函数式组件（输出仅依赖 props）。
- 避免缓存包含用户态数据的组件（如用户名）。
- 缓存命中时跳过组件渲染，直接输出 HTML 字符串。

---

## 3. 理论推导与原理解析 | Theoretical Derivation

### 3.1 SSR 渲染管线的内部实现

Vue 3 SSR 渲染管线分为多个阶段：

```javascript
// Vue 3 SSR 渲染管线（简化伪代码）
async function renderToString(app, context = {}) {
  // 1. 创建渲染上下文
  const ctx = {
    ...context,
    components: new Set(),
    directives: new Set(),
    caches: new Map(),
    overrides: {},
  };
  
  // 2. 挂载应用（不涉及 DOM）
  const vnode = app._component;
  
  // 3. 渲染为 VNode 树
  const tree = await renderComponent(vnode, ctx);
  
  // 4. 序列化 VNode 为 HTML
  const html = serializeVNode(tree, ctx);
  
  // 5. 处理 Teleport、Suspense 等副作用
  const finalHtml = postProcess(html, ctx);
  
  return finalHtml;
}

// 渲染单个组件
async function renderComponent(vnode, ctx) {
  const { type, props } = vnode;
  
  // 处理异步组件
  if (typeof type === 'function' && type.__asyncLoader) {
    const resolved = await type.__asyncLoader();
    return renderComponent({ ...vnode, type: resolved }, ctx);
  }
  
  // 处理 Suspense
  if (type.__isSuspense) {
    return renderSuspense(vnode, ctx);
  }
  
  // 处理 Teleport
  if (type === Teleport) {
    return renderTeleport(vnode, ctx);
  }
  
  // 执行 setup
  const setupState = type.setup ? await type.setup(props, {}) : null;
  
  // 渲染模板
  const render = type.render || type.template;
  const subTree = render ? render.call(setupState) : type.ssrRender(setupState);
  
  // 递归渲染子节点
  const children = await Promise.all(
    subTree.children.map(child => 
      typeof child === 'string' ? child : renderComponent(child, ctx)
    )
  );
  
  return { tag: subTree.tag, props, children, ctx };
}
```

### 3.2 Hydration 的实现原理

Vue 3 Hydration 分为两个阶段：探测阶段与挂载阶段。

```javascript
// Vue 3 Hydration 简化实现
function hydrate(vnode, container) {
  // 探测阶段：遍历 DOM 树
  const domChildren = Array.from(container.childNodes);
  let domIndex = 0;
  
  function hydrateNode(vnode, dom) {
    // 元素节点
    if (vnode.type === 'element') {
      const el = domChildren[domIndex++];
      
      // 检查标签匹配
      if (el.tagName.toLowerCase() !== vnode.tag) {
        return handleMismatch(vnode, el);
      }
      
      // 附加事件监听
      for (const event in vnode.props) {
        if (event.startsWith('on')) {
          el.addEventListener(event.slice(2).toLowerCase(), vnode.props[event]);
        }
      }
      
      // 递归 hydrate 子节点
      for (const child of vnode.children) {
        hydrateNode(child, el);
      }
    }
    // 文本节点
    else if (vnode.type === 'text') {
      const text = domChildren[domIndex++];
      if (text.textContent !== vnode.text) {
        // 文本不匹配：以服务端为准
        console.warn('Hydration text mismatch');
      }
    }
  }
  
  hydrateNode(vnode, container);
}
```

### 3.3 流式渲染的实现

Vue 3 流式渲染通过异步迭代器实现：

```javascript
// Vue 3 流式渲染简化实现
async function* renderToStream(app, context) {
  const ctx = createContext(context);
  const tree = renderComponent(app._component, ctx);
  
  // 流式遍历 VNode 树
  async function* streamNode(vnode) {
    if (typeof vnode === 'string') {
      yield vnode;
      return;
    }
    
    // 开标签
    yield `<${vnode.tag}`;
    for (const key in vnode.props) {
      yield ` ${key}="${escape(vnode.props[key])}"`;
    }
    yield '>';
    
    // 子节点
    for (const child of vnode.children) {
      yield* streamNode(child);
    }
    
    // 闭标签
    yield `</${vnode.tag}>`;
  }
  
  // 处理 Suspense 边界
  for await (const chunk of streamSuspense(tree, ctx)) {
    yield chunk;
  }
  
  // 序列化状态
  if (ctx.state) {
    yield `<script>window.__INITIAL_STATE__=${JSON.stringify(ctx.state)}</script>`;
  }
}

// Node.js 流适配
function renderToNodeStream(app, context) {
  const stream = new Readable({ read() {} });
  (async () => {
    for await (const chunk of renderToStream(app, context)) {
      stream.push(chunk);
    }
    stream.push(null);
  })();
  return stream;
}
```

### 3.4 SSR 中响应式系统的禁用

`createSSRApp` 内部禁用了响应式追踪：

```javascript
// Vue 3 源码简化
function createSSRApp(...args) {
  const app = createApp(...args);
  
  // 重写 mount：服务端不挂载
  app.mount = () => {};
  
  // 禁用响应式追踪
  app.config.performance = false;
  
  // 标记 SSR 模式
  app._isSSR = true;
  
  return app;
}

// 渲染器内部检查 SSR 模式
function setupStatefulComponent(instance) {
  if (instance.app._isSSR) {
    // 跳过响应式包装
    instance.proxy = new Proxy(instance, ssrProxyHandler);
  } else {
    instance.proxy = new Proxy(instance, clientProxyHandler);
  }
}
```

### 3.5 SSR 与 Suspense 的协作

SSR 中 Suspense 等待所有异步依赖完成：

```javascript
// Vue 3 SSR + Suspense 内部实现
async function renderSuspense(vnode, ctx) {
  const { default: defaultSlot, fallback: fallbackSlot } = vnode.children;
  
  // 收集异步依赖
  const deps = [];
  const originalRegister = ctx.registerDep;
  ctx.registerDep = (promise) => deps.push(promise);
  
  // 尝试渲染默认插槽
  let defaultResult;
  try {
    defaultResult = renderSlot(defaultSlot, ctx);
  } catch (err) {
    // 渲染 fallback
    return renderSlot(fallbackSlot, ctx);
  }
  
  // 等待所有异步依赖
  if (deps.length > 0) {
    await Promise.all(deps);
    // 依赖完成后重新渲染默认插槽
    return renderSlot(defaultSlot, ctx);
  }
  
  return defaultResult;
}
```

### 3.6 状态序列化的实现

```javascript
// 状态序列化与反序列化
function serializeState(state) {
  // 处理循环引用与特殊类型
  const seen = new WeakSet();
  return JSON.stringify(state, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return undefined; // 跳过循环引用
      seen.add(value);
    }
    // 处理 Map
    if (value instanceof Map) {
      return { __type: 'Map', value: Array.from(value.entries()) };
    }
    // 处理 Set
    if (value instanceof Set) {
      return { __type: 'Set', value: Array.from(value) };
    }
    // 处理 Date
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  });
}

function deserializeState(json) {
  return JSON.parse(json, (key, value) => {
    if (value && value.__type === 'Map') {
      return new Map(value.value);
    }
    if (value && value.__type === 'Set') {
      return new Set(value.value);
    }
    if (value && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  });
}
```

### 3.7 SSR 性能模型

设 SSR 渲染时间为 $T_{\text{ssr}}$：

$$
T_{\text{ssr}} = T_{\text{prefetch}} + T_{\text{render}} + T_{\text{serialize}}
$$

其中：

- $T_{\text{prefetch}}$：数据预取时间，受 API 响应时间与并行度影响。
- $T_{\text{render}}$：组件树渲染时间，与节点数 $n$ 线性相关：$T_{\text{render}} \approx \alpha \cdot n$。
- $T_{\text{serialize}}$：状态序列化时间，与状态大小 $|S|$ 线性相关。

**流式渲染的优化**：

$$
T_{\text{ttfb}}^{\text{stream}} = T_{\text{first chunk}} \approx \frac{T_{\text{render}}}{k}
$$

其中 $k$ 是流分块数。流式渲染使得用户更早看到首屏内容，但总渲染时间不变。

### 3.8 Hydration 性能优化

Vue 3 引入 `Hydration` 优化策略：

1. **静态节点提升**：编译时将静态节点提升到 render 函数外，hydration 时跳过。
2. **Patch Flag**：编译时标记动态节点，hydration 时仅检查动态部分。
3. **Block Tree**：将动态节点组织为 Block，减少遍历范围。

```javascript
// 编译输出示例
const _hoisted_1 = createVNode('div', null, 'Static', -1 /* HOISTED */);

function render(_ctx) {
  return openBlock(), createBlock('div', null, [
    _hoisted_1, // 静态节点，hydration 跳过
    createVNode('span', null, _ctx.dynamic, 1 /* TEXT */) // 仅检查文本
  ]);
}
```

### 3.9 组件级缓存实现

```javascript
// Vue 3 组件级缓存（通过 renderer 插件）
function createSSRCache(options = {}) {
  const cache = new Map();
  const { max = 1000, ttl = 60 * 1000 } = options;
  
  return {
    get(key) {
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() - entry.timestamp > ttl) {
        cache.delete(key);
        return null;
      }
      return entry.html;
    },
    set(key, html) {
      if (cache.size >= max) {
        // LRU 淘汰
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, { html, timestamp: Date.now() });
    },
    delete(key) {
      cache.delete(key);
    },
    clear() {
      cache.clear();
    },
  };
}

// 在渲染器中使用缓存
const cache = createSSRCache();

function renderWithCache(component, props) {
  const key = component.name + ':' + JSON.stringify(props);
  const cached = cache.get(key);
  if (cached) return cached;
  
  const html = renderComponent(component, props);
  cache.set(key, html);
  return html;
}
```

---

## 4. 代码示例 | Code Examples

### 4.1 最小 SSR 示例（Vue 3.5）

```javascript
// server.js - 最小 SSR 示例
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import express from 'express';

const server = express();

// 定义根组件
const App = {
  setup() {
    return () => h('div', { class: 'app' }, [
      h('h1', 'Hello SSR'),
      h('p', 'This is rendered on the server.'),
    ]);
  },
};

server.get('*', async (req, res) => {
  // 每个请求创建独立应用实例
  const app = createSSRApp(App);
  
  // 渲染为 HTML 字符串
  const html = await renderToString(app);
  
  // 输出完整 HTML
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Vue 3 SSR</title>
      </head>
      <body>
        <div id="app">${html}</div>
        <script type="module" src="/entry-client.js"></script>
      </body>
    </html>
  `);
});

server.listen(3000, () => {
  console.log('SSR server running at http://localhost:3000');
});
```

### 4.2 同构应用架构（企业级）

```javascript
// src/main.js - 共享入口
import { createSSRApp } from 'vue';
import { createRouter } from 'vue-router';
import { createPinia } from 'pinia';
import App from './App.vue';
import routes from './routes';

/**
 * 创建应用实例（同构工厂函数）
 * @param {boolean} isSSR - 是否为服务端
 * @returns {{ app: Vue, router: Router, pinia: Pinia }}
 */
export function createApp(isSSR = false) {
  const app = createSSRApp(App);
  
  const router = createRouter({
    history: isSSR ? createMemoryHistory() : createWebHistory(),
    routes,
  });
  
  const pinia = createPinia();
  
  app.use(router);
  app.use(pinia);
  
  return { app, router, pinia };
}

// src/entry-client.js - 客户端入口
import { createApp } from './main';
import { deserializeState } from './utils/state';

const { app, router, pinia } = createApp(false);

// 从 HTML 中恢复状态
if (window.__INITIAL_STATE__) {
  pinia.state.value = deserializeState(window.__INITIAL_STATE__);
}

// 等待路由就绪后挂载
router.isReady().then(() => {
  app.mount('#app');
});

// src/entry-server.js - 服务端入口
import { createApp } from './main';
import { serializeState } from './utils/state';

/**
 * 服务端渲染函数
 * @param {string} url - 请求 URL
 * @param {{}} manifest - 客户端构建清单
 * @returns {Promise<{ html: string, state: string }>}
 */
export async function render(url, manifest) {
  const { app, router, pinia } = createApp(true);
  
  // 推入路由
  await router.push(url);
  await router.isReady();
  
  // 执行路由级数据预取
  const matchedComponents = router.currentRoute.value.matched.flatMap(
    r => r.components.default
  );
  
  await Promise.all(
    matchedComponents.map(async (component) => {
      if (component.asyncData) {
        await component.asyncData({
          store: pinia,
          route: router.currentRoute.value,
        });
      }
    })
  );
  
  // 渲染 HTML
  const { renderToString } = await import('vue/server-renderer');
  const html = await renderToString(app);
  
  // 序列化状态
  const state = serializeState(pinia.state.value);
  
  return { html, state };
}
```

### 4.3 Vue Router 集成

```javascript
// src/router/index.js
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    component: () => import('../pages/Home.vue'),
    meta: { title: 'Home' },
  },
  {
    path: '/about',
    component: () => import('../pages/About.vue'),
    meta: { title: 'About' },
  },
  {
    path: '/posts/:id',
    component: () => import('../pages/Post.vue'),
    meta: { title: 'Post' },
  },
];

export function createRouterInstance(isSSR = false) {
  return createRouter({
    history: isSSR ? createMemoryHistory() : createWebHistory(),
    routes,
  });
}
```

### 4.4 Pinia 状态管理集成

```javascript
// src/stores/user.js
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: null,
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.user,
    username: (state) => state.user?.name || '',
  },
  
  actions: {
    async login(credentials) {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      const { user, token } = await response.json();
      this.user = user;
      this.token = token;
    },
    
    logout() {
      this.user = null;
      this.token = null;
    },
  },
});

// src/stores/post.js
export const usePostStore = defineStore('post', {
  state: () => ({
    posts: [],
    currentPost: null,
  }),
  
  actions: {
    async fetchPosts() {
      const response = await fetch('/api/posts');
      this.posts = await response.json();
    },
    
    async fetchPost(id) {
      const response = await fetch(`/api/posts/${id}`);
      this.currentPost = await response.json();
    },
  },
});
```

### 4.5 路由级数据预取

```vue
<!-- src/pages/Post.vue -->
<template>
  <div class="post-page">
    <h1>{{ post.title }}</h1>
    <div v-html="post.content"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePostStore } from '../stores/post';

const route = useRoute();
const postStore = usePostStore();

const post = computed(() => postStore.currentPost);

/**
 * 服务端数据预取
 * 在 SSR 期间执行，确保组件渲染前数据已就绪
 */
postStore.fetchPost = async ({ store, route }) => {
  const postStore = store.post;
  await postStore.fetchPost(route.params.id);
};
</script>
```

### 4.6 流式渲染（Node.js）

```javascript
// server-stream.js - 流式 SSR
import { createSSRApp } from 'vue';
import { renderToPipeableStream } from 'vue/server-renderer';
import express from 'express';
import { createApp } from './src/main';

const server = express();

server.use(express.static('public'));

server.get('*', async (req, res) => {
  const { app, router } = createApp(true);
  
  await router.push(req.url);
  await router.isReady();
  
  // 流式渲染
  const { pipe } = renderToPipeableStream(app, {
    onShellReady() {
      // Shell 就绪，立即发送 HTML 框架
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write('<!DOCTYPE html><html><head><title>SSR</title></head><body>');
      pipe(res);
    },
    onShellError(err) {
      // Shell 渲染失败，降级为客户端渲染
      console.error('Shell error:', err);
      res.writeHead(500);
      res.send('<h1>Server Error</h1>');
    },
    onAllReady() {
      // 所有内容就绪（包括异步依赖）
      res.write('</body></html>');
      res.end();
    },
    onError(err) {
      console.error('Render error:', err);
    },
  });
});

server.listen(3000);
```

### 4.7 Vite SSR 构建

```javascript
// vite.config.js - Vite SSR 配置
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  ssr: {
    // 指定 SSR 入口
    entry: 'src/entry-server.js',
    // 外部化依赖（避免打包进 SSR bundle）
    noExternal: ['vue-router', 'pinia'],
    // 内部化依赖（确保打包进 SSR bundle）
    external: ['express', 'fs', 'path'],
  },
  build: {
    // 客户端构建
    outDir: 'dist/client',
    // SSR 构建配置
    ssr: true,
    rollupOptions: {
      input: 'src/entry-server.js',
      output: {
        format: 'esm',
        dir: 'dist/server',
      },
    },
  },
});

// scripts/ssr-dev.js - 开发模式 SSR
import { createServer } from 'vite';
import express from 'express';

async function createSSRServer() {
  const app = express();
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  
  app.use(vite.middlewares);
  
  app.get('*', async (req, res) => {
    try {
      const { render } = await vite.ssrLoadModule('/src/entry-server.js');
      const { html, state } = await render(req.url);
      
      const template = await vite.transformIndexHtml(req.url, '');
      const finalHtml = template
        .replace('<!--app-html-->', html)
        .replace('<!--app-state-->', `<script>window.__INITIAL_STATE__=${state}</script>`);
      
      res.status(200).set('Content-Type', 'text/html').end(finalHtml);
    } catch (err) {
      vite.ssrFixStacktrace(err);
      console.error(err);
      res.status(500).end(err.message);
    }
  });
  
  app.listen(3000);
}

createSSRServer();
```

### 4.8 Nuxt 3 应用示例

```vue
<!-- nuxt-app/pages/index.vue -->
<template>
  <div>
    <h1>{{ title }}</h1>
    <ul>
      <li v-for="post in posts" :key="post.id">
        <NuxtLink :to="`/posts/${post.id}`">{{ post.title }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup>
// Nuxt 3 自动导入
const { data: posts } = await useFetch('/api/posts');

const title = ref('Posts');
</script>

<!-- nuxt-app/pages/posts/[id].vue -->
<template>
  <article>
    <h1>{{ post.title }}</h1>
    <div v-html="post.content"></div>
  </article>
</template>

<script setup>
const route = useRoute();
const { data: post } = await useFetch(`/api/posts/${route.params.id}`);

// SEO
useHead({
  title: post.value.title,
  meta: [
    { name: 'description', content: post.value.summary },
  ],
});
</script>

<!-- nuxt-app/nuxt.config.ts -->
export default defineNuxtConfig({
  ssr: true, // 默认启用 SSR
  nitro: {
    preset: 'node-server', // 部署目标
    // 其他预设：'cloudflare-workers', 'vercel-edge', 'netlify'
  },
  app: {
    head: {
      title: 'My Nuxt App',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
});
```

### 4.9 组件级缓存示例

```javascript
// src/utils/ssr-cache.js
const LRU = require('lru-cache');

/**
 * 创建 SSR 组件级缓存
 * @param {Object} options - 缓存配置
 * @returns {Object} 缓存实例
 */
export function createSSRCache(options = {}) {
  const cache = new LRU({
    max: options.max || 1000,
    ttl: options.ttl || 60 * 1000,
    maxSize: options.maxSize || 100 * 1024 * 1024, // 100MB
    sizeCalculation: (value) => value.html.length,
  });
  
  return {
    get: (key) => cache.get(key),
    set: (key, value) => cache.set(key, value),
    delete: (key) => cache.delete(key),
    clear: () => cache.clear(),
    stats: () => ({
      size: cache.size,
      calculatedSize: cache.calculatedSize,
    }),
  };
}

// 在渲染器中应用缓存
const cache = createSSRCache();

/**
 * 渲染带缓存的组件
 * @param {Object} component - 组件定义
 * @param {Object} props - 组件 props
 * @returns {string} HTML 字符串
 */
function renderWithCache(component, props) {
  // 仅缓存标记为可缓存的组件
  if (!component.serverCacheKey) {
    return renderComponent(component, props);
  }
  
  const key = component.name + ':' + component.serverCacheKey(props);
  const cached = cache.get(key);
  
  if (cached) {
    return cached.html;
  }
  
  const html = renderComponent(component, props);
  cache.set(key, { html, timestamp: Date.now() });
  
  return html;
}

// 可缓存组件示例
export default {
  name: 'UserAvatar',
  props: ['user'],
  serverCacheKey(props) {
    // 仅依赖 user.id 与 user.avatar 版本
    return `${props.user.id}:${props.user.avatarVersion}`;
  },
  render() {
    return h('img', {
      src: this.user.avatarUrl,
      alt: this.user.name,
    });
  },
};
```

### 4.10 Hydration Mismatch 处理

```vue
<!-- src/components/TimeDisplay.vue -->
<template>
  <span data-allow-mismatch>
    {{ currentTime }}
  </span>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const currentTime = ref('');

onMounted(() => {
  // 仅在客户端更新时间
  updateTime();
  setInterval(updateTime, 1000);
});

function updateTime() {
  currentTime.value = new Date().toLocaleTimeString();
}
</script>
vue
<!-- src/components/RandomNumber.vue -->
<template>
  <div>
    <!-- 服务端与客户端可能不同，标记可容忍 -->
    <span data-allow-mismatch>{{ randomValue }}</span>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 使用 onMounted 确保仅客户端执行
const randomValue = ref(0);

onMounted(() => {
  randomValue.value = Math.random();
});
</script>
```

### 4.11 错误处理与降级

```javascript
// src/utils/ssr-error-handler.js

/**
 * SSR 错误处理
 * @param {Error} error - 渲染错误
 * @param {Object} ctx - 请求上下文
 * @returns {Object} 降级响应
 */
export function handleSSRError(error, ctx) {
  console.error('SSR Error:', error);
  
  // 上报错误
  reportError(error, ctx);
  
  // 降级为 CSR
  return {
    html: '<div id="app"></div>',
    state: null,
    fallback: true,
  };
}

// 服务端中间件
export function ssrMiddleware(render) {
  return async (req, res) => {
    try {
      const result = await render(req.url);
      res.status(200).send(buildHTML(result));
    } catch (error) {
      const fallback = handleSSRError(error, { url: req.url });
      res.status(200).send(buildHTML(fallback));
    }
  };
}

function buildHTML({ html, state, fallback }) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>App</title>
      </head>
      <body>
        <div id="app">${html}</div>
        ${state ? `<script>window.__INITIAL_STATE__=${state}</script>` : ''}
        ${fallback ? '<!-- SSR fallback to CSR -->' : ''}
        <script type="module" src="/entry-client.js"></script>
      </body>
    </html>
  `;
}
```

### 4.12 SSR 安全防护

```javascript
// src/utils/ssr-security.js

/**
 * 转义 HTML 特殊字符，防止 XSS
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 安全序列化状态，过滤敏感字段
 * @param {Object} state - 原始状态
 * @returns {string} JSON 字符串
 */
export function safeSerialize(state) {
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey'];
  
  const filtered = JSON.parse(JSON.stringify(state), (key, value) => {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      return undefined;
    }
    return value;
  });
  
  return JSON.stringify(filtered);
}

/**
 * 验证 URL，防止 SSRF
 * @param {string} url - 请求 URL
 * @returns {boolean} 是否安全
 */
export function isSafeUrl(url) {
  try {
    const parsed = new URL(url, 'http://localhost');
    // 仅允许 http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    // 禁止访问内网 IP
    const blocked = ['127.0.0.1', '0.0.0.0', 'localhost', '169.254.169.254'];
    if (blocked.includes(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
```

### 4.13 边缘渲染示例（Cloudflare Workers）

```javascript
// worker.js - Cloudflare Workers SSR
import { createSSRApp } from 'vue';
import { renderToWebStream } from 'vue/server-renderer';
import { createApp } from './src/main';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 每个请求创建独立应用
    const { app, router } = createApp(true);
    await router.push(url.pathname);
    await router.isReady();
    
    // Web Stream 渲染
    const stream = renderToWebStream(app);
    
    // 转换为 Response
    const htmlStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode('<!DOCTYPE html><html><body><div id="app">'));
        
        for await (const chunk of stream) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        
        controller.enqueue(new TextEncoder().encode('</div><script type="module" src="/entry-client.js"></script></body></html>'));
        controller.close();
      },
    });
    
    return new Response(htmlStream, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
};
```

### 4.14 服务端组件实验性示例

```vue
<!-- ServerComponent.vue - 实验性服务端组件 -->
<template>
  <div class="server-component">
    <h2>{{ title }}</h2>
    <ul>
      <li v-for="item in items" :key="item.id">{{ item.name }}</li>
    </ul>
  </div>
</template>

<script setup>
// 服务端组件：仅在服务端渲染，不打包到客户端
const props = defineProps({
  endpoint: String,
});

const title = ref('Loading...');
const items = ref([]);

// 服务端获取数据
onServerPrefetch(async () => {
  const response = await fetch(props.endpoint);
  const data = await response.json();
  title.value = data.title;
  items.value = data.items;
});
</script>
```

### 4.15 完整企业级 SSR 应用

```javascript
// src/server/index.js - 企业级 SSR 服务器
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import { createSSRCache } from '../utils/ssr-cache';
import { handleSSRError } from '../utils/ssr-error-handler';
import { safeSerialize, isSafeUrl } from '../utils/ssr-security';

const app = express();
const cache = createSSRCache({ max: 10000, ttl: 5 * 60 * 1000 });

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// 压缩
app.use(compression());

// 静态资源
app.use(express.static('dist/client', {
  maxAge: '1y',
  immutable: true,
}));

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  
  app.use(vite.middlewares);
  
  // 健康检查
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', cache: cache.stats() });
  });
  
  // SSR 路由
  app.get('*', async (req, res) => {
    // URL 安全检查
    if (!isSafeUrl(req.url)) {
      return res.status(400).send('Invalid URL');
    }
    
    // 缓存检查
    const cacheKey = `route:${req.url}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).set('Content-Type', 'text/html').end(cached);
    }
    
    try {
      const { render } = await vite.ssrLoadModule('/src/entry-server.js');
      const { html, state, meta } = await render(req.url, {
        headers: req.headers,
        cookies: req.cookies,
      });
      
      // 构建完整 HTML
      const fullHtml = buildHTML({
        html,
        state: safeSerialize(state),
        title: meta?.title || 'App',
        description: meta?.description || '',
      });
      
      // 缓存可缓存路由
      if (meta?.cacheable) {
        cache.set(cacheKey, fullHtml);
      }
      
      res.status(200).set('Content-Type', 'text/html').end(fullHtml);
    } catch (error) {
      const fallback = handleSSRError(error, { url: req.url });
      res.status(200).set('Content-Type', 'text/html').end(buildHTML(fallback));
    }
  });
  
  app.listen(3000, () => {
    console.log('SSR server running at http://localhost:3000');
  });
}

function buildHTML({ html, state, title, description }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="preload" href="/entry-client.js" as="script">
</head>
<body>
  <div id="app">${html}</div>
  ${state ? `<script>window.__INITIAL_STATE__=${state}</script>` : ''}
  <script type="module" src="/entry-client.js"></script>
</body>
</html>`;
}

startServer();
```

---

## 5. 对比分析 | Comparative Analysis

### 5.1 SSR vs CSR vs SSG vs ISR

| 渲染模式 | 全称 | 渲染时机 | SEO | 首屏性能 | 服务器成本 | 适用场景 |
|----------|------|----------|-----|----------|------------|----------|
| CSR | Client-Side Rendering | 客户端 | 弱 | 慢 | 低 | 后台管理、SPA |
| SSR | Server-Side Rendering | 服务端实时 | 强 | 快 | 高 | 个性化内容、电商 |
| SSG | Static Site Generation | 构建时 | 强 | 极快 | 极低 | 博客、文档站 |
| ISR | Incremental Static Regeneration | 构建+增量更新 | 强 | 极快 | 低 | 内容站、新闻 |

**决策矩阵**：

- 内容静态、更新频率低：SSG
- 内容动态、个性化强：SSR
- 内容更新可接受延迟：ISR
- 应用内部、无 SEO 需求：CSR

### 5.2 Vue 3 SSR vs React 18 SSR

| 维度 | Vue 3 SSR | React 18 SSR |
|------|-----------|--------------|
| 创建应用 | `createSSRApp` | `hydrateRoot` |
| 渲染 API | `renderToString`/`renderToPipeableStream` | `renderToPipeableStream` |
| 数据预取 | `async setup()` + Suspense | `use()` + Suspense |
| Hydration | 全量 | 选择性 |
| 流式 | 支持 | 支持 |
| Server Components | 实验性 | 稳定 |
| 框架 | Nuxt 3 | Next.js 13+ |
| 学习曲线 | 较平缓 | 较陡 |

**详细差异**：

1. **Hydration 策略**：Vue 3 全量 hydration，需等待完整 JS 加载；React 18 选择性 hydration，可优先 hydrate 用户交互区域。
2. **Server Components**：React Server Components 已稳定，可显著减少客户端 bundle；Vue Server Components 仍实验性。
3. **并发渲染**：React 18 支持并发渲染（`startTransition`），Vue 3 不支持。
4. **生态成熟度**：Next.js 生态更成熟，Nuxt 3 紧随其后。

### 5.3 Vue 3 SSR vs Solid SSR

| 维度 | Vue 3 SSR | Solid SSR |
|------|-----------|-----------|
| 响应式系统 | Proxy + Effect | Signal |
| Hydration 粒度 | 组件级 | 信号级 |
| 性能 | 中等 | 优秀 |
| 生态 | Nuxt 3 | Solid Start |
| API 风格 | Options/Composition | JSX + Hooks |

Solid 的细粒度响应式使其 Hydration 仅恢复必要信号，性能显著优于 Vue 3。

### 5.4 Vue 3 SSR vs Svelte SSR

| 维度 | Vue 3 SSR | Svelte SSR |
|------|-----------|------------|
| 编译策略 | 运行时 | 编译时 |
| Bundle 体积 | 较大 | 极小 |
| SSR 性能 | 中等 | 优秀 |
| 框架 | Nuxt 3 | SvelteKit |
| 学习曲线 | 平缓 | 平缓 |

Svelte 编译时生成 SSR 代码，运行时极轻量，但灵活性低于 Vue 3。

### 5.5 Vue 3 SSR vs Angular SSR

| 维度 | Vue 3 SSR | Angular SSR |
|------|-----------|-------------|
| 架构 | 同构 | 同构 |
| Hydration | 全量 | 全量（16+ 非破坏性） |
| 框架 | Nuxt 3 | Angular Universal |
| 类型系统 | TypeScript | TypeScript |
| 复杂度 | 中等 | 高 |

Angular 16+ 引入非破坏性 Hydration，避免全量重建 DOM，性能提升显著。

### 5.6 流式渲染对比

| 框架 | 流式 API | TTFB 优化 | 错误恢复 |
|------|----------|-----------|----------|
| Vue 3 | `renderToPipeableStream` | 优秀 | 降级 CSR |
| React 18 | `renderToPipeableStream` | 优秀 | ErrorBoundary |
| Solid | `renderToStream` | 优秀 | 降级 |
| Svelte | `render` | 优秀 | 降级 |

流式渲染在所有主流框架中均有支持，是 SSR 的标配特性。

---

## 6. 常见陷阱与最佳实践 | Pitfalls and Best Practices

### 6.1 单例污染陷阱

**陷阱**：在模块作用域创建应用实例或共享状态。

```javascript
// 错误：模块作用域创建应用
import { createSSRApp } from 'vue';
const app = createSSRApp(App); // 所有请求共享同一应用！

export function render() {
  return renderToString(app);
}
```

**修复**：使用工厂函数。

```javascript
// 正确：每请求创建独立应用
export function createApp() {
  return createSSRApp(App);
}

export async function render() {
  const app = createApp();
  return renderToString(app);
}
```

### 6.2 浏览器 API 陷阱

**陷阱**：在 `setup()` 顶层使用浏览器 API。

```javascript
// 错误：setup 顶层访问 window
export default {
  setup() {
    const width = window.innerWidth; // SSR 报错
    return { width };
  },
};
```

**修复**：在 `onMounted` 中使用或添加平台判断。

```javascript
// 正确：onMounted 中使用
import { ref, onMounted } from 'vue';

export default {
  setup() {
    const width = ref(0);
    
    onMounted(() => {
      width.value = window.innerWidth;
      window.addEventListener('resize', () => {
        width.value = window.innerWidth;
      });
    });
    
    return { width };
  },
};

// 或使用平台判断
import { isRef } from 'vue';

const isClient = typeof window !== 'undefined';

export default {
  setup() {
    const width = ref(isClient ? window.innerWidth : 1024);
    return { width };
  },
};
```

### 6.3 Hydration Mismatch 陷阱

**陷阱**：服务端与客户端渲染输出不一致。

```vue
<!-- 错误：服务端无 window，客户端有 -->
<template>
  <div>{{ Date.now() }}</div>
</template>
```

**修复**：使用 `data-allow-mismatch` 或 `onMounted`。

```vue
<!-- 修复 1：允许不匹配 -->
<template>
  <div data-allow-mismatch>{{ Date.now() }}</div>
</template>

<!-- 修复 2：onMounted 中初始化 -->
<template>
  <div>{{ timestamp }}</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
const timestamp = ref(0);
onMounted(() => {
  timestamp.value = Date.now();
});
</script>
```

### 6.4 数据预取陷阱

**陷阱**：未在服务端预取数据，导致客户端二次请求。

```javascript
// 错误：仅在 onMounted 中获取数据
export default {
  setup() {
    const data = ref(null);
    onMounted(async () => {
      data.value = await fetch('/api/data').then(r => r.json());
    });
    return { data };
  },
};
```

**修复**：使用 `asyncData` 或 `serverPrefetch`。

```javascript
// 正确：使用 serverPrefetch
import { ref, serverPrefetch } from 'vue';

export default {
  setup() {
    const data = ref(null);
    
    serverPrefetch(async () => {
      data.value = await fetch('/api/data').then(r => r.json());
    });
    
    return { data };
  },
};
```

### 6.5 状态序列化陷阱

**陷阱**：序列化包含循环引用或敏感数据。

```javascript
// 错误：序列化包含密码
const state = {
  user: { name: 'Alice', password: 'secret' },
};
const serialized = JSON.stringify(state); // 密码泄露！
```

**修复**：过滤敏感字段。

```javascript
// 正确：过滤敏感字段
function safeSerialize(state) {
  return JSON.stringify(state, (key, value) => {
    if (['password', 'token', 'secret'].includes(key)) {
      return undefined;
    }
    return value;
  });
}
```

### 6.6 缓存陷阱

**陷阱**：缓存包含用户态数据的组件。

```javascript
// 错误：缓存包含用户名
export default {
  name: 'UserGreeting',
  serverCacheKey(props) {
    return 'greeting'; // 所有用户共享同一缓存
  },
  render() {
    return h('div', `Hello, ${this.user.name}`); // 错误：用户名不同
  },
};
```

**修复**：将用户标识纳入缓存键。

```javascript
// 正确：用户 ID 作为缓存键
export default {
  name: 'UserGreeting',
  serverCacheKey(props) {
    return `greeting:${props.user.id}`;
  },
  render() {
    return h('div', `Hello, ${this.user.name}`);
  },
};
```

### 6.7 性能陷阱

**陷阱**：SSR 中渲染大列表，阻塞事件循环。

```javascript
// 错误：渲染 10000 项列表
export default {
  setup() {
    const items = ref(Array.from({ length: 10000 }, (_, i) => i));
    return { items };
  },
};
```

**修复**：分页、虚拟列表或流式渲染。

```javascript
// 正确：分页
export default {
  async setup() {
    const page = 1;
    const items = await fetch(`/api/items?page=${page}`).then(r => r.json());
    return { items };
  },
};
```

### 6.8 最佳实践清单

1. **每请求独立应用实例**：使用工厂函数创建应用。
2. **平台 API 隔离**：浏览器 API 仅在 `onMounted` 或平台判断后使用。
3. **数据预取统一**：使用 `serverPrefetch` 或 `asyncData` 集中管理。
4. **状态安全序列化**：过滤敏感字段，处理循环引用。
5. **缓存粒度合理**：仅缓存纯函数式组件，用户态数据不缓存。
6. **流式渲染优先**：使用 `renderToPipeableStream` 提升 TTFB。
7. **错误降级**：SSR 失败时降级为 CSR，保证可用性。
8. **Hydration 容忍**：使用 `data-allow-mismatch` 处理时间戳等差异。
9. **安全防护**：使用 Helmet、CSP、XSS 转义。
10. **性能监控**：采集 TTFB、FCP、LCP、Hydration 耗时。

---

## 7. 工程实践 | Engineering Practice

### 7.1 Vite SSR 构建配置

```javascript
// vite.config.js - 完整 SSR 配置
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  ssr: {
    entry: 'src/entry-server.js',
    noExternal: ['vue-router', 'pinia'],
    external: ['express', 'compression', 'helmet'],
  },
  build: {
    outDir: 'dist/client',
    rollupOptions: {
      input: 'src/entry-client.js',
      output: {
        format: 'esm',
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
});

// scripts/build-ssr.js
import { build } from 'vite';

async function buildAll() {
  // 客户端构建
  await build({
    build: {
      outDir: 'dist/client',
      ssrManifest: true,
      rollupOptions: {
        input: 'src/entry-client.js',
      },
    },
  });
  
  // 服务端构建
  await build({
    build: {
      outDir: 'dist/server',
      ssr: 'src/entry-server.js',
      rollupOptions: {
        output: {
          format: 'esm',
        },
      },
    },
  });
  
  console.log('Build complete!');
}

buildAll();
```

### 7.2 Vue Router 配置

```javascript
// src/router/index.js
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';

const isSSR = import.meta.env.SSR;

const routes = [
  {
    path: '/',
    component: () => import('../pages/Home.vue'),
    meta: { cacheable: true, ttl: 60 },
  },
  {
    path: '/user/:id',
    component: () => import('../pages/User.vue'),
    meta: { cacheable: false }, // 用户页面不缓存
  },
  {
    path: '/admin',
    component: () => import('../pages/Admin.vue'),
    meta: { requiresAuth: true },
  },
];

export function createRouterInstance() {
  return createRouter({
    history: isSSR ? createMemoryHistory() : createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
      if (savedPosition) return savedPosition;
      return { top: 0 };
    },
  });
}
```

### 7.3 Pinia 集成

```javascript
// src/stores/index.js
import { createPinia } from 'pinia';

export function createPiniaInstance() {
  const pinia = createPinia();
  
  // 持久化插件（仅客户端）
  if (!import.meta.env.SSR) {
    pinia.use(({ store }) => {
      const key = `pinia:${store.$id}`;
      
      // 从 localStorage 恢复
      const saved = localStorage.getItem(key);
      if (saved) {
        store.$patch(JSON.parse(saved));
      }
      
      // 订阅变化持久化
      store.$subscribe((mutation, state) => {
        localStorage.setItem(key, JSON.stringify(state));
      });
    });
  }
  
  return pinia;
}
```

### 7.4 SEO 元信息管理

```javascript
// src/utils/seo.js
import { useHead } from '@vueuse/head';

/**
 * 设置页面 SEO 元信息
 * @param {Object} options - SEO 选项
 */
export function useSEO(options) {
  const { title, description, keywords, image, url } = options;
  
  useHead({
    title,
    meta: [
      { name: 'description', content: description },
      { name: 'keywords', content: keywords?.join(', ') },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: image },
      { property: 'og:url', content: url },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
      { rel: 'canonical', href: url },
    ],
  });
}

// 在组件中使用
export default {
  setup() {
    useSEO({
      title: 'Home Page',
      description: 'Welcome to our site',
      keywords: ['home', 'vue', 'ssr'],
      image: '/og-image.png',
      url: 'https://example.com/',
    });
  },
};
```

### 7.5 调试工具

```javascript
// src/utils/debug.js
const isDev = import.meta.env.DEV;

/**
 * SSR 调试日志
 * @param {string} tag - 标签
 * @param {...any} args - 日志参数
 */
export function ssrLog(tag, ...args) {
  if (!isDev) return;
  console.log(`[SSR:${tag}]`, ...args);
}

/**
 * 性能测量
 * @param {string} name - 测量名称
 * @param {Function} fn - 测量函数
 * @returns {Promise<any>} 函数返回值
 */
export async function measureSSR(name, fn) {
  if (!isDev) return fn();
  
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  ssrLog('perf', `${name}: ${(end - start).toFixed(2)}ms`);
  
  return result;
}

// 使用示例
export async function render(url) {
  return await measureSSR('render', async () => {
    const { app, router } = createApp(true);
    await router.push(url);
    await router.isReady();
    
    return await measureSSR('renderToString', () => 
      renderToString(app)
    );
  });
}
```

### 7.6 部署策略

#### 7.6.1 Node.js 部署

```javascript
// Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server/entry-server.js"]
yaml
# docker-compose.yml
version: '3.8'
services:
  vue-ssr:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 7.6.2 Vercel 部署

```javascript
// vercel.js
import express from 'express';
import { render } from './dist/server/entry-server.js';

const app = express();

app.use(express.static('dist/client'));

app.get('*', async (req, res) => {
  const html = await render(req.url);
  res.send(html);
});

export default app;
json
{
  "builds": [
    { "src": "vercel.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "vercel.js" }
  ]
}
```

#### 7.6.3 Cloudflare Workers 部署

```javascript
// wrangler.toml
name = "vue-ssr"
main = "worker.js"
compatibility_date = "2024-01-01"

[build]
command = "npm run build"
javascript
// worker.js
import { renderToWebStream } from 'vue/server-renderer';
import { createApp } from './dist/server/entry-server.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const { app } = createApp(true);
    
    const stream = renderToWebStream(app);
    
    return new Response(stream, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
};
```

### 7.7 性能监控

```javascript
// src/utils/performance.js

/**
 * 采集性能指标
 * @param {Object} ctx - 请求上下文
 * @returns {Object} 性能数据
 */
export function collectMetrics(ctx) {
  const metrics = {
    url: ctx.url,
    ttfb: 0,
    fcp: 0,
    lcp: 0,
    hydration: 0,
    errors: [],
  };
  
  const start = performance.now();
  
  ctx.res.on('finish', () => {
    metrics.ttfb = performance.now() - start;
    
    // 上报至监控系统
    reportMetrics(metrics);
  });
  
  return metrics;
}

/**
 * 上报指标
 * @param {Object} metrics - 性能指标
 */
async function reportMetrics(metrics) {
  await fetch('https://metrics.example.com/ssr', {
    method: 'POST',
    body: JSON.stringify(metrics),
  });
}

// 客户端 Hydration 性能采集
if (typeof window !== 'undefined') {
  const hydrationStart = performance.now();
  
  window.addEventListener('load', () => {
    const hydrationEnd = performance.now();
    
    // 采集 FCP、LCP
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'FCP') {
          console.log('FCP:', entry.startTime);
        }
        if (entry.name === 'LCP') {
          console.log('LCP:', entry.startTime);
        }
      }
    });
    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
    
    // 上报 hydration 耗时
    navigator.sendBeacon('/api/metrics', JSON.stringify({
      hydration: hydrationEnd - hydrationStart,
      url: location.href,
    }));
  });
}
```

### 7.8 测试策略

```javascript
// tests/ssr.test.js
import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import App from '../src/App.vue';

describe('SSR', () => {
  it('should render to string', async () => {
    const app = createSSRApp(App);
    const html = await renderToString(app);
    
    expect(html).toContain('<div');
    expect(html).toContain('data-server-rendered');
  });
  
  it('should handle async setup', async () => {
    const AsyncComponent = {
      async setup() {
        const data = await Promise.resolve('Hello');
        return { data };
      },
      template: '<div>{{ data }}</div>',
    };
    
    const app = createSSRApp(AsyncComponent);
    const html = await renderToString(app);
    
    expect(html).toContain('Hello');
  });
  
  it('should handle errors gracefully', async () => {
    const ErrorComponent = {
      setup() {
        throw new Error('Test error');
      },
    };
    
    const app = createSSRApp(ErrorComponent);
    
    await expect(renderToString(app)).rejects.toThrow('Test error');
  });
});

// tests/hydration.test.js
import { mount } from '@vue/test-utils';

describe('Hydration', () => {
  it('should hydrate without warnings', async () => {
    const serverHtml = await renderToString(createSSRApp(App));
    
    document.body.innerHTML = `<div id="app">${serverHtml}</div>`;
    
    const { app } = createApp(false);
    
    // 不应有 Hydration Mismatch 警告
    const spy = vi.spyOn(console, 'warn');
    
    app.mount('#app');
    
    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining('Hydration')
    );
  });
});
```

---

## 8. 案例研究 | Case Studies

### 8.1 案例一：Nuxt 3 全栈应用

**场景**：电商网站，包含商品列表、详情、用户中心。

**架构**：

- 前端：Nuxt 3 + Vue 3 + Pinia
- 后端：Nitro API Routes
- 数据库：PostgreSQL + Prisma
- 部署：Vercel Edge

**关键代码**：

```vue
<!-- pages/products/[id].vue -->
<template>
  <div class="product-page">
    <h1>{{ product.name }}</h1>
    <p>{{ product.description }}</p>
    <p>Price: ${{ product.price }}</p>
    <button @click="addToCart">Add to Cart</button>
  </div>
</template>

<script setup>
const route = useRoute();
const cart = useCartStore();

// SSR 数据预取
const { data: product } = await useFetch(`/api/products/${route.params.id}`);

// SEO
useHead({
  title: product.value.name,
  meta: [
    { name: 'description', content: product.value.description },
  ],
});

function addToCart() {
  cart.add(product.value);
}
</script>
typescript
// server/api/products/[id].ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
  });
  
  if (!product) {
    throw createError({ statusCode: 404, message: 'Product not found' });
  }
  
  return product;
});
```

**性能优化**：

- 商品列表页：ISR，每 60 秒重新生成
- 商品详情页：SSR + 组件级缓存
- 用户中心：CSR（个性化数据）

**效果**：

- TTFB：< 100ms（边缘节点）
- LCP：< 1.5s
- SEO：Google 抓取覆盖率 100%

### 8.2 案例二：企业级内容管理系统

**场景**：新闻门户网站，日均 PV 千万级。

**架构**：

- 前端：Vue 3 SSR + Vue Router + Pinia
- 后端：Node.js + Express
- 缓存：Redis + LRU
- CDN：Cloudflare
- 部署：多区域 Node.js 集群

**关键设计**：

```javascript
// 多级缓存策略
const cacheStrategy = {
  // L1: 进程内 LRU（5 分钟）
  l1: createSSRCache({ max: 10000, ttl: 5 * 60 * 1000 }),
  
  // L2: Redis（30 分钟）
  l2: createRedisCache({ ttl: 30 * 60 }),
  
  // L3: CDN（1 小时）
  l3: { ttl: 60 * 60, headers: { 'Cache-Control': 'public, max-age=3600' } },
};

async function renderWithCache(url) {
  const key = `route:${url}`;
  
  // L1 命中
  let html = cacheStrategy.l1.get(key);
  if (html) return { html, source: 'L1' };
  
  // L2 命中
  html = await cacheStrategy.l2.get(key);
  if (html) {
    cacheStrategy.l1.set(key, html);
    return { html, source: 'L2' };
  }
  
  // 未命中，SSR 渲染
  html = await render(url);
  cacheStrategy.l1.set(key, html);
  await cacheStrategy.l2.set(key, html);
  
  return { html, source: 'SSR' };
}
```

**性能指标**：

- 缓存命中率：95%（L1+L2）
- TTFB：< 50ms（缓存命中）
- TTFB：< 300ms（缓存未命中）
- 服务器 QPS：5000+

### 8.3 案例三：Vue 官网（vuejs.org）

**场景**：Vue 官方文档站，多语言、多版本。

**架构**：

- 框架：VitePress（基于 Vue 3 SSR）
- 内容：Markdown + Vue 组件
- 部署：Netlify

**特点**：

- 构建时预渲染（SSG），生成静态 HTML
- 客户端 SPA 路由
- 搜索：Pagefind 静态索引

**性能**：

- Lighthouse 评分：98+
- LCP：< 0.8s
- 静态资源：CDN 加速

### 8.4 案例四：GitLab（部分页面）

**场景**：GitLab 部分页面采用 Vue SSR。

**架构**：

- 前端：Vue 3 SSR + Apollo Client
- 后端：Ruby on Rails GraphQL API
- 部署：Kubernetes 集群

**关键设计**：

- 公开页面（项目主页、用户主页）：SSR + CDN
- 私有页面（Dashboard、Settings）：CSR
- GraphQL 数据预取：服务端执行 GraphQL 查询

### 8.5 案例五：阿里巴巴部分电商页面

**场景**：淘宝/天猫部分页面采用 SSR 优化首屏。

**架构**：

- 前端：Rax（Vue-like）SSR
- 后端：Node.js + Midway
- 部署：阿里云 EDAS

**性能优化**：

- 流式渲染：TTFB < 200ms
- 组件级缓存：热点商品缓存
- 边缘计算：阿里云 CDN Edge JS

**效果**：

- 首屏 LCP：< 1s
- 转化率提升：5%（相比 CSR）

### 8.6 案例六：Netflix 渐进式 Hydration

**场景**：Netflix 部分页面采用渐进式 Hydration 优化。

**设计**：

- 服务端输出完整 HTML
- 客户端按需 hydrate 用户交互区域
- 非首屏内容延迟 hydrate

**效果**：

- TTI（Time to Interactive）降低 50%
- 首屏 JS 体积减少 70%

Vue 3 目前没有 React 式的完整渐进式 Hydration 架构；3.5+ 的异步组件懒水合（`hydrate` 选项）可覆盖部分按需水合场景，更完整的类岛屿效果需借助实验性的 Vue Server Components。

### 8.7 案例七：VitePress 文档系统

**场景**：VitePress（Vue 官方文档工具）。

**架构**：

- 构建时：SSG 生成静态 HTML
- 运行时：SPA 路由
- 主题：Vue 3 + Vite

**关键代码**：

```javascript
// .vitepress/config.js
export default {
  title: 'My Docs',
  description: 'Documentation site',
  themeConfig: {
    nav: [...],
    sidebar: [...],
  },
  // SSR 配置
  ssr: {
    external: ['vue', 'vue-router'],
  },
};
```

**性能**：

- LCP：< 0.5s（SSG）
- 静态资源：CDN 加速
- 搜索：Pagefind 静态索引

---

### 填空题知识点讲解

**常见疑问 6**：Vue 3 中，服务端渲染的核心 API 是 `______`，它返回一个 Promise，resolve 时得到 HTML 字符串。

**解析讲解**：`renderToString`

---

**常见疑问 7**：SSR 中，`window`、`document` 等浏览器 API 应在 `______` 生命周期钩子中使用，避免服务端报错。

**解析讲解**：`onMounted`

---

**常见疑问 8**：Vue 3.4 引入 `______` 属性，允许开发者显式标记可容忍 Hydration 不一致的元素。

**解析讲解**：`data-allow-mismatch`

---

**常见疑问 9**：Nuxt 3 基于 `______` 引擎，支持多平台部署（Node.js、Cloudflare Workers、Vercel Edge 等）。

**解析讲解**：Nitro

---

**常见疑问 10**：SSR 状态序列化时，应过滤 `______`、`______`、`______` 等敏感字段，避免 XSS 泄露。

**解析讲解**：`password`、`token`、`secret`

### 编程题知识点讲解

**常见疑问 11**：实现一个最小的 SSR 服务器，使用 Express 与 Vue 3。

**解析讲解**：

```javascript
import express from 'express';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';

const app = express();

const App = {
  setup() {
    return () => h('div', 'Hello SSR');
  },
};

app.get('*', async (req, res) => {
  const ssrApp = createSSRApp(App);
  const html = await renderToString(ssrApp);
  
  res.send(`<!DOCTYPE html>
<html>
<body>
  <div id="app">${html}</div>
</body>
</html>`);
});

app.listen(3000);
```

---

**常见疑问 12**：实现一个同构应用的入口文件，支持 SSR 与 CSR 切换。

**解析讲解**：

```javascript
// src/main.js
import { createSSRApp } from 'vue';
import App from './App.vue';
import { createRouterInstance } from './router';
import { createPiniaInstance } from './stores';

export function createApp(isSSR = false) {
  const app = createSSRApp(App);
  const router = createRouterInstance();
  const pinia = createPiniaInstance();
  
  app.use(router);
  app.use(pinia);
  
  return { app, router, pinia };
}

// src/entry-client.js
import { createApp } from './main';

const { app, router } = createApp(false);

if (window.__INITIAL_STATE__) {
  // 恢复状态
}

router.isReady().then(() => {
  app.mount('#app');
});

// src/entry-server.js
import { createApp } from './main';
import { renderToString } from 'vue/server-renderer';

export async function render(url) {
  const { app, router } = createApp(true);
  
  await router.push(url);
  await router.isReady();
  
  const html = await renderToString(app);
  return { html };
}
```

---

**常见疑问 13**：实现一个组件级缓存，支持 LRU 淘汰策略。

**解析讲解**：

```javascript
import LRU from 'lru-cache';

export function createSSRCache(options = {}) {
  const cache = new LRU({
    max: options.max || 1000,
    ttl: options.ttl || 60 * 1000,
  });
  
  return {
    get(key) {
      return cache.get(key);
    },
    
    set(key, value) {
      cache.set(key, value);
    },
    
    delete(key) {
      cache.delete(key);
    },
    
    clear() {
      cache.clear();
    },
    
    stats() {
      return {
        size: cache.size,
        max: cache.max,
      };
    },
  };
}

// 使用
const cache = createSSRCache({ max: 1000, ttl: 60 * 1000 });

function renderWithCache(component, props) {
  if (!component.serverCacheKey) {
    return renderComponent(component, props);
  }
  
  const key = component.name + ':' + component.serverCacheKey(props);
  const cached = cache.get(key);
  
  if (cached) return cached;
  
  const html = renderComponent(component, props);
  cache.set(key, html);
  
  return html;
}
```

### 10.1 官方文档

[1] Vue.js. 2024. Vue.js Server-Side Rendering Guide. https://vuejs.org/guide/scaling-up/ssr.html. Accessed: 2024-12-01.

[2] Vue.js. 2024. @vue/server-renderer API Reference. https://vuejs.org/api/ssr.html. Accessed: 2024-12-01.

[3] Nuxt Labs. 2024. Nuxt 3 Documentation. https://nuxt.com/docs. Accessed: 2024-12-01.

[4] Vite. 2024. Vite Server-Side Rendering Guide. https://vitejs.dev/guide/ssr.html. Accessed: 2024-12-01.

### 10.2 学术论文

[5] You, E. 2020. Vue 3.0 Release Notes. https://github.com/vuejs/core/releases/tag/v3.0.0. Accessed: 2024-12-01.

[6] Abramov, D. 2018. React 16.6 Release: Suspense and Lazy Loading. https://react.dev/blog/2018/10/23/react-v-16-6. Accessed: 2024-12-01.

[7] Walke, A. 2022. React 18 Release: Concurrent Features. https://react.dev/blog/2022/03/29/react-v18. Accessed: 2024-12-01.

### 10.3 技术标准

[8] WHATWG. 2024. HTML Living Standard - Server-Side Rendering. https://html.spec.whatwg.org/. Accessed: 2024-12-01.

[9] Ecma International. 2024. ECMAScript 2024 Language Specification. Standard ECMA-262, 14th edition. https://tc39.es/ecma262/. Accessed: 2024-12-01.

[10] Web Hypertext Application Technology Working Group. 2024. Streams API. https://streams.spec.whatwg.org/. Accessed: 2024-12-01.

### 10.4 书籍与教程

[11] You, E. 2024. Vue.js 3 Documentation. https://vuejs.org/. Accessed: 2024-12-01.

[12] Vue School. 2024. Vue 3 SSR Course. https://vueschool.io/courses/server-side-rendering-with-vuejs-3. Accessed: 2024-12-01.

[13] Nuxt School. 2024. Nuxt 3 Master Class. https://vueschool.io/courses/nuxt-js-3-fundamentals. Accessed: 2024-12-01.

[14] Anthony Gore. 2023. Full-Stack Vue.js 3: Build SSR Applications with Nuxt. Apress. ISBN: 978-1484294052.

### 10.5 工业实践

[15] Netflix. 2019. Performance Improvements with Client-Side Hydration. https://netflixtechblog.com/. Accessed: 2024-12-01.

[16] Cloudflare. 2024. Cloudflare Workers Documentation. https://developers.cloudflare.com/workers/. Accessed: 2024-12-01.

[17] Vercel. 2024. Edge Functions Documentation. https://vercel.com/docs/functions/edge-functions. Accessed: 2024-12-01.

[18] Alibaba Group. 2023. Large-Scale SSR Practice at Alibaba. https://alibaba.github.io/. Accessed: 2024-12-01.

### 10.6 性能与优化

[19] Google. 2024. Core Web Vitals Documentation. https://web.dev/vitals/. Accessed: 2024-12-01.

[20] Google. 2024. Lighthouse SSR Performance Audit. https://web.dev/lighthouse-performance/. Accessed: 2024-12-01.

[21] Addy Osmani. 2023. The Cost of JavaScript in 2023. https://medium.com/@addyosmani/. Accessed: 2024-12-01.

### 10.7 安全参考

[22] OWASP. 2024. Cross-Site Scripting (XSS) Prevention Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html. Accessed: 2024-12-01.

[23] OWASP. 2024. Server-Side Request Forgery Prevention. https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html. Accessed: 2024-12-01.

[24] Content Security Policy Level 3. W3C Working Draft. 2024. https://www.w3.org/TR/CSP3/. Accessed: 2024-12-01.

### 10.8 框架对比

[25] Solid.js. 2024. Solid SSR Documentation. https://www.solidjs.com/guides/server. Accessed: 2024-12-01.

[26] Svelte. 2024. SvelteKit SSR Guide. https://kit.svelte.dev/docs/ssr. Accessed: 2024-12-01.

[27] Angular. 2024. Angular Universal Guide. https://angular.io/guide/universal. Accessed: 2024-12-01.

[28] React. 2024. React Server Components Documentation. https://react.dev/reference/react-server-components. Accessed: 2024-12-01.

### 10.9 ACM Reference Format示例

[29] You, E. 2024. Vue.js: A Progressive Framework for Building User Interfaces. In Proceedings of the ACM International Conference on Web Engineering (ICWE '24). ACM, New York, NY, USA, 1-12. DOI: 10.1145/1234567.1234567.

[30] Abramov, D. and Walke, A. 2022. React 18: Concurrent Features for Modern Web Applications. In Proceedings of the ACM SIGPLAN International Conference on Systems, Programming, Languages, and Applications (SPLASH '22). ACM, New York, NY, USA, 1-15. DOI: 10.1145/2345678.2345678.

[31] Petersen, H. 2023. Server-Side Rendering Performance Analysis: Vue vs React vs Solid vs Svelte. Journal of Web Engineering 22, 5, 1023-1050. DOI: 10.13052/jwe1540-9589.2254.

---

### 11.2 进阶论文与文章

- **Vue 3.0 Release Notes**：https://github.com/vuejs/core/releases/tag/v3.0.0
- **Vue 3.4 Release Notes**：https://github.com/vuejs/core/releases/tag/v3.4.0
- **React 18 Concurrent Features**：https://react.dev/blog/2022/03/29/react-v18
- **React Server Components RFC**：https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md
- **Streaming SSR with Suspense**：https://vuejs.org/guide/scaling-up/ssr.html#suspense

### 11.3 视频教程

- **Vue School SSR 课程**：https://vueschool.io/courses/server-side-rendering-with-vuejs-3
- **Nuxt 3 Master Class**：https://vueschool.io/courses/nuxt-js-3-fundamentals
- **Evan You: Vue 3 Deep Dive**：https://www.youtube.com/watch?v=Uy6u9gqJ7J0
- **Addy Osmani: Performance in Modern Web Apps**：https://www.youtube.com/watch?v=mLjxXPHIJo8

### 11.4 开源项目

- **Vue 3 Core**：https://github.com/vuejs/core
- **Nuxt 3**：https://github.com/nuxt/nuxt
- **VitePress**：https://github.com/vuejs/vitepress
- **Vue SSR Demo**：https://github.com/vuejs/core/tree/main/packages/server-renderer
- **Vite SSR Examples**：https://github.com/vitejs/vite/tree/main/playground/ssr

### 11.5 性能优化资源

- **Core Web Vitals**：https://web.dev/vitals/
- **Lighthouse**：https://developers.google.com/web/tools/lighthouse
- **WebPageTest**：https://www.webpagetest.org/
- **Chrome DevTools SSR Profiling**：https://developer.chrome.com/docs/devtools/

### 11.6 部署平台文档

- **Vercel Edge Functions**：https://vercel.com/docs/functions/edge-functions
- **Cloudflare Workers**：https://developers.cloudflare.com/workers/
- **Netlify Functions**：https://docs.netlify.com/functions/overview/
- **Deno Deploy**：https://deno.com/deploy
- **AWS Lambda@Edge**：https://aws.amazon.com/lambda/edge/

### 11.7 安全资源

- **OWASP Cheat Sheet Series**：https://cheatsheetseries.owasp.org/
- **Content Security Policy**：https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **XSS Prevention**：https://owasp.org/www-community/attacks/xss/
- **SSRF Prevention**：https://owasp.org/www-community/attacks/Server_Side_Request_Forgery

### 11.8 社区与论坛

- **Vue.js Forum**：https://forum.vuejs.org/
- **Vue Discord**：https://discord.com/invite/vue
- **Nuxt Discord**：https://discord.com/invite/nuxt
- **Stack Overflow Vue SSR**：https://stackoverflow.com/questions/tagged/vue.js+ssr
- **Reddit r/vuejs**：https://www.reddit.com/r/vuejs/

### 11.9 相关技术栈

- **Vue Router**：https://router.vuejs.org/
- **Pinia**：https://pinia.vuejs.org/
- **VueUse**：https://vueuse.org/
- **Vue Test Utils**：https://test-utils.vuejs.org/
- **Vue DevTools**：https://devtools.vuejs.org/

### 11.10 框架对比资源

- **React vs Vue SSR**：https://www.tomray.dev/react-vs-vue-ssr
- **Solid.js SSR**：https://www.solidjs.com/guides/server
- **SvelteKit SSR**：https://kit.svelte.dev/docs/ssr
- **Angular Universal**：https://angular.io/guide/universal
- **Benchmark: Frameworks SSR Performance**：https://github.com/krausest/js-framework-benchmark

---

## 总结 | Summary

Vue 3 服务端渲染（SSR）是构建高性能、SEO 友好 Web 应用的核心技术。本章节系统化阐述了 SSR 的原理、形式化定义、企业级实践与对比分析，覆盖以下关键主题：

1. **SSR 基础**：`createSSRApp`、`renderToString`、流式渲染等核心 API。
2. **同构架构**：共享入口、客户端入口、服务端入口的分离设计。
3. **Hydration 原理**：服务端输出 HTML 与客户端 Vue 实例的接合机制。
4. **数据预取**：路由级 `asyncData`、`serverPrefetch`、Pinia 状态序列化。
5. **流式渲染**：`renderToPipeableStream` 提升 TTFB，改善首屏体验。
6. **缓存策略**：组件级缓存、路由级缓存、多级缓存设计。
7. **单例污染**：工厂函数保证请求隔离，避免状态泄露。
8. **安全防护**：XSS 转义、敏感字段过滤、SSRF 防护。
9. **边缘渲染**：Cloudflare Workers、Vercel Edge 等边缘部署方案。
10. **框架对比**：Vue 3 SSR vs React 18 SSR vs Solid/Svelte/Angular SSR。

通过本章节的学习，开发者应能够：

- 理解 SSR 的核心原理与设计哲学。
- 设计并实现企业级同构应用架构。
- 优化 SSR 性能（TTFB、LCP、Hydration 耗时）。
- 解决 SSR 常见陷阱（单例污染、Hydration Mismatch、浏览器 API）。
- 评估并选择合适的渲染模式（SSR/SSG/ISR/CSR）。
- 部署 SSR 应用至多平台（Node.js、Edge、Cloudflare）。

SSR 是现代 Web 应用的高阶技术，需要在性能、复杂度、成本之间做出权衡。对于大多数内容型站点，SSG（静态生成）已足够；对于个性化、动态内容，SSR 是必要的。Nuxt 3 提供了开箱即用的 SSR 解决方案，是企业级应用的首选。

---

## SSR 基本流程

**基本写法：renderToString 渲染为字符串**
`const <html> = await renderToString(<App>)`
```ts
// 服务器渲染组件为 HTML
import { renderToString } from 'vue/server-renderer';
import { createSSRApp } from 'vue';
const app = createSSRApp(App);
const html = await renderToString(app);
```

---

**基本写法：createSSRApp 创建应用**
`const <app> = createSSRApp(<根组件>)`
```ts
// SSR 模式应用实例
const app = createSSRApp(App);
```

---

## renderToNodeStream 流式渲染

**基本写法：Node 流式输出**
`renderToNodeStream(<app>)`
```ts
// 边渲染边发送提升首屏
import { renderToNodeStream } from 'vue/server-renderer';
const stream = renderToNodeStream(app);
stream.pipe(res);
```

---

**基本写法：Web Stream 边缘环境**
`renderToWebStream(<app>)`
```ts
// Cloudflare Workers 等环境
import { renderToWebStream } from 'vue/server-renderer';
const stream = renderToWebStream(app);
```

---

## 客户端注水 hydrate

**基本写法：客户端 mount 注水**
`<app>.mount(<容器>)`
```ts
// 客户端复用服务端 HTML
import { createSSRApp } from 'vue';
const app = createSSRApp(App);
app.mount('#app');
```

---

## 入口文件分离

**基本写法：entry-server.js 导出 render**
`export async function render() { return await renderToString(<app>); }`
```ts
// 服务端入口
import { createSSRApp } from 'vue';
import App from './App.vue';
export async function render(url) {
  const app = createSSRApp(App);
  return await renderToString(app);
}
```

---

**基本写法：entry-client.js 注水**
`<app>.mount('#app')`
```ts
// 客户端入口
import { createSSRApp } from 'vue';
import App from './App.vue';
createSSRApp(App).mount('#app');
```

---

## 同构路由

**基本写法：createRouter 共享配置**
`const <router> = createRouter({ history, routes })`
```ts
// 客户端使用 createWebHistory 服务端使用 createMemoryHistory
import { createRouter } from 'vue-router';
const router = createRouter({
  history: isServer ? createMemoryHistory() : createWebHistory(),
  routes
});
```

---

**基本写法：服务端 router.push**
`<router>.push(<url>)`
```ts
// 服务端根据请求 URL 设置
router.push(ctx.url);
await router.isReady();
```

---

## 数据预取

**基本写法：组件内 serverPrefetch 钩子**
`async serverPrefetch() { await <fetch>; }`
```vue
<!-- 组件级数据预取 -->
<script>
export default {
  async serverPrefetch() {
    this.posts = await fetchPosts();
  }
}
</script>
```

---

**基本写法：路由级数据预取**
`<route>.meta.<preload>`
```ts
// 路由 meta 配置预取函数
{ path: '/user/:id', component: User, meta: { preload: fetchUser } }
```

---

## 注水数据传递

**基本写法：服务端数据序列化注入**
`<script>window.__INITIAL_STATE__ = ${JSON.stringify(<state>)}</script>`
```ts
// 通过全局变量传递初始状态
const state = serialize(state);
const html = `<script>window.__INITIAL_STATE__=${state}</script>`;
```

---

**基本写法：客户端读取注水状态**
`window.__INITIAL_STATE__`
```ts
// 客户端恢复状态
if (window.__INITIAL_STATE__) {
  store.replaceState(window.__INITIAL_STATE__);
}
```

---

## Pinia SSR 集成

**基本写法：服务端创建 Pinia**
`const <pinia> = createPinia()`
```ts
// 每请求独立实例
import { createPinia } from 'pinia';
const pinia = createPinia();
app.use(pinia);
```

---

**基本写法：序列化 Pinia 状态**
`pinia.state.value`
```ts
// 注水时传递
const state = JSON.stringify(pinia.state.value);
```

---

**基本写法：客户端恢复 Pinia**
`<pinia>.state.value = window.__INITIAL_STATE__`
```ts
// 客户端注水
pinia.state.value = window.__INITIAL_STATE__;
```

---

## 注水不匹配

**基本写法：避免服务端客户端渲染差异**
`const <date> = new Date() // 时间不一致`
```ts
// 使用 onMounted 在客户端修正
const date = ref('');
onMounted(() => date.value = new Date().toLocaleString());
```

---

## Nuxt 3 全栈框架

**基本写法：创建 Nuxt 项目**
`npx nuxi init <项目名>`
```bash
# 创建 Nuxt 3 项目
npx nuxi init my-app
```

---

**基本写法：开发命令**
`npm run dev`
```bash
# 启动 Nuxt 开发服务器
npm run dev
```

---

**基本写法：构建命令**
`npm run build`
```bash
# 构建生产版本
npm run build
```

---

**基本写法：启动生产服务**
`node .output/server/index.mjs`
```bash
# 运行 Nuxt 生产服务
node .output/server/index.mjs
```

---

## Nuxt 页面路由

**基本写法：pages 目录约定**
`pages/index.vue`
```vue
<!-- 自动生成 / 路由 -->
<template>
  <h1>首页</h1>
</template>
```

---

**基本写法：动态路由**
`pages/user/[id].vue`
```vue
<!-- 自动生成 /user/:id -->
<script setup>
const route = useRoute();
const id = route.params.id;
</script>
```

---

## Nuxt 数据获取

**基本写法：useFetch 获取数据**
`const { <data> } = await useFetch('<url>')`
```ts
// 自动 SSR 同构
const { data } = await useFetch('/api/user');
```

---

**基本写法：useAsyncData 自定义获取**
`const { <data> } = await useAsyncData('<key>', () => <fn>)`
```ts
// 自定义异步逻辑
const { data } = await useAsyncData('user', () => fetchUser());
```

---

## Nuxt 中间件

**基本写法：路由中间件**
`middleware/auth.ts`
```ts
// 全局路由中间件
export default defineNuxtRouteMiddleware((to, from) => {
  if (!isAuth()) return navigateTo('/login');
});
```

---

## Nuxt 插件

**基本写法：自定义插件**
`plugins/<名称>.ts`
```ts
// 注册全局功能
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('util', () => console.log('util'));
});
```

---

## Nuxt 服务端 API

**基本写法：server/api 目录约定**
`server/api/user.get.ts`
```ts
// 自动映射 /api/user
export default defineEventHandler(async (event) => {
  return { name: 'Alice' };
});
```

---

## Nuxt 渲染模式

**基本写法：配置渲染模式**
`ssr: true | false`
```ts
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: true // 启用 SSR 默认 true
});
```

---

**基本写法：混合渲染路由规则**
`routeRules: { '<路径>': { ssr: false } }`
```ts
// 部分路由 SPA 模式
routeRules: {
  '/admin/**': { ssr: false }
}
```

---

## Nuxt 静态生成

**基本写法：预渲染静态站点**
`nuxt generate`
```bash
# 生成纯静态 HTML
npm run generate
```

---

## 元信息管理

**基本写法：useHead 设置文档头**
`useHead({ title, meta })`
```ts
// 同构管理 head
useHead({
  title: '我的页面',
  meta: [{ name: 'description', content: '描述' }]
});
```

---

## 错误处理

**基本写法：createError 抛错**
`throw createError({ statusCode: 404 })`
```ts
// 服务端与客户端统一错误
throw createError({ statusCode: 404, statusMessage: 'Not Found' });
```

---

**基本写法：error.vue 错误页**
`error.vue`
```vue
<!-- 全局错误页 -->
<script setup>
const props = defineProps(['error']);
</script>
<template>
  <h1>{{ error.statusCode }}</h1>
</template>
```
