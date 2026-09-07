---
order: 100
title: Bun 内置服务器、 SQL 与数据库
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: Bun.serve 写 HTTP 服务，Bun.sql 操作 SQLite，内置 Redis 客户端与文件路由，一个运行时完成全栈。
author: fanquanpp
updated: '2026-08-03'
related:
  - 'nestjs/009-BunQuickStart'
  - 'sql/002-OverviewStandard'
prerequisites:
  - 'nestjs/009-BunQuickStart'
---

## 0. 一句话理解

> Bun 把服务器、SQL、Redis 客户端都"内置"了：`Bun.serve` 起服务、`Bun.sql` 查数据库，少装一半依赖。

## 1. Bun.serve：HTTP 服务器

```typescript
// server.ts
const server = Bun.serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === "/" ) {
      return new Response("你好，Bun!")
    }

    if (url.pathname === "/api/time") {
      return Response.json({ time: new Date().toISOString() })
    }

    return new Response("Not Found", { status: 404 })
  }
})

console.log(`服务已启动: http://localhost:${server.port}`)
```

**讲解：**

1. `Bun.serve({ fetch })` 使用 Web 标准 Request/Response，无需 Express 依赖。
2. `new URL(request.url)` 解析路径，按 `url.pathname` 分发路由。
3. `Response.json(...)` 是 Web 标准便捷方法，自动设置 `Content-Type: application/json`。
4. 最后一行兜底返回 404，避免未知路径静默返回 200。

## 2. Bun.sql：内置 SQLite

```typescript
// db.ts
import { Database } from "bun:sqlite"

const db = new Database("app.db")

db.run(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )
`)

// 插入
const insert = db.query("INSERT INTO todos (title) VALUES (?) RETURNING *")
const created = insert.get("学 Bun SQL")

// 查询
const all = db.query("SELECT * FROM todos ORDER BY id DESC").all()

console.log("创建:", created)
console.log("全部:", all)
```

**讲解：**

1. `bun:sqlite` 是内置 SQLite 驱动，`new Database("app.db")` 打开（没有则创建）数据库文件。
2. `db.run` 执行建表等无返回语句；`db.query(...)` 预编译 SQL，`?` 是参数占位符，防止 SQL 注入。
3. `insert.get(...)` 执行插入并返回第一行（`RETURNING *` 返回新记录），`.all()` 返回所有行。
4. 参数化查询是铁律：永远不要用字符串拼接拼 SQL。

## 3. 组合：带数据库的 API

```typescript
// api.ts
import { Database } from "bun:sqlite"

const db = new Database("app.db")

db.run(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )
`)

Bun.serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url)

    if (request.method === "POST" && url.pathname === "/todos") {
      const body = await request.json()
      const result = db
        .query("INSERT INTO todos (title) VALUES (?) RETURNING *")
        .get(body.title)
      return Response.json(result, { status: 201 })
    }

    if (request.method === "GET" && url.pathname === "/todos") {
      const rows = db.query("SELECT * FROM todos").all()
      return Response.json(rows)
    }

    return new Response("Not Found", { status: 404 })
  }
})
```

**讲解：**

1. 请求方法 + 路径组合成路由：`POST /todos` 创建，`GET /todos` 列表。
2. `await request.json()` 解析请求体，然后参数化插入数据库。
3. 这 40 行代码就是一个可运行的待办 API：无框架、无 ORM、无额外依赖。
4. 进阶：多表关联、迁移、连接池等场景再引入 Prisma/Drizzle 等 ORM，简单场景内置 SQLite 足够。

## 4. 内置 Redis 客户端

```typescript
import { Redis } from "bun"

const redis = new Redis("redis://localhost:6379")

await redis.set("counter", 1)
await redis.incr("counter")
const value = await redis.get("counter")

console.log(value) // "2"
```

**讲解：**

1. Bun 1.3+ 内置 Redis 客户端（`bun` 模块导出），无需安装 `ioredis` 等第三方包。
2. API 风格与 ioredis 高度一致：`set/get/incr` 都是 Promise，可用 `await`。
3. 内存缓存、分布式锁、限流等场景可直接使用；连接串支持 Redis 标准 URL。

## 5. 动手试试

1. 给待办 API 增加 `DELETE /todos/:id`（解析路径参数并 `db.run("DELETE ...")`）。
2. 用 `bun:sqlite` 做一个"点击计数"页面：每次访问 `/counter` 把数字加 1 并返回。
3. 启动本地 Redis（Docker），用内置客户端写入并读取一个字符串。

## 6. 一句话记住

> Bun.serve 起服务、bun:sqlite 存数据、内置 Redis 做缓存——小项目一个运行时全搞定，SQL 永远用参数占位符。
