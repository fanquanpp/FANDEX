---
order: 70
title: Deno Web 开发与云端部署
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: 用 Hono 构建 REST API，接入 Deno KV 存储与定时任务，部署到 Deno Deploy 边缘网络。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/030-DenoPermissionsSecurity'
  - 'nestjs/050-DenoKVQueues'
  - 'nestjs/160-ModuleControllerService'
  - 'cloud-computing/010-CloudComputingBasics'
prerequisites:
  - 'nestjs/030-DenoPermissionsSecurity'
---

## 0. 一句话理解

> 用 Hono 写路由、用 Deno KV 存数据、部署到 Deno Deploy——三样都是"边缘原生"，一个项目从零到上线不需要自建服务器。

本篇把[快速入门](/nestjs/020-DenoQuickStart)里学到的语法升级成一个真实的小服务：为"虚拟歌手音乐平台"实现待办式演出任务 API，本地开发、测试、部署三步走完。

## 1. Hono 第一个 API

```typescript
// main.ts
import { Hono } from "npm:hono@4"

const app = new Hono()

app.get("/", (c) => c.text("你好，Deno!"))

app.get("/hello/:name", (c) => {
  const name = c.req.param("name")
  return c.json({ message: `你好，${name}` })
})

// 带中间件的错误兜底：业务代码抛异常时返回统一 JSON
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: "服务内部错误" }, 500)
})

Deno.serve(app.fetch)
```

```bash
deno run --allow-net=:8000 main.ts
```

```text
# curl http://localhost:8000/hello/初音
{"message":"你好，初音"}
```

**讲解：**

1. `new Hono()` 创建应用，`app.get("/", 处理函数)` 注册路由；`c` 是上下文对象，`c.text/c.json` 返回响应。
2. `c.req.param("name")` 读取路径参数，`/hello/初音` 会返回 JSON 消息；查询参数用 `c.req.query("key")`。
3. `Deno.serve(app.fetch)` 把 Hono 应用挂到 Deno 内置 HTTP 服务器上，不需要 Express 或额外依赖；`--allow-net=:8000` 把监听端口也收进白名单。
4. `app.onError` 是 Hono 的统一异常出口，对应 NestJS 异常过滤器的角色——框架不同，"错误集中处理"的架构思想完全一致。
5. Hono 是轻量路由层，选择它是因为 Web 标准 API（Request/Response）与 Deno 原生服务器天然契合；Oak、Fresh 也是常见选择，思路相通。

## 2. 接入 Deno KV

```typescript
// kv_todo.ts
import { Hono } from "npm:hono@4"

const kv = await Deno.openKv()
const app = new Hono()

app.post("/todos", async (c) => {
  const { title } = await c.req.json()
  const id = crypto.randomUUID()
  await kv.set(["todos", id], { title, done: false })
  return c.json({ id, title, done: false }, 201)
})

app.get("/todos", async (c) => {
  const list = []
  for await (const entry of kv.list({ prefix: ["todos"] })) {
    list.push({ id: entry.key[1], ...entry.value })
  }
  return c.json(list)
})

app.delete("/todos/:id", async (c) => {
  await kv.delete(["todos", c.req.param("id")])
  return new Response(null, { status: 204 })
})

Deno.serve(app.fetch)
```

```bash
deno run --unstable-kv --allow-net=:8000 kv_todo.ts
```

**讲解：**

1. `Deno.openKv()` 打开内置键值存储，零配置即可持久化：本地是落在数据目录的 SQLite 文件，部署到 Deno Deploy 后是托管的 FoundationDB 后端，代码不变。注意 `--unstable-kv`：截至 Deno 2.9，KV 仍是官方标注的不稳定 API，运行时需要这个标记开启。
2. `kv.set(["todos", id], 对象)` 以数组作为分层键，`kv.list({ prefix: ["todos"] })` 遍历该前缀下的所有记录；数组键等价于"表名 + 主键"的两级结构。
3. `crypto.randomUUID()` 生成唯一 id；`for await` 异步遍历 KV 结果集。
4. KV 天然适合会话、配置、小型业务数据；原子操作、watch 监听与适用边界（何时换 PostgreSQL）见[Deno KV 与队列](/nestjs/050-DenoKVQueues)。

## 3. 定时任务与测试

