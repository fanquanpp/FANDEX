---
order: 70
title: WebSocket 与前端开发服务器
module: 'bun'
category: 后端技术
difficulty: intermediate
description: 实时与一体化：Bun.serve 的 WebSocket、routes 路由表与前端开发服务器。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'bun/003-BunBuiltinServerSQL'
  - 'bun/006-BunTestBench'
prerequisites:
  - 'bun/003-BunBuiltinServerSQL'
  - 'bun/006-BunTestBench'
---

# WebSocket 与前端开发服务器

实时能力是一个音乐平台的基本盘：弹幕、在线人数、开票提醒，都要求"服务端一有变化，浏览器立刻知道"。Bun 把 WebSocket 做进了 `Bun.serve` 本身——不需要 ws 库，不需要自己维护连接池，`publish/subscribe` 一行完成频道广播。同样内置的还有 routes 路由表与 HTML imports：一个入口文件同时托管 API、静态页面与打包后的前端资源，开发时热重载，生产时同一个进程对外服务。本篇从处理器模型讲到弹幕聊天室实战，再到路由、Cookie 与部署建议，把"实时 + 一体化"两件事一次讲完。

## 前置知识

- [Bun 内置服务器、SQL 与数据库](/bun/003-BunBuiltinServerSQL)：已经写过 Bun.serve 的 fetch 处理器，理解 Request/Response 流。
- [内置测试与基准](/bun/006-BunTestBench)：改动后能随手验证，本篇的聊天室可以配合 bun test 做协议测试。
- [Bun 快速入门：项目、依赖与测试](/bun/002-BunQuickStart)：会用 bun 运行单文件 TypeScript。

## 学习目标

1. 理解 Bun.serve 的 websocket 处理器模型与发布订阅机制。
2. 能独立实现一个按房间隔离的最小弹幕聊天室。
3. 会用 routes 路由表组织路径，并用 request.cookies 读写 Cookie。
4. 能用 HTML imports 实现前后端一体化入口，理解开发/生产两种模式。
5. 掌握 WebSocket 服务上生产的四个注意点。

## 1. websocket 处理器与频道广播

Bun.serve 在 fetch 之外多了一个 `websocket` 配置块，协议升级发生在 fetch 里，消息处理在 websocket 回调里。

```typescript
// ws_basic.ts —— 最小弹幕服务：一个 fanclub 频道
const server = Bun.serve({
  port: 3000,
  websocket: {
    open(ws) {
      ws.subscribe("fanclub")                        // 加入频道
      ws.send(`欢迎加入粉丝团，当前在线 ${server.subscriberCount("fanclub")} 人`)
    },
    message(ws, message) {
      // publish 一次，频道内全部连接收到，无需自己维护 Set<WebSocket>
      server.publish("fanclub", `[弹幕] ${message}`)
    },
    close(ws) {
      ws.unsubscribe("fanclub")                      // 退出频道
    },
  },
  fetch(request, server) {
    // 协议升级：成功返回 undefined，失败给 426
    if (server.upgrade(request)) return
    return new Response("需要 WebSocket 连接", { status: 426 })
  },
})

console.log(`弹幕服务已启动：ws://localhost:${server.port}`)
```

```typescript
// client.ts —— 浏览器侧最小客户端（控制台即可测试）
const ws = new WebSocket("ws://localhost:3000")
ws.onopen = () => ws.send("miku 太强了！")
ws.onmessage = (e) => console.log("收到：", e.data)
```

**讲解：**

1. 升级流程：客户端请求 `/`，fetch 里调用 `server.upgrade(request)` 完成 HTTP 到 WebSocket 的协议切换；升级成功后返回 undefined，失败时返回 426（Upgrade Required）。
2. `subscribe/publish/unsubscribe` 是内置发布订阅：消息发布到频道名，所有订阅该频道的连接都会收到，避免了"自己维护连接列表、自己循环 send"的样板代码。
3. `server.subscriberCount(频道名)` 统计在线人数，直接用于欢迎语或大屏展示。
4. 消息可以是字符串或 Uint8Array：弹幕走文本，封面预览帧等二进制数据走后者，同一连接复用。回调里用 `typeof message === "string"` 区分消息类型。
5. 连接生命周期由两端分担：服务端在 close 里清理订阅与关联状态，客户端负责心跳与重连（浏览器断线重连要自己实现）——职责划分清楚了，掉线排查才不抓瞎。

## 2. 最小聊天室实战

真实场景要按演唱会分房间：miku 会场的弹幕不该飘进 teto 会场。用"客户端先发加入指令、服务端按房间订阅"的约定实现。

```typescript
// chat.ts —— 按会场分房间的弹幕聊天室
const rooms = new Set(["room-miku", "room-teto"]) // 房间白名单

