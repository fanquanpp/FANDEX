---
order: 240
title: 缓存与消息队列
module: 'nestjs'
category: 后端技术
difficulty: advanced
description: CacheModule 响应缓存与 BullMQ 异步任务：TTL、key 设计、缓存三大经典问题、重试退避、延迟任务与幂等消费，附遮代码自检。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'nestjs/165-DiContainerAndProviders'
  - 'nestjs/180-DatabaseIntegration'
  - 'nestjs/190-Testing'
  - 'nestjs/240-MicroservicesAndHealth'
prerequisites:
  - 'nestjs/160-ModuleControllerService'
---

## 0. 什么时候需要它们（先读这里）

> 学习目标：判断应用何时需要缓存与队列；会用 CacheModule 与自定义拦截器做响应缓存，理解 TTL 与 key 设计；能识别并化解缓存穿透、击穿、雪崩；会用 @nestjs/bullmq 落地异步任务：注册队列、入队、消费、重试退避、延迟任务与幂等消费。

单机 CRUD 撑不到生产规模，本章对症下药：

| 症状 | 药方 | 本章小节 |
| --- | --- | --- |
| 同一列表每秒被查几十次，数据库 CPU 居高 | 响应缓存 | 1-2 |
| 导出报表、发邮件拖慢接口响应 | BullMQ 队列 | 3-4 |
| 多个应用重复实现同一套逻辑 | 微服务（见下一篇） | - |

共同点：两者都打破了"请求-响应同步完成"的假设，需要为失败重试、数据一致性支付额外复杂度。先确认真的需要，再引入。

先把**交易的心智模型**立住：缓存与队列都在做同一类交易——**拿数据一致性，换响应速度或吞吐**。缓存把"必然最新"换成"大概率新鲜"（TTL 内的数据可能已过期）；队列把"立刻完成"换成"最终完成"（请求返回时任务还没跑）。既然是一致性换来的性能，就要随时能回答两个问题："脏了怎么办"（缓存的失效策略）和"丢了怎么办"（队列的重试与持久化）。回答不出这两个问题的方案，还不该上线。

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

## 2. 缓存三大经典问题：穿透、击穿、雪崩

三个问题都是"缓存没接住，流量全砸到数据库"，区别在**没接住的原因**：

| 问题 | 场景 | 原因 | 化解 |
| --- | --- | --- | --- |
| 穿透 | 反复查询不存在的 id | 库里没有 → 缓存永远无法建立，每次都穿透到库 | 空值缓存 + 参数校验 |
| 击穿 | 某个热点 key 到期瞬间 | 重建期间上千请求同时回源 | 互斥重建（只放一个请求去查库） |
| 雪崩 | 大批 key 同时到期 | 同一时刻集体回源，数据库被打垮 | TTL 加随机抖动 |

**穿透**的化解最容易先落地——查不到也缓存一个短命空值：

```typescript
async findOne(id: number) {
  const key = `todo:${id}`
  const cached = await this.cache.get(key)
  if (cached !== undefined) {
    // 命中，包括命中"空值哨兵"
    return cached === null ? null : cached   // null 是哨兵：库里确实没有
  }
  const todo = await this.prisma.todo.findUnique({ where: { id } })
  // 空值也写缓存：TTL 短（如 30s），防住恶意扫描不存在的 id
  await this.cache.set(key, todo ?? null, 30_000)
  return todo
}
```

注意类型约定：`undefined` = "缓存里没这条记录"（需要回源），`null` = "缓存确认库里没有"（哨兵值）。区分这两个值正是穿透防护的核心——`if (cached)` 这种真值判断会把哨兵 null 当未命中，防线直接失效。

**击穿**用互斥重建：发现未命中时先用 `set(key, "building", nx?, 3s)` 类的占位（内存版没有 nx 语义，Redis 有 SET NX），抢不到占位的请求短暂等待或返回旧值。简单场景的降级版：接受击穿窗口内的一小波回源（数据库扛得住就不做），等换 Redis 后再上完整方案——**防御强度要和真实流量匹配**。

**雪崩**的成本最低，写 TTL 时加抖动即可：

```typescript
const jitter = Math.floor(Math.random() * 0.2 * ttl) // 0-20% 随机抖动
await this.cache.set(key, data, ttl + jitter)
```

三个问题共同的预防性检查：压测前先问"所有 key 同时失效会发生什么"——答案难看，就说明雪崩防御没做。

## 3. BullMQ 队列：注册、生产者与消费者

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

## 4. 延迟任务与消费可靠性

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
3. 单元测试建议：直接测试 Processor 的 `process` 方法（传入伪造 Job），队列行为本身交给集成环境验证，与测试一篇的分层思路一致。

### 4.1 幂等：重试的另一半

