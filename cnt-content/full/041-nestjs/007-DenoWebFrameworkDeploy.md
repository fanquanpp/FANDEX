---
order: 70
title: Deno Web 开发与云端部署
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: 用 Hono 构建 REST API，接入 Deno KV 存储，并部署到 Deno Deploy 边缘网络。
author: fanquanpp
updated: '2026-08-03'
related:
  - 'nestjs/003-DenoPermissionsSecurity'
  - 'nestjs/016-ModuleControllerService'
  - 'cloud-computing/001-CloudComputingBasics'
prerequisites:
  - 'nestjs/003-DenoPermissionsSecurity'
---

## 0. 一句话理解

> 用 Hono 写路由、用 Deno KV 存数据、部署到 Deno Deploy——三样都是"边缘原生"，一个项目从零到上线不需要自建服务器。

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

Deno.serve(app.fetch)
```

```bash
deno run --allow-net main.ts
```

**讲解：**

1. `new Hono()` 创建应用，`app.get("/", 处理函数)` 注册路由；`c` 是上下文对象，`c.text/c.json` 返回响应。
2. `c.req.param("name")` 读取路径参数，`/hello/小明` 会返回 JSON 消息。
3. `Deno.serve(app.fetch)` 把 Hono 应用挂到 Deno 内置 HTTP 服务器上，不需要 Express 或额外依赖。

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

Deno.serve(app.fetch)
```

**讲解：**

1. `Deno.openKv()` 打开内置键值存储（本地是 SQLite，云端是 Deno KV），零配置即可持久化。
2. `kv.set(["todos", id], 对象)` 以数组作为分层键，`kv.list({ prefix: ["todos"] })` 遍历该前缀下的所有记录。
3. `crypto.randomUUID()` 生成唯一 id；`for await` 异步遍历 KV 结果集。
4. KV 天然适合会话、配置、小型业务数据；复杂关系查询仍然选数据库（如 PostgreSQL）。

## 3. 测试与检查

```typescript
// main_test.ts
import { assertEquals } from "jsr:@std/assert@1"
import { average } from "./main.ts"

Deno.test("average 基本功能", () => {
  assertEquals(average([1, 2, 3]), 2)
})
```

```bash
deno check main.ts
deno test
```

**讲解：**

1. 测试与业务函数同文件导出，`deno test` 自动发现 `_test.ts`。
2. `deno check` 做全量类型检查，是 CI 里最便宜的一层保障。

## 4. 部署到 Deno Deploy

```bash
# 安装部署 CLI
deno install -gArf jsr:@deno/deployctl

# 登录并部署
deployctl deploy --project=my-deno-app main.ts
```

**讲解：**

1. `deployctl deploy` 把项目推送到 Deno Deploy 边缘网络，全球节点就近执行，无需配置服务器。
2. 每次部署会生成新的预览 URL，正式域名在控制台绑定。
3. 云端自动注入 `Deno.openKv()`、`Deno.cron` 等服务，本地与线上 API 一致，无环境差异。

## 5. 动手试试

1. 给待办 API 增加 `DELETE /todos/:id`（`kv.delete(["todos", id])`）。
2. 用 `Deno.cron("daily", "0 3 * * *", ...)` 写一个每天 3 点清理已完成待办的定时任务。
3. 把项目部署到 Deno Deploy，用浏览器访问线上接口。

## 6. 一句话记住

> Deno 的 Web 开发链路最短：Hono 写 API、KV 存数据、Deploy 一键上线，权限参数决定它能碰什么。