const server = Bun.serve({
  port: 3001,
  websocket: {
    message(ws, raw) {
      const data = JSON.parse(String(raw))
      if (data.join) {                                   // 加入会场
        if (!rooms.has(data.join)) return ws.send("会场不存在")
        ws.subscribe(data.join)
        return ws.send(`已进入 ${data.join}`)
      }
      if (data.room && data.text) {                      // 房间内发言
        const text = String(data.text).slice(0, 80)      // 截断超长弹幕
        server.publish(data.room, `${data.name ?? "游客"}：${text}`)
      }
    },
  },
  fetch(request, server) {
    if (new URL(request.url).pathname === "/chat") {
      if (!server.upgrade(request)) {
        return new Response("升级失败", { status: 426 })
      }
      return // 已切换协议，不再返回 HTTP 响应
    }
    return new Response("Not Found", { status: 404 })
  },
})
```

```typescript
// chat_client.ts —— 两个客户端互发弹幕的自测脚本
const a = new WebSocket("ws://localhost:3001/chat")
const b = new WebSocket("ws://localhost:3001/chat")
a.onopen = () => a.send(JSON.stringify({ join: "room-miku", name: "粉丝甲" }))
b.onopen = () => b.send(JSON.stringify({ join: "room-miku", name: "粉丝乙" }))
b.onmessage = (e) => console.log("乙收到：", e.data)
a.onopen = () => setTimeout(() => a.send(JSON.stringify({ room: "room-miku", text: "开场曲走起" })), 100)
```

**讲解：**

1. 房间 = 频道名。加入时 `ws.subscribe(data.join)`，发言时 `server.publish(data.room, ...)`，房间隔离由订阅关系天然保证。
2. 服务端做两道防线：白名单校验房间名（防止订阅任意频道），截断超长文本（防止恶意大包）。
3. 消息协议用最简单的 JSON 约定：`{join}` 表示加入、`{room, text}` 表示发言。协议升级为聊天功能时保持"一个动词一个字段"的风格，测试好写。
4. 房间可以继续加运营约束：订阅前校验房间人数上限（subscriberCount）、按粉丝团成员关系校验资格——业务规则统一收敛在 message 回调的 join 分支里，广播层保持纯粹。
5. 可靠性边界要想清楚：publish 是"尽力而为"的广播，掉线期间的弹幕不会补发；需要"进房可见历史"时，在加入分支里从存储读最近 N 条私发给该连接即可。

## 3. routes 路由表与 cookies()

Bun 1.2 起 `Bun.serve` 支持 routes 路由表：字面量路径直接命中，`:param` 声明动态段，未命中落到 fetch 兜底。Cookie 则由 `request.cookies` 托管读写。

```typescript
// routes.ts —— 路由表 + Cookie：记住到访粉丝
const server = Bun.serve({
  port: 3000,
  routes: {
    "/": () => new Response("虚拟歌手音乐平台"),

    // 静态 JSON 也可以直接作为路由值
    "/api/concerts": Response.json([
      { id: "c001", title: "2026 魔法未来", date: "2026-09-05" },
    ]),

    // 动态段 :id：读取路径参数，读写 Cookie
    "/fans/:id": (req) => {
      const fanId = req.params.id                      // 路径参数
      const lastSeen = req.cookies.get("fan_id")       // 读请求 Cookie
      req.cookies.set("fan_id", fanId, {               // 写 Cookie，自动附加 Set-Cookie
        maxAge: 60 * 60 * 24,
        httpOnly: true,
        path: "/",
      })
      return new Response(lastSeen ? `上次到访：${lastSeen}` : `首次到访：${fanId}`)
    },
  },
  fetch() {
    return new Response("Not Found", { status: 404 }) // 兜底 404
  },
})
```

**讲解：**

1. routes 的匹配顺序：字面量路径优先，动态段次之，都不命中进入 fetch。处理器可以返回 Response、字符串或 `Response.json(...)`。
2. `request.cookies` 是读写一体的 Cookie 助手（Bun 1.2.7+）：`set` 之后再返回响应，Set-Cookie 头自动附加，不用手工拼 `headers`。
3. routes 与 fetch 并存时职责清晰：routes 管"已知的业务路径"，fetch 兜底 404 与 WebSocket 协议升级——把升级请求留在 fetch 里，是与路由表共存时的常见组织方式。
4. 身份类 Cookie 记得 `httpOnly: true`（禁止脚本读取）与明确的 `path`/`maxAge`，会话标识绝不能进 localStorage 之外的可注入位置。
5. 调试 Cookie 用 `curl -i` 看响应头里的 Set-Cookie，比浏览器 DevTools 更直接；升级请求则看握手响应的状态码（101 表示切换成功）。

## 4. HTML imports 与热重载

`Bun.serve` 可以直接把 HTML 文件作为路由值：Bun 内置打包器会处理页面里引用的 TS/TSX/CSS，前端资产零配置。

```typescript
// app.ts —— 一个入口同时托管页面与 API
import index from "./index.html"   // 导入 HTML，引用的脚本与样式自动打包
import api from "./api.ts"         // API 用 Hono 或原生 fetch 均可

