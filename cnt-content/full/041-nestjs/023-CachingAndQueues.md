---
order: 230
title: 缓存与消息队列
module: 'nestjs'
category: 后端技术
difficulty: advanced
description: CacheModule 响应缓存与 BullMQ 异步任务：TTL、key 设计、重试退避与延迟任务。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nestjs/018-DatabaseIntegration'
  - 'nestjs/019-Testing'
prerequisites:
  - 'nestjs/016-ModuleControllerService'
---

## 0. 什么时候需要它们（先读这里）

> 学习目标：判断应用何时需要缓存与队列；会用 CacheModule 与自定义拦截器做响应缓存，理解 TTL 与 key 设计；会用 @nestjs/bullmq 落地异步任务：注册队列、入队、消费、重试退避与延迟任务。

单机 CRUD 撑不到生产规模，本章对症下药：

| 症状 | 药方 | 本章小节 |
| --- | --- | --- |
| 同一列表每秒被查几十次，数据库 CPU 居高 | 响应缓存 | 1 |
| 导出报表、发邮件拖慢接口响应 | BullMQ 队列 | 2-3 |
| 多个应用重复实现同一套逻辑 | 微服务（见下一篇） | - |

共同点：两者都打破了"请求-响应同步完成"的假设，需要为失败重试、数据一致性支付额外复杂度。先确认真的需要，再引入。

## 1. 响应缓存：CacheModule 与拦截器

```bash
npm i @nestjs/cache-manager cache-manager
```

```typescript
// src/app.module.ts
import { CacheModule } from "@nestjs/cache-manager"

@Module({
  imports: [
    CacheModule.register({
      ttl: 60_000 // 默认过期时间 60 秒（毫秒）；默认内存存储
    })
  ]
})
export class AppModule {}
```

注入 `Cache` 手动缓存 Todo 列表，写操作后主动失效：

```typescript
// src/todos/todos.service.ts
import { Inject, Injectable } from "@nestjs/common"
import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager"
import { PrismaService } from "../prisma/prisma.service"
import { CreateTodoDto } from "./dto/create-todo.dto"

@Injectable()
export class TodosService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache
  ) {}

  async findAll() {
    const cached = await this.cache.get("todos:all")
    if (cached) return cached // 命中：不再查库
    const todos = await this.prisma.todo.findMany({
      orderBy: { createdAt: "desc" }
    })
    await this.cache.set("todos:all", todos, 60_000)
    return todos
  }

  async create(dto: CreateTodoDto) {
    const todo = await this.prisma.todo.create({ data: { title: dto.title } })
    await this.cache.del("todos:all") // 写后删 key，避免脏读
    return todo
  }
}
```

key 必须把所有影响结果的参数编码进去：

| key 示例 | 含义 |
| --- | --- |
| `todos:all` | 全量列表 |
| `todos:page:1:size:20` | 分页列表，页码与页大小进 key |
| `todos:user:42` | 按用户隔离的数据，用户 id 进 key |

再给一个按路由自动缓存的拦截器，写法沿用守卫与拦截器一篇的 `NestInterceptor` 模式：

```typescript
// src/common/interceptors/http-cache.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common"
import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager"
import { Observable, of, tap } from "rxjs"

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest()
    if (req.method !== "GET") return next.handle() // 只缓存 GET

    const key = `http:${req.originalUrl}` // 路径 + 查询串天然构成 key
    const cached = await this.cache.get(key)
    if (cached) return of(cached) // 命中：直接回放缓存

    return next.handle().pipe(
      tap((data) => this.cache.set(key, data, 30_000)) // 写缓存不阻塞响应
    )
  }
}

// 控制器按需挂载
@UseInterceptors(HttpCacheInterceptor)
@Get()
findAll() {
  return this.todosService.findAll()
}
```

**讲解：**

1. 默认内存存储重启即失、多实例不共享；生产换 Redis 存储（@nestjs/cache-manager 配合 Keyv 系适配器），各版本配置差异以官方文档为准。
2. 两种方案选一即可：拦截器按 URL 全自动化，手动方案能精确控制 key 与失效时机；有分页、按人隔离等复杂 key 时推荐手动。
3. 失效策略从简：写操作直接删 key（cache-aside 模式），比"顺手更新缓存"更不容易出错。

## 2. BullMQ 队列：注册、生产者与消费者

```bash
npm i @nestjs/bullmq bullmq ioredis
```

