---
order: 240
title: 微服务与健康检查
module: 'nestjs'
category: 后端技术
difficulty: advanced
description: 微服务传输层选型与 @MessagePattern，@nestjs/terminus 健康检查，NestJS 12 版本要点。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nestjs/018-DatabaseIntegration'
prerequisites:
  - 'nestjs/016-ModuleControllerService'
---

## 0. 从单应用到多应用（先读这里）

> 学习目标：理解 NestJS 微服务"同一套代码换传输层"的设计；会用 @MessagePattern 与 @EventPattern 编写消息处理器，用 ClientProxy 发起调用；为应用接入 @nestjs/terminus 健康检查；了解 NestJS 12 的 ESM 与 Standard Schema 变化。

上一篇解决了单应用的读压力（缓存）与慢操作（队列），当问题变成"多个应用重复实现同一套逻辑"时，才轮到微服务。拆分顺序有讲究：先在同一仓库里拆清模块边界、用队列通信，边界稳定后再拆进程——传输层可插拔正是 NestJS 的底气。

## 1. 微服务传输层概览

```bash
npm i @nestjs/microservices
```

```typescript
// src/main.ts —— 服务端：HTTP 与微服务可共存
const app = await NestFactory.create(AppModule)
app.connectMicroservice({ transport: Transport.TCP, options: { port: 3001 } })
await app.startAllMicroservices()
await app.listen(3000) // HTTP 路由照常工作
```

```typescript
// src/todos/todos.controller.ts —— 消息处理器
@MessagePattern({ cmd: "todos.list" }) // 请求-响应：有返回值
list() {
  return this.todosService.findAll()
}

@EventPattern("todo.created") // 事件：发后即忘，不等待返回
onTodoCreated(data: { title: string }) {
  this.logger.log(`待办创建：${data.title}`)
}
```

传输层选型：

| 传输层 | 模式 | 优势 | 适用场景 |
| --- | --- | --- | --- |
| TCP | 请求-响应 | 零外部依赖 | 单机联调、起步 |
| Redis | 发布订阅 | 轻量、上手快 | 中小规模任务分发 |
| NATS | 请求-响应/发布订阅 | 极轻、低延迟 | 服务发现与内部总线 |
| Kafka | 持久化日志订阅 | 高吞吐、可回放 | 事件流、审计、日志管道 |
| gRPC | 请求-响应 | 强类型契约、跨语言 | 多语言团队、低延迟调用 |
| RabbitMQ | 发布订阅 | AMQP 成熟、路由强 | 复杂任务路由 |

**讲解：**

1. `@MessagePattern` 对应 RPC（有响应），`@EventPattern` 对应事件（无响应），语义与消息队列的两种交互一一对应。
2. pattern 可以是字符串也可以是 JSON 对象（如 `{ cmd: "todos.list" }`），对象式便于按域组织、避免命名冲突。
3. 换传输层只改 `connectMicroservice` 的配置与客户端注入，业务代码不动——这就是传输层可插拔。
4. 事件处理器内部抛异常不会通知发布方（事件本来就是发后即忘），可靠性依赖消费端重试与死信处理。
5. 一个进程可以 `connectMicroservice` 多个传输层（TCP 加 Kafka），`startAllMicroservices()` 会把它们全部启动，适合过渡期的双轨运行。

## 2. 客户端调用：ClientProxy

```typescript
// src/app.module.ts —— 注册指向 todos 服务的客户端
import { ClientsModule, Transport } from "@nestjs/microservices"

@Module({
  imports: [
    ClientsModule.register([
      {
        name: "TODOS_CLIENT", // 注入令牌
        transport: Transport.TCP,
        options: { host: "localhost", port: 3001 }
      }
    ])
  ]
})
export class AppModule {}
```

```typescript
// src/report/report.service.ts —— 另一个应用里发起调用
import { Inject, Injectable } from "@nestjs/common"
import { ClientProxy } from "@nestjs/microservices"
import { firstValueFrom, timeout, catchError, throwError } from "rxjs"

@Injectable()
export class ReportService {
  constructor(
    @Inject("TODOS_CLIENT") private readonly client: ClientProxy
  ) {}

  async countTodos() {
    return firstValueFrom(
      this.client.send({ cmd: "todos.list" }, {}).pipe(
        timeout(5000), // 远程调用必须设超时，防止无限等待
        catchError((err) =>
          throwError(() => new Error(`调用 todos 服务失败：${err.message}`))
        )
      )
    )
  }

  notifyTodoCreated(todo: { title: string }) {
    // emit 发布事件，不等待响应，返回的 Observable 无需订阅即已发送
    this.client.emit("todo.created", todo)
  }
}
```