Bun.serve({
  port: 3000,
  routes: {
    "/": index,          // 首页交给 HTML 入口
    "/api/*": (req) => api.fetch(req),
  },
})
```

```html
<!-- index.html —— 脚本直接写 TypeScript，无需前置编译 -->
<!doctype html>
<html lang="zh-CN">
  <body>
    <h1>演唱会直播间</h1>
    <ul id="danmaku"></ul>
    <script src="./client.ts"></script>
  </body>
</html>
```

```bash
bun app.ts                        # 开发模式：静态资源自动打包 + 页面自动刷新
NODE_ENV=production bun app.ts    # 生产模式：输出压缩打包产物
bun --hot app.ts                  # 后端代码热替换：进程内状态保留
```

**讲解：**

1. `import "./index.html"` 之后，页面里 `<script src="./client.ts">` 的 TypeScript、`<link>` 的 CSS 都由内置打包器处理，Vite 式的开发体验但零依赖配置。
2. 开发模式（未设 `NODE_ENV=production`）下页面改动自动刷新；后端用 `--hot` 可在保留进程状态（如在线连接）的情况下替换模块。
3. HTML imports 与 routes 共存时的约定：API 挂在 `/api/*` 前缀、页面挂根路径，前端请求走相对路径即可——同源部署，不需要额外配置 CORS。
4. routes 的处理器也支持异步：直接写 async 返回 Promise，Bun 会等待结果——弹幕历史这类"先查存储再响应"的路径同样放得进路由表。
5. 生产模式同一个入口直接输出打包产物，"开发即生产"的结构让部署只有一条路径，不会出现"本地 Vite、线上 Nginx 两套逻辑"。

## 5. 生产部署建议

```typescript
// graceful.ts —— 健康检查与优雅退出
const server = Bun.serve({
  port: 3000,
  routes: {
    "/health": () =>
      Response.json({ ok: true, online: server.subscriberCount("fanclub") }),
  },
  websocket: { /* 同前：open/message/close */ },
  fetch() { return new Response("Not Found", { status: 404 }) },
})

