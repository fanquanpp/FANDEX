# 服务端渲染 SSR

SPA 把渲染工作全推给浏览器：用户先看到空白页，等 JS 下载执行完才有内容。SSR（服务端渲染）把"出 HTML"这一步挪回服务器，用户请求到达即拿到完整页面。Vite 对 SSR 的支持是"基础设施级"的：双入口构建、服务端模块即时加载、开发期 HMR 全都开箱可用。本篇用最小代码跑通整条链路，再聊何时应该改用框架方案。

## 前置知识

- [Vite 环境变量与模式](/vite/010-ViteEnvModes)：SSR 双端代码依赖环境变量区分场合与安全边界。
- [Vite 构建与产物拆分](/vite/007-BuildSplit)：理解客户端产物的结构，SSR 要额外多打一个服务端包。
- [Vite 开发服务器与 HMR](/vite/006-DevServerHMR)：SSR 开发模式就是 dev server 的"中间件化"。

## 学习目标

1. 能画出 SSR 的请求流程，说清它与 CSR 在渲染时机上的差别。
2. 能配置客户端与服务端双入口构建，知道 `--ssr` 参数做什么。
3. 能用 Express 承载 Vite 中间件，实现最小可用的开发期 SSR 服务。
4. 能解释水合（hydration）的职责，说出不匹配告警的常见成因。
5. 能在"手写 Vite SSR"与 Nuxt / SvelteKit / Astro 等框架方案之间做出选型判断。

## 1. SSR 的本质：把渲染时机挪回服务器

先对比两条链路。CSR（客户端渲染）：服务器返回近乎空壳的 HTML，浏览器下载 JS、执行、请求数据、生成 DOM——用户等的是一个"先下载、再计算"的过程。SSR：服务器在收到请求时就把组件渲染成完整 HTML 随响应发出，浏览器立即有内容可画；随后 JS 继续下载，"接管"已经存在的 DOM 让它可交互。

```text
CSR：请求 → 空壳 HTML → 下载 JS → 执行渲染 → 用户看到内容
SSR：请求 → 服务端渲染出完整 HTML → 用户看到内容 → JS 下载后"接管"页面
```

SSR 带来两个直接收益：**首屏更快**（省去浏览器端渲染的等待，弱网下差距明显）与 **SEO 更好**（爬虫拿到的是完整 HTML）。代价也很清楚：服务器要承担每请求的渲染计算与内存；代码必须同构——同一份组件既要在 Node 里跑（不能碰 window/document），又要在浏览器里跑。理解了这笔收益与代价的账，后面所有工程决策都有依据。

什么时候值得上 SSR，可以用三个问题快速判断：首屏速度是不是核心指标（营销页、歌曲详情页是，后台看板不是）；内容是否需要被搜索引擎收录（公开页面是，登录后的页面不是）；交互密度有多高（重交互应用要权衡水合成本）。三个问题命中两个以上，SSR 或其混合形态就值得认真评估；反之，纯 CSR 加预渲染可能已经够用。

## 2. 双入口：客户端与服务器各打一个包

SSR 应用的代码天然分成两份：客户端入口负责"接管页面"，服务端入口负责"渲染 HTML"。Vite 用构建参数区分两者：

```bash
# package.json scripts：客户端与服务器两个构建目标
"build:client": "vite build --outDir dist/client",
"build:server": "vite build --ssr src/entry-server.ts --outDir dist/server"
```

`--ssr` 参数的含义：这个入口不面向浏览器，构建产物是 Node 可直接 `import` 的模块，不做 HTML 注入、不预取依赖图。服务端入口的最小实现可以只是一个返回 HTML 字符串的函数：