```typescript
// cron.ts —— 每天凌晨 3 点清理已完成的演出任务
Deno.cron("cleanup", "0 3 * * *", async () => {
  const kv = await Deno.openKv()
  for await (const entry of kv.list({ prefix: ["todos"] })) {
    if (entry.value.done) await kv.delete(entry.key)
  }
})
```

```bash
deno test --allow-net=localhost --allow-env
```

**讲解：**

1. `Deno.cron(名字, cron 表达式, 函数)` 是内置定时任务：本地由 Deno 调度，部署到 Deno Deploy 后自动成为云端定时任务，两侧语义一致。
2. cron 表达式与 Linux crontab 相同：`0 3 * * *` 即每天 03:00；写错表达式会在启动时报错，不用担心静默不执行。
3. 测试沿用 `Deno.test` + `@std/assert`：把路由处理函数抽成独立函数后可脱离 HTTP 直接断言；要测真实接口时用 `app.request("/todos", { method: "POST", body })` 构造请求，不需要真开端口。

## 4. 部署到 Deno Deploy

```bash
# 安装部署 CLI
deno install -gArf jsr:@deno/deployctl

# 登录并部署（首次会打开浏览器授权）
deployctl deploy --project=my-deno-app main.ts
```

**讲解：**

1. `deployctl deploy` 把项目推送到 Deno Deploy 边缘网络，全球节点就近执行，无需配置服务器。
2. 每次部署会生成新的预览 URL，正式域名在控制台绑定；也可以接入 GitHub 仓库，push 即自动部署。
3. 云端自动提供 `Deno.openKv()`、`Deno.cron` 等托管服务，本地与线上 API 一致，无环境差异——这是"边缘原生"相对于传统部署最大的体验优势。
4. 服务器环境的权限由平台代管：不再需要手敲 `--allow-net`，但本地开发时仍要养成最小权限的习惯，否则迁移到自建 Docker 时会踩权限坑。
5. 不想绑定单一平台时，标准做法是 `deno compile` 出单文件可执行程序放进 Docker 镜像，部署到任意云主机——Deno 不锁定部署目标。

## 5. 常见陷阱

1. **本地 KV 数据"消失"**：`Deno.openKv()` 本地默认按项目路径存 SQLite 文件，换目录运行就是新库；需要共享数据时显式传路径 `Deno.openKv("./data/kv.db")`。
2. **Deploy 上环境变量未设置**：控制台配置的环境变量与本地 `.env` 是两套体系，上线前逐项核对；密钥类变量用 Deploy 的 secrets 功能。
3. **忘记返回状态码**：`c.json(data)` 默认 200，创建资源应显式 `c.json(data, 201)`，删除成功返回 204（无 body）——语义正确的状态码是 API 的基本素养。
4. **`for await` 遍历 KV 时边遍历边写**：遍历前缀时插入/删除同前缀 key 可能漏读或重读，先收集再处理更稳妥。
5. **把 Hono 当全功能后端框架**：Hono 只管 HTTP 路由，没有依赖注入与模块系统；业务复杂后要么自己分层，要么迁移到 NestJS（见[概述与快速上手](/nestjs/150-NestJSOverview)，本模块主线）——小工具用 Hono，企业应用用 Nest，不是替代关系。

## 6. 动手试试

1. 给待办 API 增加 `PATCH /todos/:id`，用 `kv.set` 原地更新 `done` 字段，并测试切换效果。
2. 用 `Deno.cron` 写一个每分钟执行的统计任务，把任务总数写入 `["stats", "todo-count"]`。
3. 把项目部署到 Deno Deploy，用浏览器访问线上接口，再在控制台试试回滚到上一个版本。
4. 用 `app.request()` 给 `POST /todos` 写两个测试用例：合法创建返回 201、空 body 返回 400。

## 7. 本篇小结

**初学者要点：**

- Deno 的 Web 开发链路最短：Hono 写 API、KV 存数据、Deploy 一键上线，权限参数决定它能碰什么。
- 本地与云端 API 一致（KV、Cron），是 Deno Deploy 区别于传统部署的核心优势。
- 状态码语义（201/204/400/500）与统一错误出口（`app.onError`）从第一个接口就要做对。

**进阶注意：**

- KV 的进阶用法（原子操作、watch、与 Postgres 的取舍）在[Deno KV 与队列](/nestjs/050-DenoKVQueues)展开；本篇先建立"边缘原生"的直觉。
- Hono 解决"路由"，NestJS 解决"架构"；当模块、依赖注入、校验、守卫这些词开始出现在需求里，就是切换框架的信号。
