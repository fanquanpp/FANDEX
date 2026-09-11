---
order: 100
title: Bun 内置服务器、 SQL 与数据库
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: Bun.serve 写 HTTP 服务，bun:sqlite 与 Bun.SQL 两种数据库路径，内置 Redis 客户端，一个运行时完成全栈。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/090-BunQuickStart'
  - 'nestjs/130-BunWebSocketFrontendDev'
  - 'sql/020-OverviewStandard'
prerequisites:
  - 'nestjs/090-BunQuickStart'
---

## 0. 一句话理解

> Bun 把服务器、SQL、Redis 客户端都"内置"了：`Bun.serve` 起服务、`bun:sqlite`/`Bun.SQL` 查数据库、`redis` 连缓存，少装一半依赖。

本篇围绕"演出周边商店"写一个可运行的小后端：查商品（SQLite）、记订单（统一 SQL API）、做点击计数（Redis），体验零驱动的全栈开发。

## 1. Bun.serve：HTTP 服务器与路由表

```typescript
// server.ts
const server = Bun.serve({
  port: 3000,
  // routes 路由表（Bun 1.2.3+）：字面量路径直接命中，:param 声明动态段
  routes: {
    "/": () => new Response("你好，Bun!"),
    "/api/time": () => Response.json({ time: new Date().toISOString() }),
    "/api/goods/:id": (req) => {
      const { id } = req.params // 动态段自动解析
      return Response.json({ id, name: `周边-${id}` })
    }
  },
  // 未命中路由表时兜底，适合复杂判断或返回 404
  async fetch(request) {
    return new Response("Not Found", { status: 404 })
  }
})

console.log(`服务已启动: http://localhost:${server.port}`)
```

```bash
bun server.ts
# curl http://localhost:3000/api/goods/c001
# {"id":"c001","name":"周边-c001"}
```

**讲解：**

1. `Bun.serve({ fetch })` 使用 Web 标准 Request/Response；`routes` 路由表是 1.2.3 起的推荐写法，字面量匹配性能最好，`:param` 动态段从 `req.params` 读取。
2. `Response.json(...)` 是 Web 标准便捷方法，自动设置 `Content-Type: application/json`。
3. 路由未命中落到 `fetch` 兜底——本篇返回 404，避免未知路径静默返回 200；复杂的"方法 + 路径"判断也写在兜底里。
4. `Bun.serve` 支持读写一体 Cookie（`request.cookies`）、WebSocket 处理器与 HTML imports，见[WebSocket 与前端开发服务器](/nestjs/130-BunWebSocketFrontendDev)；生产可按需开启 TLS。

## 2. bun:sqlite：内置 SQLite

```typescript
// db.ts
import { Database } from "bun:sqlite"

const db = new Database("app.db")

db.run(`
  CREATE TABLE IF NOT EXISTS goods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    stock INTEGER DEFAULT 0
  )
`)

// 插入
const insert = db.query("INSERT INTO goods (title, stock) VALUES (?, ?) RETURNING *")
const created = insert.get("魔法未来应援棒", 42)

// 查询
const all = db.query("SELECT * FROM goods ORDER BY id DESC").all()

console.log("创建:", created)
console.log("全部:", all)
```

**讲解：**

1. `bun:sqlite` 是内置 SQLite 驱动，`new Database("app.db")` 打开（没有则创建）数据库文件；单文件、零服务，适合桌面工具、小型网站与本地缓存层。
2. `db.run` 执行建表等无返回语句；`db.query(...)` 预编译 SQL，`?` 是参数占位符，防止 SQL 注入；高频查询复用编译结果更快。
3. `insert.get(...)` 执行插入并返回第一行（`RETURNING *` 返回新记录），`.all()` 返回所有行。
4. 参数化查询是铁律：永远不要用字符串拼接拼 SQL。
5. 事务（保证"扣库存 + 写订单"两步同生共死）与命名参数的进阶用法见[Bun SQLite 与 S3](/nestjs/140-BunSQLiteAndS3)。

## 3. 组合：带数据库的 API

```typescript
// api.ts
import { Database } from "bun:sqlite"

const db = new Database("app.db")
db.run(`CREATE TABLE IF NOT EXISTS goods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  stock INTEGER DEFAULT 0
)`)

Bun.serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url)

    if (request.method === "POST" && url.pathname === "/goods") {
      const body = await request.json()
      const result = db
        .query("INSERT INTO goods (title, stock) VALUES (?, ?) RETURNING *")
        .get(body.title, body.stock ?? 0)
      return Response.json(result, { status: 201 })
    }

    if (request.method === "GET" && url.pathname === "/goods") {
      const rows = db.query("SELECT * FROM goods").all()
      return Response.json(rows)
    }

    return new Response("Not Found", { status: 404 })
  }
})
```

**讲解：**

1. 请求方法 + 路径组合成路由：`POST /goods` 创建，`GET /goods` 列表。
2. `await request.json()` 解析请求体，然后参数化插入数据库。
3. 这 30 行代码就是一个可运行的商店 API：无框架、无 ORM、无额外依赖。
4. 进阶：多表关联、迁移、连接池等场景再引入 Prisma/Drizzle 等 ORM，简单场景内置 SQLite 足够。

## 4. Bun.SQL：统一 SQL 客户端（Postgres 1.2+，MySQL 与 SQLite 1.3+）

`bun:sqlite` 是 SQLite 专属的同步 API；如果目标是 PostgreSQL 或 MySQL，用统一的 SQL 客户端——Postgres 支持自 Bun 1.2 起内置（`sql` 标签模板），1.3 起扩展为覆盖三类数据库的统一 API，连接串自动识别数据库类型，一套语法通吃三家：

```typescript
// sql.ts —— import { SQL } from "bun"，连接串决定驱动
import { SQL } from "bun"

