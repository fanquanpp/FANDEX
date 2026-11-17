---
order: 70
title: Deno Web 开发与云端部署
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: 用 Hono 构建 REST API，接入 Deno KV 存储与定时任务；部署一节讲清 Deno Deploy 平台现状与 Docker 自托管路线。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'nestjs/030-DenoPermissionsSecurity'
  - 'nestjs/050-DenoKVQueues'
  - 'nestjs/160-ModuleControllerService'
  - 'cloud-computing/010-CloudComputingBasics'
prerequisites:
  - 'nestjs/030-DenoPermissionsSecurity'
---

## 0. 一句话理解

> 用 Hono 写路由、用 Deno KV 存数据——两样运行时内置能力构成 Deno 的"边缘原生"开发体验；部署环节本篇讲清平台现状（Deno Deploy 已宣布关停）与自托管路线。

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

1. `Deno.openKv()` 打开内置键值存储，零配置即可持久化：本地是落在数据目录的 SQLite 文件，部署到 Deno Deploy 后（在其约 2027-04 关停前的运营期内）是托管的 FoundationDB 后端，代码不变；自托管部署时它仍是本地 SQLite 文件，持久化位置用挂载卷固定。注意 `--unstable-kv`：截至 Deno 2.9，KV 仍是官方标注的不稳定 API，运行时需要这个标记开启。
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

1. `Deno.cron(名字, cron 表达式, 函数)` 是内置定时任务：本地由 Deno 调度，部署到 Deno Deploy 后（关停前）自动成为云端定时任务，两侧语义一致；自托管时用系统 cron 或容器调度触发进程，表达式语义不变。
2. cron 表达式与 Linux crontab 相同：`0 3 * * *` 即每天 03:00；写错表达式会在启动时报错，不用担心静默不执行。
3. 测试沿用 `Deno.test` + `@std/assert`：把路由处理函数抽成独立函数后可脱离 HTTP 直接断言；要测真实接口时用 `app.request("/todos", { method: "POST", body })` 构造请求，不需要真开端口。

## 4. 部署：平台现状与自托管路线

先看清平台事实（2026-10-09 官方公告，deno.com/blog/cloudflare）：Deno 团队整体加入 Cloudflare，随之——

- **Deno Deploy 将关停**：公告后继续运营约六个月（约 2027-04 前后），之后不再可用；
- **Deno 运行时进入约一年维护期**：按月发布修复与安全更新，之后结束官方开发，项目保持开源；
- **JSR 继续运营**，基础设施迁至 Cloudflare。

对选型的含义：Deno 作为语言与运行时在本模块的教学范围内仍是稳定资产，但**新项目的生产部署应按自托管规划**，Deploy 只适合在关停前做短期体验。

```bash
# 体验用：安装部署 CLI，推送到 Deno Deploy（约 2027-04 前仍可运行）
deno install -gArf jsr:@deno/deployctl

# 登录并部署（首次会打开浏览器授权）
deployctl deploy --project=my-deno-app main.ts
```

生产路线是自托管——`deno compile` 或官方 Docker 镜像都可以，后者更常见：

```dockerfile
# Dockerfile —— Deno 服务自托管基线
# tag 与 Deno 发布版本对应，实际以 Docker Hub 的 tag 列表为准
FROM denoland/deno:2.9.8
WORKDIR /app
COPY . .
# 预热依赖缓存，缩短容器冷启动
RUN deno cache kv_todo.ts
EXPOSE 8000
CMD ["run", "--allow-net=:8000", "--unstable-kv", "kv_todo.ts"]
```

**讲解：**