`attempts: 5` 意味着一个前提必须成立：**任务可能已成功执行过一次，第二次重试还在跑**。超时后消费者被判失败、任务重新入队，但下游邮件服务可能已经把信发出去了——这就是"至少一次"（at-least-once）投递语义：**不丢，但可能重**。队列层没有"恰好一次"的免费午餐，恰好一次要业务层自己造，原料是幂等键：

```typescript
// 生产者：用业务唯一键做 jobId——BullMQ 对相同 jobId 的 waiting 任务去重
await this.emailQueue.add(
  "welcome",
  { to, subject: "欢迎注册", body: "..." },
  { jobId: `welcome:${userId}` }   // 同一用户重复触发不会重复排队
)

// 消费者：写操作用唯一约束兜底，重复消费变"冲突后放弃"而非"重复生效"
await this.prisma.couponGrant.create({ data: { userId, campaignId } })
// 重复到达时触发唯一约束冲突 → catch 后视为已处理，正常完成
```

两层防线各管一段：jobId 去重挡"重复入队"，唯一约束挡"重复消费"。设计任务时先问一句"这个任务跑两次会怎样"——答案是"发两封邮件、扣两次款"，就还没资格开重试。

## 5. 动手实践：遮代码自检

先只读任务与提示，自己写完再对照参考实现。

**任务一**：给第 1 节的 `findAll` 补上雪崩与穿透防御——

1. 所有 TTL 在基准值上带 0 到 20% 的随机抖动；
2. 列表为空时也写一个短命缓存（空数组哨兵），防止"查询空集合"的流量反复回源；
3. 保持 cache-aside 失效（create 后删 key）不变。

**提示**：第 2 条的坑在判断——空数组是合法缓存值，`if (cached)` 的真值判断对空数组恰好为真（数组是对象），但 `cache.get` 对"不存在"返回 undefined，哨兵判断要区分的是 undefined 而不是 falsy。

**参考实现**（先自己写完再看）：

```typescript
async findAll() {
  const key = "todos:all"
  const cached = await this.cache.get(key)
  if (cached !== undefined) return cached        // undefined 才是"缓存没有"

  const todos = await this.prisma.todo.findMany({ orderBy: { createdAt: "desc" } })

  const base = 60_000
  const jitter = Math.floor(Math.random() * 0.2 * base)   // 雪崩防御：0-20% 抖动
  await this.cache.set(key, todos, base + jitter)          // 空数组也缓存：穿透防御
  return todos
}
```

要点自查：`cached !== undefined` 是唯一正确的命中判断——换成 `if (cached)` 会把空数组当命中（碰巧对）但把"存了空值的 key 过期前"与"key 不存在"混为一谈的写法，在 findOne 场景（null 哨兵）就会出错；抖动一行成本，收益是把"同一时刻集体到期"摊开成一条时间带。

**任务二**：给"发送生日优惠券"任务补幂等——用户每天最多领一次，任务可能被重试，如何保证不重复发放？

**提示**：两层防线各用什么键？（第 4.1 节）jobId 去重键要包含"用户 + 当天日期"，否则跨天也发不出第二天的券；消费侧唯一约束落在哪两个字段上？

**参考实现**（先自己写完再看）：

```typescript
// 生产者
await this.couponQueue.add(
  "birthday-grant",
  { userId },
  { jobId: `birthday:${userId}:${dayjs().format("YYYY-MM-DD")}` } // 键含日期：跨天可再领
)

// 消费者
async process(job: Job<{ userId: string }>): Promise<void> {
  const { userId } = job.data
  try {
    await this.prisma.couponGrant.create({
      data: { userId, campaignId: "birthday", date: new Date() }
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return // 唯一约束冲突 = 已发放过：视为成功，避免无谓重试
    }
    throw e  // 其余异常照常抛出，交给 attempts/backoff
  }
}
```

要点自查：jobId 挡"同一天重复入队"，`(userId, campaignId, date)` 唯一约束挡"重试重复消费"——两道防线缺一不可；`P2002` 冲突按成功处理是幂等消费的标准姿势，吞掉它换来的就是"恰好一次"的效果。

## 6. 小结与延伸

- 心智模型：缓存与队列都在拿一致性换性能——缓存回答"脏了怎么办"（cache-aside 写后删 key），队列回答"丢了怎么办"（attempts + backoff + 持久化到 Redis）。
- 缓存救读压力：TTL 控制新鲜度、key 编码全部查询参数；穿透用空值哨兵（undefined 与 null 分工）、击穿用互斥重建、雪崩用 TTL 抖动。
- 队列救写延迟：`forRoot` 连接、`registerQueue` 声明、`add` 入队、`@Processor` 消费；at-least-once 语义下幂等是消费前提，jobId 去重 + 业务唯一约束两道防线。
- 两者都引入新的失败模式：先量化症状（QPS、耗时、失败率），再决定引入。
- 延伸：Bull Board 面板可视化队列积压；缓存穿透与雪崩的应对本文第 2 节已展开，击穿的完整互斥方案等切换 Redis 后落地；微服务与健康检查见下一篇。