```typescript
// src/app.module.ts
import { BullModule } from "@nestjs/bullmq"

@Module({
  imports: [
    BullModule.forRoot({
      connection: { host: "localhost", port: 6379 } // Redis 连接全局复用
    }),
    BullModule.registerQueue({ name: "email" }) // 队列名即契约
  ]
})
export class AppModule {}
```

生产者：接口只负责入队，立即返回 202：

```typescript
// src/email/email.service.ts
import { Inject, Injectable } from "@nestjs/common"
import { InjectQueue } from "@nestjs/bullmq"
import { Queue } from "bullmq"

export interface EmailJob {
  to: string
  subject: string
  body: string
}

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue("email") private readonly emailQueue: Queue<EmailJob>
  ) {}

  async sendWelcome(to: string) {
    await this.emailQueue.add(
      "welcome", // 任务名
      { to, subject: "欢迎注册", body: "..." },
      {
        attempts: 5, // 最多尝试 5 次
        backoff: { type: "exponential", delay: 3000 }, // 间隔 3s、6s、12s、24s、48s
        removeOnComplete: 100, // 完成记录最多保留 100 条，防 Redis 膨胀
        removeOnFail: 1000
      }
    )
  }
}
```

消费者：

```typescript
// src/email/email.processor.ts
import { Logger } from "@nestjs/common"
import { Processor, WorkerHost } from "@nestjs/bullmq"
import { Job } from "bullmq"
import { EmailJob } from "./email.service"

@Processor("email", { concurrency: 5 }) // 同时处理 5 个任务
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name)

  async process(job: Job<EmailJob>): Promise<void> {
    this.logger.log(`任务 ${job.id} 第 ${job.attemptsMade + 1} 次尝试`)
    await mailer.send(job.data) // 抛异常 = 本轮失败，BullMQ 按策略重试
  }
}

// EmailModule 的 providers 中注册 EmailProcessor
```

**讲解：**

1. 队列的价值：把"慢且可能失败"的操作移出请求-响应周期，接口耗时从 3 秒降到 20 毫秒，失败还能自动重试。
2. `attempts + backoff` 是可靠性下限：瞬时故障（网络抖动、下游限流）靠指数退避自愈；反复失败最终进入 failed 集合，留给人处理。
3. `job.data` 必须可 JSON 序列化：只传 id 等引用，消费者自己查库取最新数据，避免把大对象塞进 Redis。

## 3. 延迟任务与消费可靠性

```typescript
// 24 小时后发送回访邮件
await this.emailQueue.add(
  "follow-up",
  { to, subject: "使用得怎么样？" },
  { delay: 24 * 60 * 60 * 1000 }
)
```

任务状态机：

| 状态 | 含义 | 去向 |
| --- | --- | --- |
| waiting | 排队中 | active |
| active | 消费中 | completed / failed（重试回 waiting） |
| delayed | 等待触发时间 | 到期转 waiting |
| failed | 重试次数耗尽 | 人工介入 |

```typescript
// 队列事件监听：失败告警的最简实现
this.emailQueue.on("failed", (job, err) => {
  this.logger.error(`任务 ${job?.id} 失败：${err.message}`)
})
```

**讲解：**

1. delay 任务先进入 delayed 集合，到期自动转 waiting；状态存在 Redis，应用重启不丢任务。
2. 重试由"消费者抛异常"触发；对参数错误等重试无意义的失败，抛 `UnrecoverableError` 可跳过剩余重试。
3. 幂等是消费前提：重试意味着任务可能已执行过一半，写库操作用唯一键约束兜底，避免重复发货类事故。
4. 单元测试建议：直接测试 Processor 的 `process` 方法（传入伪造 Job），队列行为本身交给集成环境验证，与测试一篇的分层思路一致。

## 4. 小结与延伸

- 缓存救读压力：TTL 控制新鲜度、key 编码全部查询参数、写后删 key（cache-aside）。
- 队列救写延迟：`forRoot` 连接、`registerQueue` 声明、`add` 入队、`@Processor` 消费；重试退避保瞬时故障，幂等保最终一致。
- 两者都引入新的失败模式：先量化症状（QPS、耗时、失败率），再决定引入。
- 延伸：Bull Board 面板可视化队列积压；缓存穿透与雪崩的应对（空值缓存、随机 TTL）；微服务与健康检查见下一篇。