// 收到终止信号：停止接受新连接，等待存量 WebSocket 关闭
process.on("SIGINT", () => {
  server.stop(true) // true = 等待活跃连接关闭后再退出
  process.exit(0)
})
```

**讲解：**

1. **反向代理**：前置 Nginx/Caddy 处理 TLS 时，必须透传 `Upgrade`/`Connection` 头，否则 WebSocket 升级请求被代理拦成普通 HTTP。
2. **多实例扩展**：publish 是进程内的，多实例部署时同一频道的观众分散在不同进程，广播要经 Redis Pub/Sub 等外置总线中转，或用网关做会话粘滞。
3. **优雅退出**：滚动发布时先 `server.stop(true)` 等存量连接收尾，配合 `/health` 让负载均衡摘流量，弹幕不丢、在线不掉。
4. **可观测**：把 `subscriberCount`、每秒发布消息数接入指标系统；升级失败率（426 计数）异常升高通常是代理配置问题。
5. **灰度与扩容**：先加副本验证代理透传与外置广播总线，再放量；长连接会让滚动发布变慢，健康检查与最大排空时间要一起调整。

## 6. 身份与鉴权：升级请求里的会话

弹幕房间的第一道安全问题是谁能连上来。升级请求本质上还是一个 HTTP 请求，Cookie、查询参数都在这一刻可读；通过认证后，把身份绑定到连接本身，后续消息处理就不用再查。

```typescript
// auth_ws.ts —— 升级时校验身份，绑定每连接数据
const server = Bun.serve({
  port: 3002,
  websocket: {
    open(ws) {
      ws.subscribe("fanclub")
      // ws.data 是升级时绑定的每连接数据，不需要全局 Map 维护
      server.publish("fanclub", `${ws.data.name} 进入了直播间`)
    },
    message(ws, message) {
      server.publish("fanclub", `${ws.data.name}：${message}`)
    },
  },
  fetch(request, server) {
    // 升级请求仍是 HTTP：身份信息在握手阶段读取
    const name = new URL(request.url).searchParams.get("name")?.slice(0, 20) ?? "游客"
    if (!server.upgrade(request, { data: { name } })) {
      return new Response("需要 WebSocket 连接", { status: 426 })
    }
  },
})
```

**讲解：**

1. `server.upgrade(request, { data })` 的第二个参数携带任意对象，之后在每个回调里以 `ws.data` 直接读取——这取代了"自己维护 Map<WebSocket, 用户>"的传统写法，连接关闭时数据自动随连接回收。
2. 身份校验放在 fetch（握手）阶段而不是 message 阶段：未认证的连接根本建立不起来，拒绝时返回 401 或 426。
3. 示例用查询参数传名字便于演示；生产环境应从请求 Cookie 读取会话令牌（配合第 3 节的 request.cookies），避免敏感信息出现在 URL 日志里。
4. 有了每连接身份，广播前可以做过滤（例如VIP专享频道的消息只发给持有对应标记的连接），粒度到连接级别而不是频道级别。
5. 鉴权失败的连接直接返回 401/426 拒绝升级：不要让未认证连接先进房间再踢——在握手阶段拒绝是最便宜、最安全的做法。

## 易错点与最佳实践

1. **只 publish 不 subscribe**：客户端连上了但从未加入频道，广播永远收不到。open 回调里完成默认订阅，或协议上强制先发加入指令：

```typescript
// 错误：直接发布，未订阅者收不到
// server.publish("fanclub", text)
// 正确：先订阅再发布，成对出现
open(ws) { ws.subscribe("fanclub") }
message(ws, m) { server.publish("fanclub", `[弹幕] ${m}`) }
```

2. **upgrade 失败仍返回 200**：客户端拿到 200 却没有 WebSocket 连接，表现为"永远连不上还不报错"。升级失败返回 426，成功返回 undefined。

3. **弹幕内容不设防**：用户输入直接广播给全频道，超长文本与脚本注入都会伤及前端渲染。服务端统一截断长度、剥离控制字符，渲染层仍按纯文本处理：

```typescript
// 错误：原文广播
// server.publish(room, data.text)
// 正确：截断 + 转义责任留在客户端按 textContent 渲染
const safe = String(data.text).slice(0, 80)
server.publish(room, `${data.name ?? "游客"}：${safe}`)
```

4. **多实例直连进程内 publish**：第二个实例上线后"一半人收不到弹幕"是必然结果。上生产前就规划好外置广播总线，避免事后改造。

5. **开发模式直接上线**：未设 `NODE_ENV=production` 时资产按开发模式输出，体积大且无压缩。部署命令固定 `NODE_ENV=production bun app.ts`，或用 `bun build --compile` 出单文件。

6. **耗时副作用挡住消息循环**：message 回调与广播在连接事件循环上执行，把写数据库、发邮件这类慢操作塞进回调，同进程全部连接都会被拖慢。副作用改为入队，由队列处理器异步完成：

```typescript
// 错误：回调内同步等待外部服务，拖慢所有连接
// await sendTicketEmail(ws.data.name)
// 正确：消息入队，回调立即返回
await kv.enqueue({ type: "ticket-ok", name: ws.data.name })
```

## 本篇小结

1. WebSocket 是 Bun.serve 的一等能力：fetch 里 `server.upgrade` 升级协议，websocket 回调处理 open/message/close，`subscribe/publish` 提供频道广播。
2. 房间隔离 = 频道命名；协议用"动词字段"式 JSON 约定，服务端负责白名单与截断两道防线。
3. routes 路由表按"字面量优先、动态段次之、fetch 兜底"匹配；`request.cookies` 读写一体，set 自动附加 Set-Cookie。
4. HTML imports 让一个入口同时托管页面、API 与打包资产：开发自动刷新，`NODE_ENV=production` 输出产物，`--hot` 保留状态热替换后端。
5. 上生产四件事：代理透传升级头、多实例外置广播总线、优雅退出等存量连接、订阅数与吞吐接入监控。

## 动手实践

1. **房间在线人数大屏**：扩展聊天室，增加 `GET /api/rooms` 返回每个房间的 `subscriberCount`，前端每 3 秒拉取渲染成榜单。提示：房间列表先在服务端维护一个 Map<房间名, 简介>，避免暴露白名单实现细节。
2. **开票倒计时广播**：服务端用 setInterval 每秒向 `concert-c001` 频道 publish 剩余秒数，客户端进入页面即显示实时倒计时。提示：发布前判断 `subscriberCount > 0`，没人订阅时跳过序列化开销。
3. **弹幕协议测试**：用 [内置测试与基准](/bun/006-BunTestBench) 的 bun test 写协议级测试：模拟两个 WebSocket 客户端加入同一房间，断言广播只到达订阅者、超长文本被截断到 80 字。提示：测试里 `server.upgrade` 需要真实端口，选一个随机高位端口避免冲突。再验证一个客户端异常断开后，广播仍能正常送达其余订阅者。