```typescript
// src/entry-server.ts：服务端入口——把应用渲染成 HTML 字符串
// 这里用模板字符串演示最小实现；框架场景下换成 createSSRApp + renderToString
export function render(url: string, data: { songs: string[] }) {
  // 生产实现必须对 data 做转义后再拼接，见"易错点"第 5 条
  const list = data.songs.map((s) => `<li>${s}</li>`).join('')
  return `
    <html lang="zh-CN">
      <body>
        <h1>虚拟歌手音乐平台 · 热门歌曲</h1>
        <ul>${list}</ul>
        <button id="like">点个赞</button>
        <script type="module" src="/src/entry-client.ts"></script>
      </body>
    </html>`
}
```

客户端入口则只负责"激活"服务端已画好的 DOM，不重建页面：

```typescript
// src/entry-client.ts：客户端入口——"接管"而不是"重新渲染"
document.querySelector('#like')?.addEventListener('click', () => {
  // 点赞只更新状态与文案，整个歌曲列表的 DOM 原样保留
  const btn = document.querySelector('#like') as HTMLButtonElement
  btn.textContent = '已点赞'
})
```

双入口之间的"共享区"要有意识维护：组件、工具函数、类型放 src 下的共享目录，两个入口只做装配（客户端入口挂交互、服务端入口出 HTML）。共享代码里禁止出现"只在某一端合法"的顶层副作用（读 cookie、建定时器），否则另一端构建时就会暴露问题——这个约束逼出来的分层，恰恰是 SSR 项目最重要的结构。

## 3. 最小 server：开发用中间件模式，生产跑产物

开发期最有趣的设计是：Vite dev server 不自己监听请求再转给业务，而是**整个嵌入你的服务器**（中间件模式），让业务服务获得 Vite 的按需编译、HMR 与 `ssrLoadModule` 能力：

```typescript
// server.mjs：一个 Express 承载的 Vite SSR 服务（开发模式）
import express from 'express'
import { createServer as createViteServer } from 'vite'

const app = express()
// middlewareMode：Vite 挂进 Express，而不是独立监听端口
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'custom', // 声明"路由由我接管"，Vite 不再自带 HTML 回退
})

app.use(vite.middlewares) // 静态资源与 HMR 全部交给 Vite 处理
app.use('*', async (req, res) => {
  // ssrLoadModule 每次都拿到最新代码：改了入口文件无需重启，HMR 生效
  const { render } = await vite.ssrLoadModule('/src/entry-server.ts')
  const html = render(req.originalUrl, {
    songs: ['千本樱', 'Melt', 'Tell Your World'],
  })
  res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(html)
})

app.listen(5174, () => console.log('SSR dev server: http://localhost:5174'))
```

生产环境则是两个构建产物加一个轻量服务器：`dist/server/entry-server.js` 是纯 Node 模块，不再需要 Vite：

```typescript
// server-prod.mjs：生产环境直接跑构建产物，没有 Vite 参与
import express from 'express'
import { render } from './dist/server/entry-server.js'

const app = express()
app.use(express.static('dist/client')) // 客户端静态资源（建议交给 CDN）
app.use('*', (_req, res) => {
  res
    .status(200)
    .set({ 'Content-Type': 'text/html; charset=utf-8' })
    .end(render('/', { songs: ['千本樱', 'Melt', 'Tell Your World'] }))
})
app.listen(3000)
```

对比两份代码可以看出 SSR 部署的核心差异：**开发期"源码即时加载 + HMR"，生产期"预构建产物 + 纯 Node 运行"**。dev 与 prod 之间没有共享的运行时，这让生产包极小，也让"上线前必须完整构建一遍"成为硬性流程。

中间件模式还有个衍生收益：鉴权、限流这类"进入渲染之前"的横切逻辑直接写在 Express 里，与渲染代码解耦。粉丝团的会员票专区可以先过一层会话校验中间件，再进入 SSR 渲染——这套分层在框架方案里对应中间件/守卫机制，手写时结构反而是自己最清楚的。

## 4. 客户端水合：接管已渲染的 DOM

上一节的客户端入口是自己手动绑事件，这在真实应用里很快失控。框架级 SSR 的做法是水合（hydration）：客户端入口不用组件重建 DOM，而是告诉框架"这些 HTML 是服务端按同一份组件算出来的，请为它们接上事件与状态"。以 React 为例：