**讲解：**

1. `send` 请求-响应、`emit` 发后即忘，与 `@MessagePattern` / `@EventPattern` 成对出现。
2. `send` 返回的是 Observable：可以 `timeout`、`retry`、`catchError`，远程调用按"必然失败"设计，超时与降级是标配。
3. `ClientsModule.register` 的 `name` 就是注入令牌；每个微服务模块也可以在自己的模块里 `ClientsModule.registerAsync` 按需注册。

## 3. 健康检查：@nestjs/terminus

```bash
npm i @nestjs/terminus
```

```typescript
// src/health/health.controller.ts
import { Controller, Get } from "@nestjs/common"
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator
} from "@nestjs/terminus"
import { PrismaService } from "../prisma/prisma.service"

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // 堆内存超过 512MB 视为不健康
      () => this.memory.checkHeap("memory_heap", 512 * 1024 * 1024),
      // 自定义指示器：跑一条最轻的 SQL 确认数据库连接可用
      async () => {
        await this.prisma.$queryRaw`SELECT 1`
        return { database: { status: "up" } }
      }
    ])
  }
}
```

**讲解：**

1. 响应形如 `{ status: "ok", info: { memory_heap: {...}, database: {...} } }`；任一指示器失败则整体 `status: "error"` 并返回 503。
2. 用途直接：K8s 的 liveness/readiness 探针指向 `GET /health`，负载均衡按它摘除不健康实例，发布流水线用它做前置检查。
3. 健康检查要"轻"：只验证关键依赖的连通性（一条 `SELECT 1` 即可），不要在探针里做重查询，否则探针本身会拖垮服务。
4. 自定义指示器在 NestJS 11 起推荐基于 `HealthIndicatorService` 编写，与 Prisma、TypeORM 的现成指示器用法以官方文档为准。

## 4. NestJS 12：ESM 与 Standard Schema

2026 年的版本事实：

| 事项 | 现状 |
| --- | --- |
| 框架版本 | NestJS 12 已发布（ESM-ready、原生支持 Standard Schema），11 仍被广泛使用 |
| 运行时 | 推荐 Node.js 22 LTS |
| 语言 | TypeScript 5.x |
| ESM | 核心包提供 ESM 导出，存量 CJS 项目可渐进迁移 |
| Standard Schema | ValidationPipe 等可直接消费 zod、valibot、arktype 等实现 |

**讲解：**

1. ESM-ready 指包同时提供 CJS 与 ESM 双导出：新项目可直接用 ESM；存量项目不要在业务高峰期顺带做 ESM 改造，单独排期。
2. Standard Schema 是校验库的统一接口标准：配合《配置与环境变量校验》一篇的 zod schema，配置校验与 DTO 校验可以共享同一套 schema；团队已在用 class-validator 的不必急于更换。
3. 升级策略：按官方迁移指引（Migrations to v12）在 CI 里先行验证，重点核对 RxJS、cache-manager、bullmq 等外围包的版本配套；细节以官方文档为准。

## 5. 动手试试

1. 把 `connectMicroservice` 的 `Transport.TCP` 换成 `Transport.REDIS`，服务端与客户端同步修改，用 `redis-cli MONITOR` 观察 payload 的收发。
2. 制造故障演练：停掉 todos 服务再调用 `countTodos`，验证 `timeout + catchError` 的降级输出，确认接口不再无限等待。
3. 用 Docker 起一个 Redis 供缓存与队列共用，把 `GET /health` 配进负载均衡探针，观察任一依赖宕机后返回的 `status: "error"` 结构。

## 6. 小结与延伸

- 微服务先拆模块边界再拆进程；`@MessagePattern` 管 RPC、`@EventPattern` 管事件，传输层可插拔。
- 远程调用三件套：超时、降级、幂等，缺一不可。
- 健康检查是上生产前的最后一道自检：探针要轻、指标要真、对接 K8s 或负载均衡。
- 延伸：混合应用（HTTP + 微服务共存）的官方示例；gRPC proto 文件与 Nest 的结合；NATS 的队列组实现负载均衡消费。