const sql = new SQL("postgres://user:pass@localhost:5432/shop")
// MySQL：new SQL("mysql://user:pass@localhost:3306/shop")
// SQLite：new SQL("sqlite://app.db") 或 ":memory:"（内存库）

// 标签模板：${} 占位由驱动参数化，天然防注入
const goods = await sql`SELECT * FROM goods WHERE stock > ${0}`
console.log(goods)

await sql`INSERT INTO goods (title, stock) VALUES (${`T 恤`}, ${10})`

// 事务：transaction 回调内抛错自动回滚
await sql.begin(async tx => {
  await tx`UPDATE goods SET stock = stock - 1 WHERE id = ${1}`
  await tx`INSERT INTO orders (goods_id) VALUES (${1})`
})
```

**讲解：**

1. `import { SQL } from "bun"` 一行拿到 Postgres/MySQL/SQLite 三种驱动，无需 `pg`、`mysql2` 或 `better-sqlite3`——lockfile 直接瘦身。
2. 标签模板 `` sql`...` `` 返回 Promise，`${}` 里的值由驱动参数化；三条数据库同语法，换库只改连接串。
3. `sql.begin` 开启事务，回调内用 `tx` 执行同事务语句，抛错自动回滚——与第 2 节 SQLite 事务语义一致，心智模型只有一套。
4. 选型口诀：单机小工具用 `bun:sqlite`（同步、简单、快）；要连 Postgres/MySQL 或想保留换库自由，用统一 `SQL` 类。

## 5. 内置 Redis 客户端

```typescript
import { redis } from "bun"  // 默认实例：读取 REDIS_URL 环境变量（默认 redis://localhost:6379）

await redis.set("counter", 1)
await redis.incr("counter")
const value = await redis.get("counter")

console.log(value) // "2"
```

```typescript
// 需要多个连接或自定义地址时，用 RedisClient 类
import { RedisClient } from "bun"

const client = new RedisClient("redis://localhost:6379")
await client.set("greeting", "你好")
console.log(await client.get("greeting"))
```

**讲解：**

1. Bun 1.3+ 内置 Redis 客户端（`bun` 模块导出 `redis` 默认实例与 `RedisClient` 类），无需安装 `ioredis` 等第三方包；要求 Redis 服务器 7.2+。
2. 连接是惰性的：首次执行命令才真正建连；断线自动指数退避重连。
3. API 风格与 ioredis 高度一致：`set/get/incr` 都是 Promise，可用 `await`；内存缓存、分布式锁、限流等场景可直接使用。
4. 典型组合：SQLite/Postgres 存业务数据，Redis 存计数与热点缓存——商店首页的"浏览量"就该放 Redis，别每次写库。

## 6. 常见陷阱

1. **拿 `bun:sqlite` 的同步 API 阻塞事件循环**：`db.query(...).all()` 是同步的，大查询会卡住所有并发请求；数据量大时加 `LIMIT`、走索引，或换统一的 `SQL` 异步客户端。
2. **SQL 字符串拼接**：两种 API 都支持参数化（`?` 占位符与标签模板 `${}`），拼接用户输入等于开门揖盗。
3. **Redis 当持久化存储**：`set` 不带过期策略、不落盘配置时，重启即丢；缓存可丢，订单不可丢——数据分层要想清楚。
4. **端口占用误以为代码错了**：`EADDRINUSE` 是上一个 `bun server.ts` 还挂着；改端口或先结束旧进程。
5. **忘了环境变量注入**：`redis` 默认实例读 `REDIS_URL`，生产环境忘配就静默连 localhost；关键连接用 `RedisClient` 显式传地址并在启动时 `ping` 验证。

## 7. 动手试试

1. 给商店 API 增加 `DELETE /goods/:id`（路由表动态段 + 参数化 DELETE）。
2. 用 `bun:sqlite` 做一个"点击计数"页面：每次访问 `/counter` 把数字加 1 并返回，再改用 Redis 实现一遍，对比两种写法。
3. 用 Docker 起一个 PostgreSQL（`docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev123 postgres`），把统一 `SQL` 类的连接串指向它，跑通 `sql.begin` 事务。
4. 给 `GET /goods` 加 `?minStock=` 过滤参数，体会查询参数 -> SQL 条件的安全写法。

## 8. 本篇小结

**初学者要点：**

- Bun.serve 起服务（路由表 + fetch 兜底）、bun:sqlite 存数据、统一 `SQL` 连主流数据库、内置 Redis 做缓存——小项目一个运行时全搞定。
- SQL 永远用参数占位符：`?` 与标签模板 `${}` 都是防线，字符串拼接是红线。
- 数据分层：业务数据进数据库、计数缓存进 Redis、临时数据用内存。

**进阶注意：**

- 同步的 `bun:sqlite` 与异步的统一 `SQL` 各有适用面；并发量上来后，"同步大查询阻塞事件循环"是最常见的性能坑。
- 这些内置能力覆盖"从零到能用"，复杂场景（迁移、连接池、读写分离）仍会回到专业 ORM 与托管数据库——内置件是起点，不是终点。