1. `deployctl deploy` 曾是 Deno 部署体验的代表：推送即上边缘网络、每次部署生成预览 URL、GitHub 仓库 push 即自动部署。这些机制在关停前仍可运行，适合理解"边缘原生"的形态，但不再是长期方案。
2. Docker 镜像 `denoland/deno` 的入口就是 deno 可执行文件，`CMD` 里直接写子命令与参数；`RUN deno cache` 把依赖在构建期拉好，运行期不再下载——部署速度与离线安全都受益（依赖缓存机制见[标准库与 npm 兼容](/nestjs/040-DenoStdLibNpmCompatibility)第 5 节）。镜像 tag 跟随 Deno 发布版本，构建前先在 Docker Hub 核对实际存在的 tag 并固定到具体版本。
3. KV 的本地 SQLite 文件必须落在挂载卷上：运行容器时加 `-v kv-data:/app/data`，并把第 2 节代码（也就是 `CMD` 运行的 kv_todo.ts）里的无路径 `Deno.openKv()` 改成显式路径 `Deno.openKv("./data/kv.db")`——需要按第 5 节陷阱 1 改这一行，否则 KV 数据写在容器层、换容器就丢；除这一行改动外，本地与自托管的 KV 读写语义一致。
4. 自托管环境不再有平台代管权限，`--allow-net` 等参数要自己在 `CMD` 里配齐——这正是权限模型训练的价值：迁移到任何环境，最小权限清单都是现成的。
5. `deno compile` 出单文件可执行程序放进更小的镜像（`FROM scratch` 或 distroless）是进阶选项；代价是构建慢、调试难，先用官方镜像跑通再优化。

## 5. 常见陷阱

1. **本地 KV 数据"消失"**：`Deno.openKv()` 本地默认按项目路径存 SQLite 文件，换目录运行就是新库；需要共享数据时显式传路径 `Deno.openKv("./data/kv.db")`。
2. **部署环境的环境变量未设置**：Deploy 控制台配置的变量与本地 `.env` 是两套体系（关停前体验时逐项核对，密钥类用其 secrets 功能）；自托管则由容器编排注入环境变量或挂载 `.env`，任何路线都要在部署清单里逐项核对，别指望"本地能跑线上就能跑"。
3. **忘记返回状态码**：`c.json(data)` 默认 200，创建资源应显式 `c.json(data, 201)`，删除成功返回 204（无 body）——语义正确的状态码是 API 的基本素养。
4. **`for await` 遍历 KV 时边遍历边写**：遍历前缀时插入/删除同前缀 key 可能漏读或重读，先收集再处理更稳妥。
5. **把 Hono 当全功能后端框架**：Hono 只管 HTTP 路由，没有依赖注入与模块系统；业务复杂后要么自己分层，要么迁移到 NestJS（见[概述与快速上手](/nestjs/150-NestJSOverview)，本模块主线）——小工具用 Hono，企业应用用 Nest，不是替代关系。

## 6. 动手试试

1. 给待办 API 增加 `PATCH /todos/:id`，用 `kv.set` 原地更新 `done` 字段，并测试切换效果。
2. 用 `Deno.cron` 写一个每分钟执行的统计任务，把任务总数写入 `["stats", "todo-count"]`。
3. 部署实验走两条路：趁 Deploy 关停前用 `deployctl deploy` 体验一次线上部署与控制台回滚；再用 Docker 自托管同一个项目，对比两种路线的环境差异与 KV 数据位置。
4. 用 `app.request()` 给 `POST /todos` 写两个测试用例：合法创建返回 201、空 body 返回 400。

## 7. 本篇小结

**初学者要点：**

- Deno 的 Web 开发链路最短：Hono 写 API、KV 存数据，权限参数决定它能碰什么；上线首选 Docker 自托管。
- 本地与云端 API 一致（KV、Cron）是这套栈最突出的部署优势——平台托管（Deploy）随公告关停后，同一份代码用自托管延续同样的体验。
- 状态码语义（201/204/400/500）与统一错误出口（`app.onError`）从第一个接口就要做对。

**进阶注意：**

- KV 的进阶用法（原子操作、watch、与 Postgres 的取舍）在[Deno KV 与队列](/nestjs/050-DenoKVQueues)展开；本篇先建立"边缘原生"的直觉。
- Hono 解决"路由"，NestJS 解决"架构"；当模块、依赖注入、校验、守卫这些词开始出现在需求里，就是切换框架的信号。