```tsx
// src/entry-client.tsx（框架版）：水合替代重建
import { hydrateRoot } from 'react-dom/client'
import { App } from './App'

// hydrateRoot：复用现有 DOM，只补事件监听与状态，不重新生成节点
hydrateRoot(document.querySelector('#app')!, <App />)
```

水合有一条铁律：**客户端第一帧的渲染结果必须与服务端 HTML 一致**。不一致时浏览器控制台出现 mismatch 告警，轻则报错重画（白做一遍渲染），重则交互错乱。最常见的成因是渲染结果依赖不确定性来源——`Date.now()`、`Math.random()`、浏览器 locale——服务端与客户端各算各的，结果当然不同。修正思路是"不确定的内容放到水合完成之后再算"（如 `useEffect` 里）。

手写水合的极限也在这里：状态管理、数据注水（把服务端取到的数据序列化进页面供客户端复用）、路由同步都要自己搭。这正是下一节选型话题的由来。

数据注水值得多说一句：服务端渲染时通常已经取好数据（歌单、余量），如果客户端水合时再取一遍，就白花一次请求还可能闪烁。惯例是把服务端数据序列化进页面（一个 `window.__INITIAL_DATA__` 脚本块），客户端入口优先读它、跳过首次请求。注水与水合是一对配套动作，框架方案把它们做成了默认行为，手写时要自己记着补。

## 5. 框架方案对比：站在 Vite 肩膀上

手写 Vite SSR 适合理解原理与极简场景，生产项目通常直接选基于 Vite 的元框架——它们把数据获取、路由、注水、部署适配都做成了约定：

| 方案 | 基座框架 | 特点 | 适合的平台场景 |
| --- | --- | --- | --- |
| Nuxt | Vue | Vue 官方全栈方案，生态完整 | 后台管理系统、全 Vue 团队 |
| SvelteKit | Svelte | 轻量、编译时优化彻底 | 交互密集的小型应用 |
| Astro | 多框架混合 | 岛屿架构，默认零 JS | 内容站、歌姬主页、教程站 |
| Remix / Next | React | React 生态的 SSR 方案 | React 团队的动态站点 |

对"虚拟歌手音乐平台"这类站点，Astro 是天然契合的：歌曲页、歌姬主页是内容页面，默认零 JS；播放器用岛屿（见 014 篇的持久化播放器）；购票提交用 Actions（见 010 篇）。选择判断可以总结成一句话：**页面以内容为主选 Astro，以应用为主选 Nuxt / SvelteKit / Remix；除非为了学习，否则不要在生产上手写整套 SSR 基建**。

## 6. 部署差异：Node 常驻与 Serverless 两条路

SSR 产物要有一个执行 `render` 的地方，部署形态因此与纯静态站不同：

1. **Node 常驻进程**：如上面的 server-prod.mjs，配 pm2 / Docker 部署。优点是冷启动为零、可长连接；缺点是要自己管进程、扩容与日志。
2. **Serverless**：把 `render` 打包成云函数，按请求付费、自动扩容。代价是冷启动延迟与本地状态不可用（内存缓存、长连接要换方案），通常需要平台提供的适配器（框架方案都内置了各自的 adapter）。

另一个务实的选择是**预渲染混合**：绝大多数页面（歌姬主页、歌曲详情）内容不随请求变化，构建期直接渲染成静态 HTML（SSG），只有"票档余量""排队状态"这类真动态页面走 SSR。混合策略让服务器只服务真正需要它的请求，成本与首屏两头兼顾。平台站的推荐组合是：内容页面 SSG 化 + 票务接口走 Actions/API + 极少页面 SSR。

上线后用两组指标验证选择是否正确：服务端看 TTFB 与单请求渲染耗时（SSR 的成本侧），客户端看 FCP 与可交互时间（收益侧）。渲染耗时长于 100 毫秒、或高峰期服务器吃紧，就该把更多页面挪去预渲染；反过来 FCP 不达预期时，先查是不是把整页都做成了 SSR 而没有用岛屿拆分交互。指标代替感觉，是混合策略能持续优化的前提。

