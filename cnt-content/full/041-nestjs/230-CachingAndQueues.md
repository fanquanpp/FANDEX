---
order: 270
title: 缓存与消息队列
module: 'nestjs'
category: 后端技术
difficulty: advanced
description: CacheModule 响应缓存与拦截器缓存：TTL、key 设计、缓存三大经典问题（穿透、击穿、雪崩）在 NestJS 中的落地与取舍，附遮代码自检。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'nestjs/165-DiContainerAndProviders'
  - 'nestjs/180-DatabaseIntegration'
  - 'nestjs/190-Testing'
  - 'nestjs/235-BullMQQueuesAndReliability'
  - 'redis/120-CachePenetrationBreakdownAvalanche'
  - 'redis/125-CachePatternsAndDbConsistency'
prerequisites:
  - 'nestjs/160-ModuleControllerService'
---

## 0. 什么时候需要缓存（先读这里）

> 学习目标：判断应用何时需要缓存；会用 CacheModule 与自定义拦截器做响应缓存，理解 TTL 与 key 设计；能识别并化解缓存穿透、击穿、雪崩。

单机 CRUD 撑不到生产规模，缓存对症的是**读压力**：同一列表每秒被查几十次、数据库 CPU 居高——这是本篇要解决的症状。（写延迟的症状——导出报表、发邮件拖慢接口——归队列管，见《消息队列与异步任务可靠性》nestjs/235-BullMQQueuesAndReliability。）

先把**交易的心智模型**立住：缓存在做一类交易——**拿数据一致性，换响应速度**。缓存把"必然最新"换成"大概率新鲜"（TTL 内的数据可能已过期）。既然是一致性换来的性能，就要随时能回答："脏了怎么办"（本篇第 1 节的失效策略）和"没接住怎么办"（第 2 节的三大经典问题）。回答不出这两个问题的方案，还不该上线。

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
4. 「先更新库还是先删缓存、延迟双删、失效广播」这套读写模式与一致性的完整推导在《缓存读写模式与数据库一致性》（redis/125-CachePatternsAndDbConsistency）——本节用到的「写后删 key」只是它的最小形态。

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

> 三大问题的完整版（布隆过滤器、逻辑过期、多级缓存、熔断降级，附可运行实验）在《缓存穿透击穿雪崩》（redis/120-CachePenetrationBreakdownAvalanche）——本节是 NestJS 侧的最小落地，redis/120 是机制与进阶防护的正篇，两篇按「框架落地 / 机制深挖」分工。

## 3. 动手实践：遮代码自检

先只读任务与提示，自己写完再对照参考实现。

**任务**：给第 1 节的 `findAll` 补上雪崩与穿透防御——

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

## 4. 小结与延伸

- 心智模型：缓存在拿一致性换性能——回答"脏了怎么办"（cache-aside 写后删 key，完整模式见 redis/125）与"没接住怎么办"（本篇第 2 节）。
- 缓存救读压力：TTL 控制新鲜度、key 编码全部查询参数；穿透用空值哨兵（undefined 与 null 分工）、击穿用互斥重建、雪崩用 TTL 抖动。
- 先量化症状（QPS、命中率、数据库负载）再引入缓存；写延迟类症状（慢操作、重试）归队列，见《消息队列与异步任务可靠性》（nestjs/235-BullMQQueuesAndReliability）。
- 延伸：击穿的完整互斥方案等切换 Redis 后落地（SET NX 语义见 redis/230 的 Pipeline 与事务对照）；多实例部署后的健康探针见《健康检查与就绪探针》（nestjs/242-HealthChecksTerminus）。

## 参考与致谢

- @nestjs/cache-manager 与 NestJS 官方文档 Caching 章节 <https://docs.nestjs.com/techniques/caching>；
- 本篇由《缓存与消息队列》拆分而来：原第 1 节（CacheModule 与拦截器缓存）、第 2 节（三大经典问题）、动手实践的缓存侧任务保留于本篇；原第 3/4 节队列内容与队列侧练习已搬移至 235 号落位。