无障碍角度 SSR 还有一层隐性收益：服务端直出的 HTML 在脚本执行失败时仍可读、可导航，天然满足渐进增强的底线；客户端脚本的职责被压缩成"增强"，站点在最坏情况下也不会白屏。对以内容为主的平台页面，这份稳健性本身就是需求。

对应到工程实践，这条收益还可以主动放大：给关键内容页做"无脚本可用性"巡检（禁用 JS 走一遍主流程），白屏与死按钮会第一时间暴露——SSR 站点的稳健性需要被检验，而不是被假设。

## 易错点与最佳实践

1. **服务端代码触碰浏览器全局**。模块顶层写 `window` 在 Node 里直接抛错：

   ```typescript
   // 错误：entry-server 里引用 window，SSR 一启动就崩
   const width = window.innerWidth
   ```

   修正：用 `typeof window !== 'undefined'` 守卫，或把这段逻辑挪进客户端入口、`onMount` / `useEffect` 等仅在浏览器执行的时机。

2. **水合不匹配**。首帧渲染含 `new Date().toLocaleString()` 之类的不确定值，服务端与客户端各渲染各的。修正：不确定内容延迟到水合后再渲染，或由服务端把值随 HTML 传下来（数据注水）。

3. **双包依赖版本漂移**。客户端与服务器各自打包，若依赖版本不一致，同一组件两侧渲染结构不同，水合必炸。修正：单一 package.json 管理依赖，CI 里同时构建两包并跑一次 E2E 兜底。

4. **dev 一切正常，上线白屏**。忘了 `build:server`，生产服务器找不到服务端入口。修正：把双构建合成一条 `build` 脚本（`pnpm build:client && pnpm build:server`），CI 统一执行。

5. **模板字符串直拼用户数据**。歌曲名来自用户投稿时：

   ```typescript
   // 错误：用户可提交 <script>，直拼即存储型 XSS
   const list = data.songs.map((s) => `<li>${s}</li>`).join('')
   ```

   修正：拼接前做 HTML 转义（`&`、`<`、`>`、`"`），或直接使用框架的 `renderToString`——框架默认转义，这也是推荐框架方案的原因之一。

## 本篇小结

1. SSR 把"出 HTML"挪回服务器，换来更快首屏与更好 SEO，代价是服务端计算与同构约束（代码不能碰浏览器全局）。
2. Vite SSR 是双入口架构：`vite build` 出客户端包，`--ssr` 出 Node 服务端包，两者由同一套配置驱动。
3. 开发期用中间件模式把 Vite 嵌进 Express，`ssrLoadModule` 提供即时加载与 HMR；生产期跑预构建产物，不再有 Vite。
4. 水合的职责是"接管而非重建"，客户端首帧必须与服务端 HTML 一致，不确定内容要延迟或注水。
5. 生产项目优先选基于 Vite 的元框架（Nuxt / SvelteKit / Astro / Remix）；部署在 Node 常驻与 Serverless 之间选，多数内容站用"SSG 为主 + 少量 SSR"的混合策略。

## 动手实践

1. **跑通最小链路**：按第 2、3 节实现双入口与 Express 服务，在 entry-server 返回的歌单里加一首歌并保存，验证 HMR 让页面内容即时更新、无需重启。提示：注意 `appType: 'custom'` 不能漏。
2. **触发一次水合告警**：在服务端 HTML 里写死生成时间，客户端入口又用 `Date.now()` 渲染同一处，观察控制台告警；再用"值随 HTML 传下来"的方式修复。提示：把时间放进 `window.__INITIAL__` 脚本变量即可。
3. **选型演练**：假设平台要新增"后台数据看板"（大量交互、登录态）与"歌姬访谈专栏"（纯内容）两个子站，分别为它们给出方案并说明理由。提示：从"内容/交互占比"入手，对照第 5 节的表格。
